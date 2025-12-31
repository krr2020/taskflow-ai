/**
 * Custom error classes for the taskflow system
 */

// ============================================================================
// Base Error
// ============================================================================

export class TaskflowError extends Error {
	constructor(
		message: string,
		public readonly code: string,
		public readonly recoveryHint?: string,
	) {
		super(message);
		this.name = "TaskflowError";
		Error.captureStackTrace(this, this.constructor);
	}
}

// ============================================================================
// Specific Error Types
// ============================================================================

export class TaskNotFoundError extends TaskflowError {
	constructor(taskId: string) {
		super(
			`Task ${taskId} not found`,
			"TASK_NOT_FOUND",
			`Run 'pnpm task next' to find available tasks.`,
		);
		this.name = "TaskNotFoundError";
	}
}

export class StoryNotFoundError extends TaskflowError {
	constructor(storyId: string) {
		super(
			`Story ${storyId} not found`,
			"STORY_NOT_FOUND",
			`Run 'pnpm task status' to view project overview.`,
		);
		this.name = "StoryNotFoundError";
	}
}

export class FeatureNotFoundError extends TaskflowError {
	constructor(featureId: string) {
		super(
			`Feature ${featureId} not found`,
			"FEATURE_NOT_FOUND",
			`Run 'pnpm task status' to view project overview.`,
		);
		this.name = "FeatureNotFoundError";
	}
}

export class NoActiveSessionError extends TaskflowError {
	constructor() {
		super(
			"No active task session",
			"NO_ACTIVE_SESSION",
			`Run 'pnpm task start <id>' to start a new task session.`,
		);
		this.name = "NoActiveSessionError";
	}
}

export class ActiveSessionExistsError extends TaskflowError {
	constructor(taskId: string) {
		super(
			`Another task is already active (${taskId})`,
			"ACTIVE_SESSION_EXISTS",
			`Complete the current task with 'pnpm task commit' (or mark as blocked) before starting a new one.`,
		);
		this.name = "ActiveSessionExistsError";
	}
}

export class WrongBranchError extends TaskflowError {
	constructor(
		public readonly currentBranch: string,
		public readonly expectedBranch: string,
		public readonly switchCommand: string,
	) {
		super(
			`Wrong branch: current is '${currentBranch}', expected '${expectedBranch}'`,
			"WRONG_BRANCH",
			`Run: ${switchCommand}`,
		);
		this.name = "WrongBranchError";
	}
}

export class InvalidWorkflowStateError extends TaskflowError {
	constructor(currentStatus: string, requiredStatus: string, action: string) {
		super(
			`Cannot ${action} in status '${currentStatus}'. Required status: '${requiredStatus}'`,
			"INVALID_STATUS",
			`Run 'pnpm task check' to advance to the required status.`,
		);
		this.name = "InvalidWorkflowStateError";
	}
}

export class ValidationFailedError extends TaskflowError {
	constructor(
		public readonly failedChecks: string[],
		public readonly logDir: string,
	) {
		super(
			`Validation failed: ${failedChecks.join(", ")}`,
			"VALIDATION_FAILED",
			`Fix the errors and run 'pnpm task check' again. Full logs: ${logDir}`,
		);
		this.name = "ValidationFailedError";
	}
}

export class GitOperationError extends TaskflowError {
	constructor(operation: string, details?: string) {
		super(
			`Git ${operation} failed${details ? `: ${details}` : ""}`,
			"GIT_OPERATION_FAILED",
			`Check git status and resolve any issues before retrying.`,
		);
		this.name = "GitOperationError";
	}
}

export class CommitError extends TaskflowError {
	constructor(
		reason: "no_changes" | "hook_failed" | "push_failed",
		details?: string,
	) {
		const messages = {
			no_changes: "No changes to commit",
			hook_failed: "Pre-commit hook failed",
			push_failed: `Push failed${details ? `: ${details}` : ""}`,
		};
		const hints = {
			no_changes: `Run 'git status' to check for changes.`,
			hook_failed: `Fix the issues reported by the hook and run 'pnpm task commit' again.`,
			push_failed: `Commit succeeded but push failed. Run 'pnpm task commit' to retry push.`,
		};
		super(messages[reason], "COMMIT_FAILED", hints[reason]);
		this.name = "CommitError";
	}
}

export class InvalidCommitMessageError extends TaskflowError {
	constructor(
		public readonly providedMessage: string,
		public readonly expectedFormat: string,
	) {
		super(
			"Invalid commit message format",
			"INVALID_COMMIT_MESSAGE",
			`Expected format: ${expectedFormat}`,
		);
		this.name = "InvalidCommitMessageError";
	}
}

export class TaskAlreadyCompletedError extends TaskflowError {
	constructor(taskId: string) {
		super(
			`Task ${taskId} is already completed`,
			"TASK_ALREADY_COMPLETED",
			`Run 'pnpm task next' to find the next available task.`,
		);
		this.name = "TaskAlreadyCompletedError";
	}
}

export class TaskBlockedError extends TaskflowError {
	constructor(
		taskId: string,
		public readonly reason: string,
	) {
		super(
			`Task ${taskId} is blocked: ${reason}`,
			"TASK_BLOCKED",
			`Resolve the blocking issue first.`,
		);
		this.name = "TaskBlockedError";
	}
}

export class StoryInProgressError extends TaskflowError {
	constructor(currentStoryId: string, requestedStoryId: string) {
		super(
			`Cannot start task from story ${requestedStoryId} while story ${currentStoryId} is in progress`,
			"STORY_IN_PROGRESS",
			`Complete all tasks in the current story before starting a new one.`,
		);
		this.name = "StoryInProgressError";
	}
}

export class DependencyNotMetError extends TaskflowError {
	constructor(
		taskId: string,
		public readonly unmetDependencies: string[],
	) {
		super(
			`Task ${taskId} has unmet dependencies: ${unmetDependencies.join(", ")}`,
			"DEPENDENCY_NOT_MET",
			`Complete the dependent tasks first.`,
		);
		this.name = "DependencyNotMetError";
	}
}

export class FileNotFoundError extends TaskflowError {
	constructor(filePath: string) {
		super(
			`File not found: ${filePath}`,
			"FILE_NOT_FOUND",
			`Verify the file path exists.`,
		);
		this.name = "FileNotFoundError";
	}
}

export class InvalidFileFormatError extends TaskflowError {
	constructor(
		filePath: string,
		public readonly parseError: string,
	) {
		super(
			`Invalid file format in ${filePath}: ${parseError}`,
			"INVALID_FILE_FORMAT",
			`Check the file for JSON syntax errors or missing required fields.`,
		);
		this.name = "InvalidFileFormatError";
	}
}

export class NoSubtasksCompletedError extends TaskflowError {
	constructor(taskId: string) {
		super(
			`Cannot auto-generate commit message: No completed subtasks found for task ${taskId}`,
			"NO_SUBTASKS_COMPLETED",
			`Run 'pnpm task check' to validate and complete subtasks, or provide a custom commit message.`,
		);
		this.name = "NoSubtasksCompletedError";
	}
}

// ============================================================================
// Error Helpers
// ============================================================================

export function isTaskflowError(error: unknown): error is TaskflowError {
	return error instanceof TaskflowError;
}

export function formatError(error: unknown): string {
	if (isTaskflowError(error)) {
		let msg = `${error.name}: ${error.message}`;
		if (error.recoveryHint) {
			msg += `\nHint: ${error.recoveryHint}`;
		}
		return msg;
	}
	if (error instanceof Error) {
		return error.message;
	}
	return String(error);
}
