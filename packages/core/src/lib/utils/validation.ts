/**
 * Validation module for running checks
 */

import fs from "node:fs";
import { execaSync } from "execa";
import { getLogFilePath, MAX_OUTPUT_BUFFER } from "../config/config-paths.js";
import { saveLogFile } from "../core/data-access.js";
import { ValidationFailedError } from "../core/errors.js";
import { colors, extractErrorSummary } from "../core/output.js";
import type { ValidationResult } from "../core/types.js";

// ============================================================================
// Validation Status Persistence
// ============================================================================

export interface ValidationStatus {
	taskId: string;
	passed: boolean;
	timestamp: string;
	failedChecks: string[];
}

export function saveValidationStatus(
	logsDir: string,
	taskId: string,
	passed: boolean,
	failedChecks: string[] = [],
): void {
	const statusContent = JSON.stringify(
		{
			taskId,
			passed,
			timestamp: new Date().toISOString(),
			failedChecks,
		},
		null,
		2,
	);
	const logFile = getLogFilePath(logsDir, taskId, "validation-status.json");
	saveLogFile(logFile, "", statusContent);
}

export function getLastValidationStatus(
	logsDir: string,
	taskId: string,
): ValidationStatus | null {
	try {
		const logFile = getLogFilePath(logsDir, taskId, "validation-status.json");
		if (!fs.existsSync(logFile)) return null;

		const content = fs.readFileSync(logFile, "utf-8");
		// Skip header added by saveLogFile
		const jsonStart = content.indexOf("{");
		if (jsonStart === -1) return null;
		const jsonContent = content.slice(jsonStart);
		const status = JSON.parse(jsonContent);
		return {
			taskId: status.taskId,
			passed: status.passed,
			timestamp: status.timestamp,
			failedChecks: status.failedChecks || [],
		};
	} catch (_error) {
		return null;
	}
}

export function getFailedCheckLogs(
	logsDir: string,
	taskId: string,
	checkLabel: string,
): string {
	try {
		const logFile = getLogFilePath(logsDir, taskId, checkLabel);
		if (!fs.existsSync(logFile)) return "";
		return fs.readFileSync(logFile, "utf-8");
	} catch (_error) {
		return "";
	}
}

// ============================================================================
// Command Execution
// ============================================================================

export interface CommandExecResult {
	success: boolean;
	stdout: string;
	stderr: string;
	output: string;
}

export function executeCommand(
	cmd: string,
	args: string[] = [],
): CommandExecResult {
	try {
		const result = execaSync(cmd, args, {
			stdio: "pipe",
			maxBuffer: MAX_OUTPUT_BUFFER,
			reject: false,
			preferLocal: true,
		});

		const output = `${result.stdout}\n${result.stderr}`.trim();
		return {
			success: result.exitCode === 0,
			stdout: result.stdout,
			stderr: result.stderr,
			output,
		};
	} catch (error) {
		const err = error as { stdout?: string; stderr?: string; message?: string };
		const output =
			`${err.stdout || ""}\n${err.stderr || ""}`.trim() ||
			err.message ||
			String(error);
		return {
			success: false,
			stdout: err.stdout || "",
			stderr: err.stderr || "",
			output,
		};
	}
}

/**
 * Execute command using shell mode for better cross-platform compatibility
 * Handles paths with spaces, quoted arguments, and platform-specific syntax
 */
export function executeCommandShell(cmd: string): CommandExecResult {
	try {
		const result = execaSync(cmd, {
			stdio: "pipe",
			maxBuffer: MAX_OUTPUT_BUFFER,
			reject: false,
			preferLocal: true,
			shell: true,
		});

		const output = `${result.stdout}\n${result.stderr}`.trim();
		return {
			success: result.exitCode === 0,
			stdout: result.stdout,
			stderr: result.stderr,
			output,
		};
	} catch (error) {
		const err = error as { stdout?: string; stderr?: string; message?: string };
		const output =
			`${err.stdout || ""}\n${err.stderr || ""}`.trim() ||
			err.message ||
			String(error);
		return {
			success: false,
			stdout: err.stdout || "",
			stderr: err.stderr || "",
			output,
		};
	}
}

export function runCommandWithLog(
	logsDir: string,
	cmd: string,
	label: string,
	taskId: string,
): ValidationResult {
	// Validate command is not empty
	if (!cmd || cmd.trim() === "") {
		throw new ValidationFailedError(
			[`Command cannot be empty for label: ${label}`],
			logsDir,
		);
	}

	// Execute command using shell mode for better cross-platform compatibility
	// This handles paths with spaces, quoted arguments, and platform differences
	const result = executeCommandShell(cmd);
	const logFile = getLogFilePath(logsDir, taskId, label);

	// Save full output to log file
	saveLogFile(logFile, cmd, result.output);

	// Extract summary for display
	const summary = result.success
		? "Passed"
		: extractErrorSummary(result.output, cmd);

	return {
		command: cmd,
		label,
		success: result.success,
		summary,
		fullOutput: result.output,
		logFile,
	};
}

// ============================================================================
// Validation Workflow
// ============================================================================

export interface ValidationSummary {
	passed: boolean;
	results: ValidationResult[];
	failedChecks: string[];
	allOutput: string;
}

export function runValidations(
	logsDir: string,
	taskId: string,
	commands?: Record<string, string>,
): ValidationSummary {
	// If no commands are provided, we cannot run any validations
	// This is better than making assumptions about the user's stack
	if (!commands || Object.keys(commands).length === 0) {
		console.log(colors.warning("⚠️  No validation commands configured."));
		console.log(
			colors.muted(
				"Add validation commands to taskflow.config.json to enable checks.",
			),
		);

		return {
			passed: true, // Pass by default if no checks are configured
			results: [],
			failedChecks: [],
			allOutput: "No validation commands configured.",
		};
	}

	const results: ValidationResult[] = [];
	let _allOutput = "";
	const failedChecks: string[] = [];

	// Run each validation command
	for (const [label, cmd] of Object.entries(commands)) {
		console.log(`running ${label}: ${cmd}`);

		const result = runCommandWithLog(logsDir, cmd, label, taskId);
		results.push(result);

		if (!result.success) {
			failedChecks.push(label);
		}

		_allOutput += `\n--- ${label.toUpperCase()} ---\n${result.fullOutput}\n`;
	}

	return {
		passed: failedChecks.length === 0,
		results,
		failedChecks,
		allOutput: _allOutput,
	};
}

export function assertValidationPassed(
	summary: ValidationSummary,
	logsDir: string,
): void {
	if (!summary.passed) {
		throw new ValidationFailedError(summary.failedChecks, logsDir);
	}
}

// ============================================================================
