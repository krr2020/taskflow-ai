/**
 * Check command - Validate and advance task state
 */

import { readdir } from "node:fs/promises";
import path from "node:path";
import { execaSync } from "execa";
import { LogParser, type ParsedError } from "../../lib/analysis/log-parser.js";
import { ConfigLoader } from "../../lib/config/config-loader.js";
import { getRefFilePath, REF_FILES } from "../../lib/config/config-paths.js";
import {
	findActiveTask,
	loadTasksProgress,
	updateTaskStatus,
} from "../../lib/core/data-access.js";
import {
	LLMRequiredError,
	NoActiveSessionError,
} from "../../lib/core/errors.js";
import type {
	Subtask,
	TaskFileContent,
	TasksProgress,
} from "../../lib/core/types.js";
import { Text } from "../../lib/ui/components.js";
import {
	FileValidator,
	type ValidationResult,
} from "../../lib/utils/file-validator.js";
import {
	extractNewPatterns,
	formatNewPatternForDisplay,
	processValidationOutput,
} from "../../lib/utils/retrospective.js";
import { runValidations } from "../../lib/utils/validation.js";
import { Phase } from "../../llm/base.js";
import { ProviderFactory } from "../../llm/factory.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class CheckCommand extends BaseCommand {
	async execute(): Promise<CommandResult> {
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
		const currentStatus = content.status;

		// Handle each status transition
		switch (currentStatus) {
			case "setup":
				return this.advanceToPlanning(
					paths.tasksDir,
					tasksProgress,
					taskId,
					content,
				);

			case "planning":
				return this.advanceToImplementing(
					paths.tasksDir,
					tasksProgress,
					taskId,
					content,
				);

			case "implementing":
				return this.advanceToVerifying(
					paths.tasksDir,
					tasksProgress,
					taskId,
					content,
				);

			case "verifying":
				return this.advanceToValidating(
					paths.tasksDir,
					tasksProgress,
					taskId,
					content,
				);

			case "validating":
				return await this.advanceToCommitting(
					paths.tasksDir,
					paths.logsDir,
					paths.refDir,
					tasksProgress,
					taskId,
					content,
					config.validation?.commands,
				);

			case "committing":
				return this.failure(
					"Task is ready to commit",
					["Cannot run check in committing status"],
					"Run 'taskflow commit' to commit and complete the task.",
				);

			case "completed":
				return this.failure(
					"Task is already completed",
					[`Task ${taskId} is already marked as completed`],
					"Run 'taskflow next' to find the next available task.",
				);

			case "blocked":
				return this.failure(
					"Task is blocked",
					[
						`Task ${taskId} is blocked: ${content.blockedReason || "No reason provided"}`,
					],
					"Resolve the blocking issue, then run 'taskflow resume' to continue.",
				);

			default:
				return this.failure(
					`Unknown status: ${currentStatus}`,
					[`Task ${taskId} has an invalid status`],
					"Check the task file and fix the status manually.",
				);
		}
	}

	private advanceToPlanning(
		tasksDir: string,
		tasksProgress: TasksProgress,
		taskId: string,
		content: TaskFileContent,
	): CommandResult {
		// Advance to planning
		updateTaskStatus(tasksDir, tasksProgress, taskId, "planning");

		return this.success(
			[
				Text.success("Status advanced: setup → planning"),
				`Task ${taskId}: ${content.title}`,
				"",
				"Now create your execution plan before writing code.",
			].join("\n"),
			[
				"1. Create execution plan:",
				"   - Review all context files (RETROSPECTIVE, AI PROTOCOL, etc.)",
				"   - Identify files to modify",
				"   - Determine implementation approach",
				"   - Plan subtask execution order",
				"",
				"2. Check planning checklist:",
				"   - [ ] Reviewed RETROSPECTIVE for known issues",
				"   - [ ] Understood task requirements",
				"   - [ ] Identified affected files and patterns",
				"   - [ ] Planned implementation approach",
				"   - [ ] Considered edge cases",
				"",
				"3. When plan is ready, run:",
				"   taskflow check",
				"   This will advance you to IMPLEMENTING status",
			].join("\n"),
			{
				aiGuidance: [
					"Current Status: PLANNING",
					"Your Goal: Create a clear execution plan",
					"",
					"PLANNING CHECKLIST:",
					"─────────────────────",
					"1. CONTEXT REVIEW:",
					"   - Read RETROSPECTIVE - know what NOT to do",
					"   - Read AI PROTOCOL - understand workflow rules",
					"   - Review TASK DETAILS - understand requirements",
					"   - Check SKILL guidelines - domain-specific rules",
					"   - Review ARCHITECTURE/CODING STANDARDS",
					"",
					"2. ANALYSIS:",
					"   - Search for similar implementations in codebase",
					"   - Identify patterns to follow",
					"   - List files to modify",
					"   - Identify dependencies",
					"   - Check for library conflicts (verify no similar library exists, check compatibility)",
					"",
					"3. PLAN CREATION:",
					"   - Define implementation approach",
					"   - Order subtasks logically",
					"   - Consider error handling needs",
					"   - Note integration points",
					"   - Use EARS syntax for acceptance criteria: WHEN [event] THEN [system] SHALL [response]",
					"   - Present alternatives with pros/cons when multiple approaches exist",
					"",
					"4. RISK ASSESSMENT:",
					"   - Check RETROSPECTIVE for known issues",
					"   - Identify potential edge cases",
					"   - Plan for backward compatibility",
					"   - Ask for explicit approval (yes/approved/LGTM?) before proceeding",
					"",
					"OUTPUT DOCUMENT:",
					"─────────────────",
					"Create a brief plan covering:",
					"- Files to modify",
					"- Implementation approach",
					"- Patterns to follow",
					"- Subtask execution order",
					"- Acceptance criteria (EARS syntax)",
					"",
					"ASK ONE QUESTION AT A TIME:",
					"───────────────────────────",
					"Build understanding iteratively - ask ONE clarifying question, wait for answer, then ask the next. Do NOT batch questions.",
					"",
					"WHEN READY:",
					"────────────",
					"Run 'taskflow check' to advance to IMPLEMENTING",
				].join("\n"),
				warnings: [
					"Do NOT skip planning - it prevents costly mistakes",
					"Do NOT start coding until plan is complete",
					"Review RETROSPECTIVE carefully - avoid known errors",
				],
			},
		);
	}

	private advanceToImplementing(
		tasksDir: string,
		tasksProgress: TasksProgress,
		taskId: string,
		content: TaskFileContent,
	): CommandResult {
		// Advance to implementing
		updateTaskStatus(tasksDir, tasksProgress, taskId, "implementing");

		return this.success(
			[
				Text.success("Status advanced: planning → implementing"),
				`Task ${taskId}: ${content.title}`,
				"",
				"You may now write code to implement this task based on your plan.",
			].join("\n"),
			[
				"1. Write the code to implement the task",
				"   - Follow the patterns in the codebase",
				"   - Match existing code style",
				"   - Handle errors properly",
				"   - Verify imports before using them",
				"",
				"2. Complete all subtasks:",
				...(content.subtasks || []).map(
					(st: Subtask) =>
						`   [${st.status === "completed" ? "x" : " "}] ${st.id}. ${st.description}`,
				),
				"",
				"3. When implementation is complete, run:",
				"   taskflow check",
				"   This will advance you to VERIFYING status",
			].join("\n"),
			{
				aiGuidance: [
					"Current Status: IMPLEMENTING",
					"Your Goal: Write code that matches project standards",
					"",
					"CRITICAL - Implementation Rules:",
					"────────────────────────────────",
					"1. SEARCH FIRST - Find existing implementations to match",
					"2. VERIFY IMPORTS - Confirm paths and types exist before using",
					"3. MATCH PATTERNS - Code should be indistinguishable from existing",
					"4. HANDLE ERRORS - Every external call needs error handling",
					"5. NO GUESSING - Verify everything before declaring done",
					"6. CHECK LIBRARY COMPATIBILITY - Before suggesting new libraries, verify no similar library exists, check compatibility, consider security/maintenance",
					"7. SECURITY & PERFORMANCE - Consider security implications, performance impact, backward compatibility",
					"",
					"Operating Mode Selection:",
					"- REACTIVE: Simple, clear, single file",
					"- ANALYTICAL: Multi-file, pattern matching needed",
					"- ULTRATHINK: Architecture, security, new patterns",
					"",
					"DO NOT:",
					"────────",
					"- Guess import paths - verify they exist",
					"- Skip error handling for 'simple' operations",
					"- Use 'any' to bypass type checking",
					"- Create new patterns when existing ones work",
					"- Declare done without verifying",
					"",
					"3-RETRY LIMIT FOR TESTS:",
					"────────────────────────",
					"Automated tests: Implement test, run full suite, fix failures. Max 3 retry attempts. If still failing, STOP and analyze root cause.",
					"Manual tests: STOP and ask user to verify. Do NOT auto-proceed.",
					"",
					"LEARNINGS TRACKING:",
					"────────────────────",
					"Track learnings for future tasks: capture only general, project-wide insights (not implementation details, not what you did but what you learned, prevent repeated mistakes in future tasks).",
					"",
					"TECH DEBT REPORTING:",
					"────────────────────────",
					"Report after implementation: tech debt introduced, unfinished work, most impactful next step (focus on high-impact items only).",
					"",
					"DEFINITION OF DONE:",
					"────────────────────",
					"Before declaring complete: functional requirements implemented, tests passing (3-retry limit for automated), lint/type-check pass, documentation updated (if applicable), code reviewed (mandatory), no tech debt or explicitly reported.",
					"",
					"WHEN DONE:",
					"───────────",
					"Run 'taskflow check' to advance to VERIFYING",
				].join("\n"),
				warnings: [
					"Most common AI mistake: plausible code that doesn't match patterns",
					"Verify imports exist before using them",
					"Search for existing implementations first",
				],
			},
		);
	}

	private advanceToVerifying(
		tasksDir: string,
		tasksProgress: TasksProgress,
		taskId: string,
		content: TaskFileContent,
	): CommandResult {
		// Advance to verifying
		updateTaskStatus(tasksDir, tasksProgress, taskId, "verifying");

		return this.success(
			[
				Text.success("Status advanced: implementing → verifying"),
				`Task ${taskId}: ${content.title}`,
				"",
				"Now perform self-review of your implementation.",
			].join("\n"),
			[
				"1. Review your code (Self-Retrospective):",
				"   - Check for hardcoded values",
				"   - Look for 'any' types",
				"   - Verify error handling",
				"   - Ensure imports are correct",
				"",
				"2. Verify all acceptance criteria are met:",
				...(content.subtasks || []).map(
					(st: Subtask) =>
						`   [${st.status === "completed" ? "x" : " "}] ${st.id}. ${st.description}`,
				),
				"",
				"3. Check against .taskflow/ref/retrospective.md:",
				"   Ensure you haven't repeated known mistakes",
				"",
				"4. When self-review is complete, run:",
				"   taskflow check",
				"   This will advance you to VALIDATING status",
			].join("\n"),
			{
				aiGuidance: [
					"Current Status: VERIFYING",
					"Your Goal: Self-review your implementation",
					"",
					"CRITICAL - Self-Review Checklist:",
					"──────────────────────────────────",
					"□ No hardcoded paths or values",
					"□ No 'any' types (proper TypeScript)",
					"□ Error handling on all external operations",
					"□ All imports verified and correct",
					"□ Code matches existing patterns",
					"□ All subtasks completed",
					"□ Acceptance criteria met",
					"",
					"LEARNINGS TRACKING:",
					"────────────────────",
					"Capture only general, project-wide insights: not implementation details ('I added a function'), not what you did but what you learned, prevent repeated mistakes in future tasks.",
					"",
					"TECH DEBT REPORTING:",
					"────────────────────────",
					"Report after implementation: tech debt introduced, unfinished work, most impactful next step (focus on high-impact items only).",
					"",
					"RETROSPECTIVE CHECK:",
					"────────────────────",
					"Read .taskflow/ref/retrospective.md",
					"Confirm you haven't made any known mistakes",
					"These are errors that have been made before",
					"Do NOT repeat them",
					"",
					"Common Issues to Check:",
					"- Unused imports",
					"- Missing error cases",
					"- Incorrect type annotations",
					"- Skipped validation",
					"",
					"WHEN READY:",
					"────────────",
					"Run 'taskflow check' to advance to VALIDATING",
					"Automated checks will run next",
				].join("\n"),
				warnings: [
					"DO NOT skip the retrospective check",
					"DO NOT proceed if any subtasks are incomplete",
					"DO NOT ignore type errors or warnings",
				],
			},
		);
	}

	private advanceToValidating(
		tasksDir: string,
		tasksProgress: TasksProgress,
		taskId: string,
		content: TaskFileContent,
	): CommandResult {
		// Advance to validating
		updateTaskStatus(tasksDir, tasksProgress, taskId, "validating");

		return this.success(
			[
				Text.success("Status advanced: verifying → validating"),
				`Task ${taskId}: ${content.title}`,
				"",
				"Ready to run automated validation checks.",
			].join("\n"),
			[
				"1. The system will run automated checks:",
				"   - Format/Fix (as configured)",
				"   - Static Analysis / Compilation",
				"   - Linting (as configured)",
				"   - Tests (if configured)",
				"",
				"2. Run validation:",
				"   taskflow check",
				"",
				"3. If checks pass:",
				"   You'll advance to COMMITTING status",
				"",
				"4. If checks fail:",
				"   - Fix the errors shown",
				"   - Check if it's a known error (retrospective will tell you)",
				"   - Re-run: taskflow check",
			].join("\n"),
			{
				aiGuidance: [
					"Current Status: VALIDATING",
					"Your Goal: Pass all automated validation checks",
					"",
					"NEXT ACTION:",
					"─────────────",
					"Run 'taskflow check' again to execute validations",
					"",
					"The system will run:",
					"1. Format/Fix - auto-fix formatting issues",
					"2. Static Analysis - verify code correctness",
					"3. Lint - check code quality",
					"4. Tests - verify functionality (if configured)",
					"",
					"TEST HANDLING:",
					"────────────────",
					"Automated tests: Implement test, run full suite, fix failures. Max 3 retry attempts. If still failing, STOP and analyze root cause.",
					"Manual tests: STOP and ask user to verify. Do NOT auto-proceed.",
					"Database tests: Do NOT clean up test data.",
					"",
					"IF VALIDATION FAILS:",
					"────────────────────",
					"1. Read the error summary in the output",
					"2. Check if it matches a known pattern (RETROSPECTIVE)",
					"3. Apply the solution from retrospective if known",
					"4. Fix the errors in your code",
					"5. Re-run: taskflow check",
					"",
					"IF NEW ERROR TYPE:",
					"───────────────────",
					"You'll be prompted to add it to retrospective",
					"Run: taskflow retro add",
					"This prevents the same mistake in future",
				].join("\n"),
				warnings: [
					"Validation runs will modify files (format/fix)",
					"Commit hooks may block commits - fix issues properly",
					"Avoid suppressing errors without a good reason",
				],
			},
		);
	}

	private async advanceToCommitting(
		tasksDir: string,
		logsDir: string,
		refDir: string,
		tasksProgress: TasksProgress,
		taskId: string,
		content: TaskFileContent,
		validationCommands?: Record<string, string>,
	): Promise<CommandResult> {
		// Check if AI validation is enabled
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const config = configLoader.load();

		// Get pre-validation guidance if LLM available
		const preValidationGuidance = await this.getPreValidationGuidance(
			content,
			refDir,
		);
		if (preValidationGuidance) {
			console.log(Text.section("Pre-Validation Checklist"));
			console.log(preValidationGuidance);
			console.log("");
		}

		// Run AI-powered validation if configured
		if (config.ai?.enabled && config.ai.provider) {
			const aiResult = await this.runAIValidation(
				logsDir,
				Phase.Analysis, // Use analysis model for validation
				refDir,
			);

			if (!aiResult.passed) {
				return aiResult.result;
			}
		}

		// Run traditional validations
		console.log(Text.info("Running validations..."));

		const summary = runValidations(logsDir, taskId, validationCommands);

		// Check for known errors in output
		const retroCheck = processValidationOutput(refDir, summary.allOutput);

		if (!summary.passed) {
			// Get LLM error analysis if available
			let llmGuidance = [
				"Validation Failed - Fix Required",
				"",
				retroCheck.knownErrors.length > 0
					? "KNOWN ERRORS DETECTED:"
					: "Errors found in validation.",
				retroCheck.knownErrors.length > 0
					? "You have made mistakes that are already documented."
					: "",
				retroCheck.knownErrors.length > 0
					? "Check the output above for solutions."
					: "",
				retroCheck.knownErrors.length > 0
					? "STOP REPEATING THESE MISTAKES."
					: "",
				"",
				"How to fix:",
				"1. Read error messages carefully",
				"2. Apply solutions from retrospective (if shown)",
				"3. Fix the code",
				"4. Re-run: taskflow check",
				"",
				"DO NOT bypass validations",
				"DO NOT use 'any' types to suppress errors",
				"DO fix the root cause",
			].join("\n");

			// Parse logs and detect new error patterns
			const logParser = new LogParser();
			const logFiles = await readdir(logsDir);
			const parsedErrors: ParsedError[] = [];

			for (const logFile of logFiles) {
				if (logFile.endsWith(".log")) {
					try {
						const logPath = path.join(logsDir, logFile);
						const parseResult = await logParser.parseFile(logPath);
						parsedErrors.push(...parseResult.errors);
					} catch {
						// Ignore log parsing errors
					}
				}
			}

			// Detect NEW error patterns for retrospective
			let newPatternsDetected: string[] = [];
			if (parsedErrors.length > 0) {
				const newPatterns = extractNewPatterns(parsedErrors, refDir);
				if (newPatterns.length > 0) {
					newPatternsDetected = newPatterns.map((pattern) =>
						formatNewPatternForDisplay(pattern),
					);
				}
			}

			// Get AI error analysis if LLM available
			if (this.isLLMAvailable() && parsedErrors.length > 0) {
				try {
					const errors = parsedErrors.map((error) => ({
						file: error.file,
						message: error.message,
						line: error.line ?? undefined,
						code: error.code ?? undefined,
					}));

					const errorAnalysis = await this.getErrorAnalysis(errors, refDir);
					if (errorAnalysis) {
						llmGuidance = [
							"AI Error Analysis:",
							"───────────────────",
							errorAnalysis,
							"",
							"How to fix:",
							"1. Review the AI analysis above",
							"2. Apply suggested fixes file-by-file",
							"3. Re-run: taskflow check",
							"",
							retroCheck.knownErrors.length > 0
								? "⚠️  Known errors also detected - see solutions above"
								: "",
							"",
							newPatternsDetected.length > 0
								? "📝 NEW error patterns detected (see warnings below)"
								: "",
						].join("\n");
					}
				} catch {
					// Fall back to standard guidance
				}
			}

			// Build warnings with new patterns
			const warnings: string[] = [];
			if (newPatternsDetected.length > 0) {
				warnings.push("📝 NEW Error Patterns Detected:");
				warnings.push("");
				for (const patternDisplay of newPatternsDetected) {
					warnings.push(patternDisplay);
					warnings.push("");
				}
				warnings.push(
					"💡 Consider adding these to retrospective: taskflow retro add",
				);
				warnings.push("");
			}

			const failureOptions: { aiGuidance?: string; warnings?: string[] } = {
				aiGuidance: llmGuidance,
			};
			if (warnings.length > 0) {
				failureOptions.warnings = warnings;
			}

			return this.failure(
				"Validation failed",
				summary.failedChecks.map((check) => `${check} failed`),
				[
					"Fix the errors shown above and re-run: taskflow check",
					"",
					retroCheck.knownErrors.length > 0
						? "⚠️  Known errors detected - see solutions above"
						: "",
					retroCheck.hasNewErrors && newPatternsDetected.length === 0
						? "⚠️  New error detected - consider adding to retrospective: taskflow retro add"
						: "",
					"",
					`Full logs: ${logsDir}`,
				].join("\n"),
				failureOptions,
			);
		}

		// All validations passed - advance to committing
		updateTaskStatus(tasksDir, tasksProgress, taskId, "committing");

		return this.success(
			[
				Text.success("All validations passed!"),
				"Status advanced: validating → committing",
				`Task ${taskId}: ${content.title}`,
				"",
				"Ready to commit and complete the task.",
			].join("\n"),
			[
				"1. Review your changes one final time",
				"",
				"2. Commit with bullet points describing changes:",
				'   taskflow commit "- Added feature X\\n- Updated component Y\\n- Fixed issue Z"',
				"",
				"   The system will auto-generate:",
				"   - Proper commit header (feat/fix/etc)",
				"   - Footer with Story reference",
				"",
				"3. This will:",
				"   - Commit your changes",
				"   - Push to remote",
				"   - Mark task as completed",
				"   - Find next available task",
			].join("\n"),
			{
				aiGuidance: [
					"Current Status: COMMITTING",
					"Your Goal: Commit and complete the task",
					"",
					"COMMIT MESSAGE FORMAT:",
					"──────────────────────",
					"Provide 3-4 bullet points describing what you did:",
					'taskflow commit "- Bullet point 1\\n- Bullet point 2\\n- Bullet point 3"',
					"",
					"The system automatically adds:",
					`- Header: feat(F${content.id.split(".")[0]}): T${taskId} - ${content.title}`,
					`- Footer: Story: S${content.id.split(".")[0]}.${content.id.split(".")[1]}`,
					"",
					"Bullet points should:",
					"- Describe WHAT you changed (not why)",
					"- Be specific and concise",
					"- Focus on user-facing or functional changes",
					"",
					"TECH DEBT REPORTING:",
					"────────────────────────",
					"Report after implementation: tech debt introduced, unfinished work, most impactful next step (focus on high-impact items only).",
					"",
					"WHAT HAPPENS NEXT:",
					"───────────────────",
					"1. Git add all changes",
					"2. Git commit with formatted message",
					"3. Git push to remote",
					"4. Task marked as completed",
					"5. Next task is identified",
					"",
					"You'll receive the next task ID to work on",
				].join("\n"),
				contextFiles: [
					`${getRefFilePath(refDir, REF_FILES.aiProtocol)} - For next task`,
				],
				warnings: [
					"Commit will run git hooks - they must pass",
					"Push may fail if remote has changes - pull first if needed",
					"This action marks the task as completed",
					"Report any tech debt introduced in commit message or retrospective",
				],
			},
		);
	}

	/**
	 * Get pre-validation guidance using LLM
	 * Identifies validation pitfalls and provides checklist
	 */
	private async getPreValidationGuidance(
		content: TaskFileContent,
		refDir: string,
	): Promise<string> {
		if (!this.isLLMAvailable() || !this.llmProvider) {
			return "";
		}

		// Provider is guaranteed to be available after check
		const llmProvider = this.llmProvider;

		try {
			// Load project context
			const fs = await import("node:fs");
			const path = await import("node:path");

			let retrospectiveContext = "";
			let codingStandardsContext = "";

			// Load retrospective for common validation failures
			const retrospectivePath = path.join(refDir, "retrospective.md");
			if (fs.existsSync(retrospectivePath)) {
				retrospectiveContext = fs.readFileSync(retrospectivePath, "utf-8");
			}

			// Load coding standards
			const codingStandardsPath = path.join(refDir, "coding-standards.md");
			if (fs.existsSync(codingStandardsPath)) {
				codingStandardsContext = fs.readFileSync(codingStandardsPath, "utf-8");
			}

			let prompt = `You are about to run validation checks on code changes for this task:

Task: ${content.title}
Description: ${content.description}
Skill: ${content.skill || "backend"}
`;

			// Add project context
			if (retrospectiveContext) {
				prompt += `\n\nKNOWN VALIDATION FAILURES (from retrospective):\n${retrospectiveContext.slice(0, 800)}\n`;
			}

			if (codingStandardsContext) {
				prompt += `\n\nPROJECT CODING STANDARDS:\n${codingStandardsContext.slice(0, 800)}\n`;
			}

			prompt += `\nBefore running validation, provide:
1. Top 3 validation pitfalls to watch for based on:
   - Common errors in retrospective
   - Project coding standards
   - The task type (${content.skill || "backend"})
2. Quick checklist of items to verify before validation
3. What to do if validation fails

Be concise (max 150 words).`;

			const messages = [
				{
					role: "system" as const,
					content:
						"You are a code validation assistant helping prevent common validation failures.",
				},
				{ role: "user" as const, content: prompt },
			];
			const options = { maxTokens: 300, temperature: 0.4 };

			// Check cache first
			const cached = this.llmCache.get(messages, options);
			if (cached) {
				return cached.content;
			}

			// Cache miss - call LLM
			const response = await this.retryWithBackoff(() =>
				llmProvider.generate(messages, options),
			);

			// Cache the response
			this.llmCache.set(messages, options, response);

			// Track cost
			this.costTracker.trackUsage(response);

			return response.content;
		} catch {
			return "";
		}
	}

	/**
	 * Run AI-powered validation on changed files
	 */
	private async runAIValidation(
		logsDir: string,
		phase: Phase,
		refDir?: string,
	): Promise<{ passed: boolean; result: CommandResult }> {
		console.log(Text.info("Running AI-powered file validation..."));

		try {
			// Get AI config to create provider with correct settings
			const config = this.configLoader.load();
			if (!config?.ai || !config.ai.enabled) {
				throw new LLMRequiredError("AI configuration not enabled");
			}
			if (!config.ai.provider) {
				throw new LLMRequiredError("AI provider not configured");
			}

			// Create provider using actual config (cast to AIConfig)
			const provider = ProviderFactory.createSelector(
				config.ai as unknown as import("../../llm/factory.js").AIConfig,
			);

			const analysisProvider = provider.getProvider(phase);

			// Find modified files (git status, recent changes, etc.)
			const modifiedFiles = await this.findModifiedFiles();

			if (modifiedFiles.length === 0) {
				console.log("No modified files found for validation");
				return {
					passed: true,
					result: this.success("No files to validate", ""),
				};
			}

			console.log(
				`Validating ${modifiedFiles.length} file${modifiedFiles.length > 1 ? "s" : ""}...\n`,
			);

			// Load project context if available
			let codingStandards: string | undefined;
			let architectureRules: string | undefined;

			if (refDir) {
				const fs = await import("node:fs");
				const pathModule = await import("node:path");

				const codingStandardsPath = pathModule.join(
					refDir,
					"coding-standards.md",
				);
				if (fs.existsSync(codingStandardsPath)) {
					codingStandards = fs.readFileSync(codingStandardsPath, "utf-8");
				}

				const architectureRulesPath = pathModule.join(
					refDir,
					"architecture-rules.md",
				);
				if (fs.existsSync(architectureRulesPath)) {
					architectureRules = fs.readFileSync(architectureRulesPath, "utf-8");
				}
			}

			// Create file validator with project context
			const validatorOptions: {
				provider: typeof analysisProvider;
				includeContext: boolean;
				provideFixes: boolean;
				maxIssues: number;
				codingStandards?: string;
				architectureRules?: string;
			} = {
				provider: analysisProvider,
				includeContext: true,
				provideFixes: true,
				maxIssues: 10,
			};

			// Only add these if they have values
			if (codingStandards !== undefined) {
				validatorOptions.codingStandards = codingStandards;
			}
			if (architectureRules !== undefined) {
				validatorOptions.architectureRules = architectureRules;
			}

			const validator = new FileValidator(validatorOptions);

			// Validate each file
			const results: ValidationResult[] = [];
			for (const filePath of modifiedFiles) {
				try {
					const result = await validator.validate(filePath);
					results.push(result);
				} catch (error) {
					console.warn(
						`Failed to validate ${filePath}: ${(error as Error).message}`,
					);
				}
			}

			// Check if all files passed
			const allPassed = results.every((r) => r.passed);

			// Format and display results
			const output = this.formatValidationResults(results);

			console.log(output);

			if (allPassed) {
				return {
					passed: true,
					result: this.success(
						"All files passed AI validation",
						"Ready to proceed with standard validation",
					),
				};
			}

			// Parse logs for errors to provide context
			const logParser = new LogParser();
			const logFiles = await readdir(logsDir);
			const errors: ParsedError[] = [];

			for (const logFile of logFiles) {
				if (logFile.endsWith(".log")) {
					try {
						const logPath = path.join(logsDir, logFile);
						const parseResult = await logParser.parseFile(logPath);
						errors.push(...parseResult.errors);
					} catch {
						// Ignore log parsing errors
					}
				}
			}

			// Create AI guidance with error context
			const errorSummary = this.createErrorSummary(errors);

			const messages = [
				"Fix issues shown above and re-run: taskflow check",
				"",
				errorSummary,
				"",
				"AI-Powered Validation Benefits:",
				"- Early error detection before compilation",
				"- Context-aware fix suggestions",
				"- Pattern-based issue identification",
				"- Code quality analysis",
			];

			const guidance = [
				"AI Validation Results",
				"────────────────────",
				`Files validated: ${results.length}`,
				`Files passed: ${results.filter((r) => r.passed).length}`,
				`Files failed: ${results.filter((r) => !r.passed).length}`,
				"",
				"Fix Instructions:",
				"1. Review issues shown above for each file",
				"2. Apply suggested fixes",
				"3. Re-run: taskflow check",
				"",
				"If errors persist, check for:",
				"- Incorrect imports or types",
				"- Missing dependencies",
				"- Logic errors or bugs",
				"- Known patterns in retrospective",
			];

			return {
				passed: false,
				result: this.failure(
					"AI validation failed",
					results.flatMap((r) => r.issues.map((i) => i.message)),
					messages.join("\n"),
					{
						aiGuidance: guidance.join("\n"),
					},
				),
			};
		} catch (error) {
			console.warn(`AI validation failed: ${(error as Error).message}`);
			console.log("Falling back to standard validation\n");

			// Return passed to fall back to standard validation
			return {
				passed: true,
				result: this.success(
					"AI validation skipped",
					"Proceeding with standard validation",
				),
			};
		}
	}

	/**
	 * Find modified files for validation
	 */
	private async findModifiedFiles(): Promise<string[]> {
		try {
			// Get modified, added, and untracked files from git
			const result = execaSync(
				"git",
				["status", "--porcelain", "--untracked-files=all"],
				{
					cwd: this.context.projectRoot,
				},
			);
			const output = result.stdout.trim();

			if (!output) {
				return [];
			}

			const files: string[] = [];
			const lines = output.split("\n");

			for (const line of lines) {
				// Parse git status output format:
				// XY FILENAME
				// X = status in index, Y = status in working tree
				// Status codes: M (modified), A (added), D (deleted), ?? (untracked), etc.
				const match = line.match(/^(.{2})\s+(.+)$/);
				if (!match) continue;

				const [, status, filePath] = match;
				if (!status || !filePath) continue;

				// Skip deleted files
				if (status.includes("D")) continue;

				// Only validate source files (ts, tsx, js, jsx) but not test files
				const isSourceFile = /\.(ts|tsx|js|jsx|mjs|cjs)$/.test(filePath);
				const isTestFile = /\.(test|spec)\.(ts|tsx|js|jsx)$/.test(filePath);

				if (isSourceFile && !isTestFile) {
					// Convert to absolute path
					const absolutePath = path.join(this.context.projectRoot, filePath);
					files.push(absolutePath);
				}
			}

			return files;
		} catch (error) {
			console.warn(`Failed to get modified files: ${(error as Error).message}`);
			return [];
		}
	}

	/**
	 * Create error summary from logs and validation results
	 */
	private createErrorSummary(errors: ParsedError[]): string {
		if (errors.length === 0) {
			return "No errors found in logs.";
		}

		const grouped = new Map<string, ParsedError[]>();
		for (const error of errors) {
			if (error.file) {
				const existing = grouped.get(error.file) || [];
				existing.push(error);
				grouped.set(error.file, existing);
			}
		}

		const lines: string[] = ["Error Summary:", ""];

		for (const [file, fileErrors] of grouped) {
			lines.push(
				`${file}: ${fileErrors.length} error${fileErrors.length > 1 ? "s" : ""}`,
			);
		}

		return lines.join("\n");
	}

	/**
	 * Format validation results
	 */
	private formatValidationResults(results: ValidationResult[]): string {
		const lines: string[] = [];

		lines.push("=".repeat(80));
		lines.push("AI-Powered Validation Results");
		lines.push("=".repeat(80));

		for (const result of results) {
			lines.push("");
			lines.push(`File: ${result.file}`);
			lines.push(`Status: ${result.passed ? "✓ PASSED" : "✗ FAILED"}`);
			lines.push(`Summary: ${result.summary}`);

			if (result.issues.length > 0) {
				lines.push("");
				lines.push("Issues:");
				for (const issue of result.issues) {
					const icon =
						issue.severity === "error"
							? "✗"
							: issue.severity === "warning"
								? "⚠"
								: "ℹ";
					lines.push(`  ${icon} ${issue.message}`);
					if (issue.line) {
						lines.push(`    Line: ${issue.line}`);
					}
					if (issue.suggestedFix) {
						lines.push(`    Suggested: ${issue.suggestedFix}`);
					}
				}
			}

			if (result.suggestions.length > 0) {
				lines.push("");
				lines.push("Suggestions:");
				for (const suggestion of result.suggestions) {
					lines.push(`  • ${suggestion}`);
				}
			}
		}

		lines.push("");
		lines.push("=".repeat(80));

		return lines.join("\n");
	}
}
