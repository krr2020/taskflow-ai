/**
 * Next command - Find to next available task
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

		// Find next available task (non-intermittent first)
		const nextTask = findNextAvailableTask(tasksProgress);

		if (!nextTask && !activeTask) {
			// No tasks available
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

		// If nextTask exists, use it
		if (nextTask) {
			const { task, story, feature } = nextTask;

			// If next task is intermittent, show it as side task
			if (nextTask.isIntermittent) {
				return this.success(
					[
						"NEXT AVAILABLE TASK (Side Task):",
						"─".repeat(60),
						`Task:    T${task.id} - ${task.title} 🔄`,
						`Story:   S${story.id} - ${story.title}`,
						`Feature: F${feature.id} - ${feature.title}`,
						"",
						"This is an intermittent task that can be worked on independently of other features.",
					].join("\n"),
					[
						"To start this side task, run:",
						`  taskflow start ${task.id}`,
						"",
						"This will:",
						"  1. Load task requirements and context",
						"  2. Set status to SETUP",
						"  3. Allow you to work on this task independently",
					].join("\n"),
					{
						aiGuidance: [
							"Side Task Identified",
							"",
							"TASK DETAILS:",
							"──────────────",
							`ID: ${task.id}`,
							`Title: ${task.title}`,
							`Story: ${story.title}`,
							`Feature: ${feature.title}`,
							"",
							"TASK TYPE:",
							"───────────",
							"This is a SIDE TASK (intermittent task).",
							"",
							"WHAT THIS MEANS:",
							"────────────────",
							"Side tasks are for quick fixes, bug fixes, or small work",
							"that can be done independently of main feature work.",
							"",
							"You can work on this task alongside your main feature.",
							"It won't block or be blocked by other tasks.",
							"",
							"TO START:",
							"──────────",
							`Run: taskflow start ${task.id}`,
						].join("\n"),
						contextFiles: [
							`Side task T${task.id} - ${task.title}`,
							"Run 'taskflow start' to begin",
						],
						warnings: [
							"This is a side task - can be worked on independently",
							"Consider pausing main feature work if urgent",
							"DO NOT skip reading context files in SETUP phase",
						],
					},
				);
			}

			// Non-intermittent task
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
						"1. Read task file with full requirements",
						"2. Review ai-protocol.md for operating discipline",
						"3. Check the retrospective.md for known mistakes to avoid",
						"4. Study coding-standards.md and architecture-rules.md",
						"5. Review any skill-specific guidelines",
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
						"DO NOT skip reading context files in the SETUP phase",
						"ALWAYS follow the workflow phases in order",
					],
				},
			);
		}

		// If active task exists and no next task available, show active task info
		if (activeTask) {
			return this.success(
				"Active Task Found",
				[
					"CURRENT TASK:",
					"─".repeat(60),
					`Task:    T${activeTask.taskId}`,
					`Status:  ${activeTask.content.status}`,
					`Title:   ${activeTask.content.title}`,
				].join("\n"),
				{
					aiGuidance: [
						"To continue with the current task:",
						"  taskflow check",
						"",
						"To skip or block the task:",
						"  taskflow skip <reason>",
					].join("\n"),
				},
			);
		}

		// Default fallback - shouldn't reach here but for completeness
		return this.success(
			"Task Status",
			[
				"Check status with: taskflow status",
				"No specific task recommendation",
			].join("\n"),
		);
	}
}
