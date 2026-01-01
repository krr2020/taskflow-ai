/**
 * Retrospective module for error pattern management
 */

import fs from "node:fs";
import { getRefFilePath, REF_FILES } from "./config-paths.js";
import type { ParsedError } from "./log-parser.js";
import { colors, icons } from "./output.js";
import type { Criticality, ErrorCategory, RetrospectiveItem } from "./types.js";

// ============================================================================
// Types for Auto-Update
// ============================================================================

export interface NewPattern {
	category: ErrorCategory | string;
	pattern: string;
	solution: string;
	criticality: Criticality | string;
	errorCode?: string;
	affectedFiles: string[];
}

// ============================================================================
// File Path
// ============================================================================

export function getRetrospectiveFilePath(refDir: string): string {
	return getRefFilePath(refDir, REF_FILES.retrospective);
}

// ============================================================================
// Parsing
// ============================================================================

export function loadRetrospective(refDir: string): RetrospectiveItem[] {
	const retroFile = getRetrospectiveFilePath(refDir);
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

export function checkOutputForKnownErrors(
	refDir: string,
	output: string,
): ErrorMatch[] {
	const items = loadRetrospective(refDir);
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

export function processValidationOutput(
	refDir: string,
	output: string,
): {
	knownErrors: ErrorMatch[];
	hasNewErrors: boolean;
} {
	const knownErrors = checkOutputForKnownErrors(refDir, output);

	// If we found known errors, display them
	for (const match of knownErrors) {
		displayKnownError(match.item);
		incrementErrorCount(refDir, match.item.id);
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
		`${colors.command(`Run: ${colors.highlight("taskflow retro add")} to add this error pattern.`)}`,
	);
}

// ============================================================================
// File Modification
// ============================================================================

export function incrementErrorCount(refDir: string, id: string): void {
	const retroFile = getRetrospectiveFilePath(refDir);
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
	refDir: string,
	category: ErrorCategory | string,
	pattern: string,
	solution: string,
	criticality: Criticality | string,
): number {
	const retroFile = getRetrospectiveFilePath(refDir);
	if (!fs.existsSync(retroFile)) {
		throw new Error("retrospective.md not found");
	}

	const items = loadRetrospective(refDir);
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
// Display Functions
// ============================================================================

export function printRetroAddUsage(): void {
	console.log(
		`\n${colors.highlight(`${icons.memo} ADD NEW RETROSPECTIVE ENTRY`)}`,
	);
	console.log(`${colors.muted("This command requires arguments. Use:")}\n`);
	console.log(
		`${colors.command('taskflow retro add --category "<category>" --pattern "<regex>" --solution "<fix>" --criticality "<level>"')}`,
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
		`${colors.muted('taskflow retro add --category "Type Error" --pattern "Cannot find module" --solution "Check import path exists" --criticality "High"')}`,
	);
}

// ============================================================================
// Auto-Update Functions
// ============================================================================

/**
 * Read retrospective file content
 */
export function readRetrospectiveBeforeWork(refDir: string): string {
	const retroFile = getRetrospectiveFilePath(refDir);
	if (!fs.existsSync(retroFile)) {
		return "";
	}
	return fs.readFileSync(retroFile, "utf-8");
}

/**
 * Extract NEW error patterns from parsed errors
 * Compares against existing retrospective to avoid duplicates
 */
export function extractNewPatterns(
	errors: ParsedError[],
	refDir: string,
): NewPattern[] {
	const existingItems = loadRetrospective(refDir);
	const newPatterns: NewPattern[] = [];

	// Group errors by error code and message pattern
	const errorGroups = new Map<string, ParsedError[]>();

	for (const error of errors) {
		const key = error.code || error.message.substring(0, 50);
		if (!errorGroups.has(key)) {
			errorGroups.set(key, []);
		}
		errorGroups.get(key)?.push(error);
	}

	// For each group, check if it's a new pattern
	for (const [, groupErrors] of errorGroups) {
		const firstError = groupErrors[0];
		if (!firstError) continue;

		// Create pattern from error message
		const pattern = firstError.code || firstError.message;

		// Check if this pattern already exists in retrospective
		const alreadyExists = existingItems.some((item) => {
			try {
				const itemPattern = item.pattern.replace(/\\\|/g, "|");
				const regex = new RegExp(itemPattern, "i");
				return regex.test(pattern);
			} catch {
				return item.pattern.toLowerCase().includes(pattern.toLowerCase());
			}
		});

		if (!alreadyExists) {
			// Determine category from error
			let category: ErrorCategory | string = "Runtime";
			if (firstError.code?.startsWith("TS")) {
				category = "Type Error";
			} else if (
				firstError.message.includes("eslint") ||
				firstError.message.includes("lint")
			) {
				category = "Lint";
			} else if (firstError.message.includes("test")) {
				category = "Test";
			}

			// Determine criticality based on severity
			let criticality: Criticality | string = "Medium";
			if (firstError.severity === "error") {
				criticality = "High";
			} else if (firstError.severity === "warning") {
				criticality = "Low";
			}

			newPatterns.push({
				category,
				pattern,
				solution: "Review error message and fix the underlying issue",
				criticality,
				errorCode: firstError.code,
				affectedFiles: groupErrors.map((e) => e.file).filter(Boolean),
			});
		}
	}

	return newPatterns;
}

/**
 * Append new patterns to retrospective file
 * Uses existing addRetrospectiveEntry for each pattern
 */
export function appendNewPatternsToRetrospective(
	refDir: string,
	patterns: NewPattern[],
): number[] {
	const addedIds: number[] = [];

	for (const pattern of patterns) {
		const id = addRetrospectiveEntry(
			refDir,
			pattern.category,
			pattern.pattern,
			pattern.solution,
			pattern.criticality,
		);
		addedIds.push(id);
	}

	return addedIds;
}

/**
 * Format a new pattern for display (before adding to retrospective)
 */
export function formatNewPatternForDisplay(pattern: NewPattern): string {
	const lines: string[] = [];
	lines.push(`${colors.highlight("New Error Pattern Detected:")}`);
	lines.push(`  Category: ${colors.muted(pattern.category)}`);
	lines.push(`  Pattern: ${colors.warning(pattern.pattern)}`);
	if (pattern.errorCode) {
		lines.push(`  Code: ${colors.error(pattern.errorCode)}`);
	}
	lines.push(`  Suggested Solution: ${colors.success(pattern.solution)}`);
	lines.push(`  Criticality: ${colors.state(pattern.criticality)}`);
	if (pattern.affectedFiles.length > 0) {
		lines.push(
			`  Affected Files: ${colors.muted(pattern.affectedFiles.slice(0, 3).join(", "))}${pattern.affectedFiles.length > 3 ? "..." : ""}`,
		);
	}
	return lines.join("\n");
}
