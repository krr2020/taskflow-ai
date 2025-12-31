/**
 * TaskFlow CLI - Command-line interface
 */

import process from "node:process";
import { Command } from "commander";
import type { CommandContext, CommandResult } from "../commands/base.js";
// Import commands
import { InitCommand } from "../commands/init.js";
import { PrdCreateCommand } from "../commands/prd/create.js";
import { PrdGenerateArchCommand } from "../commands/prd/generate-arch.js";
import { RetroAddCommand } from "../commands/retro/add.js";
import { RetroListCommand } from "../commands/retro/list.js";
import { TasksGenerateCommand } from "../commands/tasks/generate.js";
import { UpgradeCommand } from "../commands/upgrade.js";
import { CheckCommand } from "../commands/workflow/check.js";
import { CommitCommand } from "../commands/workflow/commit.js";
import { DoCommand } from "../commands/workflow/do.js";
import { NextCommand } from "../commands/workflow/next.js";
import { ResumeCommand } from "../commands/workflow/resume.js";
import { SkipCommand } from "../commands/workflow/skip.js";
import { StartCommand } from "../commands/workflow/start.js";
import { StatusCommand } from "../commands/workflow/status.js";
// Import errors
import { formatError, TaskflowError } from "../lib/errors.js";
import {
	consoleOutput,
	formatFailure,
	formatSuccess,
	printLine,
} from "../lib/output.js";

export async function runCLI() {
	const program = new Command();

	program
		.name("taskflow")
		.description("AI-first task management and workflow system")
		.version("1.0.0");

	// Create command context
	const context: CommandContext = {
		projectRoot: process.cwd(),
	};

	// ========================================
	// INIT COMMAND
	// ========================================
	program
		.command("init")
		.description("Initialize taskflow in the current project")
		.argument("[project-name]", "Project name (defaults to directory name)")
		.action(async (projectName?: string) => {
			try {
				const cmd = new InitCommand(context);
				const result = await cmd.execute(projectName);
				console.log(formatSuccess(result));
				process.exit(0);
			} catch (error) {
				handleError(error);
			}
		});

	// ========================================
	// UPGRADE COMMAND
	// ========================================
	program
		.command("upgrade")
		.description("Upgrade .taskflow reference files to latest version")
		.option("--force", "Force upgrade even if already up to date")
		.option("--auto", "Skip prompts for user-generated files")
		.option("--diff", "Show diff summary without upgrading")
		.action(async (options) => {
			try {
				const cmd = new UpgradeCommand(context);
				const result = await cmd.execute(options);
				console.log(formatSuccess(result));
				process.exit(0);
			} catch (error) {
				handleError(error);
			}
		});

	// ========================================
	// STATUS COMMAND
	// ========================================
	program
		.command("status")
		.description("Show project, feature, or story status")
		.argument("[id]", "Feature ID (N) or Story ID (N.M)")
		.action(async (id?: string) => {
			try {
				const cmd = new StatusCommand(context);
				const result = await cmd.execute(id);
				console.log(formatSuccess(result));
				process.exit(0);
			} catch (error) {
				handleError(error);
			}
		});

	// ========================================
	// NEXT COMMAND
	// ========================================
	program
		.command("next")
		.description("Find the next available task")
		.action(async () => {
			try {
				const cmd = new NextCommand(context);
				const result = await cmd.execute();
				console.log(formatSuccess(result));
				process.exit(0);
			} catch (error) {
				handleError(error);
			}
		});

	// ========================================
	// START COMMAND
	// ========================================
	program
		.command("start")
		.description("Start working on a task")
		.argument("<task-id>", "Task ID (e.g., 1.1.0)")
		.action(async (taskId: string) => {
			try {
				const cmd = new StartCommand(context);
				const result = await cmd.execute(taskId);
				console.log(formatSuccess(result));
				process.exit(0);
			} catch (error) {
				handleError(error);
			}
		});

	// ========================================
	// CHECK COMMAND
	// ========================================
	program
		.command("check")
		.description("Validate current task and advance to next status")
		.action(async () => {
			try {
				const cmd = new CheckCommand(context);
				const result = await cmd.execute();
				console.log(formatSuccess(result));
				process.exit(0);
			} catch (error) {
				handleError(error);
			}
		});

	// ========================================
	// COMMIT COMMAND
	// ========================================
	program
		.command("commit")
		.description("Commit changes and complete the task")
		.argument(
			"<message>",
			'Bullet points describing changes (e.g., "- Added X\\n- Fixed Y")',
		)
		.action(async (message: string) => {
			try {
				const cmd = new CommitCommand(context);
				const result = await cmd.execute(message);
				console.log(formatSuccess(result));
				process.exit(0);
			} catch (error) {
				handleError(error);
			}
		});

	// ========================================
	// DO COMMAND
	// ========================================
	program
		.command("do")
		.description("Execute the next step of the current task")
		.action(async () => {
			try {
				const cmd = new DoCommand(context);
				const result = await cmd.execute();
				if (!result.success) {
					consoleOutput(formatFailure(result));
					process.exit(1);
				} else {
					// Don't modify output for 'do' command as it has custom formatting
					printLine(result.output);
					if (result.nextSteps) {
						printLine("\nNEXT STEPS:");
						printLine(result.nextSteps);
					}
				}
				process.exit(0);
			} catch (error) {
				handleError(error);
			}
		});

	// ========================================
	// RESUME COMMAND
	// ========================================
	program
		.command("resume")
		.description("Resume a blocked or on-hold task")
		.argument(
			"[status]",
			"Status to resume to (setup, implementing, verifying, validating)",
		)
		.action(async (status?: string) => {
			try {
				const cmd = new ResumeCommand(context);
				const result = await cmd.execute(status);
				console.log(formatSuccess(result));
				process.exit(0);
			} catch (error) {
				handleError(error);
			}
		});

	// ========================================
	// SKIP COMMAND
	// ========================================
	program
		.command("skip")
		.description("Mark current task as blocked")
		.argument("<reason>", "Reason for blocking the task")
		.action(async (reason: string) => {
			try {
				const cmd = new SkipCommand(context);
				const result = await cmd.execute(reason);
				console.log(formatSuccess(result));
				process.exit(0);
			} catch (error) {
				handleError(error);
			}
		});

	// ========================================
	// PRD COMMANDS
	// ========================================
	const prdCommand = program
		.command("prd")
		.description("PRD (Product Requirements Document) commands");

	prdCommand
		.command("create")
		.description("Create a new PRD")
		.argument("<feature-name>", "Name of the feature")
		.action(async (featureName: string) => {
			try {
				const cmd = new PrdCreateCommand(context);
				const result = await cmd.execute(featureName);
				console.log(formatSuccess(result));
				process.exit(0);
			} catch (error) {
				handleError(error);
			}
		});

	prdCommand
		.command("generate-arch")
		.description(
			"Generate coding-standards.md and architecture-rules.md from PRD",
		)
		.argument("<prd-file>", "PRD filename")
		.action(async (prdFile: string) => {
			try {
				const cmd = new PrdGenerateArchCommand(context);
				const result = await cmd.execute(prdFile);
				console.log(formatSuccess(result));
				process.exit(0);
			} catch (error) {
				handleError(error);
			}
		});

	// ========================================
	// TASKS COMMANDS
	// ========================================
	const tasksCommand = program
		.command("tasks")
		.description("Task generation commands");

	tasksCommand
		.command("generate")
		.description("Generate task breakdown from PRD")
		.argument("<prd-file>", "PRD filename")
		.action(async (prdFile: string) => {
			try {
				const cmd = new TasksGenerateCommand(context);
				const result = await cmd.execute(prdFile);
				console.log(formatSuccess(result));
				process.exit(0);
			} catch (error) {
				handleError(error);
			}
		});

	// ========================================
	// RETRO COMMANDS
	// ========================================
	const retroCommand = program
		.command("retro")
		.description("Retrospective commands");

	retroCommand
		.command("add")
		.description("Add a retrospective entry for a known error pattern")
		.argument("<category>", "Error category")
		.argument("<pattern>", "Error pattern to match")
		.argument("<solution>", "Solution to the error")
		.argument(
			"[criticality]",
			"Criticality level (low, medium, high) - defaults to medium",
		)
		.action(
			async (
				category: string,
				pattern: string,
				solution: string,
				criticality?: string,
			) => {
				try {
					const cmd = new RetroAddCommand(context);
					const result = await cmd.execute(
						category,
						pattern,
						solution,
						criticality || "medium",
					);
					console.log(formatSuccess(result));
					process.exit(0);
				} catch (error) {
					handleError(error);
				}
			},
		);

	retroCommand
		.command("list")
		.description("List all retrospective entries")
		.argument("[category]", "Filter by category")
		.action(async (category?: string) => {
			try {
				const cmd = new RetroListCommand(context);
				const result = await cmd.execute(category);
				console.log(formatSuccess(result));
				process.exit(0);
			} catch (error) {
				handleError(error);
			}
		});

	// Parse command line arguments
	await program.parseAsync(process.argv);
}

/**
 * Handle errors with proper formatting
 */
function handleError(error: unknown): never {
	// Check if it's a failed CommandResult
	if (
		typeof error === "object" &&
		error !== null &&
		"success" in error &&
		(error as CommandResult).success === false
	) {
		console.error(formatFailure(error as CommandResult));
		process.exit(1);
	}

	if (error instanceof TaskflowError) {
		// Custom TaskFlow errors
		console.error(formatError(error));
		process.exit(1);
	}

	if (error instanceof Error) {
		// Generic errors
		console.error(formatError(error));
		console.error("\nStack trace:");
		console.error(error.stack);
		process.exit(1);
	}

	// Unknown error type
	console.error("An unknown error occurred:");
	console.error(error);
	process.exit(1);
}
