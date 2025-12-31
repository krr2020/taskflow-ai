/**
 * Unblock command - Unblock a blocked task
 *
 * FLOW: Recovery command - used to unblock a task
 * PRE-HOOK: Validates task exists and is blocked
 * OUTPUT: Task unblocked status
 * NEXT STEPS: Start the task
 */

import {
	findTaskLocation,
	getTaskFilePath,
	loadTaskFile,
	loadTasksProgress,
	saveTaskFile,
	updateTaskStatus,
} from "../lib/data-access";
import { TaskNotFoundError } from "../lib/errors";
import {
	printCommandResult,
	printKeyValue,
	printLine,
	printNextStepsSection,
	printOutputSection,
} from "../lib/output";

export async function unblockCommand(taskId: string): Promise<void> {
	const tasksProgress = loadTasksProgress();
	const location = findTaskLocation(tasksProgress, taskId);

	if (!location) {
		throw new TaskNotFoundError(taskId);
	}

	const { task } = location;

	if (task.status !== "blocked") {
		printCommandResult("UNBLOCK", `Task ${taskId} is not blocked`, false);
		printOutputSection();
		printKeyValue("Current status", task.status);
		printLine("Only blocked tasks can be unblocked.");
		return;
	}

	// Reset to not-started
	updateTaskStatus(tasksProgress, taskId, "not-started");

	// Clear blocked reason
	const taskFilePath = getTaskFilePath(tasksProgress, taskId);
	if (taskFilePath) {
		const content = loadTaskFile(taskFilePath);
		if (content) {
			delete content.blockedReason;
			// Add a note about unblocking
			if (!content.notes) content.notes = [];
			content.notes.push({
				timestamp: new Date().toISOString(),
				type: "note",
				content: "Task unblocked manually",
			});
			saveTaskFile(taskFilePath, content);
		}
	}

	printCommandResult("UNBLOCK", `Task ${taskId} unblocked`);
	printOutputSection();
	printKeyValue("Task ID", taskId);
	printKeyValue("Title", task.title);
	printKeyValue("Status", "not-started");

	printNextStepsSection([
		{ cmd: `pnpm task start ${taskId}`, desc: "Start this task" },
	]);
}
