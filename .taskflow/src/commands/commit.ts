/**
 * Commit command - Commit and push changes
 *
 * FLOW: Final command in the workflow - commits and pushes changes
 * PRE-HOOK: Checks for active session in 'committing' state, validates last check passed
 * OUTPUT: Commit details and push confirmation
 * NEXT STEPS: Start next available task
 */

import { LOGS_DIR } from "../lib/config";
import {
	cleanupTaskLogs,
	findActiveTask,
	findNextAvailableTask,
	loadTasksProgress,
	updateTaskStatus,
} from "../lib/data-access";
import {
	CommitError,
	InvalidWorkflowStateError,
	NoActiveSessionError,
} from "../lib/errors";
import {
	buildCommitMessage,
	getCurrentBranch,
	gitAdd,
	gitCommit,
	gitPush,
	validateCommitMessageFormat,
} from "../lib/git";
import {
	colors,
	icons,
	printAIWarning,
	printColoredLine,
	printCommandResult,
	printEmptyLine,
	printKeyValue,
	printLine,
	printNextStepsSection,
	printOutputSection,
	printSection,
} from "../lib/output";
import { parseTaskId } from "../lib/types";
import { getFailedCheckLogs, getLastValidationStatus } from "../lib/validation";

export interface CommitOptions {
	message?: string;
}

export async function commitCommand(
	options: CommitOptions = {},
): Promise<void> {
	const tasksProgress = loadTasksProgress();

	// ─────────────────────────────────────────────────────────────────────────
	// PRE-HOOK: Check for active session
	// ─────────────────────────────────────────────────────────────────────────
	const activeTask = findActiveTask(tasksProgress);
	if (!activeTask) {
		throw new NoActiveSessionError();
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRE-HOOK: Verify task is in 'committing' state
	// ─────────────────────────────────────────────────────────────────────────
	const currentStatus = activeTask.content.status;
	if (currentStatus !== "committing") {
		throw new InvalidWorkflowStateError(currentStatus, "committing", "commit");
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRE-HOOK: Verify validations passed
	// ─────────────────────────────────────────────────────────────────────────
	printColoredLine("Running pre-commit safety checks...", colors.info);
	const lastStatus = getLastValidationStatus(activeTask.taskId);

	if (lastStatus?.passed) {
		printColoredLine(
			`${icons.success} Trusted validation from previous "task check". Skipping re-run.`,
			colors.success,
		);
	} else if (lastStatus && !lastStatus.passed) {
		// Validation ran but failed
		printCommandResult(
			"COMMIT",
			"Pre-commit validation failed - Cannot proceed",
			false,
		);
		printOutputSection();
		printColoredLine("Errors found in previous validation run:", colors.error);

		// Print errors from logs
		for (const check of lastStatus.failedChecks) {
			printSection(`Failed Check: ${check}`);
			const logContent = getFailedCheckLogs(activeTask.taskId, check);
			// Print last 20 lines of the log
			const lines = logContent.split("\n");
			const tail = lines.slice(-20).join("\n");
			printColoredLine(tail, colors.muted);
			printColoredLine(
				`... (full log in ${LOGS_DIR}/${activeTask.taskId}_${check}.log)`,
				colors.muted,
			);
		}

		printEmptyLine();

		// Error Recovery Guidance
		printColoredLine("ERROR RECOVERY STEPS", colors.highlight);
		printColoredLine("─".repeat(50), colors.muted);
		printLine("1. Read the error output above carefully");
		printLine(`2. Check full log files in ${LOGS_DIR}/ directory`);
		printLine("3. Fix the specific errors in the files mentioned");
		printLine("4. If this is a NEW error pattern, add to retrospective:");
		printLine(
			'   pnpm task retro add --category "..." --pattern "..." --solution "..." --criticality "..."',
		);
		printLine("5. Re-run: pnpm task check");
		printLine("6. Once passing, retry: pnpm task commit");
		printEmptyLine();

		// Common error patterns
		printColoredLine("COMMON ERROR PATTERNS", colors.highlight);
		printColoredLine("─".repeat(50), colors.muted);
		printLine(
			colors.muted("If you see these errors, check retrospective first:"),
		);
		printLine('  • "Cannot find module" → Check import paths');
		printLine('  • "Property does not exist" → Check types');
		printLine('  • "is not defined" → Check exports');
		printLine(
			"  • Test failures → Review test expectations and implementation",
		);
		printEmptyLine();

		printNextStepsSection([
			{
				cmd: "Fix the errors shown above",
				desc: "Address validation failures in your project source code",
			},
			{
				cmd: "pnpm task check",
				desc: "Re-run validations to verify fixes",
			},
		]);
		printAIWarning();
		return;
	} else {
		// Validation never ran (status is null)
		printCommandResult(
			"COMMIT",
			"No validation status found - Cannot proceed",
			false,
		);
		printOutputSection();
		printColoredLine(
			'You must run "pnpm task check" at least once before committing.',
			colors.error,
		);

		printNextStepsSection([
			{
				cmd: "pnpm task check",
				desc: "Run validations before committing",
			},
		]);
		printAIWarning();
		return;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRE-HOOK: Validate message is provided
	// ─────────────────────────────────────────────────────────────────────────
	const taskId = activeTask.taskId;
	const taskTitle = activeTask.content.title;
	const parsedId = parseTaskId(taskId);
	if (!parsedId) {
		throw new Error(`Invalid task ID format: ${taskId}`);
	}

	const featureId = parsedId.featureId;
	const storyId = parsedId.storyId;

	let finalCommitMessage: string;

	if (options.message) {
		// If the message matches the full format, use it directly (legacy/override support)
		if (validateCommitMessageFormat(options.message)) {
			finalCommitMessage = options.message;
		} else {
			// Otherwise, treat it as the body content (bullet points)
			// and construct the standard header/footer around it
			const bodyLines = options.message
				.split("\n")
				.map((line) => line.trim())
				.filter(Boolean);
			finalCommitMessage = buildCommitMessage(
				"feat",
				featureId,
				taskId,
				taskTitle,
				bodyLines,
				storyId,
			);
		}
	} else {
		// Require a message/body to be passed
		printCommandResult("COMMIT", "No commit message provided", false);
		printOutputSection();

		printColoredLine(
			"Please provide bullet points describing your changes.",
			colors.error,
		);
		printEmptyLine();

		printColoredLine("COMMIT MESSAGE FORMAT", colors.highlight);
		printColoredLine("─".repeat(50), colors.muted);
		printLine(
			"Provide 3-4 bullet points describing your changes in this format:",
		);
		printEmptyLine();
		printLine("  - Technical change 1 (what code was added/modified)");
		printLine("  - Technical change 2 (specific files, functions, APIs)");
		printLine("  - Technical change 3 (configuration, database, etc.)");
		printEmptyLine();

		printColoredLine("EXAMPLES", colors.highlight);
		printColoredLine("─".repeat(50), colors.muted);

		printColoredLine("Example 1 (Backend):", colors.success);
		printLine("  - Added login endpoint with JWT authentication");
		printLine("  - Created session management middleware");
		printLine("  - Updated user entity with auth fields");
		printLine("  - Added login/logout routes to API");
		printEmptyLine();

		printColoredLine("Example 2 (Frontend):", colors.success);
		printLine("  - Created LoginForm component with validation");
		printLine("  - Added authentication context provider");
		printLine("  - Implemented protected route wrapper");
		printLine("  - Updated navigation to show login state");
		printEmptyLine();

		printColoredLine("Example 3 (Database):", colors.success);
		printLine("  - Created users table migration file");
		printLine("  - Added indexes for email and username columns");
		printLine("  - Defined User entity with required fields");
		printLine("  - Added unique constraint on email");
		printEmptyLine();

		printColoredLine("USAGE", colors.highlight);
		printColoredLine("─".repeat(50), colors.muted);
		printLine(`pnpm task commit " - change 1\\n - change 2\\n - change 3"`);
		printEmptyLine();
		printLine(`Or provide full commit message:`);
		printLine(
			`pnpm task commit "feat(F1): T1.1.0 - Title\\n\\n - Change 1\\n - Change 2\\n\\nStory: S1.1"`,
		);

		printNextStepsSection([
			{
				cmd: 'pnpm task commit " - bullet 1\\n - bullet 2\\n - bullet 3"',
				desc: "Provide 3-4 bullet points describing what was changed",
			},
		]);
		printAIWarning();
		return;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// EXECUTE: Commit and push
	// ─────────────────────────────────────────────────────────────────────────
	printEmptyLine();
	printColoredLine(`Committing task ${taskId}...`, colors.info);
	printEmptyLine();
	printSection("Commit Message");
	printLine(finalCommitMessage);
	printEmptyLine();

	// Update status to completed BEFORE commit so it's included in the commit
	// We use a try-catch block to revert status if git operations fail
	try {
		updateTaskStatus(tasksProgress, taskId, "completed");

		try {
			printColoredLine("> git add .", colors.highlight);
			gitAdd(".");
		} catch (error) {
			throw new CommitError(
				"hook_failed",
				error instanceof Error ? error.message : undefined,
			);
		}

		try {
			printColoredLine("> git commit", colors.highlight);
			gitCommit(finalCommitMessage);
		} catch (error) {
			const msg = error instanceof Error ? error.message : String(error);
			if (msg.includes("nothing to commit") || msg.includes("clean")) {
				printColoredLine(
					"Nothing to commit, proceeding to push...",
					colors.muted,
				);
			} else {
				throw new CommitError("hook_failed", msg);
			}
		}

		const currentBranch = getCurrentBranch();
		try {
			printEmptyLine();
			printColoredLine(`> git push origin ${currentBranch}`, colors.highlight);
			gitPush(currentBranch);
			printColoredLine(
				`${icons.success} Pushed to origin/${currentBranch}`,
				colors.success,
			);
		} catch (_error) {
			throw new CommitError(
				"push_failed",
				`Run 'git push origin ${currentBranch}' manually.`,
			);
		}

		// Cleanup logs
		const cleaned = cleanupTaskLogs(LOGS_DIR, taskId);
		if (cleaned > 0) {
			printColoredLine(`Cleaned up ${cleaned} log file(s)`, colors.muted);
		}

		// ─────────────────────────────────────────────────────────────────────────
		// OUTPUT: Task completed successfully
		// ─────────────────────────────────────────────────────────────────────────
		printCommandResult("COMMIT", `Task ${taskId} completed successfully!`);
		printOutputSection();
		printKeyValue("Task ID", colors.task(taskId));
		printKeyValue("Title", taskTitle);
		printKeyValue("Status", colors.success("COMPLETED"));
		printKeyValue("Branch", currentBranch);

		// ─────────────────────────────────────────────────────────────────────────
		// NEXT STEPS: Start next task
		// ─────────────────────────────────────────────────────────────────────────
		// Reload progress to ensure we have the latest state from disk
		const updatedTasksProgress = loadTasksProgress();

		// Show next task suggestion
		const nextTaskInfo = findNextAvailableTask(updatedTasksProgress, taskId);
		if (nextTaskInfo) {
			const { task: nextTask, story: nextStory } = nextTaskInfo;
			printEmptyLine();
			printColoredLine(
				`${icons.target} NEXT AVAILABLE TASK: ${nextTask.id}`,
				colors.successBold,
			);
			printLine(`${colors.muted("Title:")} ${nextTask.title}`);
			printLine(`${colors.muted("Story:")} ${nextStory.title}`);

			printNextStepsSection([
				{
					cmd: `pnpm task start ${nextTask.id}`,
					desc: "Begin the next task",
				},
			]);
		} else {
			printNextStepsSection([
				{
					cmd: "pnpm task next",
					desc: "Find the next available task",
				},
				{
					cmd: "pnpm task status",
					desc: "View overall project progress",
				},
			]);
		}
	} catch (error) {
		// Revert status to committing if anything fails
		// This ensures findActiveTask can still find it for retry
		updateTaskStatus(tasksProgress, taskId, "committing");
		throw error;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// AI AGENT REMINDER
	// ─────────────────────────────────────────────────────────────────────────
	printAIWarning();
}
