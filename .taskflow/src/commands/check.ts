/**
 * Check command - Run validations and advance status
 *
 * FLOW: Called to advance through workflow states
 * PRE-HOOK: Checks for active session, validates current state allows transition
 * OUTPUT: Validation results and state transition details
 * NEXT STEPS: Varies by resulting state
 */

import fs from "node:fs";
import { execaSync } from "execa";
import {
	completeAllSubtasks,
	findActiveTask,
	findTaskLocation,
	getTaskFilePath,
	loadTaskFile,
	loadTasksProgress,
	updateTaskStatus,
} from "../lib/data-access";
import { NoActiveSessionError } from "../lib/errors";
import {
	colors,
	icons,
	printAIWarning,
	printColoredLine,
	printCommandResult,
	printEmptyLine,
	printKeyValue,
	printLine,
	printNextStepsSection,
	printOutputSection,
} from "../lib/output";
import { processValidationOutput } from "../lib/retrospective";
import type {
	ActiveStatus,
	TaskRef,
	TaskStatus,
	TasksProgress,
} from "../lib/types";
import { STATUS_TRANSITIONS } from "../lib/types";
import { runValidations } from "../lib/validation";

// ============================================================================
// Helper Functions for Early State Checks
// ============================================================================

function checkDependenciesMet(
	tasksProgress: TasksProgress,
	task: TaskRef,
): boolean {
	if (!task.dependencies || task.dependencies.length === 0) {
		return true;
	}

	for (const depId of task.dependencies) {
		const location = findTaskLocation(tasksProgress, depId);
		if (!location || location.task.status !== "completed") {
			return false;
		}
	}
	return true;
}

function getUnmetDependencies(
	tasksProgress: TasksProgress,
	task: TaskRef,
): string[] {
	const unmet: string[] = [];
	if (!task.dependencies || task.dependencies.length === 0) {
		return unmet;
	}

	for (const depId of task.dependencies) {
		const location = findTaskLocation(tasksProgress, depId);
		if (!location || location.task.status !== "completed") {
			unmet.push(depId);
		}
	}
	return unmet;
}

function hasUncommittedChanges(): boolean {
	try {
		const result = execaSync("git", ["status", "--porcelain"]);
		return result.stdout.trim().length > 0;
	} catch {
		return false;
	}
}

export async function checkCommand(): Promise<void> {
	const tasksProgress = loadTasksProgress();

	// ─────────────────────────────────────────────────────────────────────────
	// PRE-HOOK: Check for active session
	// ─────────────────────────────────────────────────────────────────────────
	const activeTask = findActiveTask(tasksProgress);
	if (!activeTask) {
		throw new NoActiveSessionError();
	}

	const currentStatus = activeTask.content.status as ActiveStatus;

	let passed = false;
	let nextStatus: TaskStatus | null = null;
	let checkDescription = "";

	switch (currentStatus) {
		case "setup": {
			// Actual checks for setup state
			printColoredLine("Running setup validation checks...", colors.info);

			const checks = {
				taskFile: false,
				contextFiles: false,
				dependencies: false,
			};

			// Check task file
			const taskFilePath = getTaskFilePath(tasksProgress, activeTask.taskId);
			if (taskFilePath && fs.existsSync(taskFilePath)) {
				checks.taskFile = true;
				printColoredLine(
					`${icons.success} Task file loaded successfully`,
					colors.success,
				);
			} else {
				printColoredLine(`${icons.error} Task file not found`, colors.error);
				printColoredLine(
					`${icons.alert} VALIDATION FAILURE: Task file is required to proceed`,
					colors.errorBold,
				);
			}

			// Check context files
			if (taskFilePath) {
				const content = loadTaskFile(taskFilePath);
				if (content?.context && content.context.length > 0) {
					const allExist = content.context.every((file) => fs.existsSync(file));
					checks.contextFiles = allExist;
					if (allExist) {
						printColoredLine(
							`${icons.success} ${content.context.length} context files exist:`,
							colors.success,
						);
						for (const file of content.context) {
							printLine(`  - ${file}`);
						}
					} else {
						printColoredLine(
							`${icons.error} Some context files are missing`,
							colors.error,
						);
						printColoredLine(
							`${icons.alert} VALIDATION FAILURE: All context files must exist`,
							colors.errorBold,
						);
					}
				} else {
					// No context files required, mark as passed
					checks.contextFiles = true;
				}
			}

			// Check dependencies
			const location = findTaskLocation(tasksProgress, activeTask.taskId);
			if (location) {
				const { task } = location;
				const depsMet = checkDependenciesMet(tasksProgress, task);
				checks.dependencies = depsMet;
				if (depsMet) {
					printColoredLine(
						`${icons.success} All dependencies completed`,
						colors.success,
					);
					if (task.dependencies && task.dependencies.length > 0) {
						printLine(`  - ${task.dependencies.join(", ")}`);
					}
				} else {
					const unmet = getUnmetDependencies(tasksProgress, task);
					printColoredLine(
						`${icons.error} Dependencies not met:`,
						colors.error,
					);
					for (const dep of unmet) {
						printLine(`  - ${dep}`);
					}
					printColoredLine(
						`${icons.alert} VALIDATION FAILURE: Complete dependencies before proceeding`,
						colors.errorBold,
					);
				}
			}

			// Determine if all checks passed
			passed = checks.taskFile && checks.contextFiles && checks.dependencies;

			if (passed) {
				checkDescription = "Setup phase complete";
				nextStatus = STATUS_TRANSITIONS.setup;
			}
			break;
		}

		case "implementing": {
			printColoredLine(
				"Running implementation validation checks...",
				colors.info,
			);

			// Check if files were modified
			const hasChanges = hasUncommittedChanges();
			if (hasChanges) {
				printColoredLine(
					`${icons.success} Code changes detected`,
					colors.success,
				);
				checkDescription = "Implementation phase complete";
				passed = true;
				nextStatus = STATUS_TRANSITIONS.implementing;
			} else {
				printColoredLine(
					`${icons.warning} No code changes detected`,
					colors.warning,
				);
				printColoredLine(
					'If you have not started coding yet, use "pnpm task back" to return to SETUP',
					colors.muted,
				);
				printColoredLine(
					`${icons.alert} VALIDATION FAILURE: Code changes are required to proceed`,
					colors.errorBold,
				);
				checkDescription = "No code changes detected";
				passed = false;
				nextStatus = null;
			}
			break;
		}

		case "verifying": {
			printColoredLine("Running verification checks...", colors.info);

			// Check if subtasks are complete
			const content = loadTaskFile(activeTask.filePath);
			if (!content) {
				printColoredLine(`${icons.error} Task file not found`, colors.error);
				printColoredLine(
					`${icons.alert} VALIDATION FAILURE: Task file is required to proceed`,
					colors.errorBold,
				);
				checkDescription = "Task file error";
				passed = false;
				nextStatus = null;
				break;
			}

			const allComplete =
				content?.subtasks?.every((st) => st.status === "completed") ?? true;

			if (allComplete) {
				printColoredLine(
					`${icons.success} All subtasks marked as completed`,
					colors.success,
				);
				checkDescription = "Verification phase complete";
				passed = true;
				nextStatus = STATUS_TRANSITIONS.verifying;
			} else {
				const pending =
					content?.subtasks?.filter((st) => st.status === "pending").length ??
					0;
				printColoredLine(
					`${icons.warning} ${pending} subtask(s) still pending`,
					colors.warning,
				);
				printColoredLine(
					"Mark subtasks as complete before advancing",
					colors.muted,
				);
				printColoredLine(
					`${icons.alert} VALIDATION FAILURE: All subtasks must be completed before proceeding`,
					colors.errorBold,
				);
				checkDescription = "Subtasks not complete";
				passed = false;
				nextStatus = null;
			}
			break;
		}

		case "committing":
			printColoredLine(
				"Task is ready to commit, but running validations again as requested...",
				colors.warning,
			);
			// Fall through to validating logic
			break;
		case "validating": {
			printColoredLine("Running validations...", colors.info);
			printColoredLine(
				"(Full output saved to .taskflow/logs/ - only errors shown here)\n",
				colors.muted,
			);

			const summary = runValidations(activeTask.taskId);
			passed = summary.passed;
			checkDescription = passed
				? "All validations passed"
				: "Validation failed";

			// Check for known/new errors in retrospective
			if (!passed) {
				printColoredLine(
					`${icons.alert} VALIDATION FAILURE: Fix errors shown below before proceeding`,
					colors.errorBold,
				);
				processValidationOutput(summary.allOutput);
			}

			nextStatus = passed ? STATUS_TRANSITIONS.validating : null;

			if (passed && activeTask.filePath) {
				completeAllSubtasks(activeTask.filePath);
			}
			break;
		}

		default:
			printCommandResult("CHECK", `Unknown status: ${currentStatus}`, false);
			return;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// OUTPUT: Display check result
	// ─────────────────────────────────────────────────────────────────────────
	if (passed && nextStatus) {
		updateTaskStatus(tasksProgress, activeTask.taskId, nextStatus);

		printCommandResult(
			"CHECK",
			`${checkDescription} - Advanced to: ${nextStatus.toUpperCase()}`,
		);
		printOutputSection();
		printKeyValue("Task ID", colors.task(activeTask.taskId));
		printKeyValue("Previous State", colors.muted(currentStatus));
		printKeyValue("New State", colors.state(nextStatus));

		// ─────────────────────────────────────────────────────────────────────────
		// NEXT STEPS based on new state
		// ─────────────────────────────────────────────────────────────────────────
		if (nextStatus === "committing") {
			printNextStepsSection([
				{
					cmd: 'pnpm task commit " - change 1\\n - change 2\\n - change 3"',
					desc: "Commit changes with 3-4 bullet points describing what was done",
				},
			]);
		} else if (nextStatus === "validating") {
			printNextStepsSection([
				{
					cmd: "pnpm task check",
					desc: "Run automated validations (type-check, lint, arch, tests)",
				},
			]);
		} else {
			printNextStepsSection([
				{
					cmd: "pnpm task do",
					desc: "Get instructions for current state",
				},
				{
					cmd: "pnpm task check",
					desc: "When ready, advance to next state",
				},
			]);
		}
	} else if (!passed) {
		// ─────────────────────────────────────────────────────────────────────────
		// OUTPUT: Validation failed
		// ─────────────────────────────────────────────────────────────────────────
		printCommandResult("CHECK", "Fix errors and retry", false);
		printOutputSection();
		printKeyValue("Task ID", colors.task(activeTask.taskId));
		printKeyValue("Current State", colors.state(currentStatus));
		printKeyValue("Result", colors.error("FAILED"));
		printEmptyLine();

		// Error Recovery Guidance
		printColoredLine("ERROR RECOVERY STEPS", colors.highlight);
		printColoredLine("─".repeat(50), colors.muted);
		printLine("1. Read the error output above carefully");
		printLine("2. Check full log files in .taskflow/logs/ directory");
		printLine("3. Fix the specific errors in the files mentioned");
		printLine("4. If this is a NEW error pattern, add to retrospective:");
		printLine(
			'   pnpm task retro add --category "..." --pattern "..." --solution "..." --criticality "..."',
		);
		printLine("5. Re-run: pnpm task check");
		printEmptyLine();

		// Common error patterns
		printColoredLine("COMMON ERROR PATTERNS", colors.highlight);
		printColoredLine("─".repeat(50), colors.muted);
		printLine(colors.muted("Check retrospective first for known patterns:"));
		printLine(
			'  • "Cannot find module" → Check import paths and file locations',
		);
		printLine('  • "Property does not exist" → Check type definitions');
		printLine('  • "is not defined" → Check exports and imports');
		printLine(
			'  • "Type X is not assignable to type Y" → Review type compatibility',
		);
		printLine("  • Formatting errors → Run pnpm biome check --write");
		printEmptyLine();

		printNextStepsSection([
			{
				cmd: "Fix the errors shown above",
				desc: "Address validation failures in your project source code",
			},
			{
				cmd: "pnpm task check",
				desc: "Re-run validations to verify fixes",
			},
		]);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// AI AGENT REMINDER
	// ─────────────────────────────────────────────────────────────────────────
	printAIWarning();
}
