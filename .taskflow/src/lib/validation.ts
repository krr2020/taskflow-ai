/**
 * Validation module for running checks
 */

import fs from "node:fs";
import { execaSync } from "execa";
import {
	FIX_COMMAND,
	getLogFilePath,
	LOGS_DIR,
	MAX_OUTPUT_BUFFER,
	VALIDATION_COMMANDS,
} from "./config";
import { saveLogFile } from "./data-access";
import { ValidationFailedError } from "./errors";
import { colors, extractErrorSummary } from "./output";
import type { ValidationResult } from "./types";

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
	const logFile = getLogFilePath(taskId, "validation-status.json");
	saveLogFile(logFile, "", statusContent);
}

export function getLastValidationStatus(
	taskId: string,
): ValidationStatus | null {
	try {
		const logFile = getLogFilePath(taskId, "validation-status.json");
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

export function getFailedCheckLogs(taskId: string, checkLabel: string): string {
	try {
		const logFile = getLogFilePath(taskId, checkLabel);
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
	cmd: string,
	label: string,
	taskId: string,
): ValidationResult {
	// Validate command is not empty
	if (!cmd || cmd.trim() === "") {
		throw new Error(`Command cannot be empty for label: ${label}`);
	}

	// Parse command into executable and args
	const parts = cmd.trim().split(" ");
	const executable = parts[0];

	// Ensure executable exists
	if (!executable) {
		throw new Error(`Invalid command format for label: ${label}`);
	}

	const args = parts.slice(1);

	const result = executeCommand(executable, args);
	const logFile = getLogFilePath(taskId, label);

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

export function runValidations(taskId: string): ValidationSummary {
	const results: ValidationResult[] = [];
	let _allOutput = "";
	const failedChecks: string[] = [];

	// First run fix command (biome:fix)
	console.log();
	console.log(colors.success("═".repeat(50)));
	console.log(colors.successBold(`✓ BIOME:FIX`));
	console.log(colors.success("═".repeat(50)));
	const fixResult = runCommandWithLog(
		FIX_COMMAND.cmd,
		FIX_COMMAND.label,
		taskId,
	);
	_allOutput += `${fixResult.fullOutput}\n`;

	if (fixResult.success) {
		console.log(
			`  ${colors.success("✓")} Auto-fixed ${fixResult.summary} formatting issues`,
		);
	} else {
		console.log(`  ${colors.error("✗")} Failed`);
		if (fixResult.summary) {
			console.log(`${colors.warning("─── Error Summary ───")}`);
			console.log(fixResult.summary);
			console.log(`${colors.warning("─".repeat(20))}\n`);
		}
		console.log(
			colors.muted(
				`Full log: .taskflow/logs/${taskId}_${FIX_COMMAND.label}.log`,
			),
		);
		failedChecks.push(FIX_COMMAND.label);
	}

	// Then run all validation commands
	for (const check of VALIDATION_COMMANDS) {
		// Fail fast if previous checks failed
		if (failedChecks.length > 0) {
			console.log();
			console.log(colors.warning(`⚠️  ${check.label.toUpperCase()} SKIPPED`));
			console.log(colors.muted("(Skipped due to previous failure)"));
			continue;
		}

		// Skip biome-check if we already ran biome:fix (which includes checks)
		if (check.label === "biome-check") {
			continue;
		}

		console.log();
		console.log(colors.success("═".repeat(50)));
		console.log(colors.successBold(`✓ ${check.label.toUpperCase()}`));
		console.log(colors.success("═".repeat(50)));
		const result = runCommandWithLog(check.cmd, check.label, taskId);
		results.push(result);

		// Accumulate output for retrospective analysis
		_allOutput += `${result.fullOutput}\n`;

		if (result.success) {
			console.log(`  ${colors.success("✓")} Passed`);
		} else {
			console.log(`  ${colors.error("✗")} Failed`);
			if (result.summary) {
				console.log(`${colors.warning("─── Error Summary ───")}`);
				console.log(result.summary);
				console.log(`${colors.warning("─".repeat(20))}\n`);
			}
			console.log(
				colors.muted(`Full log: .taskflow/logs/${taskId}_${check.label}.log`),
			);
			failedChecks.push(check.label);
			// Fail fast: stop executing subsequent checks
			break;
		}
	}

	const passed = failedChecks.length === 0;
	console.log();
	console.log(colors.success("═".repeat(50)));
	if (passed) {
		console.log(colors.successBold(`✓ ALL VALIDATIONS PASSED`));
	} else {
		console.log(colors.errorBold(`✗ VALIDATION FAILED`));
		console.log(colors.muted(`Full logs: ${LOGS_DIR}`));
	}
	console.log(colors.success("═".repeat(50)));
	saveValidationStatus(taskId, passed, failedChecks);

	return {
		passed,
		results,
		failedChecks,
		allOutput: _allOutput,
	};
}

export function assertValidationPassed(summary: ValidationSummary): void {
	if (!summary.passed) {
		throw new ValidationFailedError(summary.failedChecks, LOGS_DIR);
	}
}

// ============================================================================
// Individual Check Functions (for more granular control)
// ============================================================================

export function runTypeCheck(taskId: string): ValidationResult {
	return runCommandWithLog("pnpm type-check", "type-check", taskId);
}

export function runLintCheck(taskId: string): ValidationResult {
	return runCommandWithLog("pnpm biome:check", "biome-check", taskId);
}

export function runArchCheck(taskId: string): ValidationResult {
	return runCommandWithLog("pnpm arch:validate", "arch-validate", taskId);
}

export function runBiomeFix(taskId: string): ValidationResult {
	return runCommandWithLog("pnpm biome:fix", "biome-fix", taskId);
}

// ============================================================================
// Pre-commit Validation
// ============================================================================

export function runPreCommitValidation(taskId: string): ValidationSummary {
	// Same as runValidations but with more explicit messaging
	return runValidations(taskId);
}

// ============================================================================
// Quick Checks (without logging)
// ============================================================================

export function quickTypeCheck(): boolean {
	const result = executeCommand("pnpm", ["type-check"]);
	return result.success;
}

export function quickLintCheck(): boolean {
	const result = executeCommand("pnpm", ["biome:check"]);
	return result.success;
}

export function quickArchCheck(): boolean {
	const result = executeCommand("pnpm", ["arch:validate"]);
	return result.success;
}

export function quickAllChecks(): boolean {
	// We include tests in quick checks to be safe
	const typeCheck = executeCommand("pnpm", ["type-check"]);
	if (!typeCheck.success) {
		console.log(colors.error("Type check failed"));
		return false;
	}

	const lintCheck = executeCommand("pnpm", ["biome:check"]);
	if (!lintCheck.success) {
		console.log(colors.error("Lint/Format check failed"));
		return false;
	}

	const archCheck = executeCommand("pnpm", ["arch:validate"]);
	if (!archCheck.success) {
		console.log(colors.error("Architecture check failed"));
		return false;
	}

	const testCheck = executeCommand("pnpm", ["test"]);
	if (!testCheck.success) {
		console.log(colors.error("Tests failed"));
		return false;
	}

	return true;
}
