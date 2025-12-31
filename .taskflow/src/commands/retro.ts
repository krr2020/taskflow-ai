/**
 * Retro command - Manage retrospective entries
 *
 * FLOW: Retrospective management - used to track error patterns
 * PRE-HOOK: None (utility command)
 * OUTPUT: Entry added/listed confirmation
 * NEXT STEPS: Continue with task workflow
 */

import {
	colors,
	printAIWarning,
	printColoredLine,
	printCommandResult,
	printEmptyLine,
	printLine,
	printNextStepsSection,
	printOutputSection,
} from "../lib/output";
import {
	addRetrospectiveEntry,
	parseRetroArgs,
	printRetroAddUsage,
	validateRetroArgs,
} from "../lib/retrospective";

export interface RetroOptions {
	subcommand?: string; // 'add', 'list', etc.
	args?: string[];
}

export async function retroCommand(options: RetroOptions = {}): Promise<void> {
	const { subcommand, args = [] } = options;

	switch (subcommand) {
		case "add":
			await handleRetroAdd(args);
			break;

		case "list":
			await handleRetroList();
			break;

		default:
			printRetroHelp();
			break;
	}
}

async function handleRetroAdd(args: string[]): Promise<void> {
	const parsedArgs = parseRetroArgs(args);
	const validationError = validateRetroArgs(parsedArgs);

	if (validationError) {
		printCommandResult("RETRO ADD", "Missing required arguments", false);
		printOutputSection();
		printRetroAddUsage();
		printAIWarning();
		return;
	}

	// At this point, validation passed so all fields are present
	const { category, pattern, solution, criticality } = parsedArgs;
	if (!category || !pattern || !solution || !criticality) {
		printCommandResult("RETRO ADD", "Missing required arguments", false);
		printOutputSection();
		printRetroAddUsage();
		printAIWarning();
		return;
	}

	addRetrospectiveEntry(category, pattern, solution, criticality);

	// ─────────────────────────────────────────────────────────────────────────
	// OUTPUT: Entry added
	// ─────────────────────────────────────────────────────────────────────────
	printCommandResult("RETRO ADD", "Error pattern added to retrospective");
	printOutputSection();
	printLine(`  ${colors.muted("Category:")} ${category}`);
	printLine(`  ${colors.muted("Pattern:")} ${pattern}`);
	printLine(`  ${colors.muted("Solution:")} ${solution}`);
	printLine(`  ${colors.muted("Criticality:")} ${criticality}`);

	printNextStepsSection([
		{ cmd: "pnpm task check", desc: "Continue with validations" },
	]);
	printAIWarning();
}

async function handleRetroList(): Promise<void> {
	const { loadRetrospective } = await import("../lib/retrospective.js");
	const items = loadRetrospective();

	if (items.length === 0) {
		printCommandResult("RETRO LIST", "No entries found");
		printOutputSection();
		printColoredLine(
			"No retrospective entries have been added yet.",
			colors.warning,
		);

		printNextStepsSection([
			{
				cmd: 'pnpm task retro add --category "..." --pattern "..." --solution "..." --criticality "..."',
				desc: "Add a new error pattern",
			},
		]);
		printAIWarning();
		return;
	}

	// ─────────────────────────────────────────────────────────────────────────
	// OUTPUT: List entries
	// ─────────────────────────────────────────────────────────────────────────
	printCommandResult("RETRO LIST", `${items.length} error pattern(s) found`);
	printOutputSection();

	for (const item of items) {
		const critColor =
			item.criticality === "Critical"
				? colors.error
				: item.criticality === "High"
					? colors.warning
					: colors.muted;

		printEmptyLine();
		printLine(
			`${colors.highlight(`#${item.id}`)} [${critColor(item.criticality)}] ${colors.info(item.category)}`,
		);
		printLine(`  ${colors.muted("Pattern:")} ${item.pattern}`);
		printLine(`  ${colors.muted("Solution:")} ${item.solution}`);
		printLine(`  ${colors.muted("Count:")} ${item.count}`);
	}

	printNextStepsSection([
		{
			cmd: "pnpm task do",
			desc: "Review these patterns during implementation",
		},
	]);
	printAIWarning();
}

function printRetroHelp(): void {
	printCommandResult("RETRO", "Retrospective Management");
	printOutputSection();

	printColoredLine("Commands:", colors.highlight);
	printLine(
		`  ${colors.command("pnpm task retro add")}   Add a new error pattern`,
	);
	printLine(
		`  ${colors.command("pnpm task retro list")}  List all error patterns`,
	);
	printEmptyLine();
	printColoredLine('Usage for "add":', colors.highlight);
	printColoredLine(
		'  pnpm task retro add --category "Type Error" --pattern "Cannot find module" --solution "Check import path" --criticality "High"',
		colors.muted,
	);
	printEmptyLine();
	printLine(
		`${colors.highlight("Categories:")} Type Error, Lint, Architecture, Runtime, Build, Test, Formatting`,
	);
	printLine(`${colors.highlight("Criticality:")} Low, Medium, High, Critical`);

	printNextStepsSection([
		{ cmd: "pnpm task retro add ...", desc: "Add a new error pattern" },
		{ cmd: "pnpm task retro list", desc: "View all error patterns" },
	]);
	printAIWarning();
}
