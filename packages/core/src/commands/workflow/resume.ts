/**
 * Resume command - Resume a blocked or on-hold task
 */

import { BaseCommand, type CommandResult } from "@/commands/base";
import { ConfigLoader } from "@/lib/config/config-loader";
import { NoActiveSessionError, TaskflowError } from "@/lib/core/errors";
import type { TaskStatus } from "@/lib/core/types";
import {
	getRefFilePath,
	getSkillFilePath,
	REF_FILES,
} from "../../lib/config/config-paths.js";
import {
	findActiveTask,
	getTaskFilePath,
	loadTaskFile,
	loadTasksProgress,
	updateTaskStatus,
} from "../../lib/core/data-access.js";

export class ResumeCommand extends BaseCommand {
	async execute(resumeStatus?: string): Promise<CommandResult> {
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

		// Check if task is blocked or on-hold
		if (content.status !== "blocked" && content.status !== "on-hold") {
			return this.failure(
				"Task is not blocked or on-hold",
				[
					`Task ${taskId} is currently ${content.status}`,
					"Resume command is only for blocked or on-hold tasks",
				],
				[
					"To continue working on an active task:",
					"  taskflow check  (advance to next status)",
					"",
					"Current task status will guide you on next steps.",
				].join("\n"),
			);
		}

		// Determine resume status (default to the status before blocking)
		const targetStatus = resumeStatus || content.previousStatus || "setup";

		// Validate target status
		const validResumeStatuses = [
			"setup",
			"implementing",
			"verifying",
			"validating",
		];
		if (!validResumeStatuses.includes(targetStatus)) {
			return this.failure(
				`Invalid resume status: ${targetStatus}`,
				[
					"Resume status must be one of:",
					...validResumeStatuses.map((s) => `  - ${s}`),
				],
				[
					"Specify the status to resume to:",
					"  taskflow resume setup          (start fresh)",
					"  taskflow resume implementing   (continue coding)",
					"  taskflow resume verifying      (continue review)",
					"  taskflow resume validating     (re-run validations)",
				].join("\n"),
			);
		}

		// Update status
		updateTaskStatus(
			paths.tasksDir,
			tasksProgress,
			taskId,
			targetStatus as TaskStatus,
		);

		// Load task file for context
		const taskFilePath = getTaskFilePath(paths.tasksDir, tasksProgress, taskId);
		const taskContent = taskFilePath ? loadTaskFile(taskFilePath) : content;
		const skill = taskContent?.skill || "backend";

		// Prepare context files
		const contextFiles = [
			`${taskFilePath} - Task definition and requirements`,
			`${getRefFilePath(paths.refDir, REF_FILES.aiProtocol)} - Core AI operating discipline`,
			`${getRefFilePath(paths.refDir, REF_FILES.taskExecutor)} - Task execution workflow`,
			`${getRefFilePath(paths.refDir, REF_FILES.retrospective)} - Known error patterns to avoid`,
			`${getRefFilePath(paths.refDir, REF_FILES.codingStandards)} - Project coding standards`,
			`${getRefFilePath(paths.refDir, REF_FILES.architectureRules)} - Project architecture rules`,
			`${getSkillFilePath(paths.refDir, skill)} - ${skill} skill guidelines`,
		];

		// Status-specific guidance
		const statusGuidance: Record<string, { next: string; actions: string[] }> =
			{
				setup: {
					next: "Read context files and understand the task",
					actions: [
						"1. Review the task file completely",
						"2. Read ai-protocol.md for operating discipline",
						"3. Check retrospective.md for known mistakes",
						"4. Study coding-standards.md and architecture-rules.md",
						"5. When ready, run: taskflow check",
					],
				},
				implementing: {
					next: "Continue writing code to implement the task",
					actions: [
						"1. Review what you've implemented so far",
						"2. Complete remaining subtasks",
						"3. Follow existing code patterns",
						"4. Ensure proper error handling",
						"5. When implementation is complete, run: taskflow check",
					],
				},
				verifying: {
					next: "Perform self-review of your implementation",
					actions: [
						"1. Check for hardcoded values",
						"2. Look for 'any' types",
						"3. Verify error handling",
						"4. Ensure imports are correct",
						"5. Review against retrospective.md",
						"6. When self-review is complete, run: taskflow check",
					],
				},
				validating: {
					next: "Run automated validation checks",
					actions: [
						"1. Run: taskflow check",
						"2. This will execute:",
						"   - Format/Fix",
						"   - Type Check",
						"   - Lint",
						"   - Tests (if configured)",
						"3. Fix any errors that appear",
						"4. Re-run taskflow check until all pass",
					],
				},
			};

		const guidance = statusGuidance[targetStatus];
		if (!guidance) {
			throw new TaskflowError(
				`No guidance found for status: ${targetStatus}`,
				"INVALID_STATUS_GUIDANCE",
			);
		}

		return this.success(
			[
				`✓ Task ${taskId} resumed!`,
				`✓ Status: ${content.status} → ${targetStatus}`,
				`✓ Title: ${content.title}`,
				"",
				content.blockedReason
					? `Previous block reason: ${content.blockedReason}`
					: "",
				content.blockedReason ? "" : "",
				"NEXT:",
				"─".repeat(60),
				guidance.next,
			].join("\n"),
			guidance.actions.join("\n"),
			{
				aiGuidance: [
					`Current Status: ${targetStatus.toUpperCase()}`,
					`Task Resumed: ${taskId}`,
					"",
					content.blockedReason ? "PREVIOUS BLOCK REASON:" : "",
					content.blockedReason ? "───────────────────────" : "",
					content.blockedReason || "",
					content.blockedReason ? "" : "",
					"CONTEXT:",
					"─────────",
					"This task was previously blocked or on-hold.",
					"Review what was done before and continue from there.",
					"",
					"OPERATING MODE:",
					"────────────────",
					"Determine appropriate depth:",
					"- REACTIVE: Simple fix, single file, clear requirements",
					"- ANALYTICAL: Multi-file, moderate complexity, pattern matching",
					"- ULTRATHINK: Architecture decisions, security, new patterns",
					"",
					"NEXT ACTIONS:",
					"──────────────",
					...guidance.actions,
					"",
					"Remember to:",
					"- Review retrospective.md to avoid known mistakes",
					"- Follow existing code patterns",
					"- Verify imports before using them",
					"- Handle errors properly",
				].join("\n"),
				contextFiles,
				warnings: [
					"Review previous work before making changes",
					"Check retrospective.md for mistakes related to the block reason",
					"DO NOT rush - understand why it was blocked first",
				],
			},
		);
	}
}
