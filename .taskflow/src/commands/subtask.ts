/**
 * Subtask command - Manage subtasks within a task
 *
 * FLOW: Called to mark subtasks as complete/pending
 * PRE-HOOK: Checks for active session, validates task ID and subtask ID
 * OUTPUT: Updated subtask checklist
 * NEXT STEPS: Continue with current task or advance
 */

import {
	findActiveTask,
	getTaskFilePath,
	loadTaskFile,
	loadTasksProgress,
	saveTaskFile,
} from "../lib/data-access";
import { NoActiveSessionError, TaskNotFoundError } from "../lib/errors";
import {
	colors,
	printAIWarning,
	printColoredLine,
	printCommandResult,
	printEmptyLine,
	printLine,
	printNextStepsSection,
	printOutputSection,
} from "../lib/output";

export interface SubtaskOptions {
	taskId: string;
	subtaskId: string;
	status: "completed" | "pending";
}

export async function subtaskCommand(options: SubtaskOptions): Promise<void> {
	const tasksProgress = loadTasksProgress();
	const activeTask = findActiveTask(tasksProgress);

	if (!activeTask) {
		throw new NoActiveSessionError();
	}

	if (activeTask.taskId !== options.taskId) {
		printCommandResult(
			"SUBTASK",
			"Can only update subtasks for active task",
			false,
		);
		printOutputSection();
		printColoredLine(`Active task: ${activeTask.taskId}`, colors.error);
		printColoredLine(`Requested task: ${options.taskId}`, colors.error);
		printNextStepsSection([
			{ cmd: "pnpm task do", desc: "View current active task" },
		]);
		printAIWarning();
		return;
	}

	const taskFilePath = getTaskFilePath(tasksProgress, options.taskId);
	if (!taskFilePath) {
		throw new TaskNotFoundError(options.taskId);
	}

	const content = loadTaskFile(taskFilePath);
	if (!content || !content.subtasks) {
		printCommandResult("SUBTASK", "Task has no subtasks", false);
		printOutputSection();
		printColoredLine(
			"This task does not have any subtasks defined.",
			colors.muted,
		);
		printNextStepsSection([
			{ cmd: "pnpm task do", desc: "Continue with current task" },
		]);
		printAIWarning();
		return;
	}

	const subtask = content.subtasks.find((st) => st.id === options.subtaskId);
	if (!subtask) {
		printCommandResult(
			"SUBTASK",
			`Subtask ${options.subtaskId} not found`,
			false,
		);
		printOutputSection();
		printColoredLine("Available subtasks:", colors.muted);
		for (const st of content.subtasks) {
			const icon = st.status === "completed" ? "✓" : "□";
			printLine(`  ${icon} ${st.id}: ${st.description}`);
		}
		printNextStepsSection([
			{ cmd: "pnpm task do", desc: "Continue with current task" },
		]);
		printAIWarning();
		return;
	}

	// Update subtask status
	subtask.status = options.status;
	saveTaskFile(taskFilePath, content);

	// Check if all subtasks are now complete
	const allComplete = content.subtasks.every((st) => st.status === "completed");
	const currentStatus = activeTask.content.status;

	printCommandResult(
		"SUBTASK",
		`Subtask ${options.subtaskId} marked as ${options.status.toUpperCase()}`,
	);
	printOutputSection();

	// Show updated checklist
	printLine("Updated Subtask Checklist:");
	for (const st of content.subtasks) {
		const icon = st.status === "completed" ? "✓" : "□";
		printLine(`  ${icon} ${st.id}: ${st.description}`);
	}

	if (allComplete && currentStatus === "implementing") {
		printEmptyLine();
		printColoredLine("🎉 All subtasks completed!", colors.successBold);
		printNextStepsSection([
			{ cmd: "pnpm task check", desc: "Advance to VERIFYING state" },
		]);
	} else {
		printNextStepsSection([
			{ cmd: "pnpm task do", desc: "Continue with current task" },
		]);
	}
	printAIWarning();
}
