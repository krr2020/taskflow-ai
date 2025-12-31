/**
 * Retrospective Add command - Add a new error pattern to retrospective
 */

import { ConfigLoader } from "../../lib/config-loader.js";
import { getRefFilePath, REF_FILES } from "../../lib/config-paths.js";
import { addRetrospectiveEntry } from "../../lib/retrospective.js";
import type { ErrorCategory } from "../../lib/types.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class RetroAddCommand extends BaseCommand {
	async execute(
		category: string,
		errorPattern: string,
		solution: string,
		criticality: string = "medium",
	): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();

		// Validate inputs
		if (!category || category.trim().length === 0) {
			return this.failure(
				"Category is required",
				["You must specify an error category"],
				[
					"Add a retrospective entry:",
					'  taskflow retro add <category> "<error-pattern>" "<solution>" [criticality]',
					"",
					"Valid categories:",
					"  - type_error: TypeScript type errors",
					"  - import_error: Module/import issues",
					"  - runtime_error: Runtime errors",
					"  - validation_error: Validation failures",
					"  - test_error: Test failures",
					"  - build_error: Build/compilation errors",
					"  - lint_error: Linting errors",
					"  - logic_error: Business logic errors",
					"  - other: Other errors",
					"",
					"Valid criticality levels:",
					"  - low: Minor issues, suggestions",
					"  - medium: Important to fix (default)",
					"  - high: Critical, must fix immediately",
					"",
					"Example:",
					'  taskflow retro add type_error "Cannot find name" "Verify import path exists" high',
				].join("\n"),
			);
		}

		if (!errorPattern || errorPattern.trim().length === 0) {
			return this.failure(
				"Error pattern is required",
				["You must specify the error pattern to match"],
				[
					"Provide an error pattern:",
					'  taskflow retro add type_error "<error-pattern>" "<solution>"',
					"",
					"The pattern should be:",
					"- A substring that appears in the error message",
					"- Specific enough to match the error type",
					"- Not too generic (avoid patterns like 'error' or 'failed')",
				].join("\n"),
			);
		}

		if (!solution || solution.trim().length === 0) {
			return this.failure(
				"Solution is required",
				["You must specify the solution to the error"],
				[
					"Provide a solution:",
					'  taskflow retro add type_error "Cannot find name" "<solution>"',
					"",
					"The solution should:",
					"- Be specific and actionable",
					"- Explain how to fix the error",
					"- Reference relevant files or patterns if applicable",
				].join("\n"),
			);
		}

		// Validate category and normalize
		const categoryMap: Record<string, ErrorCategory> = {
			type_error: "Type Error",
			type: "Type Error",
			lint_error: "Lint",
			lint: "Lint",
			architecture: "Architecture",
			arch: "Architecture",
			runtime_error: "Runtime",
			runtime: "Runtime",
			build_error: "Build",
			build: "Build",
			test_error: "Test",
			test: "Test",
			formatting: "Formatting",
			format: "Formatting",
		};

		const normalizedCategory =
			categoryMap[category.toLowerCase().replace(/\s+/g, "_")] || category;

		// Add retrospective entry
		try {
			const errorId = addRetrospectiveEntry(
				paths.refDir,
				normalizedCategory as ErrorCategory,
				errorPattern.trim(),
				solution.trim(),
				criticality.trim(),
			);

			const retroPath = getRefFilePath(paths.refDir, REF_FILES.retrospective);

			return this.success(
				[
					`✓ Retrospective entry added: ${errorId}`,
					`✓ Category: ${normalizedCategory}`,
					`✓ Pattern: ${errorPattern}`,
					"",
					"This error will now be detected in future validations.",
				].join("\n"),
				[
					"The system will now:",
					"1. Watch for this error pattern in validation output",
					"2. Provide the solution automatically when detected",
					"3. Increment the count each time it occurs",
					"",
					"To view all retrospective entries:",
					"  taskflow retro list",
					"",
					`To edit the entry, open: ${retroPath}`,
				].join("\n"),
				{
					aiGuidance: [
						"Retrospective Entry Added",
						"",
						"WHAT IS THE RETROSPECTIVE?",
						"───────────────────────────",
						"The retrospective is a living document that tracks:",
						"- Common errors that occur during development",
						"- Solutions to those errors",
						"- How many times each error has occurred",
						"",
						"WHY IS THIS IMPORTANT?",
						"───────────────────────",
						"1. PREVENTS REPEAT MISTAKES:",
						"   - AI reads retrospective before starting tasks",
						"   - Known errors are avoided proactively",
						"",
						"2. PROVIDES INSTANT SOLUTIONS:",
						"   - When validation fails, retrospective is checked",
						"   - If error is known, solution is shown immediately",
						"",
						"3. TRACKS PATTERNS:",
						"   - Count field shows how often errors occur",
						"   - Helps identify systemic issues",
						"",
						"YOUR ENTRY:",
						"────────────",
						`ID: ${errorId}`,
						`Category: ${normalizedCategory}`,
						`Pattern: "${errorPattern}"`,
						`Solution: "${solution}"`,
						`Criticality: ${criticality}`,
						"",
						"HOW IT WORKS:",
						"──────────────",
						"1. During VALIDATING phase, validation output is scanned",
						"2. If output contains the error pattern, it's matched",
						"3. Solution is displayed to the AI",
						"4. Count is incremented",
						"5. AI applies the solution and re-runs validation",
						"",
						"BEST PRACTICES:",
						"────────────────",
						"- Add entries for recurring errors only",
						"- Make patterns specific but not too narrow",
						"- Provide actionable solutions",
						"- Include examples when helpful",
						"- Review retrospective periodically",
						"",
						`File: ${retroPath}`,
					].join("\n"),
					contextFiles: [
						`${retroPath} - Complete retrospective log`,
						"Entry will be used during task validation",
					],
					warnings: [
						"The retrospective is read during SETUP and VALIDATING phases",
						"Make sure patterns are specific enough to avoid false matches",
						"Update the solution if a better approach is discovered",
					],
				},
			);
		} catch (error) {
			return this.failure(
				"Failed to add retrospective entry",
				[
					error instanceof Error ? error.message : "Unknown error",
					"",
					"The retrospective file may be corrupted or inaccessible.",
				],
				[
					"Try:",
					`1. Check the file: ${getRefFilePath(paths.refDir, REF_FILES.retrospective)}`,
					"2. Verify it's valid Markdown format",
					"3. Fix any syntax errors",
					"4. Try again",
				].join("\n"),
			);
		}
	}
}
