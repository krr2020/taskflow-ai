/**
 * Output utilities for logging and formatting
 *
 * STANDARDIZED OUTPUT FORMAT FOR AI AGENTS
 * ========================================
 * Every command outputs in this structure to guide AI agents through workflows
 */

import pc from "picocolors";
import { ERROR_PATTERNS, MAX_SUMMARY_LINES } from "@/lib/config/config-paths";
import { isTaskflowError } from "@/lib/core/errors";

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

export function printLine(message: string): void {
	consoleOutput(message);
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
		consoleOutput(`Fix the errors and run 'taskflow check' again.`);
		consoleOutput(
			`${colors.command(`If this is a new error, run: ${colors.highlight("taskflow retro add")}`)}`,
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

// ============================================================================
// Task Details Display
// ============================================================================

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

// ============================================================================
// Command Result Formatting (for CLI)
// ============================================================================

import type { CommandResult } from "@/commands/base";

/**
 * Format a successful CommandResult for CLI output
 */
export function formatSuccess(result: CommandResult): string {
	const parts: string[] = [];

	// Output section
	if (result.output) {
		parts.push(result.output);
	}

	// Next steps section
	if (result.nextSteps) {
		parts.push("");
		parts.push(colors.highlight("NEXT STEPS:"));
		parts.push(SINGLE_LINE);
		parts.push(result.nextSteps);
	}

	// AI guidance section (for MCP/AI agents - can be hidden in human mode)
	if (result.aiGuidance) {
		parts.push("");
		parts.push(colors.muted("AI GUIDANCE:"));
		parts.push(colors.muted(SINGLE_LINE));
		parts.push(colors.muted(result.aiGuidance));
	}

	// Context files section
	if (result.contextFiles && result.contextFiles.length > 0) {
		parts.push("");
		parts.push(colors.info("CONTEXT FILES:"));
		parts.push(SINGLE_LINE);
		for (const file of result.contextFiles) {
			parts.push(`  ${colors.file(file)}`);
		}
	}

	// Warnings section
	if (result.warnings && result.warnings.length > 0) {
		parts.push("");
		parts.push(colors.warning(`${icons.warning} WARNINGS:`));
		parts.push(SINGLE_LINE);
		for (const warning of result.warnings) {
			parts.push(`  ${colors.warning(warning)}`);
		}
	}

	return parts.join("\n");
}

/**
 * Format a failed CommandResult for CLI output
 */
export function formatFailure(result: CommandResult): string {
	const parts: string[] = [];

	parts.push(colors.errorBold(`${icons.error} ${result.output}`));

	if (result.errors && result.errors.length > 0) {
		parts.push("");
		parts.push(colors.error("ERRORS:"));
		parts.push(SINGLE_LINE);
		for (const err of result.errors) {
			parts.push(`  ${colors.error(err)}`);
		}
	}

	if (result.nextSteps) {
		parts.push("");
		parts.push(colors.highlight("NEXT STEPS:"));
		parts.push(SINGLE_LINE);
		parts.push(result.nextSteps);
	}

	if (result.aiGuidance) {
		parts.push("");
		parts.push(colors.muted("AI GUIDANCE:"));
		parts.push(colors.muted(SINGLE_LINE));
		parts.push(colors.muted(result.aiGuidance));
	}

	return parts.join("\n");
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
