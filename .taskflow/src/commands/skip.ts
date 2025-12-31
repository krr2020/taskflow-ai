/**
 * Skip command - Mark a task as blocked with a reason
 *
 * FLOW: Recovery command - used to skip/block a task
 * PRE-HOOK: Validates task exists and is not completed
 * OUTPUT: Task blocked confirmation
 * NEXT STEPS: Start the next available task
 */

import {
	blockTask,
	findActiveTask,
	findNextAvailableTask,
	findTaskLocation,
	loadTasksProgress,
} from "../lib/data-access";
import { TaskNotFoundError } from "../lib/errors";
import {
	colors,
	printAIWarning,
	printColoredLine,
	printCommandResult,
	printEmptyLine,
	printKeyValue,
	printLine,
	printNextStepsSection,
	printOutputSection,
} from "../lib/output";

export interface SkipOptions {
	taskId?: string;
	reason?: string;
}

export async function skipCommand(options: SkipOptions = {}): Promise<void> {
	const tasksProgress = loadTasksProgress();

	// If no taskId provided, try to skip the active task
	let targetTaskId = options.taskId;

	if (!targetTaskId) {
		const activeTask = findActiveTask(tasksProgress);
		if (activeTask) {
			targetTaskId = activeTask.taskId;
		} else {
			printCommandResult("SKIP", "No task ID provided", false);
			printOutputSection();
			printColoredLine("Task ID is required to skip a task.", colors.error);
			printEmptyLine();
			printColoredLine("Usage:", colors.highlight);
			printLine(`  pnpm task skip <taskId> --reason "<reason>"`);
			printEmptyLine();
			printColoredLine("Example:", colors.highlight);
			printLine(`  pnpm task skip 1.1.2 --reason "Blocked by API changes"`);

			printNextStepsSection([
				{ cmd: "pnpm task status", desc: "View project to find task IDs" },
			]);
			printAIWarning();
			return;
		}
	}

	// Verify the task exists
	const location = findTaskLocation(tasksProgress, targetTaskId);
	if (!location) {
		throw new TaskNotFoundError(targetTaskId);
	}

	const { task, story, feature } = location;

	// Check if already blocked
	if (task.status === "blocked") {
		printCommandResult(
			"SKIP",
			`Task ${targetTaskId} is already blocked`,
			false,
		);
		printOutputSection();
		printColoredLine("This task has already been blocked.", colors.warning);

		printNextStepsSection([
			{ cmd: "pnpm task next", desc: "Find an available task" },
		]);
		printAIWarning();
		return;
	}

	// Check if completed
	if (task.status === "completed") {
		printCommandResult(
			"SKIP",
			`Task ${targetTaskId} is already completed`,
			false,
		);
		printOutputSection();
		printColoredLine("Cannot skip a completed task.", colors.warning);

		printNextStepsSection([
			{ cmd: "pnpm task next", desc: "Find the next available task" },
		]);
		printAIWarning();
		return;
	}

	// Require a reason
	if (!options.reason) {
		printCommandResult("SKIP", "Reason is required", false);
		printOutputSection();
		printColoredLine(
			"You must provide a reason for blocking a task.",
			colors.error,
		);
		printEmptyLine();
		printColoredLine("Usage:", colors.highlight);
		printLine(`  pnpm task skip ${targetTaskId} --reason "<reason>"`);
		printEmptyLine();
		printColoredLine("Examples:", colors.highlight);
		printLine(
			`  pnpm task skip ${targetTaskId} --reason "Blocked by external dependency"`,
		);
		printLine(
			`  pnpm task skip ${targetTaskId} --reason "Waiting for design approval"`,
		);
		printLine(
			`  pnpm task skip ${targetTaskId} --reason "Technical blocker: need API update"`,
		);
		printAIWarning();
		return;
	}

	// Block the task
	blockTask(tasksProgress, targetTaskId, options.reason);

	// ─────────────────────────────────────────────────────────────────────────
	// OUTPUT: Task blocked successfully
	// ─────────────────────────────────────────────────────────────────────────
	printCommandResult("SKIP", `Task ${targetTaskId} marked as BLOCKED`);
	printOutputSection();
	printKeyValue("Task ID", colors.task(targetTaskId));
	printKeyValue("Title", task.title);
	printKeyValue("Story", `${story.id} - ${story.title}`);
	printKeyValue("Feature", `${feature.id} - ${feature.title}`);
	printKeyValue("Reason", colors.warning(options.reason));

	// ─────────────────────────────────────────────────────────────────────────
	// NEXT STEPS: Find next task
	// ─────────────────────────────────────────────────────────────────────────
	const nextTaskInfo = findNextAvailableTask(tasksProgress, targetTaskId);

	if (nextTaskInfo) {
		printEmptyLine();
		printColoredLine(
			`Next available task: ${nextTaskInfo.task.id}`,
			colors.successBold,
		);
		printLine(`${colors.muted("Title:")} ${nextTaskInfo.task.title}`);

		printNextStepsSection([
			{
				cmd: `pnpm task start ${nextTaskInfo.task.id}`,
				desc: "Start the next task",
			},
		]);
	} else {
		printNextStepsSection([
			{ cmd: "pnpm task status", desc: "View overall project progress" },
		]);
	}

	printAIWarning();
}
