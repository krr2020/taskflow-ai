#!/usr/bin/env tsx

/**
 * Task Manager CLI - Main entry point
 *
 * A task management framework for AI-assisted development.
 */

import { Command } from "commander";
import { abortCommand } from "./commands/abort";
import { backCommand } from "./commands/back";
import { type BulkOptions, bulkCommand } from "./commands/bulk";
import { checkCommand } from "./commands/check";
import { type CommitOptions, commitCommand } from "./commands/commit";
import { type DepsOptions, depsCommand } from "./commands/deps";
import { doCommand } from "./commands/do";
import { type FindOptions, findCommand } from "./commands/find";
import { type HandoffOptions, handoffCommand } from "./commands/handoff";
import { helpCommand } from "./commands/help";
import { type HistoryOptions, historyCommand } from "./commands/history";
import { nextCommand } from "./commands/next";
import { type NoteOptions, noteCommand } from "./commands/note";
import { type ResumeOptions, resumeCommand } from "./commands/resume";
import { retroCommand } from "./commands/retro";
import { type SkipOptions, skipCommand } from "./commands/skip";
import { startCommand } from "./commands/start";
import { type StatusOptions, statusCommand } from "./commands/status";
import { type SubtaskOptions, subtaskCommand } from "./commands/subtask";
import { type TimeOptions, timeCommand } from "./commands/time";
import { printTaskflowError } from "./lib/output";
import type { TaskStatus } from "./lib/types";

const program = new Command();

program
	.name("task")
	.description(
		"Task Manager CLI - A task management framework for AI-assisted development",
	)
	.version("2.0.0");

// ============================================================================
// Workflow Commands
// ============================================================================

program
	.command("start <taskId>")
	.description("Start a new task session")
	.action(async (taskId: string) => {
		await runCommand(() => startCommand({ taskId }));
	});

program
	.command("do")
	.description("Get context-aware instructions for current state")
	.action(async () => {
		await runCommand(() => doCommand());
	});

program
	.command("check")
	.description("Run validations and advance workflow state")
	.action(async () => {
		await runCommand(() => checkCommand());
	});

program
	.command("commit [message]")
	.description("Commit and push changes (provide bullet points as message)")
	.action(async (message?: string) => {
		const options: CommitOptions = message ? { message } : {};
		await runCommand(() => commitCommand(options));
	});

// ============================================================================
// Navigation Commands
// ============================================================================

program
	.command("status [target]")
	.description("Show project overview or details for a feature/story")
	.action(async (target?: string) => {
		const options: StatusOptions = target ? { target } : {};
		await runCommand(() => statusCommand(options));
	});

program
	.command("next")
	.description("Find the next available task")
	.action(async () => {
		await runCommand(() => nextCommand());
	});

program
	.command("find")
	.description("Search and filter tasks by criteria")
	.option(
		"--skill <skill>",
		"Filter by skill (backend, frontend, database, etc.)",
	)
	.option(
		"--status <status>",
		"Filter by status (not-started, implementing, blocked, etc.)",
	)
	.option("--keyword <keyword>", "Search by keyword in title")
	.option("--story <storyId>", "Filter by story ID")
	.option("--feature <featureId>", "Filter by feature ID")
	.action(
		async (options?: {
			skill?: string;
			status?: string;
			keyword?: string;
			story?: string;
			feature?: string;
		}) => {
			const findOptions: FindOptions = {};
			if (options?.skill) {
				findOptions.skill = options.skill as FindOptions["skill"];
			}
			if (options?.status) {
				findOptions.status = options.status as FindOptions["status"];
			}
			if (options?.keyword) {
				findOptions.keyword = options.keyword;
			}
			if (options?.story) {
				findOptions.story = options.story;
			}
			if (options?.feature) {
				findOptions.feature = options.feature;
			}
			await runCommand(() => findCommand(findOptions));
		},
	);

program
	.command("deps <taskId>")
	.description("Show task dependencies and dependency tree")
	.action(async (taskId: string) => {
		const depsOptions: DepsOptions = { taskId };
		await runCommand(() => depsCommand(depsOptions));
	});

program
	.command("history <taskId>")
	.description("Show task history, notes, and commits")
	.action(async (taskId: string) => {
		const historyOptions: HistoryOptions = { taskId };
		await runCommand(() => historyCommand(historyOptions));
	});

program
	.command("bulk <operation>")
	.description(
		"Perform bulk operations on multiple tasks (block, reset, complete)",
	)
	.option("--story <storyId>", "Filter by story ID")
	.option("--feature <featureId>", "Filter by feature ID")
	.option("--status <status>", "Filter by task status")
	.option("--reason <reason>", "Reason for blocking (for block operation)")
	.action(
		async (
			operation: string,
			options?: {
				story?: string;
				feature?: string;
				status?: string;
				reason?: string;
			},
		) => {
			if (
				operation !== "block" &&
				operation !== "reset" &&
				operation !== "complete"
			) {
				console.error(
					"Invalid operation. Must be one of: block, reset, complete",
				);
				process.exit(1);
			}

			const bulkOptions: BulkOptions = {
				operation: operation as "block" | "reset" | "complete",
				story: options?.story,
				feature: options?.feature,
				status: options?.status as TaskStatus | undefined,
				reason: options?.reason,
			};
			await runCommand(() => bulkCommand(bulkOptions));
		},
	);

// ============================================================================
// Recovery Commands
// ============================================================================

program
	.command("resume [taskId]")
	.description("Resume an interrupted session")
	.action(async (taskId?: string) => {
		const options: ResumeOptions = taskId ? { taskId } : {};
		await runCommand(() => resumeCommand(options));
	});

program
	.command("skip [taskId]")
	.description("Mark a task as blocked")
	.option("-r, --reason <reason>", "Reason for skipping")
	.action(async (taskId?: string, options?: { reason?: string }) => {
		const skipOptions: SkipOptions = {};
		if (taskId !== undefined) skipOptions.taskId = taskId;
		if (options?.reason !== undefined) skipOptions.reason = options.reason;
		await runCommand(() => skipCommand(skipOptions));
	});

program
	.command("abort")
	.description("Abandon current active task")
	.action(async () => {
		await runCommand(() => abortCommand());
	});

program
	.command("back")
	.description("Revert to previous workflow state")
	.action(async () => {
		await runCommand(() => backCommand());
	});

program
	.command("handoff [taskId]")
	.description("Transfer task to another person")
	.option("--to <person>", "Person to hand off task to")
	.option("--notes <notes>", "Additional notes for handoff")
	.action(
		async (taskId?: string, options?: { to?: string; notes?: string }) => {
			const handoffOptions: HandoffOptions = {};
			if (taskId) handoffOptions.taskId = taskId;
			if (options?.to) handoffOptions.to = options.to;
			if (options?.notes) handoffOptions.notes = options.notes;
			await runCommand(() => handoffCommand(handoffOptions));
		},
	);

program
	.command("subtask <taskId> <subtaskId>")
	.description("Mark a subtask as completed or pending")
	.option(
		"--status <status>",
		"Subtask status: completed or pending (default: completed)",
	)
	.action(
		async (
			taskId: string,
			subtaskId: string,
			options?: { status?: string },
		) => {
			const status = options?.status === "pending" ? "pending" : "completed";
			const subtaskOptions: SubtaskOptions = { taskId, subtaskId, status };
			await runCommand(() => subtaskCommand(subtaskOptions));
		},
	);

program
	.command("note <taskId> <note>")
	.description("Add a note to a task")
	.action(async (taskId: string, note: string) => {
		const noteOptions: NoteOptions = { taskId, note };
		await runCommand(() => noteCommand(noteOptions));
	});

program
	.command("time [taskId]")
	.description("Track time spent on tasks")
	.option("--start", "Start timer")
	.option("--stop", "Stop timer")
	.option("--log <hours>", "Manually log hours")
	.option("--estimate <hours>", "Set estimated hours")
	.option("--show", "Show time entries")
	.option("--note <note>", "Add note to time entry")
	.action(
		async (
			taskId?: string,
			options?: {
				start?: boolean;
				stop?: boolean;
				log?: string;
				estimate?: string;
				show?: boolean;
				note?: string;
			},
		) => {
			const timeOptions: TimeOptions = {
				taskId,
				start: options?.start,
				stop: options?.stop,
				log: options?.log,
				estimate: options?.estimate,
				show: options?.show,
				note: options?.note,
			};
			await runCommand(() => timeCommand(timeOptions));
		},
	);

// ============================================================================
// Navigation Commands
// ============================================================================

program
	.command("retro <subcommand>")
	.description("Manage retrospective entries (add, list)")
	.option("--category <category>", "Error category")
	.option("--pattern <pattern>", "Error pattern (regex)")
	.option("--solution <solution>", "How to fix")
	.option("--criticality <level>", "Criticality level")
	.allowUnknownOption()
	.action(async (subcommand: string, options: Record<string, string>) => {
		// Convert commander options to args array for retroCommand
		const args: string[] = [];
		if (options.category) args.push("--category", options.category);
		if (options.pattern) args.push("--pattern", options.pattern);
		if (options.solution) args.push("--solution", options.solution);
		if (options.criticality) args.push("--criticality", options.criticality);

		await runCommand(() => retroCommand({ subcommand, args }));
	});

// ============================================================================
// Help Command (override default)
// ============================================================================

program
	.command("help")
	.description("Show detailed help")
	.action(async () => {
		await helpCommand();
	});

// ============================================================================
// Legacy/Deprecated Commands (for backward compatibility)
// ============================================================================

program
	.command("update <taskId>")
	.description("[DEPRECATED] Use start/submit instead")
	.option("-s, --status <status>", "New status")
	.action(async () => {
		console.log(
			"This command is deprecated. Use pnpm task start/submit instead.",
		);
		process.exit(1);
	});

// ============================================================================
// Error Handler Wrapper
// ============================================================================

async function runCommand(fn: () => Promise<void>): Promise<void> {
	try {
		await fn();
	} catch (error) {
		printTaskflowError(error);
		process.exit(1);
	}
}

// ============================================================================
// Parse and Execute
// ============================================================================

program.parse(process.argv);

// If no command was provided, show help
if (process.argv.length <= 2) {
	helpCommand();
}
