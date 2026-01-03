/**
 * Do command - Get instructions for current status
 */

import { AgentRunner } from "@/agent/runner";
import { BaseCommand, type CommandResult } from "@/commands/base";
import { ConfigLoader } from "@/lib/config/config-loader";
import { NoActiveSessionError } from "@/lib/core/errors";
import { colors, icons } from "@/lib/core/output";
import type { ActiveStatus, TaskFileContent } from "@/lib/core/types";
import { parseTaskId } from "@/lib/core/types";
import {
	getRefFilePath,
	getSkillFilePath,
	REF_FILES,
} from "../../lib/config/config-paths.js";
import {
	findActiveTask,
	findTaskLocation,
	loadReferenceFile,
	loadTasksProgress,
} from "../../lib/core/data-access.js";

export class DoCommand extends BaseCommand {
	async execute(options?: { guide?: boolean }): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const config = configLoader.load();
		const paths = configLoader.getPaths();

		const tasksProgress = loadTasksProgress(paths.tasksDir);
		const activeTask = findActiveTask(paths.tasksDir, tasksProgress);

		if (!activeTask) {
			throw new NoActiveSessionError();
		}

		// Check for Agent Mode
		// If agentMode is enabled AND we are not in --guide mode
		if (config.ai?.enabled && config.ai.agentMode?.enabled && !options?.guide) {
			const runner = new AgentRunner(
				{
					taskId: activeTask.taskId,
					status: activeTask.content.status,
					projectRoot: this.context.projectRoot,
					files: activeTask.content.context || [],
					// In a real implementation, we would pass validation errors here
					// For now, we assume the agent will read them or run checks itself
				},
				configLoader,
			);
			await runner.run();
			// Agent runner handles its own output and loop
			return this.success("", "");
		}

		// Fallback to Standard Guidance Mode
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
				result = await this.getSetupState(paths.refDir, content, taskId);
				break;
			case "planning":
				result = await this.getPlanningState(paths.refDir, content, taskId);
				break;
			case "implementing":
				result = await this.getImplementState(paths.refDir, content, taskId);
				break;
			case "verifying":
				result = await this.getVerifyState(paths.refDir, content, taskId);
				break;
			case "validating":
				result = await this.getValidateState();
				break;
			case "committing":
				result = await this.getCommitState(feature.id, taskId, task.title);
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

	private async getSetupState(
		refDir: string,
		taskContent: TaskFileContent,
		taskId: string,
	): Promise<Partial<CommandResult>> {
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

		// Get LLM guidance if available
		let llmGuidance = "Read and understand. Do not code yet.";
		if (this.isLLMAvailable()) {
			try {
				const enhancedGuidance = await this.getLLMGuidance({
					task: taskContent.title,
					status: "setup",
					files: taskContent.context,
					instructions:
						"Focus on understanding the task context, not on implementation. Emphasize files to read and patterns to learn.",
				});
				if (enhancedGuidance) {
					llmGuidance = enhancedGuidance;
				}
			} catch {
				// Use default guidance if LLM call fails
			}
		}

		return {
			output: outputParts.join("\n"),
			nextSteps:
				" When you understand the task, run 'taskflow check' to advance to PLANNING",
			aiGuidance: llmGuidance,
			contextFiles: [
				REF_FILES.aiProtocol,
				REF_FILES.retrospective,
				REF_FILES.taskGenerator,
			],
		};
	}

	private async getPlanningState(
		refDir: string,
		taskContent: TaskFileContent,
		taskId: string,
	): Promise<Partial<CommandResult>> {
		const skill = taskContent.skill || "backend";
		const outputParts: string[] = [];

		outputParts.push(
			colors.infoBold(`${icons.brain} PLANNING STATE - CREATE EXECUTION PLAN`),
		);
		outputParts.push(
			colors.info("DO: Analyze context, create implementation plan"),
		);
		outputParts.push(
			colors.error("DO NOT: Write code yet - planning must come first"),
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

		// CRITICAL CONTEXT
		outputParts.push(
			this.formatReference(
				"RETROSPECTIVE - KNOWN ERRORS TO AVOID",
				getRefFilePath(refDir, REF_FILES.retrospective),
				colors.error,
			),
		);
		outputParts.push(
			this.formatReference(
				"AI PROTOCOL - WORKFLOW RULES",
				getRefFilePath(refDir, REF_FILES.aiProtocol),
				colors.warning,
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

		// PLANNING CHECKLIST
		outputParts.push(
			"",
			colors.warningBold(`${icons.info} PLANNING CHECKLIST`),
		);
		outputParts.push("□ 1. Reviewed RETROSPECTIVE - know what NOT to do");
		outputParts.push("□ 2. Understood TASK DETAILS and requirements");
		outputParts.push("□ 3. Identified files to modify");
		outputParts.push("□ 4. Determined implementation approach");
		outputParts.push("□ 5. Planned subtask execution order");
		outputParts.push("□ 6. Considered edge cases and error handling");

		// QUICK START
		outputParts.push(
			"",
			colors.successBold(`${icons.rocket} PLAN CREATION STEPS`),
		);
		outputParts.push("1. Search for similar implementations");
		outputParts.push("2. List files to modify and patterns to follow");
		outputParts.push("3. Define implementation approach");
		outputParts.push("4. Order subtasks logically");
		outputParts.push("5. Document your plan");

		// Get LLM guidance if available
		let llmGuidance = [
			"Current Status: PLANNING",
			"Your Goal: Create a clear, documented plan before coding",
			"",
			"PLANNING PROCESS:",
			"────────────────",
			"1. SEARCH FIRST:",
			"   - Find existing implementations to match",
			"   - Study patterns used in similar code",
			"   - Identify relevant files and modules",
			"",
			"2. CONTEXT REVIEW:",
			"   - RETROSPECTIVE: Learn what NOT to do",
			"   - AI PROTOCOL: Understand workflow rules",
			"   - SKILL GUIDES: Domain-specific patterns",
			"   - ARCHITECTURE/STANDARDS: Project conventions",
			"",
			"3. PLAN CREATION:",
			"   - List files to modify",
			"   - Define implementation approach",
			"   - Order subtasks logically",
			"   - Note integration points",
			"   - Plan error handling",
			"",
			"4. RISK CHECK:",
			"   - Check RETROSPECTIVE for similar issues",
			"   - Identify edge cases",
			"   - Consider backward compatibility",
			"",
			"CRITICAL RULES:",
			"───────────────",
			"- Search BEFORE planning",
			"- Match existing patterns, don't invent new ones",
			"- Consider all subtasks in your plan",
			"- Document the approach clearly",
			"",
			"DO NOT:",
			"───────",
			"- Skip planning and start coding",
			"- Assume patterns without searching",
			"- Ignore RETROSPECTIVE warnings",
			"- Create vague or incomplete plans",
			"",
			"WHEN READY:",
			"────────────",
			"Run 'taskflow check' to advance to IMPLEMENTING",
			"Be ready to execute your plan",
		].join("\n");

		if (this.isLLMAvailable()) {
			try {
				// Read retrospective to include known error patterns in LLM guidance
				const retrospectivePath = getRefFilePath(
					refDir,
					REF_FILES.retrospective,
				);
				const retrospectiveContent = loadReferenceFile(retrospectivePath);

				// Build instructions with retrospective context
				let instructions =
					"Focus on planning guidance: files to modify, patterns to follow, subtask order, potential pitfalls. Keep under 200 words.";

				if (retrospectiveContent) {
					instructions += `\n\nIMPORTANT - Learn from known errors in this project:\n${retrospectiveContent}\n\nAvoid repeating these mistakes in your plan.`;
				}

				const enhancedGuidance = await this.getLLMGuidance({
					task: taskContent.title,
					status: "planning",
					files: taskContent.context,
					instructions,
				});
				if (enhancedGuidance) {
					llmGuidance = enhancedGuidance;
				}
			} catch {
				// Use default guidance if LLM call fails
			}
		}

		return {
			output: outputParts.join("\n"),
			nextSteps: [
				"1. Search codebase for similar implementations",
				"2. Create execution plan (files, approach, order)",
				"3. Complete all planning checklist items",
				"4. taskflow check (When plan is ready)",
			].join("\n"),
			aiGuidance: llmGuidance,
			warnings: [
				"Most common AI mistake: Skipping planning and writing code immediately",
				"Always search for existing implementations first",
				"Your plan should be specific and actionable",
			],
		};
	}

	private async getImplementState(
		refDir: string,
		taskContent: TaskFileContent,
		taskId: string,
	): Promise<Partial<CommandResult>> {
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

		// Get LLM guidance if available
		let llmGuidance =
			"Implement subtasks one by one. Check off subtasks mostly mentally or via subtask command if available.";
		if (this.isLLMAvailable()) {
			try {
				const enhancedGuidance = await this.getLLMGuidance({
					task: taskContent.title,
					status: "implementing",
					files: taskContent.context,
					instructions:
						"Focus on implementation guidance: files to modify, patterns to follow, subtask execution order. Keep under 200 words.",
				});
				if (enhancedGuidance) {
					llmGuidance = enhancedGuidance;
				}
			} catch {
				// Use default guidance if LLM call fails
			}
		}

		return {
			output: outputParts.join("\n"),
			nextSteps: [
				"1. Implement each subtask in order (modifying ONLY project source files)",
				"2. Test your changes locally",
				"3. taskflow check  (When ALL subtasks are complete)",
			].join("\n"),
			aiGuidance: llmGuidance,
		};
	}

	private async getVerifyState(
		refDir: string,
		taskContent: TaskFileContent,
		_taskId: string,
	): Promise<Partial<CommandResult>> {
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

		// Get LLM guidance if available
		let llmGuidance = "Self-review strictly. Don't skip this step.";
		if (this.isLLMAvailable()) {
			try {
				const enhancedGuidance = await this.getLLMGuidance({
					task: taskContent.title,
					status: "verifying",
					instructions:
						"Focus on self-review guidance: common mistakes to check, patterns to verify. Keep under 200 words.",
				});
				if (enhancedGuidance) {
					llmGuidance = enhancedGuidance;
				}
			} catch {
				// Use default guidance if LLM call fails
			}
		}

		return {
			output: outputParts.join("\n"),
			nextSteps: [
				"1. Review checklist items",
				"2. Fix any issues found",
				"3. taskflow check (When self-review is complete)",
			].join("\n"),
			aiGuidance: llmGuidance,
		};
	}

	private async getValidateState(): Promise<Partial<CommandResult>> {
		const outputParts: string[] = [];
		outputParts.push(
			colors.infoBold(`${icons.test} VALIDATING STATE - AUTOMATED CHECKS`),
		);
		outputParts.push(
			"System will run configured checks (format, lint, test, etc.)",
		);
		outputParts.push("", "ON SUCCESS: Advances to COMMITTING");
		outputParts.push("ON FAILURE: Stay in VALIDATING details, fix errors.");

		// Get LLM guidance if available
		let llmGuidance = "Run validation. If fails, fix and retry.";
		if (this.isLLMAvailable()) {
			try {
				const enhancedGuidance = await this.getLLMGuidance({
					status: "validating",
					instructions:
						"Focus on validation guidance: how to fix errors, error analysis approach. Keep under 200 words.",
				});
				if (enhancedGuidance) {
					llmGuidance = enhancedGuidance;
				}
			} catch {
				// Use default guidance if LLM call fails
			}
		}

		return {
			output: outputParts.join("\n"),
			nextSteps: "Run 'taskflow check' to run validations",
			aiGuidance: llmGuidance,
		};
	}

	private async getCommitState(
		featureId: string,
		taskId: string,
		taskTitle: string,
	): Promise<Partial<CommandResult>> {
		const outputParts: string[] = [];
		outputParts.push(
			colors.successBold(`${icons.save} COMMITTING STATE - READY TO COMMIT`),
		);
		outputParts.push("All validations passed.");
		outputParts.push("", colors.highlight("Commit Message Format:"));
		outputParts.push(`Header: feat(F${featureId}): T${taskId} - ${taskTitle}`);
		outputParts.push("Body: Provide 3-4 bullet points");

		// Get LLM guidance if available
		let llmGuidance = [
			"Current Status: COMMITTING",
			"Your Goal: Commit changes with proper message format",
			"",
			"COMMIT MESSAGE FORMAT:",
			"─────────────────────",
			`Header: feat(F${featureId}): T${taskId} - ${taskTitle}`,
			"",
			"Body: Provide 3-4 bullet points describing changes:",
			"  - Change 1 (be specific)",
			"  - Change 2 (be specific)",
			"  - Change 3 (if applicable)",
			"",
			"CRITICAL RULES:",
			"───────────────",
			"- Use bullet points (not paragraphs)",
			"- Be specific about changes (not vague)",
			"- Include technical debt notes if any",
			"- Keep each bullet concise",
			"",
			"NEXT STEP:",
			"──────────",
			`taskflow commit " - Change 1\\n - Change 2"`,
		].join("\n");

		if (this.isLLMAvailable()) {
			try {
				const enhancedGuidance = await this.getLLMGuidance({
					task: taskTitle,
					status: "committing",
					instructions:
						"Focus on commit message guidance: format, content, best practices. Keep under 200 words.",
				});
				if (enhancedGuidance) {
					llmGuidance = enhancedGuidance;
				}
			} catch {
				// Use default guidance if LLM call fails
			}
		}

		return {
			output: outputParts.join("\n"),
			nextSteps: `taskflow commit " - Change 1\\n - Change 2"`,
			aiGuidance: llmGuidance,
		};
	}
}
