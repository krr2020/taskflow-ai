import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { resumeCommand } from "../../src/commands/resume";
import * as dataAccess from "../../src/lib/data-access";
import { NoActiveSessionError, TaskNotFoundError } from "../../src/lib/errors";
import * as output from "../../src/lib/output";

vi.mock("../../src/lib/data-access");
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
	COMMON_COMMANDS: { noSession: [], activeSession: [] },
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
}));

describe("resumeCommand", () => {
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
						status: "in-progress" as const,
						tasks: [
							{
								id: "1.1.0",
								title: "Task 0",
								status: "implementing" as const,
								dependencies: [],
							},
							{
								id: "1.1.1",
								title: "Task 1",
								status: "not-started" as const,
								dependencies: [],
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
		vi.mocked(dataAccess.updateTaskStatus).mockReturnValue(null);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should show active session when one exists", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: {
				title: "Task 0",
				status: "implementing",
			},
		} as any);

		await resumeCommand({});

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"RESUME",
			expect.stringContaining("Found active session"),
		);
		expect(output.printNextStepsSection).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ cmd: "pnpm task do" }),
			]),
		);
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should throw TaskNotFoundError for non-existent task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue(null);

		await expect(resumeCommand({ taskId: "99.99.99" })).rejects.toThrow(
			TaskNotFoundError,
		);
	});

	it("should warn when trying to resume not-started task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0],
			story: mockTasksProgress.features[0]?.stories[0],
			task: {
				id: "1.1.1",
				title: "Task 1",
				status: "not-started" as const,
				dependencies: [],
			},
		} as any);

		await resumeCommand({ taskId: "1.1.1" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"RESUME",
			expect.stringContaining("not been started"),
			false,
		);
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should warn when trying to resume completed task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0],
			story: mockTasksProgress.features[0]?.stories[0],
			task: {
				id: "1.1.0",
				title: "Task 0",
				status: "completed" as const,
				dependencies: [],
			},
		} as any);

		await resumeCommand({ taskId: "1.1.0" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"RESUME",
			expect.stringContaining("completed"),
			false,
		);
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should throw TaskNotFoundError when task file path not found", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0],
			story: mockTasksProgress.features[0]?.stories[0],
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0],
		} as any);
		vi.mocked(dataAccess.getTaskFilePath).mockReturnValue(null);

		await expect(resumeCommand({ taskId: "1.1.0" })).rejects.toThrow(
			TaskNotFoundError,
		);
	});

	it("should throw TaskNotFoundError when task file cannot be loaded", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0],
			story: mockTasksProgress.features[0]?.stories[0],
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0],
		} as any);
		vi.mocked(dataAccess.getTaskFilePath).mockReturnValue("/path/to/task.json");
		vi.mocked(dataAccess.loadTaskFile).mockReturnValue(null);

		await expect(resumeCommand({ taskId: "1.1.0" })).rejects.toThrow(
			TaskNotFoundError,
		);
	});

	it("should resume task with implementing status", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0],
			story: mockTasksProgress.features[0]?.stories[0],
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0],
		} as any);
		vi.mocked(dataAccess.getTaskFilePath).mockReturnValue("/path/to/task.json");
		vi.mocked(dataAccess.loadTaskFile).mockReturnValue({
			title: "Task 0",
			status: "implementing",
		} as any);

		await resumeCommand({ taskId: "1.1.0" });

		// Task already has active status, should not need update
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"RESUME",
			expect.stringContaining("already active"),
		);
	});

	it("should show already active for task with validating status", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0],
			story: mockTasksProgress.features[0]?.stories[0],
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0],
		} as any);
		vi.mocked(dataAccess.getTaskFilePath).mockReturnValue("/path/to/task.json");
		vi.mocked(dataAccess.loadTaskFile).mockReturnValue({
			title: "Task 0",
			status: "validating",
		} as any);

		await resumeCommand({ taskId: "1.1.0" });

		// Should not update status since task already has active status
		expect(dataAccess.updateTaskStatus).not.toHaveBeenCalled();
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"RESUME",
			expect.stringContaining("already active"),
		);
	});

	it("should throw NoActiveSessionError when no taskId and no active task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);

		await expect(resumeCommand({})).rejects.toThrow(NoActiveSessionError);
	});

	it("should throw NoActiveSessionError when no task to resume", async () => {
		const noInProgressProgress = {
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
							status: "in-progress" as const,
							tasks: [
								{
									id: "1.1.0",
									title: "Task 0",
									status: "completed" as const,
									dependencies: [],
								},
								{
									id: "1.1.1",
									title: "Task 1",
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
			noInProgressProgress,
		);
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);

		await expect(resumeCommand({})).rejects.toThrow(NoActiveSessionError);
	});

	it("should find active task in feature when one exists", async () => {
		const activeTaskResult = {
			taskId: "2.1.0",
			filePath: "/path/to/task.json",
			content: {
				title: "Task",
				status: "implementing",
			},
		};
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			activeTaskResult as any,
		);

		await resumeCommand({});

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"RESUME",
			expect.stringContaining("Found active session"),
		);
	});
});
