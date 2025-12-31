/**
 * Next command - Find the next available task
 *
 * FLOW: Navigation command - can be run at any time
 * PRE-HOOK: None (informational command)
 * OUTPUT: Next available task or active task details
 * NEXT STEPS: Start the suggested task
 */

import {
	findActiveTask,
	findNextAvailableTask,
	loadTasksProgress,
} from "../lib/data-access";
import {
	colors,
	printAIWarning,
	printColoredLine,
	printCommandResult,
	printKeyValue,
	printLine,
	printNextStepsSection,
	printOutputSection,
} from "../lib/output";
import { isActiveStatus } from "../lib/types";

export async function nextCommand(): Promise<void> {
	const tasksProgress = loadTasksProgress();

	// Check if there's an active task
	const activeTask = findActiveTask(tasksProgress);
	if (activeTask) {
		// ─────────────────────────────────────────────────────────────────────────
		// OUTPUT: Active task found
		// ─────────────────────────────────────────────────────────────────────────
		printCommandResult("NEXT", `Active task found: ${activeTask.taskId}`);
		printOutputSection();
		printKeyValue("Task ID", colors.task(activeTask.taskId));
		printKeyValue("Title", activeTask.content.title);
		printKeyValue("Status", colors.state(activeTask.content.status));

		printNextStepsSection([
			{ cmd: "pnpm task do", desc: "Get instructions for current state" },
			{ cmd: "pnpm task check", desc: "Run validations and advance state" },
		]);
		printAIWarning();
		return;
	}

	// Find next available task
	const nextTaskInfo = findNextAvailableTask(tasksProgress);

	if (nextTaskInfo) {
		const { task, story, feature } = nextTaskInfo;
		const isActive = isActiveStatus(task.status);

		// ─────────────────────────────────────────────────────────────────────────
		// OUTPUT: Next task found
		// ─────────────────────────────────────────────────────────────────────────
		printCommandResult(
			"NEXT",
			isActive
				? `Continue task: ${task.id}`
				: `Next available task: ${task.id}`,
		);
		printOutputSection();
		printKeyValue("Task ID", colors.task(task.id));
		printKeyValue("Title", task.title);
		printKeyValue("Story", `${story.id} - ${story.title}`);
		printKeyValue("Feature", `${feature.id} - ${feature.title}`);

		if (task.dependencies && task.dependencies.length > 0) {
			printKeyValue("Dependencies", task.dependencies.join(", "));
		}

		printNextStepsSection([
			{
				cmd: `pnpm task start ${task.id}`,
				desc: isActive ? "Continue working on this task" : "Begin this task",
			},
		]);
	} else {
		// ─────────────────────────────────────────────────────────────────────────
		// OUTPUT: No tasks available
		// ─────────────────────────────────────────────────────────────────────────
		const allComplete = tasksProgress.features.every(
			(f) => f.status === "completed",
		);

		if (allComplete) {
			printCommandResult("NEXT", "All tasks completed! Project is done.");
			printOutputSection();
			printColoredLine(
				"Congratulations! All features have been completed.",
				colors.success,
			);
		} else {
			printCommandResult("NEXT", "No available tasks found", false);
			printOutputSection();

			// Find blocked tasks
			const blockedTasks = tasksProgress.features
				.flatMap((f) => f.stories)
				.flatMap((s) => s.tasks)
				.filter((t) => t.status === "blocked");

			if (blockedTasks.length > 0) {
				printColoredLine("Some tasks are blocked:", colors.warning);
				for (const task of blockedTasks.slice(0, 5)) {
					printLine(`  - ${task.id}: ${task.title}`);
				}
				if (blockedTasks.length > 5) {
					printLine(`  ... and ${blockedTasks.length - 5} more`);
				}
			}
		}

		printNextStepsSection([
			{ cmd: "pnpm task status", desc: "View overall project progress" },
			{ cmd: "pnpm task help", desc: "Show all available commands" },
		]);
	}

	printAIWarning();
}
