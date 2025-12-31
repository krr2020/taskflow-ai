/**
 * Abort command - Abandon/abort the current active task
 *
 * FLOW: Called when user wants to abandon the current task
 * PRE-HOOK: Checks for active session
 * OUTPUT: Task reset to not-started state
 * NEXT STEPS: Find another task to work on
 */

import {
	findActiveTask,
	getTaskFilePath,
	loadTaskFile,
	loadTasksProgress,
	saveTaskFile,
	updateTaskStatus,
} from "../lib/data-access";
import { NoActiveSessionError } from "../lib/errors";
import {
	colors,
	printAIWarning,
	printCommandResult,
	printKeyValue,
	printNextStepsSection,
	printOutputSection,
} from "../lib/output";

export async function abortCommand(): Promise<void> {
	const tasksProgress = loadTasksProgress();
	const activeTask = findActiveTask(tasksProgress);

	if (!activeTask) {
		throw new NoActiveSessionError();
	}

	// Reset task to not-started
	updateTaskStatus(tasksProgress, activeTask.taskId, "not-started");

	// Clear workflow state from task file
	const taskFilePath = getTaskFilePath(tasksProgress, activeTask.taskId);
	if (taskFilePath) {
		const content = loadTaskFile(taskFilePath);
		if (content) {
			content.status = "not-started";
			saveTaskFile(taskFilePath, content);
		}
	}

	printCommandResult("ABORT", `Task ${activeTask.taskId} abandoned`);
	printOutputSection();
	printKeyValue("Task ID", colors.task(activeTask.taskId));
	printKeyValue("Title", activeTask.content.title);
	printKeyValue("Previous Status", colors.state(activeTask.content.status));
	printKeyValue("New Status", colors.state("not-started"));
	printKeyValue("Reason", "Task abandoned by user");

	printNextStepsSection([
		{ cmd: "pnpm task next", desc: "Find another task to work on" },
	]);
	printAIWarning();
}
