/**
 * Output utilities for logging and formatting
 *
 * STANDARDIZED OUTPUT FORMAT FOR AI AGENTS
 * ========================================
 * Every command outputs in this structure:
 *
 * ══════════════════════════════════════════════════════════════════════
 * [COMMAND] result description
 * ══════════════════════════════════════════════════════════════════════
 *
 * OUTPUT
 * ──────────────────────────────────────────────────────────────────────
 * [Command result details]
 *
 * NEXT STEPS
 * ──────────────────────────────────────────────────────────────────────
 * ▸ pnpm task <command>
 *   Description of what this command does
 *
 * AI AGENT RULES (CRITICAL):
 * - NEVER read or modify files in .taskflow/ or tasks/ directories directly
 * - ALWAYS use pnpm task commands for task management
 * - ONLY modify project source code to implement tasks
 */

import pc from "picocolors";
import { ERROR_PATTERNS, MAX_SUMMARY_LINES } from "./config";
import { isTaskflowError } from "./errors";

// ============================================================================
// Constants
// ============================================================================

export const LINE_WIDTH = 70;
export const DOUBLE_LINE = "═".repeat(LINE_WIDTH);
export const SINGLE_LINE = "─".repeat(LINE_WIDTH);

// ============================================================================
// Color Helpers (exported for testing and direct use)
// ============================================================================

export const colors = {
	// Status colors
	success: pc.green,
	error: pc.red,
	warning: pc.yellow,
	info: pc.blue,
	muted: pc.gray,

	// Semantic colors
	task: pc.green,
	state: pc.magenta,
	command: pc.cyan,
	file: pc.blue,
	highlight: pc.bold,

	// Combined
	successBold: (s: string) => pc.bold(pc.green(s)),
	errorBold: (s: string) => pc.bold(pc.red(s)),
	warningBold: (s: string) => pc.bold(pc.yellow(s)),
	infoBold: (s: string) => pc.bold(pc.blue(s)),
} as const;

// ============================================================================
// Status Icons
// ============================================================================

export const icons = {
	success: "\u2713", // ✓
	error: "\u2717", // ✗
	warning: "\u26a0", // ⚠
	info: "\u2139", // ℹ
	rocket: "\ud83d\ude80", // 🚀
	celebration: "\ud83c\udf89", // 🎉
	brain: "\ud83e\udde0", // 🧠
	target: "\ud83c\udfaf", // 🎯
	architecture: "\ud83d\udcd0", // 📐
	code: "\ud83d\udcbb", // 💻
	memo: "\ud83d\udcdd", // 📝
	search: "\ud83d\udd0d", // 🔍
	test: "\ud83e\uddea", // 🧪
	save: "\ud83d\udcbe", // 💾
	stop: "\ud83d\uded1", // 🛑
	alert: "\ud83d\udea8", // 🚨
	arrow: "\u25b8", // ▸
} as const;

// ============================================================================
// Centralized Console Output Utility
// ============================================================================

export type ConsoleType = "log" | "error" | "warn" | "info";

export interface ConsoleOptions {
	type?: ConsoleType;
	icon?: string;
	color?: (s: string) => string;
}

/**
 * Centralized console output utility
 * Provides a single place to control all console output in taskflow
 *
 * @param message - The message to output (supports multi-line strings)
 * @param options - Optional configuration for type, icon, and color
 * @param args - Additional arguments to pass to console method
 *
 * @example
 * // Simple log
 * consoleOutput('Hello world');
 *
 * @example
 * // With icon
 * consoleOutput('Task completed', { icon: icons.success });
 *
 * @example
 * // With color
 * consoleOutput('Error occurred', { type: 'error', color: colors.error });
 *
 * @example
 * // With icon and color
 * consoleOutput('Warning message', {
 *   type: 'warn',
 *   icon: icons.warning,
 *   color: colors.warning
 * });
 *
 * @example
 * // Multi-line with color
 * consoleOutput('Line 1\nLine 2\nLine 3', { color: colors.muted });
 */
export function consoleOutput(
	message: string,
	options?: ConsoleOptions,
	...args: unknown[]
): void {
	const { type = "log", icon, color } = options || {};

	let formattedMessage = message;

	// Apply icon if provided
	if (icon) {
		formattedMessage = `${icon} ${formattedMessage}`;
	}

	// Apply color if provided
	if (color) {
		formattedMessage = color(formattedMessage);
	}

	// Use appropriate console method
	switch (type) {
		case "error":
			console.error(formattedMessage, ...args);
			break;
		case "warn":
			console.warn(formattedMessage, ...args);
			break;
		case "info":
			console.info(formattedMessage, ...args);
			break;
		default:
			console.log(formattedMessage, ...args);
			break;
	}
}

// ============================================================================
// Standardized Output Format (for AI Agent Guidance)
// ============================================================================

export interface NextStep {
	cmd: string;
	desc: string;
}

/**
 * Print standardized command result header
 * @param command - Command name (e.g., "START", "CHECK")
 * @param result - Result description (e.g., "Task 1.1.0 started successfully")
 * @param success - Whether the command succeeded
 */
export function printCommandResult(
	command: string,
	result: string,
	success = true,
): void {
	consoleOutput("");
	const colorFn = success ? colors.success : colors.error;
	consoleOutput(DOUBLE_LINE, { color: colorFn });
	const icon = success ? icons.success : icons.error;
	const boldColorFn = success ? colors.successBold : colors.errorBold;
	consoleOutput(`${icon} [${command.toUpperCase()}] ${result}`, {
		color: boldColorFn,
	});
	consoleOutput(DOUBLE_LINE, { color: colorFn });
}

/**
 * Print OUTPUT section header
 */
export function printOutputSection(): void {
	consoleOutput("");
	consoleOutput("OUTPUT", { color: colors.highlight });
	consoleOutput(SINGLE_LINE, { color: colors.muted });
}

/**
 * Print NEXT STEPS section with available commands
 * @param steps - Array of next steps with command and description
 */
export function printNextStepsSection(steps: NextStep[]): void {
	consoleOutput("");
	consoleOutput("NEXT STEPS", { color: colors.highlight });
	consoleOutput(SINGLE_LINE, { color: colors.muted });
	for (const step of steps) {
		consoleOutput(`${colors.info(icons.arrow)} ${colors.command(step.cmd)}`);
		consoleOutput(`  ${colors.muted(step.desc)}`);
	}
}

/**
 * Print AI Agent warning/reminder
 * These are critical rules AI agents must follow
 */
export function printAIWarning(): void {
	consoleOutput("");
	consoleOutput(SINGLE_LINE, { color: colors.warning });
	consoleOutput(`${icons.alert} AI AGENT RULES`, { color: colors.warningBold });
	consoleOutput(
		"• NEVER read or modify files in .taskflow/ or tasks/ directly",
		{
			color: colors.warning,
		},
	);
	consoleOutput("• ALWAYS use pnpm task commands for task management", {
		color: colors.warning,
	});
	consoleOutput("• ONLY modify project source code to implement tasks", {
		color: colors.warning,
	});
	consoleOutput(SINGLE_LINE, { color: colors.warning });
}

/**
 * Print pre-hook failure message
 * @param requiredState - The required state/condition that was not met
 * @param currentState - The current state
 * @param recoveryCommand - Command to recover
 */
export function printPreHookFailure(
	requiredState: string,
	currentState: string,
	recoveryCommand: string,
): void {
	printCommandResult(
		"PRE-CHECK FAILED",
		`Expected: ${requiredState}, Got: ${currentState}`,
		false,
	);
	printOutputSection();
	consoleOutput(`Cannot proceed: ${currentState}`, { color: colors.error });
	consoleOutput(`Required state: ${requiredState}`, { color: colors.muted });
	printNextStepsSection([
		{ cmd: recoveryCommand, desc: "Run this to fix the issue" },
	]);
}

// ============================================================================
// Output Functions
// ============================================================================

export function printHeader(title: string): void {
	consoleOutput(`\n${colors.highlight(`[${title.toUpperCase()}]`)}`);
	consoleOutput(colors.muted("\u2500".repeat(50)));
}

export function printSubheader(title: string): void {
	consoleOutput(`\n${colors.infoBold(title)}`);
}

export function printSection(title: string): void {
	printHeader(title);
}

export function printSuccess(message: string): void {
	consoleOutput(`${colors.success(icons.success)} ${message}`);
}

export function printError(message: string): void {
	consoleOutput(`${colors.error(icons.error)} ${message}`);
}

export function printWarning(message: string): void {
	consoleOutput(`${colors.warning(icons.warning)} ${message}`);
}

export function printInfo(message: string): void {
	consoleOutput(`${colors.info(icons.info)} ${message}`);
}

export function printMuted(message: string): void {
	consoleOutput(message, { color: colors.muted });
}

export function printCommand(label: string, command: string): void {
	consoleOutput(`  ${colors.highlight(label)}  ${colors.command(command)}`);
}

export function printKeyValue(key: string, value: string): void {
	consoleOutput(`  ${colors.muted(`${key}:`)} ${value}`);
}

export function printDivider(char = "\u2500", length = 50): void {
	consoleOutput(char.repeat(length), { color: colors.muted });
}

export function printEmptyLine(): void {
	consoleOutput("");
}

export function printColoredLine(
	message: string,
	colorFn: (s: string) => string,
): void {
	consoleOutput(message, { color: colorFn });
}

export function printLine(message: string): void {
	consoleOutput(message);
}

// ============================================================================
// Task-specific Output
// ============================================================================

export function printTaskStarted(
	taskId: string,
	title: string,
	storyTitle: string,
): void {
	printSection("Session Started");
	consoleOutput(
		`${colors.state(icons.rocket)} ${colors.successBold(`Task ${taskId}`)}`,
	);
	printKeyValue("Title", title);
	printKeyValue("Story", storyTitle);
}

export function printTaskCompleted(taskId: string): void {
	printSection("Task Completed");
	consoleOutput(
		`${colors.success(icons.celebration)} ${colors.successBold(`Task ${taskId} is complete!`)}`,
	);
}

export function printCurrentState(
	state: string,
	taskId: string,
	filePath: string,
): void {
	printSection("Current State");
	consoleOutput(`${colors.state(state.toUpperCase())}`);
	printMuted(`Task: ${taskId}`);
	printMuted(`File: ${filePath}`);
}

export function printNextStep(command: string, description?: string): void {
	printSection("Next Steps");
	consoleOutput(`${colors.command(command)}`);
	if (description) {
		consoleOutput(`  ${colors.muted(description)}`);
	}
}

export function printNextSteps(steps: { cmd: string; desc: string }[]): void {
	printSection("Next Steps");
	for (const step of steps) {
		consoleOutput(`${colors.command(step.cmd)}`);
		consoleOutput(`  ${colors.muted(step.desc)}`);
	}
}

export function printAction(action: string, command: string): void {
	consoleOutput(
		`\n${colors.command("ACTION:")} Run ${colors.highlight(command)} ${action}`,
	);
}

// ============================================================================
// Workflow State Instructions
// ============================================================================

export function printSetupInstructions(taskFilePath: string): void {
	printSubheader(`${icons.memo} INSTRUCTIONS:`);
	consoleOutput(`1. Read the task file: ${colors.file(taskFilePath)}`);
	consoleOutput(`2. Verify you have all necessary context.`);
}

export function printVerifyInstructions(): void {
	printSubheader(`${icons.search} INSTRUCTIONS:`);
	consoleOutput(`1. Review your code (Self-Retrospective).`);
	consoleOutput(
		`2. Check for hardcoded paths, 'any' types, and error handling.`,
	);
	consoleOutput(`3. Ensure all acceptance criteria in the task file are met.`);
	consoleOutput(
		`4. ${colors.error("Double-check against .taskflow/ref/RETROSPECTIVE.md")}`,
	);
	printNextStep("pnpm task check");
}

export function printValidateInstructions(): void {
	printSubheader(`${icons.test} INSTRUCTIONS:`);
	consoleOutput(`1. The system will now run automated checks.`);
	consoleOutput(`   - Type Check`);
	consoleOutput(`   - Lint/Format`);
	consoleOutput(`   - Architecture Validation`);
	printAction("to start validation.", "pnpm task check");
}

export function printCommitInstructions(
	_featureId: string,
	_taskId: string,
	_taskTitle: string,
	_storyId: string,
): void {
	printSubheader(`${icons.save} INSTRUCTIONS:`);
	consoleOutput(
		`1. Run ${colors.highlight("pnpm task commit")} with your bullet points.`,
	);
	printMuted(
		`   Format: pnpm task commit " - change 1\\n - change 2\\n - change 3"`,
	);
	printMuted(`   Body: 3-4 bullet points describing changes done`);
	printMuted(`   (Header and Footer are auto-generated)`);
	consoleOutput(
		`   Example: ${colors.highlight(`pnpm task commit " - Added user login validation\\n - Improved error messages for failed login\\n - Updated session handling logic"`)}`,
	);
	consoleOutput(
		`\n${colors.warning("NOTE:")} This will commit, push, and mark task as completed.`,
	);
}

// ============================================================================
// Error Output
// ============================================================================

export function printTaskflowError(error: unknown): void {
	printSection("Error");
	if (isTaskflowError(error)) {
		consoleOutput(
			`${colors.errorBold(`${icons.error} ${error.name.replace("Error", "").toUpperCase()}`)}`,
			{ type: "error" },
		);
		consoleOutput(`  ${error.message}`, { type: "error" });
		if (error.recoveryHint) {
			consoleOutput(`\n${colors.command("Hint:")} ${error.recoveryHint}`);
		}
	} else if (error instanceof Error) {
		consoleOutput(`${colors.errorBold(`${icons.error} ERROR`)}`, {
			type: "error",
		});
		consoleOutput(`  ${error.message}`, { type: "error" });
	} else {
		consoleOutput(`${colors.errorBold(`${icons.error} ERROR`)}`, {
			type: "error",
		});
		consoleOutput(`  ${String(error)}`, { type: "error" });
	}
}

// ============================================================================
// Available Commands
// ============================================================================

export function printAvailableCommands(
	commands: readonly { readonly cmd: string; readonly desc: string }[],
): void {
	consoleOutput(`\n${colors.command("Available Commands:")}`);
	for (const { cmd, desc } of commands) {
		printCommand(cmd, desc);
	}
	printEmptyLine();
}

export const COMMON_COMMANDS = {
	noSession: [
		{ cmd: "pnpm task start <id>", desc: "Start a new task session" },
		{ cmd: "pnpm task next", desc: "Find the next available task" },
		{ cmd: "pnpm task status", desc: "View overall project progress" },
	],
	activeSession: [
		{ cmd: "pnpm task do", desc: "View instructions for current state" },
		{ cmd: "pnpm task check", desc: "Run validations and advance state" },
		{ cmd: "pnpm task commit", desc: "Commit changes (when ready)" },
	],
	all: [
		{ cmd: "pnpm task start <id>", desc: "Start a new task session" },
		{ cmd: "pnpm task do", desc: "Get context-aware instructions" },
		{ cmd: "pnpm task check", desc: "Run validations & advance state" },
		{ cmd: "pnpm task commit", desc: "Commit and push changes" },
		{ cmd: "pnpm task next", desc: "Find next available task" },
		{ cmd: "pnpm task status", desc: "Show project overview" },
		{ cmd: "pnpm task resume", desc: "Resume interrupted session" },
		{ cmd: "pnpm task skip", desc: "Skip/block a task with reason" },
		{ cmd: "pnpm task retro add", desc: "Add error to retrospective" },
		{ cmd: "pnpm task help", desc: "Show help message" },
	],
} as const;

// ============================================================================
// Validation Output
// ============================================================================

export function extractErrorSummary(output: string, command: string): string {
	const lines = output.split("\n");
	const errorLines: string[] = [];

	// Collect lines matching error patterns with context
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i];
		if (line && ERROR_PATTERNS.some((p) => p.test(line))) {
			// Add 1 line before for context (if exists and not already added)
			const prevLine = lines[i - 1];
			if (i > 0 && prevLine && !errorLines.includes(prevLine)) {
				errorLines.push(prevLine);
			}
			errorLines.push(line);
			// Add 2 lines after for context
			const nextLine1 = lines[i + 1];
			const nextLine2 = lines[i + 2];
			if (i + 1 < lines.length && nextLine1) errorLines.push(nextLine1);
			if (i + 2 < lines.length && nextLine2) errorLines.push(nextLine2);
		}
	}

	// Dedupe and limit
	const uniqueLines = [...new Set(errorLines)];
	const summary = uniqueLines.slice(0, MAX_SUMMARY_LINES);

	if (uniqueLines.length > MAX_SUMMARY_LINES) {
		summary.push(
			`\n... ${uniqueLines.length - MAX_SUMMARY_LINES} more error lines (see full log)`,
		);
	}

	return summary.length > 0
		? summary.join("\n")
		: `No specific errors extracted. Check full log for ${command}`;
}

export function printValidationHeader(label: string): void {
	consoleOutput(`${colors.highlight(`> ${label}`)}`);
}

export function printValidationStatus(
	success: boolean,
	summary?: string,
): void {
	if (success) {
		consoleOutput(`  ${colors.success(`${icons.success} Passed`)}`);
	} else {
		consoleOutput(`  ${colors.error(`${icons.error} Failed`)}`);
		if (summary) {
			consoleOutput(
				`${colors.warning("\u2500\u2500\u2500 Error Summary \u2500\u2500\u2500")}`,
			);
			consoleOutput(summary);
			consoleOutput(`${colors.warning("\u2500".repeat(20))}\n`);
		}
	}
}

export function printValidationResult(
	label: string,
	success: boolean,
	summary?: string,
): void {
	printValidationHeader(label);
	printValidationStatus(success, summary);
}

export function printValidationSummary(passed: boolean, logDir: string): void {
	if (passed) {
		consoleOutput(
			`\n${colors.successBold(`${icons.success} ALL VALIDATIONS PASSED`)}`,
		);
	} else {
		consoleOutput(`\n${colors.errorBold(`${icons.error} VALIDATION FAILED`)}`);
		printMuted(`Full logs: ${logDir}`);
		consoleOutput(`Fix the errors and run 'pnpm task check' again.`);
		consoleOutput(
			`${colors.command(`If this is a new error, run: ${colors.highlight("pnpm task retro add")}`)}`,
		);
	}
}

// ============================================================================
// Progress Display
// ============================================================================

export function printProjectOverview(
	totalFeatures: number,
	completedFeatures: number,
	totalStories: number,
	completedStories: number,
	totalTasks: number,
	completedTasks: number,
): void {
	printSection("Project Overview");
	consoleOutput(`  Features: ${completedFeatures}/${totalFeatures} completed`);
	consoleOutput(`  Stories:  ${completedStories}/${totalStories} completed`);
	consoleOutput(`  Tasks:    ${completedTasks}/${totalTasks} completed`);
}

export function printTaskContext(
	currentTask: { id: string; title: string; status: string } | null,
	nextTask: { id: string; title: string } | null,
): void {
	if (currentTask) {
		consoleOutput(`${colors.task(currentTask.id)}`);
	} else {
		consoleOutput(`${colors.warning("\u25cb")}`);
	}

	if (nextTask) {
		consoleOutput(`${colors.info(`\u2192 ${nextTask.id}`)}`);
	}
}

// ============================================================================
// Reference Content Display
// ============================================================================

export function printReferenceContent(
	title: string,
	content: string,
	color: (s: string) => string = colors.muted,
): void {
	printSection(title);
	consoleOutput(content, { color });
}

export function printTaskDetails(
	taskId: string,
	title: string,
	skill: string,
	description: string,
	subtasks: Array<{ id: string; description: string; status: string }>,
	context: string[],
): void {
	printSection(`Task ${taskId}`);
	consoleOutput(`${colors.highlight(title)}`);
	consoleOutput(`${colors.muted("Skill:")} ${colors.command(skill)}`);
	printDivider();
	consoleOutput(description);

	if (subtasks.length > 0) {
		printSubheader("Checklist");
		for (const st of subtasks) {
			const mark =
				st.status === "completed" ? `[${colors.success("x")}]` : "[ ]";
			consoleOutput(`${mark} ${st.id}: ${st.description}`);
		}
	}

	if (context.length > 0) {
		printSubheader("Context Files");
		for (const c of context) {
			consoleOutput(`- ${c}`);
		}
	}
}
