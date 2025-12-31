/**
 * Resume command - Resume an interrupted task session
 *
 * FLOW: Recovery command - used to resume interrupted work
 * PRE-HOOK: Checks for active session or restorable task
 * OUTPUT: Resumed task details
 * NEXT STEPS: Continue with task workflow
 */

import {
	findActiveTask,
	findTaskLocation,
	getTaskFilePath,
	loadTaskFile,
	loadTasksProgress,
	updateTaskStatus,
} from "../lib/data-access";
import { NoActiveSessionError, TaskNotFoundError } from "../lib/errors";
import {
	colors,
	printAIWarning,
	printColoredLine,
	printCommandResult,
	printKeyValue,
	printNextStepsSection,
	printOutputSection,
} from "../lib/output";
import { isActiveStatus } from "../lib/types";

export interface ResumeOptions {
	taskId?: string; // Optional - if not provided, try to find any in-progress task
}

export async function resumeCommand(
	options: ResumeOptions = {},
): Promise<void> {
	const tasksProgress = loadTasksProgress();

	// First, check if there's already an active session
	const activeTask = findActiveTask(tasksProgress);
	if (activeTask) {
		// ─────────────────────────────────────────────────────────────────────────
		// OUTPUT: Active session found
		// ─────────────────────────────────────────────────────────────────────────
		printCommandResult("RESUME", `Found active session: ${activeTask.taskId}`);
		printOutputSection();
		printKeyValue("Task ID", colors.task(activeTask.taskId));
		printKeyValue("Title", activeTask.content.title);
		printKeyValue("Status", colors.state(activeTask.content.status));

		printNextStepsSection([
			{ cmd: "pnpm task do", desc: "Get instructions for current state" },
		]);
		printAIWarning();
		return;
	}

	// If taskId provided, try to resume that specific task
	if (options.taskId) {
		const location = findTaskLocation(tasksProgress, options.taskId);
		if (!location) {
			throw new TaskNotFoundError(options.taskId);
		}

		const { task, story, feature } = location;

		// Check task status
		if (task.status === "completed") {
			printCommandResult(
				"RESUME",
				`Task ${options.taskId} is already completed`,
				false,
			);
			printOutputSection();
			printColoredLine("Cannot resume a completed task.", colors.warning);

			printNextStepsSection([
				{ cmd: "pnpm task next", desc: "Find the next available task" },
			]);
			printAIWarning();
			return;
		}

		if (task.status === "not-started") {
			printCommandResult(
				"RESUME",
				`Task ${options.taskId} has not been started`,
				false,
			);
			printOutputSection();
			printColoredLine('Use "start" to begin a new task.', colors.warning);

			printNextStepsSection([
				{ cmd: `pnpm task start ${options.taskId}`, desc: "Start this task" },
			]);
			printAIWarning();
			return;
		}

		if (task.status === "blocked") {
			printCommandResult("RESUME", `Task ${options.taskId} is blocked`, false);
			printOutputSection();
			printColoredLine(
				"This task has been blocked and cannot be resumed.",
				colors.warning,
			);

			printNextStepsSection([
				{ cmd: "pnpm task next", desc: "Find an available task" },
			]);
			printAIWarning();
			return;
		}

		// Task should be in an active status - already handled by findActiveTask above
		// This means the task file status doesn't match the feature file status
		// Resume by setting it to 'implementing'
		const taskFilePath = getTaskFilePath(tasksProgress, options.taskId);
		if (!taskFilePath) {
			throw new TaskNotFoundError(options.taskId);
		}

		const taskContent = loadTaskFile(taskFilePath);
		if (!taskContent) {
			throw new TaskNotFoundError(options.taskId);
		}

		// If task file doesn't have an active status, set it to 'implementing'
		if (!isActiveStatus(taskContent.status)) {
			updateTaskStatus(tasksProgress, options.taskId, "implementing");

			printCommandResult(
				"RESUME",
				`Task ${options.taskId} resumed - Status: IMPLEMENTING`,
			);
			printOutputSection();
			printKeyValue("Task ID", colors.task(options.taskId));
			printKeyValue("Title", task.title);
			printKeyValue("Story", `${story.id} - ${story.title}`);
			printKeyValue("Feature", `${feature.id} - ${feature.title}`);
			printKeyValue("Status", colors.state("implementing"));
		} else {
			printCommandResult(
				"RESUME",
				`Task ${options.taskId} is already active - Status: ${taskContent.status.toUpperCase()}`,
			);
			printOutputSection();
			printKeyValue("Task ID", colors.task(options.taskId));
			printKeyValue("Title", task.title);
			printKeyValue("Status", colors.state(taskContent.status));
		}

		printNextStepsSection([
			{ cmd: "pnpm task do", desc: "Get instructions for current state" },
		]);
		printAIWarning();
		return;
	}

	// No taskId provided and no active task found
	throw new NoActiveSessionError();
}
