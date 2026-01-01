/**
 * File Validator
 * Validates code files using LLM to provide fix suggestions and guidance
 */

import { readFile } from "node:fs/promises";
import type { LLMMessage, LLMProvider } from "../llm/base.js";

export interface ValidationResult {
	/**
	 * File path
	 */
	file: string;

	/**
	 * Whether file passed validation
	 */
	passed: boolean;

	/**
	 * Issues found
	 */
	issues: ValidationIssue[];

	/**
	 * Suggestions for fixes
	 */
	suggestions: string[];

	/**
	 * Validation summary
	 */
	summary: string;
}

export interface ValidationIssue {
	/**
	 * Severity of the issue
	 */
	severity: "error" | "warning" | "info";

	/**
	 * Line number (if available)
	 */
	line?: number;

	/**
	 * Issue description
	 */
	message: string;

	/**
	 * Code or type of issue
	 */
	code?: string;

	/**
	 * Suggested fix
	 */
	suggestedFix?: string;
}

export interface ValidatorOptions {
	/**
	 * Provider to use for validation
	 */
	provider: LLMProvider;

	/**
	 * Whether to include context in validation
	 */
	includeContext?: boolean;

	/**
	 * Whether to provide fix suggestions
	 */
	provideFixes?: boolean;

	/**
	 * Maximum issues to report
	 */
	maxIssues?: number;
}

/**
 * File Validator class
 * Validates code files using LLM for analysis and fix suggestions
 */
export class FileValidator {
	constructor(private options: ValidatorOptions) {}

	/**
	 * Validate a file
	 */
	async validate(filePath: string): Promise<ValidationResult> {
		const content = await readFile(filePath, "utf-8");
		return this.validateContent(filePath, content);
	}

	/**
	 * Validate multiple files
	 */
	async validateFiles(filePaths: string[]): Promise<ValidationResult[]> {
		const results: ValidationResult[] = [];

		for (const filePath of filePaths) {
			const result = await this.validate(filePath);
			results.push(result);
		}

		return results;
	}

	/**
	 * Validate file content
	 */
	async validateContent(
		filePath: string,
		content: string,
	): Promise<ValidationResult> {
		const provider = this.options.provider;

		// Create validation prompt
		const messages: LLMMessage[] = [
			{
				role: "user",
				content: this.createValidationPrompt(filePath, content),
			},
		];

		try {
			// Call LLM for validation
			const response = await provider.generate(messages, {
				maxTokens: 2000,
				temperature: 0.3, // Lower temperature for more deterministic results
			});

			// Parse LLM response
			const issues = this.parseValidationResponse(response.content);
			const suggestions = this.extractSuggestions(issues);

			// Determine if passed
			const hasErrors = issues.some((i) => i.severity === "error");
			const hasWarnings = issues.some((i) => i.severity === "warning");

			const summary = this.createSummary(issues, filePath);

			return {
				file: filePath,
				passed: !hasErrors && !hasWarnings,
				issues,
				suggestions,
				summary,
			};
		} catch (error) {
			// Fallback to basic validation if LLM fails
			return this.createFallbackResult(filePath, content, error as Error);
		}
	}

	/**
	 * Create validation prompt
	 */
	private createValidationPrompt(filePath: string, content: string): string {
		const fileName = filePath.split("/").pop() || "";
		const fileExtension = fileName.split(".").pop() || "";

		const prompt = `Analyze the following ${fileExtension} file and identify any issues:

File: ${fileName}
Path: ${filePath}

\`\`\`$${fileExtension}
${this.truncateContent(content)}
\`\`\`

Please provide:
1. Any syntax errors or type errors
2. Any logical errors or bugs
3. Code quality issues (naming, complexity, etc.)
4. Security concerns
5. Performance concerns
6. Suggested fixes for issues found

Format your response as JSON:
\`\`\`json
{
  "issues": [
    {
      "severity": "error" | "warning" | "info",
      "line": number,
      "message": string,
      "code": string,
      "suggestedFix": string
    }
  ],
  "suggestions": ["string", "string"]
}
\`\`\`

If no issues are found, respond with:
\`\`\`json
{
  "issues": [],
  "suggestions": ["File looks good"]
}
\`\`\``;

		return prompt;
	}

	/**
	 * Truncate content to fit within context limits
	 */
	private truncateContent(content: string, maxLength = 8000): string {
		if (content.length <= maxLength) {
			return content;
		}

		// Return first part with indicator
		return `${content.substring(0, maxLength)}\n\n... (content truncated)`;
	}

	/**
	 * Parse validation response from LLM
	 */
	private parseValidationResponse(response: string): ValidationIssue[] {
		try {
			// Try to extract JSON from response
			const jsonMatch = response.match(/```json\s*([\s\S]*?)\s*```/);
			if (jsonMatch?.[1]) {
				const parsed = JSON.parse(jsonMatch[1]) as {
					issues: ValidationIssue[];
					suggestions: string[];
				};
				return parsed.issues ?? [];
			}

			// Try to parse entire response as JSON
			const parsed = JSON.parse(response) as {
				issues: ValidationIssue[];
				suggestions: string[];
			};
			return parsed.issues ?? [];
		} catch {
			// If parsing fails, return empty issues
			return [];
		}
	}

	/**
	 * Extract suggestions from issues
	 */
	private extractSuggestions(issues: ValidationIssue[]): string[] {
		const suggestions: string[] = [];

		for (const issue of issues) {
			if (issue.suggestedFix) {
				suggestions.push(issue.suggestedFix);
			}
		}

		// Add general suggestions if needed
		if (issues.length === 0) {
			suggestions.push("No issues found in the file");
		}

		return suggestions;
	}

	/**
	 * Create validation summary
	 */
	private createSummary(issues: ValidationIssue[], filePath: string): string {
		const errorCount = issues.filter((i) => i.severity === "error").length;
		const warningCount = issues.filter((i) => i.severity === "warning").length;
		const infoCount = issues.filter((i) => i.severity === "info").length;

		const fileName = filePath.split("/").pop() || "";

		if (errorCount === 0 && warningCount === 0 && infoCount === 0) {
			return `${fileName}: No issues found`;
		}

		const parts: string[] = [`${fileName}:`];

		if (errorCount > 0) {
			parts.push(`${errorCount} error${errorCount > 1 ? "s" : ""}`);
		}
		if (warningCount > 0) {
			parts.push(`${warningCount} warning${warningCount > 1 ? "s" : ""}`);
		}
		if (infoCount > 0) {
			parts.push(`${infoCount} info`);
		}

		return parts.join(" ");
	}

	/**
	 * Create fallback result when LLM fails
	 */
	private createFallbackResult(
		filePath: string,
		content: string,
		error: Error,
	): ValidationResult {
		const fileName = filePath.split("/").pop() || "";

		// Basic validation checks
		const issues: ValidationIssue[] = [];

		if (content.trim().length === 0) {
			issues.push({
				severity: "error",
				message: "File is empty",
				code: "EMPTY_FILE",
			});
		}

		if (content.length > 100000) {
			issues.push({
				severity: "warning",
				message: "File is very large, may affect validation",
				code: "LARGE_FILE",
			});
		}

		return {
			file: filePath,
			passed: issues.length === 0,
			issues,
			suggestions: [
				`Validation error: ${error.message}`,
				"AI validation unavailable - showing basic checks only",
			],
			summary: `${fileName}: Basic validation only (${issues.length} issue${issues.length > 1 ? "s" : ""})`,
		};
	}

	/**
	 * Format validation result for display
	 */
	formatResult(result: ValidationResult): string {
		const lines: string[] = [];

		lines.push(`\n${"=".repeat(60)}`);
		lines.push(`File: ${result.file}`);
		lines.push(`Status: ${result.passed ? "✓ PASSED" : "✗ FAILED"}`);
		lines.push("=".repeat(60));
		lines.push("");

		if (result.issues.length > 0) {
			lines.push("Issues:");
			lines.push("");

			for (const issue of result.issues.slice(
				0,
				this.options.maxIssues || 10,
			)) {
				const icon =
					issue.severity === "error"
						? "✗"
						: issue.severity === "warning"
							? "⚠"
							: "ℹ";
				lines.push(`  ${icon} ${issue.message}`);

				if (issue.line) {
					lines.push(`    Line: ${issue.line}`);
				}
				if (issue.code) {
					lines.push(`    Code: ${issue.code}`);
				}
				if (issue.suggestedFix) {
					lines.push(`    Fix: ${issue.suggestedFix}`);
				}
				lines.push("");
			}

			if (result.issues.length > (this.options.maxIssues || 10)) {
				const remaining = result.issues.length - (this.options.maxIssues || 10);
				lines.push(
					`  ... and ${remaining} more issue${remaining > 1 ? "s" : ""} (truncated)`,
				);
				lines.push("");
			}
		}

		if (result.suggestions.length > 0) {
			lines.push("Suggestions:");
			lines.push("");
			for (const suggestion of result.suggestions) {
				lines.push(`  • ${suggestion}`);
			}
			lines.push("");
		}

		lines.push(`Summary: ${result.summary}`);
		lines.push("");

		return lines.join("\n");
	}

	/**
	 * Format multiple validation results
	 */
	formatResults(results: ValidationResult[]): string {
		const lines: string[] = [];

		lines.push(`\n${"=".repeat(80)}`);
		lines.push("Validation Report");
		lines.push("=".repeat(80));

		const passedCount = results.filter((r) => r.passed).length;
		const failedCount = results.filter((r) => !r.passed).length;
		const totalIssues = results.reduce((sum, r) => sum + r.issues.length, 0);

		lines.push(`Files: ${results.length}`);
		lines.push(`Passed: ${passedCount}`);
		lines.push(`Failed: ${failedCount}`);
		lines.push(`Total Issues: ${totalIssues}`);
		lines.push("=".repeat(80));
		lines.push("");

		for (const result of results) {
			lines.push(this.formatResult(result));
		}

		return lines.join("\n");
	}
}
