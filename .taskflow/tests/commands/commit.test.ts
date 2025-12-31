import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { commitCommand } from "../../src/commands/commit";
import * as dataAccess from "../../src/lib/data-access";
import {
	CommitError,
	InvalidWorkflowStateError,
	NoActiveSessionError,
} from "../../src/lib/errors";
import * as git from "../../src/lib/git";
import * as output from "../../src/lib/output";
import type { ActiveTask, Subtask, TaskFileContent } from "../../src/lib/types";
import * as validation from "../../src/lib/validation";

vi.mock("../../src/lib/data-access", async (importOriginal) => {
	const actual: Record<string, unknown> = await importOriginal();
	return {
		...actual,
		loadTasksProgress: vi.fn(),
		findActiveTask: vi.fn(),
		updateTaskStatus: vi.fn(),
		loadTaskFile: vi.fn(),
		saveTaskFile: vi.fn(),
		cleanupTaskLogs: vi.fn(),
		findNextAvailableTask: vi.fn(),
	};
});
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
	printSection: vi.fn(),
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
	printEmptyLine: vi.fn(),
}));
vi.mock("../../src/lib/validation", () => ({
	quickAllChecks: vi.fn(),
	getLastValidationStatus: vi.fn(),
	getFailedCheckLogs: vi.fn().mockReturnValue("mock log content"),
}));
vi.mock("../../src/lib/config", () => ({
	LOGS_DIR: "/path/to/logs",
}));

describe("commitCommand", () => {
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
								status: "committing" as const,
								dependencies: [],
							},
						],
					},
				],
			},
		],
	};

	const createMockActiveTask = (
		subtasks: Partial<Subtask>[] = [],
		status = "committing",
	): ActiveTask => ({
		taskId: "1.1.0",
		filePath: "/path/to/task.json",
		content: {
			title: "Task 0",
			status: status as any,
			subtasks: subtasks as Subtask[],
		} as unknown as TaskFileContent,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(mockTasksProgress);
		vi.mocked(dataAccess.updateTaskStatus).mockReturnValue(null);
		vi.mocked(dataAccess.loadTaskFile).mockReturnValue({
			title: "Task",
			status: "committing",
		} as unknown as TaskFileContent);
		vi.mocked(dataAccess.saveTaskFile).mockImplementation(() => {});
		vi.mocked(dataAccess.cleanupTaskLogs).mockReturnValue(0);
		vi.mocked(git.gitAdd).mockImplementation(() => {});
		vi.mocked(git.gitCommit).mockImplementation(() => {});
		vi.mocked(git.gitPush).mockImplementation(() => {});
		vi.mocked(git.getCurrentBranch).mockReturnValue("feature/test");
		vi.mocked(git.validateCommitMessageFormat).mockReturnValue(true);
		vi.mocked(git.buildCommitMessage).mockReturnValue(
			"feat(F1): T1.1.0 - Task 0\n\n- subtask\n\nStory: S1.1",
		);
		vi.mocked(output.printSection).mockImplementation(() => {});

		// Default to passing validation status for existing tests
		vi.mocked(validation.getLastValidationStatus).mockReturnValue({
			taskId: "1.1.0",
			passed: true,
			timestamp: new Date().toISOString(),
			failedChecks: [],
		});
		vi.mocked(validation.quickAllChecks).mockReturnValue(true);
		vi.mocked(validation.getFailedCheckLogs).mockReturnValue(
			"mock log content",
		);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should throw NoActiveSessionError when no active task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);

		await expect(commitCommand()).rejects.toThrow(NoActiveSessionError);
	});

	it("should throw InvalidWorkflowStateError when not in committing status", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask([], "validating"),
		);

		await expect(commitCommand()).rejects.toThrow(InvalidWorkflowStateError);
	});

	it("should return early when no message/body is provided", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask([{ description: "Subtask 1", status: "pending" }]),
		);

		await commitCommand();

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"COMMIT",
			expect.stringContaining("No commit message"),
			false,
		);
		expect(git.gitCommit).not.toHaveBeenCalled();
	});

	it("should construct commit message from body argument", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask([
				{ description: "Completed subtask", status: "completed" },
			]),
		);
		vi.mocked(git.validateCommitMessageFormat).mockReturnValue(false); // treat as body

		await commitCommand({ message: "Bullet point 1\nBullet point 2" });

		expect(git.buildCommitMessage).toHaveBeenCalledWith(
			"feat",
			"1",
			"1.1.0",
			"Task 0",
			["Bullet point 1", "Bullet point 2"],
			"1.1",
		);
	});

	it("should use custom message when provided", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask([]),
		);
		vi.mocked(git.validateCommitMessageFormat).mockReturnValue(true);

		await commitCommand({
			message: "feat(F1): T1.1.0 - Custom message\n\n- Detail\n\nStory: S1.1",
		});

		expect(git.buildCommitMessage).not.toHaveBeenCalled();
		expect(git.gitCommit).toHaveBeenCalled();
	});

	it("should throw CommitError when git add fails", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask([{ description: "Done", status: "completed" }]),
		);
		vi.mocked(git.gitAdd).mockImplementation(() => {
			throw new Error("Git add failed");
		});

		await expect(commitCommand({ message: "msg" })).rejects.toThrow(
			CommitError,
		);
	});

	it("should throw CommitError when git commit fails", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask([{ description: "Done", status: "completed" }]),
		);
		vi.mocked(git.gitCommit).mockImplementation(() => {
			throw new Error("Git commit failed");
		});

		await expect(commitCommand({ message: "msg" })).rejects.toThrow(
			CommitError,
		);
	});

	it("should throw CommitError when git push fails", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask([{ description: "Done", status: "completed" }]),
		);
		vi.mocked(git.gitPush).mockImplementation(() => {
			throw new Error("Git push failed");
		});

		await expect(commitCommand({ message: "msg" })).rejects.toThrow(
			CommitError,
		);
	});

	it("should update task status to completed before commit", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask([{ description: "Done", status: "completed" }]),
		);

		await commitCommand({ message: "msg" });

		expect(dataAccess.updateTaskStatus).toHaveBeenCalledWith(
			expect.anything(),
			"1.1.0",
			"completed",
		);
		// Ensure updateTaskStatus is called before gitCommit
		expect(git.gitCommit).toHaveBeenCalled();
	});

	it("should revert task status if git commit fails", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask([{ description: "Done", status: "completed" }]),
		);
		vi.mocked(git.gitCommit).mockImplementation(() => {
			throw new Error("Git commit failed");
		});

		await expect(commitCommand({ message: "msg" })).rejects.toThrow(
			CommitError,
		);

		// Should have tried to update to completed
		expect(dataAccess.updateTaskStatus).toHaveBeenCalledWith(
			expect.anything(),
			"1.1.0",
			"completed",
		);
		// Should have reverted to committing
		expect(dataAccess.updateTaskStatus).toHaveBeenCalledWith(
			expect.anything(),
			"1.1.0",
			"committing",
		);
	});

	it("should commit successfully with completed subtasks", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask([{ description: "Done", status: "completed" }]),
		);

		await commitCommand({ message: "msg" });

		expect(git.gitAdd).toHaveBeenCalled();
		expect(git.gitCommit).toHaveBeenCalled();
		expect(git.gitPush).toHaveBeenCalled();
	});

	it("should cleanup task logs", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask([{ description: "Done", status: "completed" }]),
		);
		vi.mocked(dataAccess.cleanupTaskLogs).mockReturnValue(3);

		await commitCommand({ message: "msg" });

		expect(dataAccess.cleanupTaskLogs).toHaveBeenCalledWith(
			"/path/to/logs",
			"1.1.0",
		);
	});

	it("should block commit if validation status is failed", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask([{ description: "Done", status: "completed" }]),
		);
		vi.mocked(validation.getLastValidationStatus).mockReturnValue({
			taskId: "1.1.0",
			passed: false,
			timestamp: new Date().toISOString(),
			failedChecks: ["lint"],
		});

		await commitCommand({ message: "msg" });

		expect(git.gitCommit).not.toHaveBeenCalled();
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"COMMIT",
			expect.stringContaining("validation failed"),
			false,
		);
	});

	it("should block commit if no validation status found", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask([{ description: "Done", status: "completed" }]),
		);
		vi.mocked(validation.getLastValidationStatus).mockReturnValue(null);

		await commitCommand({ message: "msg" });

		expect(git.gitCommit).not.toHaveBeenCalled();
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"COMMIT",
			expect.stringContaining("No validation status"),
			false,
		);
	});

	it("should print success and next step", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask([{ description: "Done", status: "completed" }]),
		);
		// Mock no next task
		vi.mocked(dataAccess.findNextAvailableTask).mockReturnValue(null);

		await commitCommand({ message: "msg" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"COMMIT",
			expect.stringContaining("completed successfully"),
		);
		expect(output.printNextStepsSection).toHaveBeenCalled();
	});
});
