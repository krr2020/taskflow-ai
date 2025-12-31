/**
 * Retrospective module for error pattern management
 */

import fs from "node:fs";
import { getRefFilePath, REF_FILES } from "./config";
import { colors, icons } from "./output";
import type { Criticality, ErrorCategory, RetrospectiveItem } from "./types";

// ============================================================================
// File Path
// ============================================================================

export function getRetrospectiveFilePath(): string {
	return getRefFilePath(REF_FILES.retrospective);
}

// ============================================================================
// Parsing
// ============================================================================

export function loadRetrospective(): RetrospectiveItem[] {
	const retroFile = getRetrospectiveFilePath();
	if (!fs.existsSync(retroFile)) return [];

	const content = fs.readFileSync(retroFile, "utf-8");
	return parseRetrospectiveContent(content);
}

export function parseRetrospectiveContent(
	content: string,
): RetrospectiveItem[] {
	const lines = content.split("\n");
	const items: RetrospectiveItem[] = [];

	// Parse markdown table
	// Skip header lines (start reading after |---|---|...)
	let inTable = false;
	for (const line of lines) {
		if (line.includes("|---|---|")) {
			inTable = true;
			continue;
		}
		if (inTable && line.trim().startsWith("|")) {
			const parts = line
				.split("|")
				.map((p) => p.trim())
				.filter((p) => p !== "");
			if (parts.length >= 6) {
				items.push({
					id: parts[0] ?? "",
					category: parts[1] ?? "",
					pattern: parts[2] ?? "",
					solution: parts[3] ?? "",
					count: Number.parseInt(parts[4] ?? "0", 10) || 0,
					criticality: parts[5] ?? "",
				});
			}
		}
	}
	return items;
}

// ============================================================================
// Error Detection
// ============================================================================

export interface ErrorMatch {
	item: RetrospectiveItem;
	matched: boolean;
}

export function checkOutputForKnownErrors(output: string): ErrorMatch[] {
	const items = loadRetrospective();
	const matches: ErrorMatch[] = [];

	for (const item of items) {
		// Create regex from pattern (handle escaped pipes)
		const pattern = item.pattern.replace(/\\\|/g, "|");
		try {
			const regex = new RegExp(pattern, "i");
			if (regex.test(output)) {
				matches.push({ item, matched: true });
			}
		} catch {
			// If regex is invalid, try simple string match
			if (output.toLowerCase().includes(pattern.toLowerCase())) {
				matches.push({ item, matched: true });
			}
		}
	}

	return matches;
}

export function processValidationOutput(output: string): {
	knownErrors: ErrorMatch[];
	hasNewErrors: boolean;
} {
	const knownErrors = checkOutputForKnownErrors(output);

	// If we found known errors, display them
	for (const match of knownErrors) {
		displayKnownError(match.item);
		incrementErrorCount(match.item.id);
	}

	// If no known patterns matched but output suggests errors
	const hasErrorIndicators =
		/error|fail|TypeError|SyntaxError|Cannot find/i.test(output);
	const hasNewErrors = hasErrorIndicators && knownErrors.length === 0;

	if (hasNewErrors) {
		displayNewErrorPrompt();
	}

	return { knownErrors, hasNewErrors };
}

// ============================================================================
// Display Functions
// ============================================================================

export function displayKnownError(item: RetrospectiveItem): void {
	console.log(
		`\n${colors.errorBold(`${icons.alert} DETECTED KNOWN ERROR: ${item.id} (${item.category})`)}`,
	);
	console.log(`${colors.warning(`Pattern: ${item.pattern}`)}`);
	console.log(`${colors.success(`Solution: ${item.solution}`)}`);
	console.log(
		`${colors.state(`Accountability: Count incremented for ${item.id}. STOP MAKING THIS MISTAKE.`)}`,
	);
}

export function displayNewErrorPrompt(): void {
	console.log(`\n${colors.warning("No known error patterns matched.")}`);
	console.log(
		`${colors.errorBold(`${icons.warning} NEW ERROR DETECTED - YOU MUST ADD IT TO RETROSPECTIVE`)}`,
	);
	console.log(
		`${colors.command(`Run: ${colors.highlight("pnpm task retro add")} to add this error pattern.`)}`,
	);
}

// ============================================================================
// File Modification
// ============================================================================

export function incrementErrorCount(id: string): void {
	const retroFile = getRetrospectiveFilePath();
	if (!fs.existsSync(retroFile)) return;

	const content = fs.readFileSync(retroFile, "utf-8");
	const lines = content.split("\n");
	const newLines = lines.map((line) => {
		if (line.trim().startsWith(`| ${id} `)) {
			const parts = line.split("|");
			// Count is at index 5 (0 is empty because line starts with |)
			const currentCount = Number.parseInt(parts[5]?.trim() || "0", 10);
			parts[5] = ` ${currentCount + 1} `;
			return parts.join("|");
		}
		return line;
	});

	fs.writeFileSync(retroFile, newLines.join("\n"));
}

export function addRetrospectiveEntry(
	category: ErrorCategory | string,
	pattern: string,
	solution: string,
	criticality: Criticality | string,
): number {
	const retroFile = getRetrospectiveFilePath();
	if (!fs.existsSync(retroFile)) {
		throw new Error("RETROSPECTIVE.md not found");
	}

	const items = loadRetrospective();
	const nextId =
		items.length > 0
			? Math.max(...items.map((i) => Number.parseInt(i.id, 10))) + 1
			: 1;

	const content = fs.readFileSync(retroFile, "utf-8");
	const newRow = `| ${nextId} | ${category} | ${pattern} | ${solution} | 1 | ${criticality} |`;
	const updatedContent = `${content.trimEnd()}\n${newRow}\n`;

	fs.writeFileSync(retroFile, updatedContent);

	console.log(
		`\n${colors.success(`${icons.success} Added retrospective entry #${nextId}`)}`,
	);
	console.log(`${colors.muted(`Category: ${category}`)}`);
	console.log(`${colors.muted(`Pattern: ${pattern}`)}`);
	console.log(`${colors.muted(`Solution: ${solution}`)}`);
	console.log(`${colors.muted(`Criticality: ${criticality}`)}`);

	return nextId;
}

// ============================================================================
// Validation
// ============================================================================

export const VALID_CATEGORIES: ErrorCategory[] = [
	"Type Error",
	"Lint",
	"Architecture",
	"Runtime",
	"Build",
	"Test",
	"Formatting",
];

export const VALID_CRITICALITIES: Criticality[] = [
	"Low",
	"Medium",
	"High",
	"Critical",
];

export function isValidCategory(category: string): category is ErrorCategory {
	return VALID_CATEGORIES.includes(category as ErrorCategory);
}

export function isValidCriticality(
	criticality: string,
): criticality is Criticality {
	return VALID_CRITICALITIES.includes(criticality as Criticality);
}

// ============================================================================
// CLI Argument Parsing
// ============================================================================

export interface RetroAddArgs {
	category?: string;
	pattern?: string;
	solution?: string;
	criticality?: string;
}

export function parseRetroArgs(args: string[]): RetroAddArgs {
	const result: RetroAddArgs = {};
	for (let i = 0; i < args.length; i++) {
		if (args[i] === "--category" && args[i + 1] !== undefined)
			result.category = args[++i] as string;
		else if (args[i] === "--pattern" && args[i + 1] !== undefined)
			result.pattern = args[++i] as string;
		else if (args[i] === "--solution" && args[i + 1] !== undefined)
			result.solution = args[++i] as string;
		else if (args[i] === "--criticality" && args[i + 1] !== undefined)
			result.criticality = args[++i] as string;
	}
	return result;
}

export function validateRetroArgs(args: RetroAddArgs): string | null {
	if (!args.category) return "Missing --category";
	if (!args.pattern) return "Missing --pattern";
	if (!args.solution) return "Missing --solution";
	if (!args.criticality) return "Missing --criticality";
	return null;
}

export function printRetroAddUsage(): void {
	console.log(
		`\n${colors.highlight(`${icons.memo} ADD NEW RETROSPECTIVE ENTRY`)}`,
	);
	console.log(`${colors.muted("This command requires arguments. Use:")}\n`);
	console.log(
		`${colors.command('pnpm task retro add --category "<category>" --pattern "<regex>" --solution "<fix>" --criticality "<level>"')}`,
	);
	console.log(`\n${colors.highlight("Arguments:")}`);
	console.log(
		`  --category     Error category (e.g., "Type Error", "Lint", "Architecture")`,
	);
	console.log(`  --pattern      Regex or keywords to match the error`);
	console.log(`  --solution     How to fix this error`);
	console.log(`  --criticality  "Low", "Medium", "High", or "Critical"`);
	console.log(`\n${colors.highlight("Example:")}`);
	console.log(
		`${colors.muted('pnpm task retro add --category "Type Error" --pattern "Cannot find module" --solution "Check import path exists" --criticality "High"')}`,
	);
}
