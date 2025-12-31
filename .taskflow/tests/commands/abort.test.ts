import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { abortCommand } from "../../src/commands/abort";
import * as dataAccess from "../../src/lib/data-access";
import { NoActiveSessionError } from "../../src/lib/errors";
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
		successBold: (s: string) => `[successBold]${s}[/successBold]`,
		task: (s: string) => `[task]${s}[/task]`,
		state: (s: string) => `[state]${s}[/state]`,
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
	printCommandResult: vi.fn(),
	printOutputSection: vi.fn(),
	printNextStepsSection: vi.fn(),
	printAIWarning: vi.fn(),
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

describe("abortCommand", () => {
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
		vi.mocked(dataAccess.updateTaskStatus).mockReturnValue(null);
		vi.mocked(dataAccess.getTaskFilePath).mockReturnValue("/path/to/task.json");
		vi.mocked(dataAccess.loadTaskFile).mockReturnValue({
			id: "1.1.0",
			title: "Task 0",
			description: "Test task",
			status: "implementing" as const,
			skill: "backend" as const,
			subtasks: [],
			context: [],
		});
		vi.mocked(dataAccess.saveTaskFile).mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should throw NoActiveSessionError when no active task", async () => {
		await expect(abortCommand()).rejects.toThrow(NoActiveSessionError);
	});

	it("should reset active task to not-started", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: { title: "Test", status: "implementing" } as any,
		});

		await abortCommand();

		expect(dataAccess.updateTaskStatus).toHaveBeenCalledWith(
			mockTasksProgress,
			"1.1.0",
			"not-started",
		);
	});

	it("should clear workflow state from task file", async () => {
		const mockContent = {
			id: "1.1.0",
			title: "Task 0",
			description: "Test task",
			status: "implementing" as const,
			skill: "backend" as const,
			subtasks: [],
			context: [],
		};
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: mockContent,
		});
		vi.mocked(dataAccess.loadTaskFile).mockReturnValue(mockContent);

		await abortCommand();

		expect(dataAccess.loadTaskFile).toHaveBeenCalledWith("/path/to/task.json");
		expect(dataAccess.saveTaskFile).toHaveBeenCalledWith("/path/to/task.json", {
			...mockContent,
			status: "not-started",
		});
	});

	it("should print abort result with correct information", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: { title: "Test", status: "implementing" } as any,
		});

		await abortCommand();

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"ABORT",
			expect.stringContaining("1.1.0"),
		);
		expect(output.printOutputSection).toHaveBeenCalled();
		expect(output.printKeyValue).toHaveBeenCalledWith(
			"Task ID",
			"[task]1.1.0[/task]",
		);
		expect(output.printKeyValue).toHaveBeenCalledWith("Title", "Test");
		expect(output.printKeyValue).toHaveBeenCalledWith(
			"Previous Status",
			"[state]implementing[/state]",
		);
		expect(output.printKeyValue).toHaveBeenCalledWith(
			"New Status",
			"[state]not-started[/state]",
		);
		expect(output.printKeyValue).toHaveBeenCalledWith(
			"Reason",
			"Task abandoned by user",
		);
	});

	it("should show next steps to find another task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: { title: "Test", status: "implementing" } as any,
		});

		await abortCommand();

		expect(output.printNextStepsSection).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ cmd: "pnpm task next" }),
			]),
		);
	});

	it("should print AI warning", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: { title: "Test", status: "implementing" } as any,
		});

		await abortCommand();

		expect(output.printAIWarning).toHaveBeenCalled();
	});
});
