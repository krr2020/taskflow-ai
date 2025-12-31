/**
 * History command - Show task history and audit trail
 *
 * FLOW: Navigation command - used to visualize task history
 * PRE-HOOK: Validates task exists
 * OUTPUT: Task events, notes, and commit history
 * NEXT STEPS: Continue with current task
 */

import { execaSync } from "execa";
import {
	findTaskLocation,
	getTaskFilePath,
	loadTaskFile,
	loadTasksProgress,
} from "../lib/data-access";
import { TaskNotFoundError } from "../lib/errors";
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

import type { TaskFileContent } from "../lib/types";

export interface HistoryOptions {
	taskId: string;
}

export async function historyCommand(options: HistoryOptions): Promise<void> {
	const taskId = options.taskId;
	const tasksProgress = loadTasksProgress();
	const location = findTaskLocation(tasksProgress, taskId);

	if (!location) {
		throw new TaskNotFoundError(taskId);
	}

	const { task, story, feature } = location;

	printCommandResult("HISTORY", `History for task ${taskId}`);
	printOutputSection();
	printKeyValue("Task ID", colors.task(taskId));
	printKeyValue("Title", task.title);
	printKeyValue("Story", `${story.id} - ${story.title}`);
	printKeyValue("Feature", `${feature.id} - ${feature.title}`);
	printKeyValue("Current Status", colors.state(task.status));

	// Load task file for notes
	const taskFilePath = getTaskFilePath(tasksProgress, taskId);
	let content: TaskFileContent | null = null;
	if (taskFilePath) {
		content = loadTaskFile(taskFilePath);
	}

	if (content?.notes && content.notes.length > 0) {
		printEmptyLine();
		printColoredLine("Notes & Events:", colors.highlight);
		printLine(colors.muted("─".repeat(50)));
		for (const note of content.notes) {
			const timestamp = new Date(note.timestamp).toLocaleString();
			let typeIcon = "📝";
			let typeLabel = "NOTE";

			if (note.type) {
				switch (note.type) {
					case "handoff":
						typeIcon = "🤝";
						typeLabel = "HANDOFF";
						break;
					case "blocker":
						typeIcon = "🚫";
						typeLabel = "BLOCKER";
						break;
					case "decision":
						typeIcon = "💡";
						typeLabel = "DECISION";
						break;
				}
			}

			printLine(
				`${typeIcon} ${colors.muted(timestamp)} - ${colors.info(typeLabel)}`,
			);
			if (note.from && note.to) {
				printLine(
					`    ${colors.muted("From:")} ${note.from} ${colors.muted("→")} ${colors.muted("To:")} ${note.to}`,
				);
			}
			printLine(`    ${note.content}`);
			printEmptyLine();
		}
	}

	// Show commit history for this task
	printEmptyLine();
	printColoredLine("Commit History:", colors.highlight);
	printLine(colors.muted("─".repeat(50)));
	try {
		// Search for commits containing the task ID (T1.1.0 or just 1.1.0)
		// We use grep to filter by task ID
		const commits = execaSync("git", [
			"log",
			"--all",
			"--grep",
			`T${taskId}`,
			"--pretty=%h|%ad|%s|%b",
			"--date=short",
		]).stdout;

		const commitLines = commits.split("\n");

		if (
			commitLines.length === 0 ||
			(commitLines.length === 1 && commitLines[0] === "")
		) {
			printLine("No commits found for this task.");
		} else {
			for (const line of commitLines) {
				if (!line) continue;
				const parts = line.split("|");
				if (parts.length < 3) continue;

				const [hash, date, subject, body] = parts;
				printLine(`${colors.command(hash)} - ${colors.muted(date)}`);
				printLine(`  ${subject}`);
				if (body?.trim()) {
					const bodyLines = body.trim().split("\n");
					// Show first 2 lines of body
					for (let i = 0; i < Math.min(bodyLines.length, 2); i++) {
						printLine(`  ${colors.muted(bodyLines[i])}`);
					}
					if (bodyLines.length > 2) {
						printLine(`  ${colors.muted("...")}`);
					}
				}
				printEmptyLine();
			}
		}
	} catch {
		printLine(colors.warning("Could not retrieve commit history."));
		// Only show error if it's not just "no matches found" (which git log might exit with 1 for?)
		// Actually git log returns 0 even if no matches found usually, unless invalid arguments.
		// But execaSync throws on non-zero exit code.
	}

	printNextStepsSection([
		{ cmd: "pnpm task do", desc: "View current task instructions" },
		{ cmd: "pnpm task status", desc: "View project overview" },
	]);
	printAIWarning();
}
