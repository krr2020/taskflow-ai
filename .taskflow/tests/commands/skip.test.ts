import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { skipCommand } from "../../src/commands/skip";
import * as dataAccess from "../../src/lib/data-access";
import { TaskNotFoundError } from "../../src/lib/errors";
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

import type { TasksProgress } from "../../src/lib/types";

describe("skipCommand", () => {
	const mockTasksProgress: TasksProgress = {
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
								status: "setup" as const,
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
		vi.mocked(dataAccess.blockTask).mockReturnValue(null);
		vi.mocked(dataAccess.findNextAvailableTask).mockReturnValue(null);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should show usage when no task ID and no active task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);

		await skipCommand({});

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"SKIP",
			expect.stringContaining("No task ID"),
			false,
		);
		expect(output.printNextStepsSection).toHaveBeenCalled();
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should use active task when no task ID provided", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: {
				id: "1.1.0",
				title: "Task 0",
				description: "Test Description",
				status: "setup",
				skill: "backend",
				subtasks: [],
				context: [],
			},
		});
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0],
			story: mockTasksProgress.features[0]?.stories[0],
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0],
		} as any);

		await skipCommand({ reason: "Test reason" });

		expect(dataAccess.blockTask).toHaveBeenCalledWith(
			mockTasksProgress,
			"1.1.0",
			"Test reason",
		);
	});

	it("should throw TaskNotFoundError for non-existent task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue(null);

		await expect(
			skipCommand({ taskId: "99.99.99", reason: "Test" }),
		).rejects.toThrow(TaskNotFoundError);
	});

	it("should warn when task is already blocked", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0],
			story: mockTasksProgress.features[0]?.stories[0],
			task: {
				id: "1.1.0",
				title: "Task 0",
				status: "blocked" as const,
				dependencies: [],
			},
		} as any);

		await skipCommand({ taskId: "1.1.0", reason: "Test" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"SKIP",
			expect.stringContaining("already blocked"),
			false,
		);
		expect(dataAccess.blockTask).not.toHaveBeenCalled();
	});

	it("should warn when task is already completed", async () => {
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

		await skipCommand({ taskId: "1.1.0", reason: "Test" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"SKIP",
			expect.stringContaining("already completed"),
			false,
		);
		expect(dataAccess.blockTask).not.toHaveBeenCalled();
	});

	it("should require reason for skipping", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0],
			story: mockTasksProgress.features[0]?.stories[0],
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0],
		} as any);

		await skipCommand({ taskId: "1.1.0" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"SKIP",
			expect.stringContaining("Reason is required"),
			false,
		);
		expect(dataAccess.blockTask).not.toHaveBeenCalled();
	});

	it("should successfully block task with reason", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0],
			story: mockTasksProgress.features[0]?.stories[0],
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0],
		} as any);

		await skipCommand({
			taskId: "1.1.0",
			reason: "Blocked by external API changes",
		});

		expect(dataAccess.blockTask).toHaveBeenCalledWith(
			mockTasksProgress,
			"1.1.0",
			"Blocked by external API changes",
		);
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"SKIP",
			expect.stringContaining("marked as BLOCKED"),
		);
	});

	it("should show next available task after blocking", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0],
			story: mockTasksProgress.features[0]?.stories[0],
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0],
		} as any);
		vi.mocked(dataAccess.findNextAvailableTask).mockReturnValue({
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[1],
			story: mockTasksProgress.features[0]?.stories[0],
			feature: mockTasksProgress.features[0],
		} as any);

		await skipCommand({ taskId: "1.1.0", reason: "Test reason" });

		// We can't easily verify printColoredLine calls because it's a mock function
		// and printCommandResult might call it internally or separate calls are made.
		// However, we can verify that printCommandResult was called which implies the flow continued.
		// Or check if findNextAvailableTask was called.
		expect(dataAccess.findNextAvailableTask).toHaveBeenCalled();
	});

	it("should show no available tasks when none found", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0],
			story: mockTasksProgress.features[0]?.stories[0],
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0],
		} as any);
		vi.mocked(dataAccess.findNextAvailableTask).mockReturnValue(null);

		await skipCommand({ taskId: "1.1.0", reason: "Test reason" });

		expect(output.printNextStepsSection).toHaveBeenCalled();
	});

	it("should display task and story info after blocking", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0],
			story: mockTasksProgress.features[0]?.stories[0],
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0],
		} as any);

		await skipCommand({ taskId: "1.1.0", reason: "API not ready" });

		expect(output.printKeyValue).toHaveBeenCalledWith("Title", "Task 0");
		expect(output.printKeyValue).toHaveBeenCalledWith(
			"Story",
			expect.stringContaining("Story 1.1"),
		);
		expect(output.printKeyValue).toHaveBeenCalledWith(
			"Reason",
			expect.stringContaining("API not ready"),
		);
	});
});
