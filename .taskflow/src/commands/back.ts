/**
 * Back command - Revert to previous workflow state
 *
 * FLOW: Recovery command - used to go back one state
 * PRE-HOOK: Validates active session and allows backward transition
 * OUTPUT: State reverted confirmation
 * NEXT STEPS: Get instructions for new state
 */

import {
	findActiveTask,
	loadTasksProgress,
	updateTaskStatus,
} from "../lib/data-access";
import { NoActiveSessionError } from "../lib/errors";
import {
	colors,
	printAIWarning,
	printColoredLine,
	printCommandResult,
	printKeyValue,
	printNextStepsSection,
	printOutputSection,
} from "../lib/output";
import type { ActiveStatus, TaskStatus } from "../lib/types";
import { isActiveStatus } from "../lib/types";

export async function backCommand(): Promise<void> {
	const tasksProgress = loadTasksProgress();
	const activeTask = findActiveTask(tasksProgress);

	if (!activeTask) {
		throw new NoActiveSessionError();
	}

	const currentStatus = activeTask.content.status;

	// Define allowed backward transitions
	const backwardTransitions: Record<ActiveStatus, TaskStatus> = {
		setup: "setup", // Cannot go back from setup
		implementing: "setup",
		verifying: "implementing",
		validating: "verifying",
		committing: "validating",
	};

	if (!isActiveStatus(currentStatus)) {
		printCommandResult("BACK", "Cannot go back from terminal state", false);
		printOutputSection();
		printColoredLine(`Current status: ${currentStatus}`, colors.warning);
		printColoredLine(
			"Can only go back from active states (setup, implementing, verifying, validating, committing)",
			colors.muted,
		);
		printAIWarning();
		return;
	}

	const previousStatus = backwardTransitions[currentStatus];

	if (currentStatus === "setup" || previousStatus === currentStatus) {
		printCommandResult("BACK", "No previous state available", false);
		printOutputSection();
		printColoredLine(
			`Already at earliest state: ${currentStatus}`,
			colors.warning,
		);
		printNextStepsSection([
			{ cmd: "pnpm task do", desc: "Get instructions for current state" },
		]);
		printAIWarning();
		return;
	}

	// Revert status
	updateTaskStatus(tasksProgress, activeTask.taskId, previousStatus);

	// ─────────────────────────────────────────────────────────────────────────
	// OUTPUT: State reverted successfully
	// ─────────────────────────────────────────────────────────────────────────
	printCommandResult("BACK", `Reverted to ${previousStatus.toUpperCase()}`);
	printOutputSection();
	printKeyValue("Task ID", colors.task(activeTask.taskId));
	printKeyValue("Title", activeTask.content.title);
	printKeyValue("Previous State", colors.state(currentStatus));
	printKeyValue("New State", colors.state(previousStatus));

	printNextStepsSection([
		{ cmd: "pnpm task do", desc: "Get instructions for new state" },
	]);
	printAIWarning();
}
