/**
 * Status command - Display project/feature/story status
 */

import { BaseCommand, type CommandResult } from "@/commands/base";
import { ConfigLoader } from "@/lib/config/config-loader";
import { Colors, Text } from "@/lib/ui/components";
import {
	calculateProgressStats,
	findActiveTask,
	findFeature,
	findStoryLocation,
	loadTasksProgress,
} from "../../lib/core/data-access.js";
import type {
	Feature,
	Story,
	TaskRef,
	TasksProgress,
} from "../../lib/core/types.js";

export class StatusCommand extends BaseCommand {
	async execute(id?: string): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();

		// Load tasks progress
		const tasksProgress = loadTasksProgress(paths.tasksDir);

		if (!id) {
			return this.showProjectOverview(paths.tasksDir, tasksProgress);
		}

		// Check if it's a feature ID (single number)
		if (/^\d+$/.test(id)) {
			return this.showFeatureStatus(tasksProgress, id);
		}

		// Check if it's a story ID (N.M)
		if (/^\d+\.\d+$/.test(id)) {
			return this.showStoryStatus(tasksProgress, id);
		}

		return this.failure(
			"Invalid ID format",
			[`ID ${id} is not a valid feature or story ID`],
			[
				"Valid formats:",
				"- Feature: N (e.g., '1')",
				"- Story: N.M (e.g., '1.1')",
				"",
				"Run 'taskflow status' for project overview",
			].join("\n"),
		);
	}

	private showProjectOverview(
		tasksDir: string,
		tasksProgress: TasksProgress,
	): CommandResult {
		const stats = calculateProgressStats(tasksProgress);
		const activeTask = findActiveTask(tasksDir, tasksProgress);

		// Separate F0 (intermittent) from other features
		const intermittentFeature = tasksProgress.features.find(
			(f) => f.id === "0",
		);
		const mainFeatures = tasksProgress.features.filter((f) => f.id !== "0");

		const mainFeaturesList = mainFeatures
			.map((f: Feature) => {
				const statusIcon = this.getStatusIcon(f.status);
				return `  ${statusIcon} F${f.id}: ${f.title} (${f.status})`;
			})
			.join("\n");

		const intermittentTasksList =
			intermittentFeature && intermittentFeature.stories.length > 0
				? intermittentFeature.stories
						.flatMap((s: Story) =>
							s.tasks.map((t: TaskRef) => ({
								task: t,
								story: s,
								feature: intermittentFeature,
							})),
						)
						.filter((item) => item.task.status !== "completed")
						.map((item) => {
							const statusIcon = this.getStatusIcon(item.task.status);
							return `  ${statusIcon} T${item.task.id}: ${item.task.title} (${item.task.status}) 🔄`;
						})
						.join("\n") || "  No intermittent tasks"
				: "  No intermittent tasks";

		return this.success(
			[
				Text.heading(`PROJECT: ${tasksProgress.project}`),
				"",
				Text.section("PROGRESS"),
				`Features: ${stats.completedFeatures}/${stats.totalFeatures} completed`,
				`Stories:  ${stats.completedStories}/${stats.totalStories} completed`,
				`Tasks:    ${stats.completedTasks}/${stats.totalTasks} completed`,
				"",
				activeTask
					? Text.success(
							`ACTIVE TASK: ${activeTask.taskId} (${activeTask.content.status})`,
						)
					: "No active task",
				"",
				Text.section("MAIN FEATURES"),
				mainFeaturesList || "  No main features",
				"",
				Text.section("INTERMITTENT TASKS (Side Tasks)"),
				intermittentTasksList,
			].join("\n"),
			[
				"View detailed status:",
				"  taskflow status <feature-id>  (e.g., 'taskflow status 1')",
				"  taskflow status <story-id>    (e.g., 'taskflow status 1.1')",
				"",
				activeTask ? "Continue working:" : "Start working:",
				activeTask
					? `  taskflow check  (continue task ${activeTask.taskId})`
					: "  taskflow next   (find next available task)",
			].join("\n"),
			{
				contextFiles: [
					activeTask
						? `Task ${activeTask.taskId} is active - run 'taskflow check' to continue`
						: "No active task - run 'taskflow next' to find available tasks",
				],
			},
		);
	}

	private showFeatureStatus(
		tasksProgress: TasksProgress,
		featureId: string,
	): CommandResult {
		const feature = findFeature(tasksProgress, featureId);
		if (!feature) {
			return this.failure(
				`Feature F${featureId} not found`,
				[],
				"Run 'taskflow status' to see all features.",
			);
		}

		const storiesList = feature.stories
			.map((s: Story) => {
				const statusIcon = this.getStatusIcon(s.status);
				const tasksCount = s.tasks.length;
				const completedTasks = s.tasks.filter(
					(t: TaskRef) => t.status === "completed",
				).length;
				return `  ${statusIcon} S${s.id}: ${s.title} (${completedTasks}/${tasksCount} tasks ${s.status})`;
			})
			.join("\n");

		return this.success(
			[
				Text.heading(`FEATURE F${feature.id}: ${feature.title}`),
				`Status: ${feature.status}`,
				"",
				Text.section("STORIES"),
				storiesList || "  No stories",
			].join("\n"),
			[
				"View story details:",
				`  taskflow status <story-id>  (e.g., 'taskflow status ${feature.id}.1')`,
				"",
				"Start a task:",
				"  taskflow next   (find next available task)",
			].join("\n"),
		);
	}

	private showStoryStatus(
		tasksProgress: TasksProgress,
		storyId: string,
	): CommandResult {
		const location = findStoryLocation(tasksProgress, storyId);
		if (!location) {
			return this.failure(
				`Story S${storyId} not found`,
				[],
				"Run 'taskflow status' to see all stories.",
			);
		}

		const { story, feature } = location;

		const tasksList = story.tasks
			.map((t: TaskRef) => {
				const statusIcon = this.getStatusIcon(t.status);
				const deps =
					t.dependencies && t.dependencies.length > 0
						? ` [deps: ${t.dependencies.join(", ")}]`
						: "";
				return `  ${statusIcon} T${t.id}: ${t.title} (${t.status})${deps}`;
			})
			.join("\n");

		return this.success(
			[
				Text.heading(`STORY S${story.id}: ${story.title}`),
				`Feature: F${feature.id} - ${feature.title}`,
				`Status: ${story.status}`,
				"",
				Text.section("TASKS"),
				tasksList || "  No tasks",
			].join("\n"),
			[
				"Start a task:",
				`  taskflow start <task-id>  (e.g., 'taskflow start ${story.id}.0')`,
				"",
				"Or find next available:",
				"  taskflow next",
			].join("\n"),
		);
	}

	private getStatusIcon(status: string): string {
		const icons: Record<string, string> = {
			"not-started": Colors.muted("○"),
			"in-progress": Colors.primary("◐"),
			setup: Colors.primary("◐"),
			implementing: Colors.primary("◐"),
			verifying: Colors.warning("◐"),
			validating: Colors.warning("◐"),
			committing: Colors.success("◐"),
			completed: Colors.success("●"),
			blocked: Colors.error("✗"),
			"on-hold": Colors.muted("⊘"),
		};
		return icons[status] || "?";
	}
}
