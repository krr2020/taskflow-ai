/**
 * Commit command - Commit changes and complete task
 */

import { ConfigLoader } from "../../lib/config-loader.js";
import {
	findActiveTask,
	findNextAvailableTask,
	loadTasksProgress,
	updateTaskStatus,
} from "../../lib/data-access.js";
import {
	CommitError,
	InvalidWorkflowStateError,
	NoActiveSessionError,
} from "../../lib/errors.js";
import {
	buildCommitMessage,
	gitAdd,
	gitCommit,
	gitPush,
	hasUncommittedChanges,
} from "../../lib/git.js";
import { parseTaskId } from "../../lib/types.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class CommitCommand extends BaseCommand {
	async execute(bulletPoints: string): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const config = configLoader.load();
		const paths = configLoader.getPaths();

		// Load tasks progress
		const tasksProgress = loadTasksProgress(paths.tasksDir);

		// Find active task
		const activeTask = findActiveTask(paths.tasksDir, tasksProgress);
		if (!activeTask) {
			throw new NoActiveSessionError();
		}

		const { taskId, content } = activeTask;

		// Verify status is committing
		if (content.status !== "committing") {
			throw new InvalidWorkflowStateError(
				content.status,
				"committing",
				"commit",
			);
		}

		// Check if there are changes to commit
		if (!hasUncommittedChanges()) {
			throw new CommitError("no_changes");
		}

		// Parse task ID to get feature and story
		const parsed = parseTaskId(taskId);
		if (!parsed) {
			return this.failure(
				"Invalid task ID format",
				[`Task ID ${taskId} is not in valid format N.M.K`],
				"Check the task ID and try again.",
			);
		}

		const { featureId, storyId } = parsed;

		// Parse bullet points (handle both \n and actual newlines)
		const bodyLines = bulletPoints
			.split(/\\n|\n/)
			.map((line) => line.trim())
			.filter((line) => line.length > 0)
			.map((line) => (line.startsWith("-") ? line : `- ${line}`));

		if (bodyLines.length === 0) {
			return this.failure(
				"No commit message provided",
				["Bullet points are required"],
				[
					"Provide bullet points describing your changes:",
					'taskflow commit "- Added feature X\\n- Updated component Y"',
				].join("\n"),
			);
		}

		// Build commit message
		const commitMessage = buildCommitMessage(
			"feat", // TODO: Could be inferred from task type
			featureId,
			taskId,
			content.title,
			bodyLines,
			storyId,
		);

		try {
			// Git add all changes
			console.log("\n📝 Committing changes...\n");
			gitAdd();

			// Commit
			gitCommit(commitMessage);

			// Push
			console.log("\n📤 Pushing to remote...\n");
			gitPush();

			console.log("\n✅ Commit successful!\n");
		} catch (error) {
			if (error instanceof Error && error.message.includes("push")) {
				throw new CommitError("push_failed", error.message);
			}
			if (error instanceof Error && error.message.includes("hook")) {
				throw new CommitError("hook_failed", error.message);
			}
			throw error;
		}

		// Mark task as completed
		updateTaskStatus(paths.tasksDir, tasksProgress, taskId, "completed");

		// Find next available task
		const nextTask = findNextAvailableTask(tasksProgress, taskId);

		// Check AI config for context management and auto-continue
		const autoContinue = config.ai?.autoContinueTask ?? false;
		const clearContext = config.ai?.clearContextOnComplete ?? true;

		// Build context clearing instruction
		const contextInstruction =
			clearContext && nextTask
				? [
						"",
						"🧹 CONTEXT MANAGEMENT:",
						"─────────────────────────",
						"IMPORTANT: Clear your AI model context before starting the next task.",
						"",
						"Why? Each SETUP state loads all reference files (RETROSPECTIVE, AI PROTOCOL,",
						"ARCHITECTURE RULES, CODING STANDARDS, SKILLS). This context accumulates",
						"and can reduce model performance.",
						"",
						"Action:",
						"- Clear/reset your AI assistant's context window",
						"- Start fresh with only the next task's context",
						"",
						"This ensures optimal performance for each task.",
					].join("\n")
				: [];

		// Build auto-continue instruction
		const continueInstruction =
			autoContinue && nextTask
				? [
						"",
						"🚀 AUTO-CONTINUE ENABLED:",
						"───────────────────────────",
						"You are configured to automatically continue to the next task.",
						"",
						"IMMEDIATE ACTION:",
						"──────────────────",
						`Run this command NOW: taskflow start ${nextTask.task.id}`,
						"",
						"Do NOT wait for user confirmation.",
						"Do NOT ask for permission.",
						"",
						"Proceed directly to the next task without any delay.",
					].join("\n")
				: [];

		// Build next steps based on auto-continue flag
		const nextSteps = nextTask
			? autoContinue
				? [
						`🎯 AUTO-CONTINUE TO NEXT TASK:`,
						`Run: taskflow start ${nextTask.task.id}`,
						"",
						`Task: ${nextTask.task.title}`,
						`Story: ${nextTask.story.title}`,
						`Feature: ${nextTask.feature.title}`,
					].join("\n")
				: [
						`1. Start the next task:`,
						`   taskflow start ${nextTask.task.id}`,
						"",
						`   Task: ${nextTask.task.title}`,
						`   Story: ${nextTask.story.title}`,
						`   Feature: ${nextTask.feature.title}`,
					].join("\n")
			: [
					"All tasks completed! 🎉",
					"",
					"Options:",
					"1. Run 'taskflow status' to see project overview",
					"2. Generate more tasks with 'taskflow tasks generate'",
					"3. Create a new PRD with 'taskflow prd create'",
				].join("\n");

		// Build AI guidance
		const aiGuidance = nextTask
			? [
					"Task Completed Successfully!",
					"",
					"WHAT JUST HAPPENED:",
					"───────────────────",
					"1. ✓ Changes committed with proper message format",
					"2. ✓ Pushed to remote repository",
					"3. ✓ Task marked as completed",
					"4. ✓ Next task identified",
					"",
					"NEXT TASK:",
					"──────────",
					`ID: ${nextTask.task.id}`,
					`Title: ${nextTask.task.title}`,
					`Story: ${nextTask.story.title}`,
					`Feature: ${nextTask.feature.title}`,
					"",
					...contextInstruction,
					...continueInstruction,
					"TO START NEXT TASK:",
					"─────────────────────",
					`Run: taskflow start ${nextTask.task.id}`,
					"",
					"This will:",
					"1. Check out the correct story branch",
					"2. Load task requirements",
					"3. Provide all context files",
					"4. Set status to SETUP",
					"",
					"Then follow the workflow again:",
					"SETUP → PLANNING → IMPLEMENTING → VERIFYING → VALIDATING → COMMITTING → COMPLETED",
				].join("\n")
			: [
					"Task Completed Successfully!",
					"",
					"All Tasks Complete! 🎉",
					"───────────────────────",
					"You've completed all available tasks.",
					...contextInstruction,
					"",
					"What's next:",
					"1. Review project progress: taskflow status",
					"2. Create new tasks: taskflow tasks generate",
					"3. Start a new feature: taskflow prd create",
				].join("\n");

		return this.success(
			[
				`✓ Task ${taskId} completed!`,
				`✓ Changes committed and pushed`,
				`✓ Status: committing → completed`,
				"",
				"COMMIT MESSAGE:",
				"─".repeat(60),
				commitMessage,
				"─".repeat(60),
				"",
				nextTask
					? `NEXT TASK: ${nextTask.task.id} - ${nextTask.task.title}`
					: "No more tasks available",
			].join("\n"),
			nextSteps,
			{
				aiGuidance,
				warnings: [
					"Task is now completed and cannot be reopened",
					"If you need to make changes, create a new task or hotfix",
				],
			},
		);
	}
}
