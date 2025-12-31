import { describe, expect, it } from "vitest";
import {
	ActiveSessionExistsError,
	CommitError,
	DependencyNotMetError,
	FeatureNotFoundError,
	FileNotFoundError,
	formatError,
	GitOperationError,
	InvalidCommitMessageError,
	InvalidFileFormatError,
	InvalidWorkflowStateError,
	isTaskflowError,
	NoActiveSessionError,
	NoSubtasksCompletedError,
	StoryInProgressError,
	StoryNotFoundError,
	TaskAlreadyCompletedError,
	TaskBlockedError,
	TaskflowError,
	TaskNotFoundError,
	ValidationFailedError,
	WrongBranchError,
} from "../../src/lib/errors";

describe("errors", () => {
	describe("TaskflowError", () => {
		it("should create error with message and code", () => {
			const error = new TaskflowError("Test message", "TEST_CODE");
			expect(error.message).toBe("Test message");
			expect(error.code).toBe("TEST_CODE");
			expect(error.name).toBe("TaskflowError");
			expect(error.recoveryHint).toBeUndefined();
		});

		it("should create error with recovery hint", () => {
			const error = new TaskflowError("Test", "TEST", "Try this to fix");
			expect(error.recoveryHint).toBe("Try this to fix");
		});

		it("should be an instance of Error", () => {
			const error = new TaskflowError("Test", "TEST");
			expect(error).toBeInstanceOf(Error);
			expect(error).toBeInstanceOf(TaskflowError);
		});
	});

	describe("TaskNotFoundError", () => {
		it("should create error with task ID", () => {
			const error = new TaskNotFoundError("1.1.1");
			expect(error.message).toBe("Task 1.1.1 not found");
			expect(error.code).toBe("TASK_NOT_FOUND");
			expect(error.name).toBe("TaskNotFoundError");
			expect(error.recoveryHint).toContain("pnpm task next");
		});
	});

	describe("StoryNotFoundError", () => {
		it("should create error with story ID", () => {
			const error = new StoryNotFoundError("1.1");
			expect(error.message).toBe("Story 1.1 not found");
			expect(error.code).toBe("STORY_NOT_FOUND");
			expect(error.name).toBe("StoryNotFoundError");
		});
	});

	describe("FeatureNotFoundError", () => {
		it("should create error with feature ID", () => {
			const error = new FeatureNotFoundError("1");
			expect(error.message).toBe("Feature 1 not found");
			expect(error.code).toBe("FEATURE_NOT_FOUND");
			expect(error.name).toBe("FeatureNotFoundError");
		});
	});

	describe("NoActiveSessionError", () => {
		it("should create error with default message", () => {
			const error = new NoActiveSessionError();
			expect(error.message).toBe("No active task session");
			expect(error.code).toBe("NO_ACTIVE_SESSION");
			expect(error.name).toBe("NoActiveSessionError");
			expect(error.recoveryHint).toContain("pnpm task start");
		});
	});

	describe("ActiveSessionExistsError", () => {
		it("should create error with active task ID", () => {
			const error = new ActiveSessionExistsError("1.1.1");
			expect(error.message).toContain("1.1.1");
			expect(error.code).toBe("ACTIVE_SESSION_EXISTS");
			expect(error.name).toBe("ActiveSessionExistsError");
			expect(error.recoveryHint).toContain("pnpm task commit");
		});
	});

	describe("WrongBranchError", () => {
		it("should create error with branch info", () => {
			const error = new WrongBranchError(
				"main",
				"story/S1.1-test",
				"git checkout story/S1.1-test",
			);
			expect(error.message).toContain("main");
			expect(error.message).toContain("story/S1.1-test");
			expect(error.code).toBe("WRONG_BRANCH");
			expect(error.name).toBe("WrongBranchError");
			expect(error.currentBranch).toBe("main");
			expect(error.expectedBranch).toBe("story/S1.1-test");
			expect(error.switchCommand).toBe("git checkout story/S1.1-test");
		});
	});

	describe("InvalidWorkflowStateError", () => {
		it("should create error with status info", () => {
			const error = new InvalidWorkflowStateError(
				"implementing",
				"committing",
				"commit",
			);
			expect(error.message).toContain("implementing");
			expect(error.message).toContain("committing");
			expect(error.message).toContain("commit");
			expect(error.code).toBe("INVALID_STATUS");
			expect(error.name).toBe("InvalidWorkflowStateError");
		});
	});

	describe("ValidationFailedError", () => {
		it("should create error with failed checks", () => {
			const error = new ValidationFailedError(["type-check", "lint"], "/logs");
			expect(error.message).toContain("type-check");
			expect(error.message).toContain("lint");
			expect(error.code).toBe("VALIDATION_FAILED");
			expect(error.name).toBe("ValidationFailedError");
			expect(error.failedChecks).toEqual(["type-check", "lint"]);
			expect(error.logDir).toBe("/logs");
		});
	});

	describe("GitOperationError", () => {
		it("should create error with operation name", () => {
			const error = new GitOperationError("push");
			expect(error.message).toBe("Git push failed");
			expect(error.code).toBe("GIT_OPERATION_FAILED");
			expect(error.name).toBe("GitOperationError");
		});

		it("should include details if provided", () => {
			const error = new GitOperationError("commit", "No changes");
			expect(error.message).toBe("Git commit failed: No changes");
		});
	});

	describe("CommitError", () => {
		it("should create error for no changes", () => {
			const error = new CommitError("no_changes");
			expect(error.message).toBe("No changes to commit");
			expect(error.code).toBe("COMMIT_FAILED");
			expect(error.name).toBe("CommitError");
			expect(error.recoveryHint).toContain("git status");
		});

		it("should create error for hook failed", () => {
			const error = new CommitError("hook_failed");
			expect(error.message).toBe("Pre-commit hook failed");
			expect(error.recoveryHint).toContain("Fix the issues");
		});

		it("should create error for push failed", () => {
			const error = new CommitError("push_failed", "Network error");
			expect(error.message).toContain("Push failed");
			expect(error.message).toContain("Network error");
			expect(error.recoveryHint).toContain("pnpm task commit");
		});
	});

	describe("InvalidCommitMessageError", () => {
		it("should create error with message details", () => {
			const error = new InvalidCommitMessageError(
				"bad message",
				"feat(F1): T1.1.1 - Title",
			);
			expect(error.message).toBe("Invalid commit message format");
			expect(error.code).toBe("INVALID_COMMIT_MESSAGE");
			expect(error.name).toBe("InvalidCommitMessageError");
			expect(error.providedMessage).toBe("bad message");
			expect(error.expectedFormat).toBe("feat(F1): T1.1.1 - Title");
		});
	});

	describe("TaskAlreadyCompletedError", () => {
		it("should create error with task ID", () => {
			const error = new TaskAlreadyCompletedError("1.1.1");
			expect(error.message).toContain("1.1.1");
			expect(error.message).toContain("already completed");
			expect(error.code).toBe("TASK_ALREADY_COMPLETED");
			expect(error.name).toBe("TaskAlreadyCompletedError");
		});
	});

	describe("TaskBlockedError", () => {
		it("should create error with task ID and reason", () => {
			const error = new TaskBlockedError("1.1.1", "Waiting for API");
			expect(error.message).toContain("1.1.1");
			expect(error.message).toContain("Waiting for API");
			expect(error.code).toBe("TASK_BLOCKED");
			expect(error.name).toBe("TaskBlockedError");
			expect(error.reason).toBe("Waiting for API");
		});
	});

	describe("StoryInProgressError", () => {
		it("should create error with story IDs", () => {
			const error = new StoryInProgressError("1.1", "1.2");
			expect(error.message).toContain("1.1");
			expect(error.message).toContain("1.2");
			expect(error.code).toBe("STORY_IN_PROGRESS");
			expect(error.name).toBe("StoryInProgressError");
		});
	});

	describe("DependencyNotMetError", () => {
		it("should create error with dependencies", () => {
			const error = new DependencyNotMetError("1.1.2", ["1.1.0", "1.1.1"]);
			expect(error.message).toContain("1.1.2");
			expect(error.message).toContain("1.1.0");
			expect(error.message).toContain("1.1.1");
			expect(error.code).toBe("DEPENDENCY_NOT_MET");
			expect(error.name).toBe("DependencyNotMetError");
			expect(error.unmetDependencies).toEqual(["1.1.0", "1.1.1"]);
		});
	});

	describe("FileNotFoundError", () => {
		it("should create error with file path", () => {
			const error = new FileNotFoundError("/path/to/file.json");
			expect(error.message).toContain("/path/to/file.json");
			expect(error.code).toBe("FILE_NOT_FOUND");
			expect(error.name).toBe("FileNotFoundError");
		});
	});

	describe("InvalidFileFormatError", () => {
		it("should create error with file path and parse error", () => {
			const error = new InvalidFileFormatError(
				"/path/to/file.json",
				"Invalid JSON",
			);
			expect(error.message).toContain("/path/to/file.json");
			expect(error.message).toContain("Invalid JSON");
			expect(error.code).toBe("INVALID_FILE_FORMAT");
			expect(error.name).toBe("InvalidFileFormatError");
			expect(error.parseError).toBe("Invalid JSON");
		});
	});

	describe("NoSubtasksCompletedError", () => {
		it("should create error with task ID", () => {
			const error = new NoSubtasksCompletedError("1.1.1");
			expect(error.message).toContain("1.1.1");
			expect(error.message).toContain("No completed subtasks");
			expect(error.code).toBe("NO_SUBTASKS_COMPLETED");
			expect(error.name).toBe("NoSubtasksCompletedError");
		});
	});

	describe("isTaskflowError", () => {
		it("should return true for TaskflowError instances", () => {
			expect(isTaskflowError(new TaskflowError("Test", "TEST"))).toBe(true);
			expect(isTaskflowError(new TaskNotFoundError("1.1.1"))).toBe(true);
			expect(isTaskflowError(new NoActiveSessionError())).toBe(true);
		});

		it("should return false for other errors", () => {
			expect(isTaskflowError(new Error("Regular error"))).toBe(false);
			expect(isTaskflowError(new TypeError("Type error"))).toBe(false);
			expect(isTaskflowError("string error")).toBe(false);
			expect(isTaskflowError(null)).toBe(false);
			expect(isTaskflowError(undefined)).toBe(false);
		});
	});

	describe("formatError", () => {
		it("should format TaskflowError with hint", () => {
			const error = new TaskNotFoundError("1.1.1");
			const formatted = formatError(error);
			expect(formatted).toContain("TaskNotFoundError");
			expect(formatted).toContain("Task 1.1.1 not found");
			expect(formatted).toContain("Hint:");
		});

		it("should format TaskflowError without hint", () => {
			const error = new TaskflowError("Test message", "TEST");
			const formatted = formatError(error);
			expect(formatted).toContain("TaskflowError");
			expect(formatted).toContain("Test message");
			expect(formatted).not.toContain("Hint:");
		});

		it("should format regular Error", () => {
			const error = new Error("Regular error");
			const formatted = formatError(error);
			expect(formatted).toBe("Regular error");
		});

		it("should format non-Error values", () => {
			expect(formatError("string error")).toBe("string error");
			expect(formatError(123)).toBe("123");
			expect(formatError(null)).toBe("null");
		});
	});
});
