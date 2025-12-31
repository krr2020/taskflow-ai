/**
 * Bulk command - Perform bulk operations on multiple tasks
 *
 * FLOW: Utility command - used to update multiple tasks at once
 * PRE-HOOK: Validates filters and operation
 * OUTPUT: Summary of tasks updated
 * NEXT STEPS: View status or start next task
 */

import {
	getTaskFilePath,
	loadTaskFile,
	loadTasksProgress,
	saveTaskFile,
	updateTaskStatus,
} from "../lib/data-access";
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
import type { TaskRef, TaskStatus } from "../lib/types";

export interface BulkOptions {
	operation: "block" | "reset" | "complete";
	story?: string | undefined;
	feature?: string | undefined;
	status?: TaskStatus | undefined;
	reason?: string | undefined;
}

export async function bulkCommand(options: BulkOptions): Promise<void> {
	const tasksProgress = loadTasksProgress();

	// Validate filters
	if (!options.story && !options.feature && !options.status) {
		printCommandResult("BULK", "No filter specified", false);
		printOutputSection();
		printColoredLine("You must specify at least one filter:", colors.error);
		printLine("  --story <storyId>   - Update all tasks in a story");
		printLine("  --feature <featureId> - Update all tasks in a feature");
		printLine(
			"  --status <status>   - Update all tasks with a specific status",
		);
		printEmptyLine();
		printColoredLine("Examples:", colors.highlight);
		printLine('  pnpm task bulk block --story 1.1 --reason "Design changed"');
		printLine("  pnpm task bulk reset --feature 2");
		printLine("  pnpm task bulk complete --status implementing");
		printNextStepsSection([
			{ cmd: "pnpm task status", desc: "View task overview" },
		]);
		printAIWarning();
		return;
	}

	// Collect matching tasks
	const matchingTasks: Array<{ taskId: string; task: TaskRef }> = [];

	for (const feature of tasksProgress.features) {
		if (options.feature && feature.id !== options.feature) continue;

		for (const story of feature.stories) {
			if (options.story && story.id !== options.story) continue;

			for (const task of story.tasks) {
				if (options.status && task.status !== options.status) continue;

				matchingTasks.push({ taskId: task.id, task });
			}
		}
	}

	if (matchingTasks.length === 0) {
		printCommandResult("BULK", "No tasks match the specified filters", false);
		printOutputSection();
		printLine("No tasks found matching:");
		if (options.story) printLine(`  Story: ${options.story}`);
		if (options.feature) printLine(`  Feature: ${options.feature}`);
		if (options.status) printLine(`  Status: ${options.status}`);
		printNextStepsSection([
			{ cmd: "pnpm task status", desc: "View task overview" },
		]);
		printAIWarning();
		return;
	}

	// Perform operation
	let updatedCount = 0;
	const errors: string[] = [];

	for (const { taskId, task } of matchingTasks) {
		try {
			switch (options.operation) {
				case "block": {
					if (task.status === "blocked" || task.status === "completed") {
						continue;
					}
					updateTaskStatus(tasksProgress, taskId, "blocked");
					const taskFilePath = getTaskFilePath(tasksProgress, taskId);
					if (taskFilePath) {
						const content = loadTaskFile(taskFilePath);
						if (content) {
							content.blockedReason = options.reason || "Bulk operation";
							if (!content.notes) content.notes = [];
							content.notes.push({
								timestamp: new Date().toISOString(),
								type: "blocker",
								content: options.reason || "Blocked by bulk operation",
							});
							saveTaskFile(taskFilePath, content);
						}
					}
					updatedCount++;
					break;
				}

				case "reset": {
					if (task.status === "not-started" || task.status === "completed") {
						continue;
					}
					updateTaskStatus(tasksProgress, taskId, "not-started");
					const taskFilePath = getTaskFilePath(tasksProgress, taskId);
					if (taskFilePath) {
						const content = loadTaskFile(taskFilePath);
						if (content) {
							delete content.blockedReason;
							if (!content.notes) content.notes = [];
							content.notes.push({
								timestamp: new Date().toISOString(),
								type: "note",
								content: "Reset by bulk operation",
							});
							saveTaskFile(taskFilePath, content);
						}
					}
					updatedCount++;
					break;
				}

				case "complete": {
					if (task.status === "completed") {
						continue;
					}
					updateTaskStatus(tasksProgress, taskId, "completed");
					updatedCount++;
					break;
				}
			}
		} catch (error) {
			errors.push(`Failed to update ${taskId}: ${error}`);
		}
	}

	// Output results
	printCommandResult("BULK", `Bulk ${options.operation} operation completed`);
	printOutputSection();
	printKeyValue("Operation", colors.highlight(options.operation.toUpperCase()));
	printKeyValue("Tasks matched", String(matchingTasks.length));
	printKeyValue("Tasks updated", colors.success(String(updatedCount)));
	printKeyValue(
		"Tasks skipped",
		colors.muted(String(matchingTasks.length - updatedCount)),
	);

	if (errors.length > 0) {
		printEmptyLine();
		printColoredLine("Errors:", colors.error);
		for (const error of errors) {
			printLine(`  ${error}`);
		}
	}

	printEmptyLine();
	printColoredLine("Updated tasks:", colors.highlight);
	printLine(colors.muted("─".repeat(50)));
	for (const { taskId, task } of matchingTasks.slice(0, 10)) {
		printLine(`  ${colors.task(taskId)} - ${task.title}`);
	}
	if (matchingTasks.length > 10) {
		printLine(`  ... and ${matchingTasks.length - 10} more`);
	}

	printNextStepsSection([
		{ cmd: "pnpm task status", desc: "View updated task status" },
		{ cmd: "pnpm task next", desc: "Find next available task" },
	]);
	printAIWarning();
}
