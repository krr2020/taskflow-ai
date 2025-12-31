import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { startCommand } from "../../src/commands/start";
import * as dataAccess from "../../src/lib/data-access";
import {
	ActiveSessionExistsError,
	DependencyNotMetError,
	StoryInProgressError,
	TaskAlreadyCompletedError,
	TaskNotFoundError,
} from "../../src/lib/errors";
import * as git from "../../src/lib/git";
import * as output from "../../src/lib/output";

vi.mock("../../src/lib/data-access");
vi.mock("../../src/lib/git");
vi.mock("../../src/lib/output", () => ({
	colors: {
		info: (s: string) => `[info]${s}[/info]`,
		command: (s: string) => `[command]${s}[/command]`,
		highlight: (s: string) => `[highlight]${s}[/highlight]`,
		success: (s: string) => `[success]${s}[/success]`,
		error: (s: string) => `[error]${s}[/error]`,
		warning: (s: string) => `[warning]${s}[/warning]`,
		muted: (s: string) => `[muted]${s}[/muted]`,
		file: (s: string) => `[file]${s}[/file]`,
		task: (s: string) => `[task]${s}[/task]`,
		state: (s: string) => `[state]${s}[/state]`,
		warningBold: (s: string) => `[warningBold]${s}[/warningBold]`,
		successBold: (s: string) => `[successBold]${s}[/successBold]`,
		infoBold: (s: string) => `[infoBold]${s}[/infoBold]`,
		errorBold: (s: string) => `[errorBold]${s}[/errorBold]`,
	},
	icons: {
		success: "✓",
		error: "✗",
		warning: "⚠",
		info: "ℹ",
		brain: "🧠",
		target: "🎯",
		architecture: "📐",
		code: "💻",
		search: "🔍",
		test: "🧪",
		save: "💾",
		stop: "🛑",
		arrow: "▸",
		alert: "🚨",
	},
	// New standardized output functions
	printCommandResult: vi.fn(),
	printOutputSection: vi.fn(),
	printNextStepsSection: vi.fn(),
	printAIWarning: vi.fn(),
	printDivider: vi.fn(),
	printSubheader: vi.fn(),
	printKeyValue: vi.fn(),
	printColoredLine: vi.fn(),
	printEmptyLine: vi.fn(),
	printLine: vi.fn(),
	printSection: vi.fn(),
	printHeader: vi.fn(),
	printSuccess: vi.fn(),
	printError: vi.fn(),
	printWarning: vi.fn(),
	printInfo: vi.fn(),
	printMuted: vi.fn(),
	printCommand: vi.fn(),
	printTaskStarted: vi.fn(),
	printTaskCompleted: vi.fn(),
	printCurrentState: vi.fn(),
	printNextStep: vi.fn(),
	printNextSteps: vi.fn(),
	printAction: vi.fn(),
	printSetupInstructions: vi.fn(),
	printVerifyInstructions: vi.fn(),
	printValidateInstructions: vi.fn(),
	printCommitInstructions: vi.fn(),
	printPreHookFailure: vi.fn(),
	printAvailableCommands: vi.fn(),
	COMMON_COMMANDS: { noSession: [], activeSession: [] },
}));

describe("startCommand", () => {
	const mockTasksProgress = {
		project: "Test",
		features: [
			{
				id: "1",
				title: "Feature 1",
				status: "in-progress" as const,
				stories: [
					{
						id: "1.1",
						title: "Story 1.1",
						status: "not-started" as const,
						tasks: [
							{
								id: "1.1.0",
								title: "Task 0",
								status: "not-started" as const,
								dependencies: [],
							},
							{
								id: "1.1.1",
								title: "Task 1",
								status: "not-started" as const,
								dependencies: ["1.1.0"],
							},
						],
					},
				],
			},
		],
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(mockTasksProgress);
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.checkDependenciesMet).mockReturnValue(true);
		vi.mocked(dataAccess.getUnmetDependencies).mockReturnValue([]);
		vi.mocked(dataAccess.updateTaskStatus).mockReturnValue(null);
		vi.mocked(dataAccess.getTaskFilePath).mockReturnValue("/path/to/task.json");
		vi.mocked(git.verifyBranch).mockImplementation(() => {});
		vi.mocked(output.printAvailableCommands).mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should show usage when no task ID provided", async () => {
		await startCommand({ taskId: "" });
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"START",
			expect.stringContaining("No task ID"),
			false,
		);
		expect(output.printAvailableCommands).toHaveBeenCalled();
	});

	it("should throw ActiveSessionExistsError when session already active with different task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: { title: "Test", status: "implementing" },
		} as any);

		await expect(startCommand({ taskId: "1.1.1" })).rejects.toThrow(
			ActiveSessionExistsError,
		);
	});

	it("should treat starting an already active task as a resume", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: { title: "Test", status: "setup" } as any,
		});

		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]?.stories[0]!,
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0]!,
		} as any);

		await startCommand({ taskId: "1.1.0" });

		expect(dataAccess.updateTaskStatus).not.toHaveBeenCalled();
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"START",
			expect.stringContaining("already active"),
		);
		expect(output.printNextStepsSection).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ cmd: "pnpm task do" }),
			]),
		);
	});

	it("should throw TaskNotFoundError for non-existent task", async () => {
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue(null);

		await expect(startCommand({ taskId: "99.99.99" })).rejects.toThrow(
			TaskNotFoundError,
		);
	});

	it("should throw TaskAlreadyCompletedError for completed task", async () => {
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]?.stories[0]!,
			task: {
				id: "1.1.0",
				title: "Task 0",
				status: "completed",
				dependencies: [],
			},
		} as any);

		await expect(startCommand({ taskId: "1.1.0" })).rejects.toThrow(
			TaskAlreadyCompletedError,
		);
	});

	it("should throw StoryInProgressError when another story is active", async () => {
		const progressWithActiveStory = {
			...mockTasksProgress,
			features: [
				{
					...mockTasksProgress.features[0],
					stories: [
						{
							id: "1.1",
							title: "Story 1.1",
							status: "in-progress" as const,
							tasks: mockTasksProgress.features[0]?.stories[0]?.tasks,
						},
						{
							id: "1.2",
							title: "Story 1.2",
							status: "not-started" as const,
							tasks: [
								{
									id: "1.2.0",
									title: "Task",
									status: "not-started" as const,
									dependencies: [],
								},
							],
						},
					],
				},
			],
		};
		vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(
			progressWithActiveStory as any,
		);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: progressWithActiveStory.features[0]!,
			story: progressWithActiveStory.features[0]?.stories[1]!,
			task: progressWithActiveStory.features[0]?.stories[1]?.tasks[0]!,
		} as any);

		await expect(startCommand({ taskId: "1.2.0" })).rejects.toThrow(
			StoryInProgressError,
		);
	});

	it("should throw DependencyNotMetError when dependencies not completed", async () => {
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]?.stories[0]!,
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[1]!,
		} as any);
		vi.mocked(dataAccess.checkDependenciesMet).mockReturnValue(false);
		vi.mocked(dataAccess.getUnmetDependencies).mockReturnValue(["1.1.0"]);

		await expect(startCommand({ taskId: "1.1.1" })).rejects.toThrow(
			DependencyNotMetError,
		);
	});

	it("should successfully start a task", async () => {
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]?.stories[0]!,
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0]!,
		} as any);

		await startCommand({ taskId: "1.1.0" });

		expect(dataAccess.updateTaskStatus).toHaveBeenCalledWith(
			mockTasksProgress,
			"1.1.0",
			"setup",
		);
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"START",
			expect.stringContaining("started"),
		);
		expect(output.printOutputSection).toHaveBeenCalled();
		expect(output.printKeyValue).toHaveBeenCalled();
		expect(output.printNextStepsSection).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ cmd: "pnpm task do" }),
			]),
		);
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should call verifyBranch with correct story", async () => {
		const story = mockTasksProgress.features[0]?.stories[0]!;
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story,
			task: story.tasks[0]!,
		} as any);

		await startCommand({ taskId: "1.1.0" });

		expect(git.verifyBranch).toHaveBeenCalledWith(story);
	});
});
