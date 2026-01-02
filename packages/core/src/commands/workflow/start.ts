/**
 * Start command - Start working on a task
 */

import { ConfigLoader } from "../../lib/config-loader.js";
import {
	getRefFilePath,
	getSkillFilePath,
	REF_FILES,
} from "../../lib/config-paths.js";
import {
	checkDependenciesMet,
	findActiveTask,
	findTaskLocation,
	getTaskFilePath,
	getUnmetDependencies,
	loadTaskFile,
	loadTasksProgress,
	updateTaskStatus,
} from "../../lib/data-access.js";
import {
	ActiveSessionExistsError,
	DependencyNotMetError,
	TaskAlreadyCompletedError,
	TaskNotFoundError,
} from "../../lib/errors.js";
import { verifyBranch } from "../../lib/git.js";
import { consoleOutput } from "../../lib/output.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class StartCommand extends BaseCommand {
	async execute(taskId: string): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();

		// Load tasks progress
		const tasksProgress = loadTasksProgress(paths.tasksDir);

		// Find task first to check if it's intermittent
		const location = findTaskLocation(tasksProgress, taskId);
		if (!location) {
			throw new TaskNotFoundError(taskId);
		}

		const { task } = location;

		// Check for existing active session
		const activeTask = findActiveTask(paths.tasksDir, tasksProgress);

		// Allow starting intermittent tasks even if active task exists
		const isSwitchingToIntermittent = task.isIntermittent;
		if (
			activeTask &&
			activeTask.taskId !== taskId &&
			!isSwitchingToIntermittent
		) {
			throw new ActiveSessionExistsError(activeTask.taskId);
		}

		// If active task exists and we're starting an intermittent task, show warning
		if (activeTask && isSwitchingToIntermittent) {
			consoleOutput(
				`\n⚠️  Switching to intermittent task. Main task ${activeTask.taskId} is paused.\n`,
			);
		}

		const { story } = location;

		// Check if task is already completed
		if (task.status === "completed") {
			throw new TaskAlreadyCompletedError(taskId);
		}

		// Check dependencies
		const depsMet = checkDependenciesMet(tasksProgress, task);
		if (!depsMet) {
			const unmetDeps = getUnmetDependencies(tasksProgress, task);
			throw new DependencyNotMetError(taskId, unmetDeps);
		}

		// Verify/switch to correct branch
		verifyBranch(story);

		// Load task file
		const taskFilePath = getTaskFilePath(paths.tasksDir, tasksProgress, taskId);
		const taskContent = taskFilePath ? loadTaskFile(taskFilePath) : null;

		if (!taskContent) {
			return this.failure(
				`Task file not found for ${taskId}`,
				[`Expected task file at: ${taskFilePath || "unknown"}`],
				"Ensure task files are generated properly.",
			);
		}

		// Update status to 'setup'
		updateTaskStatus(paths.tasksDir, tasksProgress, taskId, "setup");

		// Prepare context files list
		const contextFiles = [
			`${taskFilePath} - Task definition and requirements`,
			`${getRefFilePath(paths.refDir, REF_FILES.aiProtocol)} - Core AI operating discipline`,
			`${getRefFilePath(paths.refDir, REF_FILES.taskExecutor)} - Task execution workflow`,
			`${getRefFilePath(paths.refDir, REF_FILES.retrospective)} - Known error patterns to avoid`,
			`${getRefFilePath(paths.refDir, REF_FILES.codingStandards)} - Project coding standards`,
			`${getRefFilePath(paths.refDir, REF_FILES.architectureRules)} - Project architecture rules`,
			`${getSkillFilePath(paths.refDir, taskContent.skill || "backend")} - ${taskContent.skill || "backend"} skill guidelines`,
		];

		// Add task context files
		if (taskContent.context && taskContent.context.length > 0) {
			contextFiles.push("");
			contextFiles.push("Task-specific context:");
			for (const ctx of taskContent.context) {
				contextFiles.push(`  ${ctx}`);
			}
		}

		// Get LLM-powered guidance if available
		let llmGuidance = "";
		if (this.isLLMAvailable()) {
			llmGuidance = await this.getLLMGuidance({
				task: `${taskId}: ${taskContent.title}`,
				status: "setup",
				files: taskContent.context || [],
				instructions: [
					`Task description: ${taskContent.description}`,
					`Skill: ${taskContent.skill || "backend"}`,
					`Subtasks: ${taskContent.subtasks?.length || 0}`,
					`Acceptance criteria: ${taskContent.acceptanceCriteria?.join(", ") || "none"}`,
				].join("\n"),
			});
		}

		return this.success(
			[
				`✓ Task ${taskId} started: ${task.title}`,
				`✓ Status: not-started → setup`,
				`✓ Branch: story/S${story.id}-${story.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
				`✓ Skill: ${taskContent.skill || "backend"}`,
				"",
				"TASK DETAILS:",
				"─".repeat(60),
				`Title: ${taskContent.title}`,
				`Description: ${taskContent.description}`,
				"",
				taskContent.subtasks && taskContent.subtasks.length > 0
					? `Subtasks (${taskContent.subtasks.length}):`
					: "No subtasks defined",
				...(taskContent.subtasks || []).map(
					(st) =>
						`  [${st.status === "completed" ? "x" : " "}] ${st.id}. ${st.description}`,
				),
			].join("\n"),
			[
				"1. Read ALL context files listed above",
				"   CRITICAL: Read these files in order:",
				"   a) Task file - understand requirements",
				"   b) ai-protocol.md - core discipline",
				"   c) retrospective.md - avoid known mistakes",
				"   d) coding-standards.md - follow project standards",
				"   e) architecture-rules.md - follow project architecture",
				`   f) skills/${taskContent.skill || "backend"}.md - skill-specific guidance`,
				"",
				"2. Understand the complete task before proceeding",
				"   - What is the goal?",
				"   - What are the acceptance criteria?",
				"   - What files will you need to modify?",
				"   - What are the potential pitfalls?",
				"",
				"3. When you've read everything and understand the task, run:",
				"   taskflow check",
				"   This will advance you to PLANNING status",
			].join("\n"),
			{
				aiGuidance: llmGuidance
					? [
							"Current Status: SETUP",
							"Your Goal: Understand the task completely before writing ANY code",
							"",
							"LLM ANALYSIS:",
							"──────────────",
							llmGuidance,
							"",
							"WHEN READY:",
							"────────────",
							"Run 'taskflow check' to advance to PLANNING status",
						].join("\n")
					: [
							"Current Status: SETUP",
							"Your Goal: Understand the task completely before writing ANY code",
							"",
							"CRITICAL - Operating Mode:",
							"────────────────────────────",
							"Determine appropriate depth:",
							"- REACTIVE: Simple fix, single file, clear requirements",
							"- ANALYTICAL: Multi-file, moderate complexity, pattern matching",
							"- ULTRATHINK: Architecture decisions, security, new patterns",
							"",
							"CRITICAL - Discovery First:",
							"────────────────────────────",
							"1. Read the task file completely",
							"2. Read ai-protocol.md - this is your operating manual",
							"3. Read retrospective.md - these are mistakes already made",
							"4. Read project standards (coding-standards.md, architecture-rules.md)",
							`5. Read skill file (skills/${taskContent.skill || "backend"}.md)`,
							"6. Search for similar implementations in the codebase",
							"7. Understand existing patterns before writing code",
							"",
							"DO NOT:",
							"────────",
							"- Write any code yet (you're in SETUP status)",
							"- Skip reading the context files",
							"- Ignore the retrospective",
							"- Guess at patterns - search and match instead",
							"",
							"WHEN READY:",
							"────────────",
							"Run 'taskflow check' to advance to PLANNING status",
							"Then create your execution plan before writing code",
						].join("\n"),
				contextFiles,
				warnings: [
					"DO NOT write code in SETUP status - read and understand first",
					"DO NOT skip reading retrospective.md - it contains critical learnings",
					"DO NOT edit .taskflow/ or tasks/ directories - use taskflow commands only",
					"DO NOT proceed without reading ALL context files",
				],
			},
		);
	}
}
