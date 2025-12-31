/**
 * Note command - Add notes to a task
 *
 * FLOW: Called to add notes, observations, or blockers discovered during work
 * PRE-HOOK: Checks for active session, validates task ID
 * OUTPUT: Note added confirmation
 * NEXT STEPS: Continue with current task
 */

import {
	findActiveTask,
	findTaskLocation,
	getTaskFilePath,
	loadTaskFile,
	loadTasksProgress,
	saveTaskFile,
} from "../lib/data-access";
import { NoActiveSessionError, TaskNotFoundError } from "../lib/errors";
import {
	printAIWarning,
	printCommandResult,
	printKeyValue,
	printLine,
	printNextStepsSection,
	printOutputSection,
} from "../lib/output";

export interface NoteOptions {
	taskId?: string;
	note: string;
}

export async function noteCommand(options: NoteOptions): Promise<void> {
	const tasksProgress = loadTasksProgress();

	let targetTaskId = options.taskId;

	// If no taskId provided, use active task
	if (!targetTaskId) {
		const activeTask = findActiveTask(tasksProgress);
		if (!activeTask) {
			throw new NoActiveSessionError();
		}
		targetTaskId = activeTask.taskId;
	}

	const location = findTaskLocation(tasksProgress, targetTaskId);
	if (!location) {
		throw new TaskNotFoundError(targetTaskId);
	}

	const { task } = location;

	// Add note to task file
	const taskFilePath = getTaskFilePath(tasksProgress, targetTaskId);
	if (taskFilePath) {
		const content = loadTaskFile(taskFilePath);
		if (content) {
			if (!content.notes) content.notes = [];
			content.notes.push({
				timestamp: new Date().toISOString(),
				type: "note",
				content: options.note,
			});
			saveTaskFile(taskFilePath, content);
		}
	}

	printCommandResult("NOTE", `Note added to task ${targetTaskId}`);
	printOutputSection();
	printKeyValue("Task ID", targetTaskId);
	printKeyValue("Title", task.title);
	printLine(`\nNote: ${options.note}`);
	printLine(`Timestamp: ${new Date().toISOString()}`);

	printNextStepsSection([
		{ cmd: "pnpm task do", desc: "View task with notes" },
	]);
	printAIWarning();
}
