/**
 * Skip command - Mark task as blocked
 */

import { ConfigLoader } from "../../lib/config-loader.js";
import {
	findActiveTask,
	findNextAvailableTask,
	getTaskFilePath,
	loadTasksProgress,
	updateTaskStatus,
} from "../../lib/data-access.js";
import { NoActiveSessionError } from "../../lib/errors.js";
import { exists, writeJson } from "../../lib/file-utils.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class SkipCommand extends BaseCommand {
	async execute(reason: string): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();

		// Load tasks progress
		const tasksProgress = loadTasksProgress(paths.tasksDir);

		// Find active task
		const activeTask = findActiveTask(paths.tasksDir, tasksProgress);
		if (!activeTask) {
			throw new NoActiveSessionError();
		}

		const { taskId, content } = activeTask;

		// Validate reason is provided
		if (!reason || reason.trim().length === 0) {
			return this.failure(
				"Block reason is required",
				["You must provide a reason for blocking the task"],
				[
					"Provide a reason when skipping:",
					'  taskflow skip "Waiting for API documentation"',
					'  taskflow skip "Dependency on task 1.2.1 not yet complete"',
					'  taskflow skip "Need clarification on requirements"',
				].join("\n"),
			);
		}

		// Check if task is already blocked or completed
		if (content.status === "blocked") {
			return this.failure(
				"Task is already blocked",
				[
					`Task ${taskId} is already blocked`,
					`Current reason: ${content.blockedReason || "No reason provided"}`,
				],
				[
					"To resume this task:",
					"  taskflow resume",
					"",
					"To update the block reason, resume first then skip again.",
				].join("\n"),
			);
		}

		if (content.status === "completed") {
			return this.failure(
				"Cannot block completed task",
				[`Task ${taskId} is already completed`],
				"Completed tasks cannot be blocked. Create a new task if needed.",
			);
		}

		// Store previous status and update to blocked
		const previousStatus = content.status;

		// Update task file with blocked status and reason
		const taskFilePath = getTaskFilePath(paths.tasksDir, tasksProgress, taskId);
		if (taskFilePath && exists(taskFilePath)) {
			const updatedContent = {
				...content,
				status: "blocked" as const,
				blockedReason: reason.trim(),
				previousStatus: previousStatus,
			};

			writeJson(taskFilePath, updatedContent);
		}

		// Update status in progress file
		updateTaskStatus(paths.tasksDir, tasksProgress, taskId, "blocked");

		// Find next available task
		const nextTask = findNextAvailableTask(tasksProgress, taskId);

		return this.success(
			[
				`✓ Task ${taskId} marked as blocked`,
				`✓ Status: ${previousStatus} → blocked`,
				`✓ Reason: ${reason}`,
				"",
				nextTask
					? `NEXT AVAILABLE TASK: T${nextTask.task.id} - ${nextTask.task.title}`
					: "No other tasks available",
			].join("\n"),
			nextTask
				? [
						"1. Start the next task:",
						`   taskflow start ${nextTask.task.id}`,
						"",
						`   Task: ${nextTask.task.title}`,
						`   Story: ${nextTask.story.title}`,
						`   Feature: ${nextTask.feature.title}`,
						"",
						"2. Or resume the blocked task when ready:",
						"   taskflow resume",
					].join("\n")
				: [
						"No other tasks available to work on.",
						"",
						"Options:",
						"1. Resume this task when blocker is resolved:",
						"   taskflow resume",
						"",
						"2. Check overall status:",
						"   taskflow status",
						"",
						"3. Generate more tasks:",
						"   taskflow tasks generate <prd-file>",
					].join("\n"),
			{
				aiGuidance: nextTask
					? [
							"Task Blocked Successfully",
							"",
							"WHAT HAPPENED:",
							"───────────────",
							`✓ Task ${taskId} marked as blocked`,
							`✓ Previous status (${previousStatus}) saved for resume`,
							`✓ Block reason: ${reason}`,
							"",
							"NEXT AVAILABLE TASK:",
							"────────────────────",
							`ID: ${nextTask.task.id}`,
							`Title: ${nextTask.task.title}`,
							`Story: ${nextTask.story.title}`,
							`Feature: ${nextTask.feature.title}`,
							"",
							"TO START NEXT TASK:",
							"────────────────────",
							`Run: taskflow start ${nextTask.task.id}`,
							"",
							"This will:",
							"1. Check out the correct story branch",
							"2. Load task requirements",
							"3. Provide all context files",
							"4. Set status to SETUP",
							"",
							"TO RESUME BLOCKED TASK LATER:",
							"──────────────────────────────",
							"When the blocker is resolved:",
							"Run: taskflow resume",
							"",
							`This will restore status to ${previousStatus}`,
							"You can continue from where you left off",
						].join("\n")
					: [
							"Task Blocked - No Other Tasks Available",
							"",
							"WHAT HAPPENED:",
							"───────────────",
							`✓ Task ${taskId} marked as blocked`,
							`✓ Previous status (${previousStatus}) saved for resume`,
							`✓ Block reason: ${reason}`,
							"",
							"NO OTHER TASKS:",
							"────────────────",
							"There are no other available tasks to work on.",
							"",
							"OPTIONS:",
							"─────────",
							"1. Wait for blocker to be resolved, then resume:",
							"   taskflow resume",
							"",
							"2. Check project status:",
							"   taskflow status",
							"",
							"3. Generate more tasks if needed:",
							"   taskflow tasks generate <prd-file>",
							"",
							"4. Create a new feature:",
							"   taskflow prd create <feature-name>",
						].join("\n"),
				contextFiles: nextTask
					? [
							`Next task: ${nextTask.task.id}`,
							"Run 'taskflow start' when ready",
						]
					: ["No tasks available", "Resolve blocker or generate more tasks"],
				warnings: [
					"Blocked tasks are not included in progress calculations",
					"Remember to resume the task when blocker is resolved",
					nextTask
						? "Starting a new task will not automatically resume the blocked task"
						: "All tasks may be blocked - check project status",
				],
			},
		);
	}
}
