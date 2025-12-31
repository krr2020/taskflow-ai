/**
 * Find command - Search and filter tasks
 *
 * FLOW: Navigation command - used to search for tasks by various criteria
 * PRE-HOOK: Validates search criteria
 * OUTPUT: List of matching tasks
 * NEXT STEPS: Start a specific task
 */

import {
	getTaskFilePath,
	loadTaskFile,
	loadTasksProgress,
} from "../lib/data-access";
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
import type {
	Feature,
	Story,
	TaskRef,
	TaskSkill,
	TaskStatus,
} from "../lib/types";

export interface FindOptions {
	skill?: TaskSkill | undefined;
	status?: TaskStatus | undefined;
	keyword?: string | undefined;
	story?: string | undefined;
	feature?: string | undefined;
}

interface TaskSearchResult {
	task: TaskRef;
	story: Story;
	feature: Feature;
}

export async function findCommand(options: FindOptions = {}): Promise<void> {
	const tasksProgress = loadTasksProgress();

	// Check if any filter criteria provided
	const hasFilters =
		options.skill ||
		options.status ||
		options.keyword ||
		options.story ||
		options.feature;

	if (!hasFilters) {
		printCommandResult("FIND", "No search criteria provided", false);
		printOutputSection();
		printColoredLine(
			"You must specify at least one search criterion.",
			colors.error,
		);
		printEmptyLine();
		printColoredLine("Usage:", colors.highlight);
		printLine("  pnpm task find --skill <skill>");
		printLine("  pnpm task find --status <status>");
		printLine('  pnpm task find --keyword "<keyword>"');
		printLine("  pnpm task find --story <storyId>");
		printLine("  pnpm task find --feature <featureId>");
		printEmptyLine();
		printColoredLine("Examples:", colors.highlight);
		printLine("  pnpm task find --skill backend --status not-started");
		printLine('  pnpm task find --keyword "authentication"');
		printLine("  pnpm task find --status blocked");
		printLine("  pnpm task find --story 1.1");

		printNextStepsSection([
			{
				cmd: "pnpm task find --status not-started",
				desc: "Find all tasks not yet started",
			},
		]);
		printAIWarning();
		return;
	}

	const results: TaskSearchResult[] = [];

	// Filter tasks based on criteria
	for (const feature of tasksProgress.features) {
		if (options.feature && feature.id !== options.feature) continue;

		for (const story of feature.stories) {
			if (options.story && story.id !== options.story) continue;

			for (const task of story.tasks) {
				// Check status filter
				if (options.status && task.status !== options.status) continue;

				// Check keyword filter
				if (
					options.keyword &&
					!task.title.toLowerCase().includes(options.keyword.toLowerCase())
				)
					continue;

				// Check skill filter (need to load task file for this)
				if (options.skill) {
					const taskFilePath = getTaskFilePath(tasksProgress, task.id);
					if (taskFilePath) {
						const content = loadTaskFile(taskFilePath);
						if (content && content.skill !== options.skill) continue;
					}
				}

				results.push({ task, story, feature });
			}
		}
	}

	// ─────────────────────────────────────────────────────────────────────────
	// OUTPUT: Search results
	// ─────────────────────────────────────────────────────────────────────────
	printCommandResult("FIND", `Found ${results.length} task(s)`);
	printOutputSection();

	// Show active filters
	printColoredLine("Search Criteria:", colors.highlight);
	if (options.skill) printKeyValue("  Skill", colors.command(options.skill));
	if (options.status) printKeyValue("  Status", colors.state(options.status));
	if (options.keyword)
		printKeyValue("  Keyword", colors.warning(options.keyword));
	if (options.story) printKeyValue("  Story", colors.info(options.story));
	if (options.feature) printKeyValue("  Feature", colors.info(options.feature));
	printEmptyLine();

	if (results.length === 0) {
		printColoredLine("No tasks match your criteria.", colors.warning);
		printEmptyLine();
		printColoredLine("Try adjusting your search criteria:", colors.muted);
		printLine("  - Remove some filters to broaden search");
		printLine("  - Check spelling of keywords");
		printLine("  - Use pnpm task status to see all tasks");
	} else {
		printColoredLine(`Found ${results.length} task(s):`, colors.successBold);
		printEmptyLine();

		for (const { task, story, feature } of results) {
			printLine(`${colors.task(task.id)} - ${task.title}`);
			printLine(`  Story: ${story.id} - ${story.title}`);
			printLine(`  Feature: ${feature.id} - ${feature.title}`);
			printLine(`  Status: ${colors.state(task.status)}`);
			printEmptyLine();
		}
	}

	printNextStepsSection([
		{ cmd: "pnpm task start <id>", desc: "Start a specific task" },
		{ cmd: "pnpm task status <id>", desc: "View details for a task" },
	]);
	printAIWarning();
}
