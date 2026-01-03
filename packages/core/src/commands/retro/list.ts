/**
 * Retrospective List command - List all retrospective entries
 */

import fs from "node:fs";
import { ConfigLoader } from "../../lib/config/config-loader.js";
import { getRefFilePath, REF_FILES } from "../../lib/config/config-paths.js";
import { BaseCommand, type CommandResult } from "../base.js";

interface RetroEntry {
	id: string;
	category: string;
	pattern: string;
	solution: string;
	example?: string;
	count: number;
}

export class RetroListCommand extends BaseCommand {
	async execute(category?: string): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();

		const retroPath = getRefFilePath(paths.refDir, REF_FILES.retrospective);

		// Check if retrospective file exists
		if (!fs.existsSync(retroPath)) {
			return this.failure(
				"Retrospective file not found",
				[`File does not exist: ${retroPath}`],
				[
					"The retrospective file should be created during init.",
					"",
					"To recreate:",
					"1. Run: taskflow init",
					"Or manually create the file using the template.",
				].join("\n"),
			);
		}

		// Read retrospective file
		const content = fs.readFileSync(retroPath, "utf-8");

		// Parse entries
		const entries = this.parseRetrospective(content);

		// Filter by category if specified
		const filteredEntries = category
			? entries.filter(
					(e) => e.category.toLowerCase() === category.toLowerCase(),
				)
			: entries;

		if (filteredEntries.length === 0) {
			return this.success(
				category
					? `No retrospective entries found for category: ${category}`
					: "No retrospective entries yet",
				[
					"Add a retrospective entry:",
					'  taskflow retro add <category> "<error-pattern>" "<solution>"',
					"",
					"Categories:",
					"  - type_error, import_error, runtime_error",
					"  - validation_error, test_error, build_error",
					"  - lint_error, logic_error, other",
				].join("\n"),
			);
		}

		// Group by category
		const byCategory = filteredEntries.reduce(
			(acc, entry) => {
				if (!acc[entry.category]) {
					acc[entry.category] = [];
				}
				acc[entry.category]?.push(entry);
				return acc;
			},
			{} as Record<string, RetroEntry[]>,
		);

		// Format output
		const output: string[] = [
			"RETROSPECTIVE ENTRIES:",
			"─".repeat(60),
			`Total entries: ${filteredEntries.length}`,
			"",
		];

		for (const [cat, catEntries] of Object.entries(byCategory)) {
			output.push(`\n${cat.toUpperCase()} (${catEntries.length} entries):`);
			output.push("─".repeat(60));

			for (const entry of catEntries) {
				output.push(`\n${entry.id} [Count: ${entry.count}]`);
				output.push(`  Pattern: ${entry.pattern}`);
				output.push(`  Solution: ${entry.solution}`);
				if (entry.example) {
					output.push(`  Example: ${entry.example}`);
				}
			}
		}

		return this.success(
			output.join("\n"),
			[
				"To add a new entry:",
				'  taskflow retro add <category> "<pattern>" "<solution>"',
				"",
				"To view specific category:",
				"  taskflow retro list <category>",
				"",
				`To edit entries directly: ${retroPath}`,
			].join("\n"),
			{
				aiGuidance: [
					"Retrospective Entries Overview",
					"",
					"WHAT YOU'RE SEEING:",
					"─────────────────────",
					`${filteredEntries.length} error patterns tracked in the retrospective.`,
					"These are mistakes that have been made before.",
					"",
					"HOW TO USE THIS:",
					"─────────────────",
					"1. BEFORE IMPLEMENTING:",
					"   - Read the retrospective during SETUP phase",
					"   - Avoid making known mistakes",
					"",
					"2. DURING VALIDATION:",
					"   - If validation fails, check if error is known",
					"   - Apply the documented solution",
					"   - If it's a new error, add it with 'taskflow retro add'",
					"",
					"3. PERIODIC REVIEW:",
					"   - Look at high-count entries",
					"   - These indicate systemic issues",
					"   - Consider refactoring to prevent them structurally",
					"",
					"HIGH-COUNT ENTRIES:",
					"────────────────────",
					...filteredEntries
						.filter((e) => e.count >= 3)
						.sort((a, b) => b.count - a.count)
						.slice(0, 5)
						.map(
							(e) =>
								`${e.id} [${e.count}x]: ${e.pattern.substring(0, 50)}${e.pattern.length > 50 ? "..." : ""}`,
						),
					filteredEntries.filter((e) => e.count >= 3).length === 0
						? "No high-frequency errors (count >= 3)"
						: "",
					"",
					"CATEGORIES:",
					"────────────",
					...Object.entries(byCategory).map(
						([cat, entries]) =>
							`${cat}: ${entries.length} entries (total count: ${entries.reduce((sum, e) => sum + e.count, 0)})`,
					),
					"",
					`Full file: ${retroPath}`,
				].join("\n"),
				contextFiles: [
					`${retroPath} - Complete retrospective with all entries`,
				],
				warnings: [
					"High-count entries indicate repeated mistakes",
					"Review these patterns before starting new tasks",
					"Consider structural changes to prevent common errors",
				],
			},
		);
	}

	private parseRetrospective(content: string): RetroEntry[] {
		const entries: RetroEntry[] = [];
		const lines = content.split("\n");

		let currentEntry: Partial<RetroEntry> | null = null;
		let currentCategory = "";

		for (const line of lines) {
			// Category header: ### TYPE_ERROR
			const categoryMatch = line.match(/^###\s+(.+)/);
			if (categoryMatch?.[1]) {
				currentCategory = categoryMatch[1].toLowerCase().replace(/\s+/g, "_");
				continue;
			}

			// Entry header: #### TE001: Pattern text (count: 5)
			const entryMatch = line.match(
				/^####\s+([A-Z]+\d+):\s+(.+?)\s+\(count:\s*(\d+)\)/i,
			);
			if (entryMatch?.[1] && entryMatch[2] && entryMatch[3]) {
				// Save previous entry if exists
				if (currentEntry?.id) {
					entries.push(currentEntry as RetroEntry);
				}

				currentEntry = {
					id: entryMatch[1],
					category: currentCategory,
					pattern: entryMatch[2],
					solution: "", // Required field, will be set when solution is found
					count: parseInt(entryMatch[3], 10),
				};
				continue;
			}

			// Solution line: **Solution:** text
			const solutionMatch = line.match(/^\*\*Solution:\*\*\s+(.+)/);
			if (solutionMatch?.[1] && currentEntry) {
				currentEntry.solution = solutionMatch[1];
				continue;
			}

			// Example line: **Example:** text
			const exampleMatch = line.match(/^\*\*Example:\*\*\s+(.+)/);
			if (exampleMatch?.[1] && currentEntry) {
				currentEntry.example = exampleMatch[1];
			}
		}

		// Add last entry
		if (currentEntry?.id) {
			entries.push(currentEntry as RetroEntry);
		}

		return entries;
	}
}
