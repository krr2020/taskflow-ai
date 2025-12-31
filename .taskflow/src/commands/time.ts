/**
 * Time command - Track time spent on tasks
 *
 * FLOW: Utility command - used to track time
 * PRE-HOOK: Validates task exists
 * OUTPUT: Time tracking status
 */

import {
	findActiveTask,
	findTaskLocation,
	getTaskFilePath,
	loadTaskFile,
	loadTasksProgress,
	saveTaskFile,
} from "../lib/data-access";
import { NoActiveSessionError, TaskNotFoundError } from "../lib/errors";
import {
	colors,
	printColoredLine,
	printCommandResult,
	printEmptyLine,
	printKeyValue,
	printLine,
	printNextStepsSection,
	printOutputSection,
} from "../lib/output";

export interface TimeOptions {
	taskId?: string | undefined;
	start?: boolean | undefined;
	stop?: boolean | undefined;
	log?: string | undefined; // number of hours
	show?: boolean | undefined;
	estimate?: string | undefined; // number of hours
	note?: string | undefined;
}

export async function timeCommand(options: TimeOptions): Promise<void> {
	const tasksProgress = loadTasksProgress();
	let targetTaskId = options.taskId;

	// If no taskId provided, use active task
	if (!targetTaskId) {
		const activeTask = findActiveTask(tasksProgress);
		if (activeTask) {
			targetTaskId = activeTask.taskId;
		} else {
			// If we are just showing, we might need a task ID.
			// But if we are starting/stopping, we need a task.
			throw new NoActiveSessionError();
		}
	}

	const location = findTaskLocation(tasksProgress, targetTaskId);
	if (!location) {
		throw new TaskNotFoundError(targetTaskId);
	}

	const { task } = location;
	const taskFilePath = getTaskFilePath(tasksProgress, targetTaskId);

	if (!taskFilePath) {
		throw new TaskNotFoundError(targetTaskId);
	}

	const content = loadTaskFile(taskFilePath);
	if (!content) {
		throw new Error(`Could not load task file for ${targetTaskId}`);
	}

	// Initialize arrays if missing
	if (!content.timeEntries) content.timeEntries = [];

	// Handle commands

	// ESTIMATE
	if (options.estimate) {
		const hours = parseFloat(options.estimate);
		if (Number.isNaN(hours)) {
			throw new Error("Estimate must be a number");
		}
		content.estimatedHours = hours;
		saveTaskFile(taskFilePath, content);

		printCommandResult(
			"TIME",
			`Estimated time updated for task ${targetTaskId}`,
		);
		printOutputSection();
		printKeyValue("Task ID", targetTaskId);
		printKeyValue("Title", task.title);
		printKeyValue("Estimated", `${hours} hours`);
		return;
	}

	// START
	if (options.start) {
		// Check if already running
		const running = content.timeEntries.find((e) => !e.end);
		if (running) {
			printCommandResult(
				"TIME",
				`Timer already running for task ${targetTaskId}`,
				false,
			);
			printOutputSection();
			printLine(`Started at: ${new Date(running.start).toLocaleString()}`);
			printLine("Stop it first with --stop");
			return;
		}

		content.timeEntries.push({
			start: new Date().toISOString(),
			note: options.note,
		});
		saveTaskFile(taskFilePath, content);

		printCommandResult("TIME", `Timer started for task ${targetTaskId}`);
		printOutputSection();
		printKeyValue("Task ID", targetTaskId);
		printKeyValue("Start Time", new Date().toLocaleString());
		if (options.note) {
			printKeyValue("Note", options.note);
		}
		return;
	}

	// STOP
	if (options.stop) {
		const runningIndex = content.timeEntries.findIndex((e) => !e.end);
		if (runningIndex === -1) {
			printCommandResult(
				"TIME",
				`No timer running for task ${targetTaskId}`,
				false,
			);
			return;
		}

		const entry = content.timeEntries[runningIndex];
		if (!entry) {
			throw new Error("Timer entry not found");
		}

		const end = new Date();
		const start = new Date(entry.start);
		const durationMs = end.getTime() - start.getTime();
		const durationHours = durationMs / (1000 * 60 * 60);

		// Round to 2 decimals
		const roundedHours = Math.round(durationHours * 100) / 100;

		content.timeEntries[runningIndex] = {
			...entry,
			end: end.toISOString(),
			hours: roundedHours,
			note: options.note || entry.note, // Update note if provided
		};

		// Update total actual hours
		content.actualHours = (content.actualHours || 0) + roundedHours;

		saveTaskFile(taskFilePath, content);

		printCommandResult("TIME", `Timer stopped for task ${targetTaskId}`);
		printOutputSection();
		printKeyValue("Task ID", targetTaskId);
		printKeyValue("Duration", `${roundedHours} hours`);
		printKeyValue("Total Actual", `${content.actualHours.toFixed(2)} hours`);
		return;
	}

	// LOG
	if (options.log) {
		const hours = parseFloat(options.log);
		if (Number.isNaN(hours)) {
			throw new Error("Log hours must be a number");
		}

		content.timeEntries.push({
			start: new Date().toISOString(), // Just use current time as start
			end: new Date().toISOString(),
			hours: hours,
			note: options.note || "Manual log",
		});

		content.actualHours = (content.actualHours || 0) + hours;
		saveTaskFile(taskFilePath, content);

		printCommandResult(
			"TIME",
			`Logged ${hours} hours for task ${targetTaskId}`,
		);
		printOutputSection();
		printKeyValue("Task ID", targetTaskId);
		printKeyValue("Total Actual", `${content.actualHours.toFixed(2)} hours`);
		return;
	}

	// SHOW (Default if no other action)
	printCommandResult("TIME", `Time tracking for task ${targetTaskId}`);
	printOutputSection();
	printKeyValue("Task ID", targetTaskId);
	printKeyValue("Title", task.title);

	if (content.estimatedHours) {
		printKeyValue("Estimated", `${content.estimatedHours} hours`);
	}

	const total = content.actualHours || 0;
	printKeyValue("Total Spent", `${total.toFixed(2)} hours`);

	if (content.timeEntries && content.timeEntries.length > 0) {
		printEmptyLine();
		printColoredLine("Time Entries:", colors.highlight);
		printLine(colors.muted("─".repeat(50)));

		for (const entry of content.timeEntries) {
			const start = new Date(entry.start).toLocaleString();
			const end = entry.end
				? new Date(entry.end).toLocaleString()
				: "Running...";
			const hours = entry.hours ? `${entry.hours.toFixed(2)}h` : "---";

			printLine(`${start} - ${end} (${hours})`);
			if (entry.note) {
				printLine(`  ${colors.muted(entry.note)}`);
			}
		}
	} else {
		printEmptyLine();
		printLine("No time entries yet.");
	}

	// Check if timer is running
	const running = content.timeEntries.find((e) => !e.end);
	if (running) {
		printEmptyLine();
		printColoredLine("⏱  Timer is RUNNING", colors.success);
		printLine(`Started: ${new Date(running.start).toLocaleString()}`);
	}

	printNextStepsSection([
		{ cmd: `pnpm task time ${targetTaskId} --start`, desc: "Start timer" },
		{ cmd: `pnpm task time ${targetTaskId} --stop`, desc: "Stop timer" },
	]);
}
