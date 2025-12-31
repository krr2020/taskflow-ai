/**
 * Do command - Get instructions for current status
 */

import { ConfigLoader } from "../../lib/config-loader.js";
import {
	getRefFilePath,
	getSkillFilePath,
	REF_FILES,
} from "../../lib/config-paths.js";
import {
	findActiveTask,
	findTaskLocation,
	loadReferenceFile,
	loadTasksProgress,
} from "../../lib/data-access.js";
import { NoActiveSessionError } from "../../lib/errors.js";
import { colors, icons } from "../../lib/output.js";
import type { ActiveStatus, TaskFileContent } from "../../lib/types.js";
import { parseTaskId } from "../../lib/types.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class DoCommand extends BaseCommand {
	async execute(): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();

		const tasksProgress = loadTasksProgress(paths.tasksDir);
		const activeTask = findActiveTask(paths.tasksDir, tasksProgress);

		if (!activeTask) {
			throw new NoActiveSessionError();
		}

		const location = findTaskLocation(tasksProgress, activeTask.taskId);
		if (!location) {
			throw new NoActiveSessionError();
		}

		const { feature, story, task } = location;
		const status = activeTask.content.status as ActiveStatus;
		const content = activeTask.content;
		const taskId = task.id;

		// Build header info
		const headerParts = [
			`Task ID: ${colors.task(taskId)}`,
			`Title: ${task.title}`,
			`Story: ${story.id} - ${story.title}`,
			`Feature: ${feature.id} - ${feature.title}`,
			`Status: ${colors.state(status)}`,
		];

		let result: Partial<CommandResult> = {};

		switch (status) {
			case "setup":
				result = this.getSetupState(paths.refDir, content, taskId);
				break;
			case "implementing":
				result = this.getImplementState(paths.refDir, content, taskId);
				break;
			case "verifying":
				result = this.getVerifyState(paths.refDir, content, taskId);
				break;
			case "validating":
				result = this.getValidateState();
				break;
			case "committing":
				result = this.getCommitState(feature.id, taskId, task.title);
				break;
			default:
				return this.failure(
					`Unknown status: ${status}`,
					[`Task status '${status}' is not recognized`],
					"Check the task file for valid status values",
				);
		}

		return this.success(
			`${headerParts.join("\n")}\n\n${result.output || ""}`,
			result.nextSteps || "",
			{
				aiGuidance: result.aiGuidance || "",
				contextFiles: result.contextFiles || [],
				warnings: result.warnings || [],
			},
		);
	}

	private formatSection(
		title: string,
		content: string,
		colorFn = colors.muted,
	): string {
		return [
			"",
			colors.highlight(`[${title}]`),
			colors.muted("─".repeat(50)),
			colorFn(content),
		].join("\n");
	}

	private formatReference(
		title: string,
		filePath: string,
		colorFn = colors.muted,
	): string {
		const content = loadReferenceFile(filePath);
		if (!content) return "";
		return this.formatSection(title, content, colorFn);
	}

	private formatTaskDetails(
		taskId: string,
		title: string,
		skill: string,
		description: string,
		subtasks: Array<{ id: string; description: string; status: string }>,
		context: string[],
	): string {
		const parts = [
			"",
			colors.highlight(`[TASK ${taskId}] ${title}`),
			`${colors.muted("Skill:")} ${colors.command(skill)}`,
			colors.muted("─".repeat(50)),
			description,
		];

		if (subtasks && subtasks.length > 0) {
			parts.push("", colors.infoBold("Checklist"));
			for (const st of subtasks) {
				const mark =
					st.status === "completed" ? `[${colors.success("x")}]` : "[ ]";
				parts.push(`${mark} ${st.id}: ${st.description}`);
			}
		}

		if (context && context.length > 0) {
			parts.push("", colors.infoBold("Context Files"));
			for (const c of context) {
				parts.push(`- ${c}`);
			}
		}
		return parts.join("\n");
	}

	private getSetupState(
		refDir: string,
		taskContent: TaskFileContent,
		taskId: string,
	): Partial<CommandResult> {
		const skill = taskContent.skill || "backend";
		parseTaskId(taskId);

		const outputParts: string[] = [];

		// CRITICAL SECTION
		outputParts.push(
			colors.errorBold(`${icons.alert} CRITICAL (Must Read Before Coding)`),
		);
		outputParts.push(colors.error("─".repeat(50)));
		outputParts.push(
			this.formatReference(
				"RETROSPECTIVE - Known Errors",
				getRefFilePath(refDir, REF_FILES.retrospective),
				colors.error,
			),
		);

		// REQUIRED SECTION
		outputParts.push(
			"",
			colors.warningBold(
				`${icons.brain} REQUIRED (Should Read Before Starting)`,
			),
		);
		outputParts.push(colors.warning("─".repeat(50)));
		outputParts.push(
			this.formatReference(
				"AI PROTOCOL",
				getRefFilePath(refDir, REF_FILES.aiProtocol),
				colors.muted,
			),
		);

		// TASK DETAILS
		outputParts.push(
			this.formatTaskDetails(
				taskId,
				taskContent.title,
				skill,
				taskContent.description,
				taskContent.subtasks || [],
				taskContent.context || [],
			),
		);

		// REFERENCE SECTION
		outputParts.push(
			"",
			colors.infoBold(`${icons.memo} REFERENCE (Read as Needed)`),
		);
		outputParts.push(colors.info("─".repeat(50)));
		outputParts.push(
			this.formatReference(
				`SKILL: ${skill.toUpperCase()}`,
				getSkillFilePath(refDir, skill),
				colors.command,
			),
		);
		outputParts.push(
			this.formatReference(
				"ARCHITECTURE RULES",
				getRefFilePath(refDir, REF_FILES.architectureRules),
				colors.info,
			),
		);
		outputParts.push(
			this.formatReference(
				"CODING STANDARDS",
				getRefFilePath(refDir, REF_FILES.codingStandards),
				colors.info,
			),
		);

		// QUICK START
		outputParts.push(
			"",
			colors.successBold(`${icons.rocket} QUICK START (3 Steps)`),
		);
		outputParts.push("1. Read RETROSPECTIVE to avoid known errors");
		outputParts.push("2. Read AI PROTOCOL to understand workflow rules");
		outputParts.push("3. Review TASK DETAILS and subtasks");

		return {
			output: outputParts.join("\n"),
			nextSteps:
				" When you understand the task, run 'taskflow check' to advance to IMPLEMENTING",
			aiGuidance: "Read and understand. do not code yet.",
			contextFiles: [
				REF_FILES.aiProtocol,
				REF_FILES.retrospective,
				REF_FILES.taskGenerator,
			],
		};
	}

	private getImplementState(
		refDir: string,
		taskContent: TaskFileContent,
		taskId: string,
	): Partial<CommandResult> {
		const skill = taskContent.skill || "backend";
		const outputParts: string[] = [];

		outputParts.push(
			colors.successBold(`${icons.code} IMPLEMENTING STATE - WRITE CODE NOW`),
		);
		outputParts.push(
			colors.success(
				"DO: Implement each subtask, follow standards, use context files",
			),
		);
		outputParts.push(
			colors.error("DO NOT: Modify .taskflow/ or tasks/ directly"),
		);

		outputParts.push(
			this.formatTaskDetails(
				taskId,
				taskContent.title,
				skill,
				taskContent.description,
				taskContent.subtasks || [],
				taskContent.context || [],
			),
		);

		outputParts.push(
			this.formatReference(
				"AVOID THESE KNOWN ERRORS",
				getRefFilePath(refDir, REF_FILES.retrospective),
				colors.error,
			),
		);

		return {
			output: outputParts.join("\n"),
			nextSteps: [
				"1. Implement each subtask in order (modifying ONLY project source files)",
				"2. Test your changes locally",
				"3. taskflow check  (When ALL subtasks are complete)",
			].join("\n"),
			aiGuidance:
				"Implement subtasks one by one. Check off subtasks mostly mentally or via subtask command if available.",
		};
	}

	private getVerifyState(
		refDir: string,
		taskContent: TaskFileContent,
		_taskId: string,
	): Partial<CommandResult> {
		const outputParts: string[] = [];
		outputParts.push(
			colors.infoBold(
				`${icons.search} VERIFYING STATE - SELF-REVIEW YOUR CODE`,
			),
		);
		outputParts.push("DO: Review ALL code changes. Verify against checklists.");

		outputParts.push("", colors.infoBold("VERIFICATION CHECKLIST"));
		outputParts.push("□ 1. All subtasks completed?");
		outputParts.push("□ 2. No hardcoded paths or magic values?");
		outputParts.push("□ 3. Strict typing / no loose types?");
		outputParts.push("□ 4. Proper error handling?");
		outputParts.push("□ 5. Following architecture rules?");
		outputParts.push("□ 6. No patterns from RETROSPECTIVE?");

		if (taskContent.subtasks && taskContent.subtasks.length > 0) {
			outputParts.push("", colors.infoBold("SUBTASKS TO VERIFY"));
			for (const st of taskContent.subtasks) {
				const mark =
					st.status === "completed" ? colors.success("✓") : colors.warning("□");
				outputParts.push(`${mark} ${st.description}`);
			}
		}

		outputParts.push(
			this.formatReference(
				"CHECK AGAINST RETROSPECTIVE",
				getRefFilePath(refDir, REF_FILES.retrospective),
				colors.error,
			),
		);

		return {
			output: outputParts.join("\n"),
			nextSteps: [
				"1. Review checklist items",
				"2. Fix any issues found",
				"3. taskflow check (When self-review is complete)",
			].join("\n"),
			aiGuidance: "Self-review strictly. Don't skip this step.",
		};
	}

	private getValidateState(): Partial<CommandResult> {
		const outputParts: string[] = [];
		outputParts.push(
			colors.infoBold(`${icons.test} VALIDATING STATE - AUTOMATED CHECKS`),
		);
		outputParts.push(
			"System will run configured checks (format, lint, test, etc.)",
		);
		outputParts.push("", "ON SUCCESS: Advances to COMMITTING");
		outputParts.push("ON FAILURE: Stay in VALIDATING details, fix errors.");

		return {
			output: outputParts.join("\n"),
			nextSteps: "Run 'taskflow check' to run validations",
			aiGuidance: "Run validation. If fails, fix and retry.",
		};
	}

	private getCommitState(
		featureId: string,
		taskId: string,
		taskTitle: string,
	): Partial<CommandResult> {
		const outputParts: string[] = [];
		outputParts.push(
			colors.successBold(`${icons.save} COMMITTING STATE - READY TO COMMIT`),
		);
		outputParts.push("All validations passed.");
		outputParts.push("", colors.highlight("Commit Message Format:"));
		outputParts.push(`Header: feat(F${featureId}): T${taskId} - ${taskTitle}`);
		outputParts.push("Body: Provide 3-4 bullet points");

		return {
			output: outputParts.join("\n"),
			nextSteps: `taskflow commit " - Change 1\\n - Change 2"`,
			aiGuidance: "Commit and complete task.",
		};
	}
}
