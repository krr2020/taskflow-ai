import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { backCommand } from "../../src/commands/back";
import * as dataAccess from "../../src/lib/data-access";
import { NoActiveSessionError } from "../../src/lib/errors";
import * as output from "../../src/lib/output";

vi.mock("../../src/lib/data-access");

vi.mock("../../src/lib/output", () => ({
	colors: {
		success: (s: string) => `[success]${s}[/success]`,
		error: (s: string) => `[error]${s}[/error]`,
		warning: (s: string) => `[warning]${s}[/warning]`,
		info: (s: string) => `[info]${s}[/info]`,
		highlight: (s: string) => `[highlight]${s}[/highlight]`,
		muted: (s: string) => `[muted]${s}[/muted]`,
		command: (s: string) => `[command]${s}[/command]`,
		task: (s: string) => `[task]${s}[/task]`,
		state: (s: string) => `[state]${s}[/state]`,
		successBold: (s: string) => `[successBold]${s}[/successBold]`,
		errorBold: (s: string) => `[errorBold]${s}[/errorBold]`,
		warningBold: (s: string) => `[warningBold]${s}[/warningBold]`,
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
	printLine: vi.fn(),
}));

const mockTasksProgress = {
	project: "test-project",
	features: [
		{
			id: "1",
			title: "Feature 1",
			status: "in-progress" as const,
			stories: [
				{
					id: "1.1",
					title: "Story 1",
					status: "in-progress" as const,
					tasks: [
						{
							id: "1.1.0",
							title: "Task 0",
							status: "implementing" as const,
							dependencies: [],
						},
					],
				},
			],
		},
	],
};

const createMockActiveTask = (status: string) => ({
	taskId: "1.1.0",
	filePath: "/path/to/task.json",
	content: {
		id: "1.1.0",
		title: "Task 0",
		description: "Test task description",
		status: status as any,
		skill: "backend" as const,
		subtasks: [],
		context: [],
	},
});

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, "log").mockImplementation(() => {});
	vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(mockTasksProgress);
	vi.mocked(dataAccess.updateTaskStatus).mockReturnValue(null);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("backCommand", () => {
	it("should throw NoActiveSessionError when no active task exists", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);

		await expect(backCommand()).rejects.toThrow(NoActiveSessionError);
	});

	it("should revert from implementing to setup", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("implementing"),
		);

		await backCommand();

		expect(dataAccess.updateTaskStatus).toHaveBeenCalledWith(
			mockTasksProgress,
			"1.1.0",
			"setup",
		);
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"BACK",
			"Reverted to SETUP",
		);
		expect(output.printKeyValue).toHaveBeenCalledWith(
			"Task ID",
			"[task]1.1.0[/task]",
		);
		expect(output.printKeyValue).toHaveBeenCalledWith(
			"Previous State",
			"[state]implementing[/state]",
		);
		expect(output.printKeyValue).toHaveBeenCalledWith(
			"New State",
			"[state]setup[/state]",
		);
	});

	it("should revert from verifying to implementing", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("verifying"),
		);

		await backCommand();

		expect(dataAccess.updateTaskStatus).toHaveBeenCalledWith(
			mockTasksProgress,
			"1.1.0",
			"implementing",
		);
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"BACK",
			"Reverted to IMPLEMENTING",
		);
	});

	it("should revert from validating to verifying", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("validating"),
		);

		await backCommand();

		expect(dataAccess.updateTaskStatus).toHaveBeenCalledWith(
			mockTasksProgress,
			"1.1.0",
			"verifying",
		);
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"BACK",
			"Reverted to VERIFYING",
		);
	});

	it("should revert from committing to validating", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("committing"),
		);

		await backCommand();

		expect(dataAccess.updateTaskStatus).toHaveBeenCalledWith(
			mockTasksProgress,
			"1.1.0",
			"validating",
		);
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"BACK",
			"Reverted to VALIDATING",
		);
	});

	it("should not allow going back from setup state", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("setup"),
		);

		await backCommand();

		expect(dataAccess.updateTaskStatus).not.toHaveBeenCalled();
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"BACK",
			"No previous state available",
			false,
		);
		expect(output.printColoredLine).toHaveBeenCalledWith(
			"Already at earliest state: setup",
			expect.anything(),
		);
	});

	it("should not allow going back from completed state", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("completed"),
		);

		await backCommand();

		expect(dataAccess.updateTaskStatus).not.toHaveBeenCalled();
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"BACK",
			"Cannot go back from terminal state",
			false,
		);
		expect(output.printColoredLine).toHaveBeenCalledWith(
			"Current status: completed",
			expect.anything(),
		);
	});

	it("should not allow going back from not-started state", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("not-started"),
		);

		await backCommand();

		expect(dataAccess.updateTaskStatus).not.toHaveBeenCalled();
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"BACK",
			"Cannot go back from terminal state",
			false,
		);
	});

	it("should not allow going back from blocked state", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("blocked"),
		);

		await backCommand();

		expect(dataAccess.updateTaskStatus).not.toHaveBeenCalled();
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"BACK",
			"Cannot go back from terminal state",
			false,
		);
	});

	it("should always print AI warning at the end", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("implementing"),
		);

		await backCommand();

		expect(output.printAIWarning).toHaveBeenCalled();
	});
});
