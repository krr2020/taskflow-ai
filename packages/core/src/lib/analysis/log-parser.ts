/**
 * Log Parser
 * Extracts errors and diagnostic information from build/test logs
 */

import { readFile } from "node:fs/promises";

export interface ParsedError {
	/**
	 * File path (relative or absolute)
	 */
	file: string;

	/**
	 * Line number where error occurred
	 */
	line: number;

	/**
	 * Column number where error occurred
	 */
	column: number;

	/**
	 * Error message
	 */
	message: string;

	/**
	 * Error code or type (e.g., TS2322, E404)
	 */
	code: string;

	/**
	 * Error severity (error, warning, info)
	 */
	severity: "error" | "warning" | "info";

	/**
	 * Context lines around the error
	 */
	context?: string[];

	/**
	 * Raw log line
	 */
	raw: string;
}

export interface LogParseResult {
	/**
	 * Parsed errors
	 */
	errors: ParsedError[];

	/**
	 * Warning count
	 */
	warningCount: number;

	/**
	 * Error count
	 */
	errorCount: number;

	/**
	 * Success indicator (no errors found)
	 */
	success: boolean;
}

/**
 * Log Parser class
 * Parses build/test logs to extract errors and diagnostics
 */
export class LogParser {
	private patterns: Array<{
		name: string;
		regex: RegExp;
		severity: "error" | "warning" | "info";
	}> = [
		{
			name: "TypeScript error",
			regex: /([^:\n]+?):(\d+):(\d+) - error (TS\d+): (.+)/g,
			severity: "error",
		},
		{
			name: "TypeScript warning",
			regex: /([^:\n]+?):(\d+):(\d+) - warning (TS\d+): (.+)/g,
			severity: "warning",
		},
		{
			name: "ESLint error",
			regex: /([^:\n]+?):(\d+):(\d+) error (.+)/g,
			severity: "error",
		},
		{
			name: "ESLint warning",
			regex: /([^:\n]+?):(\d+):(\d+) warning (.+)/g,
			severity: "warning",
		},
		{
			name: "Test failure",
			regex: /FAIL\s+([^\s]+?)(?:\n|$)/g,
			severity: "error",
		},
		{
			name: "Build error",
			regex: /error\s+(.+?)(?:\n|$)/g,
			severity: "error",
		},
		{
			name: "Compilation error",
			regex: /([^:\n]+?):(\d+): error: (.+)/g,
			severity: "error",
		},
	];

	/**
	 * Parse log string
	 */
	parse(logContent: string): LogParseResult {
		const errors: ParsedError[] = [];

		for (const pattern of this.patterns) {
			let match: RegExpExecArray | null = pattern.regex.exec(logContent);
			while (match !== null) {
				const error = this.createErrorFromMatch(match, pattern);
				if (error) {
					errors.push(error);
				}
				match = pattern.regex.exec(logContent);
			}
		}

		const errorCount = errors.filter((e) => e.severity === "error").length;
		const warningCount = errors.filter((e) => e.severity === "warning").length;

		return {
			errors,
			errorCount,
			warningCount,
			success: errorCount === 0,
		};
	}

	/**
	 * Parse log file
	 */
	async parseFile(filePath: string): Promise<LogParseResult> {
		const content = await readFile(filePath, "utf-8");
		return this.parse(content);
	}

	/**
	 * Create error from regex match
	 */
	private createErrorFromMatch(
		match: RegExpExecArray,
		pattern: { name: string; severity: "error" | "warning" | "info" },
	): ParsedError | null {
		const raw = match[0];

		// Try to extract file, line, column, message, code
		let file = "";
		let line = 0;
		let column = 0;
		let message = raw;
		let code = "";

		switch (pattern.name) {
			case "TypeScript error":
			case "TypeScript warning":
				file = match[1] || "";
				line = Number.parseInt(match[2] || "0", 10);
				column = Number.parseInt(match[3] || "0", 10);
				code = match[4]?.split(":")[0] || "";
				message = match[4] || raw;
				break;

			case "ESLint error":
			case "ESLint warning":
				file = match[1] || "";
				line = Number.parseInt(match[2] || "0", 10);
				column = Number.parseInt(match[3] || "0", 10);
				message = match[4] || raw;
				break;

			case "Test failure":
				file = match[1] || "";
				message = `Test failed: ${match[1]}`;
				break;

			case "Build error":
				message = match[1] || raw;
				break;

			case "Compilation error":
				file = match[1] || "";
				line = Number.parseInt(match[2] || "0", 10);
				message = match[3] || raw;
				break;

			default:
				message = raw;
		}

		return {
			file,
			line,
			column,
			message,
			code,
			severity: pattern.severity,
			raw,
		};
	}

	/**
	 * Group errors by file
	 */
	groupErrorsByFile(errors: ParsedError[]): Map<string, ParsedError[]> {
		const grouped = new Map<string, ParsedError[]>();

		for (const error of errors) {
			if (error.file) {
				const existing = grouped.get(error.file) || [];
				existing.push(error);
				grouped.set(error.file, existing);
			}
		}

		return grouped;
	}

	/**
	 * Filter errors by severity
	 */
	filterBySeverity(
		errors: ParsedError[],
		severity: "error" | "warning" | "info",
	): ParsedError[] {
		return errors.filter((e) => e.severity === severity);
	}

	/**
	 * Filter errors by file
	 */
	filterByFile(errors: ParsedError[], filePattern: string): ParsedError[] {
		const regex = new RegExp(filePattern);
		return errors.filter((e) => regex.test(e.file));
	}

	/**
	 * Format error for display
	 */
	formatError(error: ParsedError): string {
		const parts: string[] = [];

		if (error.file) {
			parts.push(error.file);
			if (error.line) {
				parts.push(`:${error.line}`);
				if (error.column) {
					parts.push(`:${error.column}`);
				}
			}
		}

		if (error.code) {
			parts.push(`[${error.code}]`);
		}

		parts.push(`- ${error.message}`);

		return parts.join(" ");
	}
}
