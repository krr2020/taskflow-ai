/**
 * Status command - View project progress
 *
 * FLOW: Navigation command - can be run at any time
 * PRE-HOOK: None (informational command)
 * OUTPUT: Project overview or feature/story details
 * NEXT STEPS: Suggests starting tasks or viewing details
 */

import {
	calculateProgressStats,
	findActiveTask,
	findFeature,
	findStoryLocation,
	findTaskLocation,
	loadTasksProgress,
} from "../lib/data-access";
import { FeatureNotFoundError, StoryNotFoundError } from "../lib/errors";
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
import { isActiveStatus, isValidFeatureId, isValidStoryId } from "../lib/types";

export interface StatusOptions {
	target?: string; // Feature ID, Story ID, or undefined for overview
}

export async function statusCommand(
	options: StatusOptions = {},
): Promise<void> {
	const { target } = options;
	const tasksProgress = loadTasksProgress();

	if (!target) {
		// ─────────────────────────────────────────────────────────────────────────
		// OUTPUT: Show project overview
		// ─────────────────────────────────────────────────────────────────────────
		const stats = calculateProgressStats(tasksProgress);
		printCommandResult(
			"STATUS",
			`Project Overview - ${stats.completedTasks}/${stats.totalTasks} tasks completed`,
		);
		printOutputSection();

		// Project Progress Bar
		const projectBar = generateProgressBar(
			stats.completedTasks,
			stats.totalTasks,
		);
		printLine(`Project Progress: ${projectBar}`);
		printEmptyLine();

		// List all features with visual indicators
		printColoredLine(
			`FEATURES (${stats.completedFeatures}/${stats.totalFeatures} completed - ${Math.round((stats.completedFeatures / stats.totalFeatures) * 100)}%)`,
			colors.highlight,
		);
		printLine(colors.muted("─".repeat(50)));
		for (const feature of tasksProgress.features.slice(0, 5)) {
			const statusIcon = getStatusIcon(feature.status);
			const featureTasks = feature.stories.reduce(
				(sum, s) => sum + s.tasks.length,
				0,
			);
			const featureCompleted = feature.stories.reduce(
				(sum, s) =>
					sum + s.tasks.filter((t) => t.status === "completed").length,
				0,
			);
			printLine(
				`  ${statusIcon} F${feature.id} - ${feature.title} [${formatStatus(feature.status)}] (${featureCompleted}/${featureTasks})`,
			);
		}
		if (tasksProgress.features.length > 5) {
			printLine(`  ... and ${tasksProgress.features.length - 5} more`);
		}
		printEmptyLine();

		// STORIES Section
		const allStories = tasksProgress.features.flatMap((f) =>
			f.stories.map((s) => ({ story: s, feature: f })),
		);
		const storyPercentage =
			stats.totalStories > 0
				? Math.round((stats.completedStories / stats.totalStories) * 100)
				: 0;
		printColoredLine(
			`STORIES (${stats.completedStories}/${stats.totalStories} completed - ${storyPercentage}%)`,
			colors.highlight,
		);
		printLine(colors.muted("─".repeat(50)));

		// Show stories (prioritize in-progress, then not-started, then completed)
		const inProgressStories = allStories.filter(
			(s) => s.story.status === "in-progress",
		);
		const notStartedStories = allStories.filter(
			(s) => s.story.status === "not-started",
		);
		const completedStories = allStories.filter(
			(s) => s.story.status === "completed",
		);

		const storiesToShow = [
			...inProgressStories.slice(0, 5),
			...notStartedStories.slice(0, 3),
			...completedStories.slice(0, 2),
		].slice(0, 10);

		for (const { story } of storiesToShow) {
			const statusIcon = getStatusIcon(story.status);
			printLine(
				`  ${statusIcon} S${story.id} - ${story.title} [${formatStatus(story.status)}]`,
			);
		}
		if (allStories.length > 10) {
			printLine(colors.muted(`  ... and ${allStories.length - 10} more`));
		}
		printEmptyLine();

		// TASKS Section
		const taskPercentage =
			stats.totalTasks > 0
				? Math.round((stats.completedTasks / stats.totalTasks) * 100)
				: 0;
		printColoredLine(
			`TASKS (${stats.completedTasks}/${stats.totalTasks} completed - ${taskPercentage}%)`,
			colors.highlight,
		);
		printLine(colors.muted("─".repeat(50)));

		// Show tasks (prioritize active, not-started, then completed)
		const allTasks = allStories.flatMap((s) =>
			s.story.tasks.map((t) => ({
				task: t,
				story: s.story,
				feature: s.feature,
			})),
		);
		const activeTasks = allTasks.filter((t) => isActiveStatus(t.task.status));
		const notStartedTasks = allTasks.filter(
			(t) => t.task.status === "not-started",
		);
		const completedTasks = allTasks.filter(
			(t) => t.task.status === "completed",
		);

		const tasksToShow = [
			...activeTasks.slice(0, 5),
			...notStartedTasks.slice(0, 3),
			...completedTasks.slice(0, 2),
		].slice(0, 10);

		for (const { task } of tasksToShow) {
			const statusIcon = getStatusIcon(task.status);
			printLine(
				`  ${statusIcon} ${task.id} - ${task.title} [${formatStatus(task.status)}]`,
			);
		}
		if (allTasks.length > 10) {
			printLine(colors.muted(`  ... and ${allTasks.length - 10} more`));
		}
		printEmptyLine();

		// Find and display active task
		const activeTaskInfo = findActiveTask(tasksProgress);
		if (activeTaskInfo) {
			const location = findTaskLocation(tasksProgress, activeTaskInfo.taskId);
			if (location) {
				printEmptyLine();
				printColoredLine("Current Activity:", colors.highlight);
				printKeyValue("Feature", location.feature.title);
				printKeyValue("Story", location.story.title);
				printKeyValue(
					"Task",
					`${colors.task(location.task.id)} - ${location.task.title}`,
				);
				printKeyValue("Status", colors.state(location.task.status));
			}
		}

		// ─────────────────────────────────────────────────────────────────────────
		// NEXT STEPS
		// ─────────────────────────────────────────────────────────────────────────
		const nextSteps = activeTaskInfo
			? [
					{ cmd: "pnpm task do", desc: "Get instructions for current task" },
					{
						cmd: "pnpm task status <id>",
						desc: "View details for a feature (1) or story (1.1)",
					},
				]
			: [
					{ cmd: "pnpm task next", desc: "Find the next available task" },
					{ cmd: "pnpm task start <id>", desc: "Start a specific task" },
					{
						cmd: "pnpm task status <id>",
						desc: "View details for a feature (1) or story (1.1)",
					},
				];

		printNextStepsSection(nextSteps);
		printAIWarning();
		return;
	}

	// Check if target is a story ID (e.g., "1.1")
	if (isValidStoryId(target)) {
		const location = findStoryLocation(tasksProgress, target);
		if (!location) {
			throw new StoryNotFoundError(target);
		}

		const { story, feature } = location;
		const completedTasks = story.tasks.filter(
			(t) => t.status === "completed",
		).length;

		printCommandResult(
			"STATUS",
			`Story ${target} - ${completedTasks}/${story.tasks.length} tasks completed`,
		);
		printOutputSection();
		printKeyValue("Title", story.title);
		printKeyValue("Feature", `${feature.id} - ${feature.title}`);
		printKeyValue("Status", formatStatus(story.status));
		printEmptyLine();
		printColoredLine("Tasks:", colors.highlight);

		for (const task of story.tasks) {
			const statusIcon = getStatusIcon(task.status);
			printLine(`  ${statusIcon} ${task.id} - ${task.title}`);
			if (task.dependencies && task.dependencies.length > 0) {
				printColoredLine(
					`    Dependencies: ${task.dependencies.join(", ")}`,
					colors.muted,
				);
			}
		}

		// Find first not-started task
		const nextTask = story.tasks.find((t) => t.status === "not-started");
		printNextStepsSection(
			nextTask
				? [
						{
							cmd: `pnpm task start ${nextTask.id}`,
							desc: "Start the next task in this story",
						},
					]
				: [{ cmd: "pnpm task status", desc: "View project overview" }],
		);
		printAIWarning();
		return;
	}

	// Check if target is a feature ID (e.g., "1")
	if (isValidFeatureId(target)) {
		const feature = findFeature(tasksProgress, target);
		if (!feature) {
			throw new FeatureNotFoundError(target);
		}

		const totalTasks = feature.stories.reduce(
			(sum, s) => sum + s.tasks.length,
			0,
		);
		const completedTasks = feature.stories.reduce(
			(sum, s) => sum + s.tasks.filter((t) => t.status === "completed").length,
			0,
		);

		printCommandResult(
			"STATUS",
			`Feature ${target} - ${completedTasks}/${totalTasks} tasks completed`,
		);
		printOutputSection();
		printKeyValue("Title", feature.title);
		printKeyValue("Status", formatStatus(feature.status));
		printEmptyLine();
		printColoredLine("Stories:", colors.highlight);

		for (const story of feature.stories) {
			const statusIcon = getStatusIcon(story.status);
			const storyCompletedTasks = story.tasks.filter(
				(t) => t.status === "completed",
			).length;
			const storyTotalTasks = story.tasks.length;
			printLine(
				`  ${statusIcon} S${story.id} - ${story.title} (${storyCompletedTasks}/${storyTotalTasks})`,
			);
		}

		// Find first not-started story
		const nextStory = feature.stories.find((s) => s.status !== "completed");
		printNextStepsSection(
			nextStory
				? [
						{
							cmd: `pnpm task status ${nextStory.id}`,
							desc: "View details for the next story",
						},
					]
				: [{ cmd: "pnpm task status", desc: "View project overview" }],
		);
		printAIWarning();
		return;
	}

	// Invalid target format
	printCommandResult("STATUS", `Invalid target: ${target}`, false);
	printOutputSection();
	printColoredLine(
		"Expected feature ID (e.g., 1) or story ID (e.g., 1.1)",
		colors.error,
	);

	printNextStepsSection([
		{ cmd: "pnpm task status", desc: "View overall project progress" },
		{ cmd: "pnpm task status 1", desc: "View feature 1 details" },
		{ cmd: "pnpm task status 1.1", desc: "View story 1.1 details" },
	]);
	printAIWarning();
}

function generateProgressBar(
	completed: number,
	total: number,
	width = 30,
): string {
	if (total === 0) return "░".repeat(width);
	const percentage = Math.round((completed / total) * 100);
	const filled = Math.round((completed / total) * width);
	const empty = width - filled;
	const bar = "█".repeat(filled) + "░".repeat(empty);
	return `${bar} ${percentage}%`;
}

function formatStatus(status: string): string {
	if (status === "completed") {
		return colors.success("completed");
	}
	if (status === "in-progress" || isActiveStatus(status)) {
		return colors.warning(status);
	}
	if (status === "blocked") {
		return colors.error("blocked");
	}
	if (status === "on-hold") {
		return colors.muted("on-hold");
	}
	return colors.muted("not-started");
}

function getStatusIcon(status: string): string {
	if (status === "completed") {
		return colors.success("[x]");
	}
	if (status === "in-progress" || isActiveStatus(status)) {
		return colors.warning("[~]");
	}
	if (status === "blocked") {
		return colors.error("[!]");
	}
	if (status === "on-hold") {
		return colors.muted("[-]");
	}
	return "[ ]";
}
