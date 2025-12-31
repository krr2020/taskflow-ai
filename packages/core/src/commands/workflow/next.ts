/**
 * Next command - Find the next available task
 */

import { ConfigLoader } from "../../lib/config-loader.js";
import {
	calculateProgressStats,
	findActiveTask,
	findNextAvailableTask,
	loadTasksProgress,
} from "../../lib/data-access.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class NextCommand extends BaseCommand {
	async execute(): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();

		// Load tasks progress
		const tasksProgress = loadTasksProgress(paths.tasksDir);

		// Check for active task
		const activeTask = findActiveTask(paths.tasksDir, tasksProgress);
		if (activeTask) {
			return this.failure(
				`Active task exists: ${activeTask.taskId}`,
				[
					`Task ${activeTask.taskId} is currently ${activeTask.content.status}`,
					`Title: ${activeTask.content.title}`,
				],
				[
					"You must complete or skip the current task first:",
					"",
					"To continue working:",
					"  taskflow check  (advance task status)",
					"",
					"To skip/block task:",
					"  taskflow skip <reason>  (mark as blocked)",
				].join("\n"),
			);
		}

		// Find next available task
		const nextTask = findNextAvailableTask(tasksProgress);

		if (!nextTask) {
			const stats = calculateProgressStats(tasksProgress);

			return this.success(
				[
					"🎉 All tasks completed!",
					"",
					"PROGRESS:",
					"─".repeat(60),
					`Features: ${stats.completedFeatures}/${stats.totalFeatures} completed`,
					`Stories:  ${stats.completedStories}/${stats.totalStories} completed`,
					`Tasks:    ${stats.completedTasks}/${stats.totalTasks} completed`,
				].join("\n"),
				[
					"No more tasks available. Options:",
					"",
					"1. Review project status:",
					"   taskflow status",
					"",
					"2. Generate more tasks:",
					"   taskflow tasks generate <prd-file>",
					"",
					"3. Create a new PRD:",
					"   taskflow prd create <feature-name>",
				].join("\n"),
				{
					aiGuidance: [
						"All Tasks Complete! 🎉",
						"",
						"WHAT THIS MEANS:",
						"───────────────────",
						"You've completed all available tasks in the project.",
						"",
						"NEXT OPTIONS:",
						"──────────────",
						"1. REVIEW: Run 'taskflow status' to see completed work",
						"2. EXPAND: Generate more tasks from existing PRD",
						"3. NEW FEATURE: Create a new PRD and generate tasks",
						"",
						"TASK GENERATION:",
						"─────────────────",
						"To generate more tasks, you need a PRD file.",
						"Run: taskflow prd create <feature-name>",
						"Then: taskflow tasks generate <prd-file>",
					].join("\n"),
				},
			);
		}

		const { task, story, feature } = nextTask;

		return this.success(
			[
				"NEXT AVAILABLE TASK:",
				"─".repeat(60),
				`Task:    T${task.id} - ${task.title}`,
				`Story:   S${story.id} - ${story.title}`,
				`Feature: F${feature.id} - ${feature.title}`,
				"",
				task.dependencies && task.dependencies.length > 0
					? `Dependencies: ${task.dependencies.join(", ")} (all met)`
					: "No dependencies",
			].join("\n"),
			[
				"To start this task, run:",
				`  taskflow start ${task.id}`,
				"",
				"This will:",
				`  1. Switch to branch: story/S${story.id}-${story.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
				"  2. Load task requirements and context",
				"  3. Set status to SETUP",
				"  4. Provide all necessary context files",
			].join("\n"),
			{
				aiGuidance: [
					"Next Task Identified",
					"",
					"TASK DETAILS:",
					"──────────────",
					`ID: ${task.id}`,
					`Title: ${task.title}`,
					`Story: ${story.title}`,
					`Feature: ${feature.title}`,
					"",
					task.dependencies && task.dependencies.length > 0
						? "DEPENDENCIES:"
						: "",
					task.dependencies && task.dependencies.length > 0
						? "──────────────"
						: "",
					task.dependencies && task.dependencies.length > 0
						? `All dependencies met: ${task.dependencies.join(", ")}`
						: "",
					task.dependencies && task.dependencies.length > 0 ? "" : "",
					"TO START:",
					"──────────",
					`Run: taskflow start ${task.id}`,
					"",
					"This will begin the SETUP phase where you'll:",
					"1. Read the task file with full requirements",
					"2. Review AI-PROTOCOL.md for operating discipline",
					"3. Check RETROSPECTIVE.md for known mistakes",
					"4. Study CODING-STANDARDS.md and ARCHITECTURE-RULES.md",
					"5. Review skill-specific guidelines",
					"6. Understand the complete task before coding",
					"",
					"WORKFLOW PHASES:",
					"─────────────────",
					"SETUP → PLANNING → IMPLEMENTING → VERIFYING → VALIDATING → COMMITTING → COMPLETED",
					"",
					"Each phase has specific requirements and checks.",
					"The system will guide you through each transition.",
				].join("\n"),
				contextFiles: [
					`Story S${story.id} requires branch: story/S${story.id}-${story.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
					"Run 'taskflow start' to begin",
				],
				warnings: [
					"DO NOT start working without running 'taskflow start' first",
					"DO NOT skip reading the context files in SETUP phase",
					"ALWAYS follow the workflow phases in order",
				],
			},
		);
	}
}
