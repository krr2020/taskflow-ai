/**
 * Handoff command - Transfer task to another developer
 *
 * FLOW: Recovery command - used to handoff task to another person
 * PRE-HOOK: Validates task exists and recipient is provided
 * OUTPUT: Handoff confirmation with details
 * NEXT STEPS: New person can start the task
 */

import fs from "node:fs";
import path from "node:path";
import {
	findActiveTask,
	findTaskLocation,
	getTaskFilePath,
	loadTaskFile,
	loadTasksProgress,
	saveTaskFile,
	updateTaskStatus,
} from "../lib/data-access";
import { NoActiveSessionError, TaskNotFoundError } from "../lib/errors";
import {
	colors,
	printAIWarning,
	printColoredLine,
	printCommandResult,
	printEmptyLine,
	printKeyValue,
	printLine,
	printNextStepsSection,
	printOutputSection,
} from "../lib/output";

const LOGS_DIR = path.join(process.cwd(), ".taskflow", "logs");

export interface HandoffOptions {
	taskId?: string;
	to?: string;
	notes?: string;
}

interface HandoffEntry {
	taskId: string;
	taskTitle: string;
	from: string;
	to: string;
	timestamp: string;
	notes?: string;
}

export async function handoffCommand(
	options: HandoffOptions = {},
): Promise<void> {
	const tasksProgress = loadTasksProgress();

	let targetTaskId = options.taskId;

	// If no taskId provided, use active task
	if (!targetTaskId) {
		const activeTask = findActiveTask(tasksProgress);
		if (!activeTask) {
			throw new NoActiveSessionError();
		}
		targetTaskId = activeTask.taskId;
	}

	const location = findTaskLocation(tasksProgress, targetTaskId);
	if (!location) {
		throw new TaskNotFoundError(targetTaskId);
	}

	const { task, story, feature } = location;

	// Require recipient
	if (!options.to) {
		printCommandResult("HANDOFF", "Recipient required", false);
		printOutputSection();
		printColoredLine(
			"You must specify who to hand off this task to.",
			colors.error,
		);
		printEmptyLine();
		printColoredLine("Usage:", colors.highlight);
		printLine('  pnpm task handoff <taskId> --to "<person>" --notes "<notes>"');
		printEmptyLine();
		printColoredLine("Example:", colors.highlight);
		printLine(
			'  pnpm task handoff 1.1.0 --to "John Doe" --notes "API changes needed"',
		);

		printNextStepsSection([
			{
				cmd: 'pnpm task handoff <taskId> --to "<person>"',
				desc: "Specify recipient for task handoff",
			},
		]);
		printAIWarning();
		return;
	}

	// Reset task to not-started
	updateTaskStatus(tasksProgress, targetTaskId, "not-started");

	// Add handoff note to task file
	const taskFilePath = getTaskFilePath(tasksProgress, targetTaskId);
	if (taskFilePath) {
		const content = loadTaskFile(taskFilePath);
		if (content) {
			if (!content.notes) content.notes = [];
			content.notes.push({
				timestamp: new Date().toISOString(),
				type: "handoff",
				from: "current",
				to: options.to,
				content: options.notes || "No additional notes",
			});
			content.status = "not-started";
			saveTaskFile(taskFilePath, content);
		}
	}

	// Log handoff
	if (!fs.existsSync(LOGS_DIR)) {
		fs.mkdirSync(LOGS_DIR, { recursive: true });
	}

	const handoffLogPath = path.join(LOGS_DIR, "handoffs.json");
	let handoffs: HandoffEntry[] = [];
	if (fs.existsSync(handoffLogPath)) {
		handoffs = JSON.parse(fs.readFileSync(handoffLogPath, "utf-8"));
	}
	const handoffEntry: HandoffEntry = {
		taskId: targetTaskId,
		taskTitle: task.title,
		from: "current",
		to: options.to,
		timestamp: new Date().toISOString(),
	};
	if (options.notes) {
		handoffEntry.notes = options.notes;
	}
	handoffs.push(handoffEntry);
	fs.writeFileSync(handoffLogPath, JSON.stringify(handoffs, null, 2));

	// ─────────────────────────────────────────────────────────────────────────
	// OUTPUT: Task handed off successfully
	// ─────────────────────────────────────────────────────────────────────────
	printCommandResult(
		"HANDOFF",
		`Task ${targetTaskId} handed off to ${options.to}`,
	);
	printOutputSection();
	printKeyValue("Task ID", colors.task(targetTaskId));
	printKeyValue("Title", task.title);
	printKeyValue("Story", `${story.id} - ${story.title}`);
	printKeyValue("Feature", `${feature.id} - ${feature.title}`);
	printKeyValue("From", "current");
	printKeyValue("To", colors.warning(options.to));
	printKeyValue("Status", colors.state("not-started"));

	if (options.notes) {
		printEmptyLine();
		printColoredLine("Handoff Notes:", colors.highlight);
		printLine(`  ${options.notes}`);
	}

	printNextStepsSection([
		{
			cmd: `pnpm task start ${targetTaskId}`,
			desc: `${options.to} can now start this task`,
		},
	]);
	printAIWarning();
}
