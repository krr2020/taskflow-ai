/**
 * Deps command - Show task dependencies
 *
 * FLOW: Navigation command - used to visualize task dependencies
 * PRE-HOOK: Validates task exists
 * OUTPUT: Dependency tree and reverse dependencies
 * NEXT STEPS: Start a task when dependencies are met
 */

import { findTaskLocation, loadTasksProgress } from "../lib/data-access";
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
import type { TaskRef, TasksProgress } from "../lib/types";

export interface DepsOptions {
	taskId: string;
}

export async function depsCommand(options: DepsOptions): Promise<void> {
	const tasksProgress = loadTasksProgress();
	const location = findTaskLocation(tasksProgress, options.taskId);

	if (!location) {
		throw new TaskNotFoundError(options.taskId);
	}

	const { task, story, feature } = location;

	// ─────────────────────────────────────────────────────────────────────────
	// OUTPUT: Dependency information
	// ─────────────────────────────────────────────────────────────────────────
	printCommandResult("DEPS", `Dependencies for task ${options.taskId}`);
	printOutputSection();
	printKeyValue("Task ID", colors.task(options.taskId));
	printKeyValue("Title", task.title);
	printKeyValue("Story", `${story.id} - ${story.title}`);
	printKeyValue("Feature", `${feature.id} - ${feature.title}`);
	printEmptyLine();

	// Show direct dependencies
	if (task.dependencies && task.dependencies.length > 0) {
		printColoredLine(
			"Direct Dependencies (must complete first):",
			colors.highlight,
		);
		printLine(colors.muted("─".repeat(50)));

		for (const depId of task.dependencies) {
			const depLocation = findTaskLocation(tasksProgress, depId);
			if (depLocation) {
				const statusIcon = getStatusIcon(depLocation.task.status);
				printLine(
					`  ${statusIcon} ${colors.task(depId)} - ${depLocation.task.title} ${colors.state(`[${depLocation.task.status}]`)}`,
				);
			} else {
				printLine(
					`  ⚠ ${colors.warning(depId)} - ${colors.error("Not found")}`,
				);
			}
		}
		printEmptyLine();
	} else {
		printColoredLine("No direct dependencies.", colors.success);
		printEmptyLine();
	}

	// Find reverse dependencies (tasks that depend on this one)
	const reverseDeps: Array<{
		task: TaskRef;
		storyId: string;
		storyTitle: string;
	}> = [];
	for (const f of tasksProgress.features) {
		for (const s of f.stories) {
			for (const t of s.tasks) {
				if (t.dependencies?.includes(options.taskId)) {
					reverseDeps.push({ task: t, storyId: s.id, storyTitle: s.title });
				}
			}
		}
	}

	if (reverseDeps.length > 0) {
		printColoredLine(
			"Tasks that depend on this one (blocked by this task):",
			colors.highlight,
		);
		printLine(colors.muted("─".repeat(50)));

		for (const { task: depTask, storyId, storyTitle } of reverseDeps) {
			const statusIcon = getStatusIcon(depTask.status);
			printLine(
				`  ${statusIcon} ${colors.task(depTask.id)} - ${depTask.title}`,
			);
			printLine(`      Story: ${storyId} - ${storyTitle}`);
		}
		printEmptyLine();
	} else {
		printColoredLine("No tasks depend on this one.", colors.muted);
		printEmptyLine();
	}

	// Show ASCII dependency tree
	printColoredLine("Dependency Tree:", colors.highlight);
	printLine(colors.muted("─".repeat(50)));
	const tree = buildDependencyTree(tasksProgress, options.taskId, 0, new Set());
	printLine(tree);

	// Check if all dependencies are complete
	const allDepsComplete =
		!task.dependencies ||
		task.dependencies.length === 0 ||
		task.dependencies.every((depId) => {
			const depLocation = findTaskLocation(tasksProgress, depId);
			return depLocation && depLocation.task.status === "completed";
		});

	if (allDepsComplete && task.status === "not-started") {
		printEmptyLine();
		printColoredLine(
			"✅ All dependencies complete! This task is ready to start.",
			colors.success,
		);
	} else if (!allDepsComplete) {
		printEmptyLine();
		printColoredLine(
			"⚠️  Some dependencies are not yet complete. Wait for them to finish.",
			colors.warning,
		);
	}

	printNextStepsSection([
		allDepsComplete && task.status === "not-started"
			? {
					cmd: `pnpm task start ${options.taskId}`,
					desc: "Start this task (dependencies met)",
				}
			: { cmd: `pnpm task status ${story.id}`, desc: "View story progress" },
	]);
	printAIWarning();
}

function getStatusIcon(status: string): string {
	switch (status) {
		case "completed":
			return "✓";
		case "blocked":
		case "on-hold":
			return "✗";
		case "implementing":
		case "verifying":
		case "validating":
		case "committing":
			return "⏳";
		default:
			return "○";
	}
}

function buildDependencyTree(
	tasksProgress: TasksProgress,
	taskId: string,
	depth: number,
	visited: Set<string>,
): string {
	// Prevent infinite loops in circular dependencies
	if (visited.has(taskId)) {
		const indent = "  ".repeat(depth);
		return `${indent}⚠ ${colors.warning(taskId)} - ${colors.error("Circular dependency detected")}\n`;
	}

	visited.add(taskId);

	const location = findTaskLocation(tasksProgress, taskId);
	if (!location) {
		const indent = "  ".repeat(depth);
		return `${indent}⚠ ${colors.warning(taskId)} - ${colors.error("Not found")}\n`;
	}

	const { task } = location;
	const indent = "  ".repeat(depth);
	const statusIcon = getStatusIcon(task.status);

	let result = `${indent}${statusIcon} ${colors.task(taskId)} - ${task.title} ${colors.state(`[${task.status}]`)}\n`;

	if (task.dependencies && task.dependencies.length > 0) {
		for (const depId of task.dependencies) {
			result += buildDependencyTree(
				tasksProgress,
				depId,
				depth + 1,
				new Set(visited),
			);
		}
	}

	return result;
}
