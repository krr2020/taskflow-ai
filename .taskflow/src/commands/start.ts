/**
 * Start command - Begin a new task session
 *
 * FLOW: This is the first command in the workflow
 * PRE-HOOK: Checks for no existing active session, valid task ID, correct branch
 * OUTPUT: Task started successfully with task details
 * NEXT STEPS: Run 'pnpm task do' for instructions
 */

import {
	checkDependenciesMet,
	findActiveTask,
	findTaskLocation,
	getUnmetDependencies,
	loadTasksProgress,
	updateTaskStatus,
} from "../lib/data-access";
import {
	ActiveSessionExistsError,
	DependencyNotMetError,
	StoryInProgressError,
	TaskAlreadyCompletedError,
	TaskNotFoundError,
} from "../lib/errors";
import { verifyBranch } from "../lib/git";
import {
	COMMON_COMMANDS,
	colors,
	printAIWarning,
	printAvailableCommands,
	printColoredLine,
	printCommandResult,
	printKeyValue,
	printNextStepsSection,
	printOutputSection,
} from "../lib/output";

export interface StartOptions {
	taskId: string;
}

export async function startCommand(options: StartOptions): Promise<void> {
	const { taskId } = options;

	// ─────────────────────────────────────────────────────────────────────────
	// PRE-HOOK: Validate task ID is provided
	// ─────────────────────────────────────────────────────────────────────────
	if (!taskId) {
		printCommandResult("START", "No task ID provided", false);
		printOutputSection();
		printColoredLine("Task ID is required to start a session.", colors.error);
		printAvailableCommands(COMMON_COMMANDS.noSession);
		printColoredLine("Example: pnpm task start 1.1.1", colors.muted);
		return;
	}

	const tasksProgress = loadTasksProgress();

	// ─────────────────────────────────────────────────────────────────────────
	// PRE-HOOK: Check for existing active session
	// ─────────────────────────────────────────────────────────────────────────
	const activeTask = findActiveTask(tasksProgress);
	if (activeTask && activeTask.taskId !== taskId) {
		throw new ActiveSessionExistsError(activeTask.taskId);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRE-HOOK: Verify task exists
	// ─────────────────────────────────────────────────────────────────────────
	const location = findTaskLocation(tasksProgress, taskId);
	if (!location) {
		throw new TaskNotFoundError(taskId);
	}

	const { feature, story, task } = location;

	// ─────────────────────────────────────────────────────────────────────────
	// PRE-HOOK: Check if task is already completed
	// ─────────────────────────────────────────────────────────────────────────
	if (task.status === "completed") {
		throw new TaskAlreadyCompletedError(taskId);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRE-HOOK: Verify correct branch
	// ─────────────────────────────────────────────────────────────────────────
	verifyBranch(story);

	// ─────────────────────────────────────────────────────────────────────────
	// PRE-HOOK: Check if another story is in progress
	// ─────────────────────────────────────────────────────────────────────────
	const activeStory = tasksProgress.features
		.flatMap((f) => f.stories)
		.find((s) => s.status === "in-progress" && s.id !== story.id);

	if (activeStory) {
		throw new StoryInProgressError(activeStory.id, story.id);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// PRE-HOOK: Check dependencies
	// ─────────────────────────────────────────────────────────────────────────
	if (!checkDependenciesMet(tasksProgress, task)) {
		const unmet = getUnmetDependencies(tasksProgress, task);
		throw new DependencyNotMetError(taskId, unmet);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// EXECUTE: Start the task session
	// ─────────────────────────────────────────────────────────────────────────
	if (!activeTask) {
		// Update task status to 'setup' (first active state)
		updateTaskStatus(tasksProgress, taskId, "setup");

		// ─────────────────────────────────────────────────────────────────────────
		// OUTPUT: Task started successfully
		// ─────────────────────────────────────────────────────────────────────────
		printCommandResult("START", `Task ${taskId} started - Status: SETUP`);
		printOutputSection();
		printKeyValue("Task ID", colors.task(taskId));
		printKeyValue("Title", task.title);
		printKeyValue("Story", `${story.id} - ${story.title}`);
		printKeyValue("Feature", `${feature.id} - ${feature.title}`);
		printKeyValue("Status", colors.state("setup"));
	} else {
		// ─────────────────────────────────────────────────────────────────────────
		// OUTPUT: Task was already active
		// ─────────────────────────────────────────────────────────────────────────
		printCommandResult(
			"START",
			`Task ${taskId} is already active - Status: ${activeTask.content.status.toUpperCase()}`,
		);
		printOutputSection();
		printKeyValue("Task ID", colors.task(taskId));
		printKeyValue("Title", activeTask.content.title);
		printKeyValue("Status", colors.state(activeTask.content.status));
	}

	// ─────────────────────────────────────────────────────────────────────────
	// NEXT STEPS
	// ─────────────────────────────────────────────────────────────────────────
	printNextStepsSection([
		{
			cmd: "pnpm task do",
			desc: "Get context and instructions for implementing this task",
		},
	]);

	// ─────────────────────────────────────────────────────────────────────────
	// AI AGENT REMINDER
	// ─────────────────────────────────────────────────────────────────────────
	printAIWarning();
}
