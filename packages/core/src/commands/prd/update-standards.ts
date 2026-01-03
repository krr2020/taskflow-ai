/**
 * PRD Update Standards command - Add new rules to coding-standards.md
 */

import fs from "node:fs";
import { BaseCommand, type CommandResult } from "@/commands/base";
import { ConfigLoader } from "@/lib/config/config-loader";
import { getRefFilePath, REF_FILES } from "@/lib/config/config-paths";
import { LLMRequiredError } from "@/lib/core/errors";

export class PrdUpdateStandardsCommand extends BaseCommand {
	async execute(rule: string, section?: string): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();

		// Validate rule parameter
		if (!rule || rule.trim().length === 0) {
			return this.failure(
				"Rule is required",
				["You must specify the rule to add"],
				[
					"Add a rule to coding standards:",
					"  taskflow prd update-standards <rule> [--section <section-name>]",
					"",
					"Example:",
					'  taskflow prd update-standards "Use async/await instead of .then()" --section "Code Style"',
				].join("\n"),
			);
		}

		// Get coding-standards.md path
		const codingStandardsPath = getRefFilePath(
			paths.refDir,
			REF_FILES.codingStandards,
		);

		// Check if coding-standards.md exists
		if (!fs.existsSync(codingStandardsPath)) {
			return this.failure(
				"Coding standards file not found",
				[`File does not exist: ${codingStandardsPath}`],
				[
					"Generate coding standards first:",
					"  taskflow prd generate-arch <prd-file>",
				].join("\n"),
			);
		}

		// Try to update with LLM if available
		if (this.isLLMAvailable()) {
			return this.executeWithFallback(
				() => this.updateStandardsWithLLM(codingStandardsPath, rule, section),
				() => this.manualUpdate(codingStandardsPath, rule, section),
				"Update Coding Standards",
			);
		}

		// Fallback to manual update
		return this.manualUpdate(codingStandardsPath, rule, section);
	}

	/**
	 * Update coding standards using LLM
	 */
	private async updateStandardsWithLLM(
		codingStandardsPath: string,
		rule: string,
		section?: string,
	): Promise<CommandResult> {
		if (!this.llmProvider) {
			throw new LLMRequiredError("LLM provider not available");
		}

		// Read current standards
		const currentStandards = fs.readFileSync(codingStandardsPath, "utf-8");

		const systemPrompt = `You are an expert software architect tasked with updating coding standards.

Your mission is to add a new rule to the coding-standards.md file in the most appropriate section.

CRITICAL RULES:
1. Preserve all existing content
2. Add the new rule in the appropriate section (or create a new section if needed)
3. Maintain the existing formatting and style
4. Make the rule clear, specific, and enforceable
5. Include examples if helpful

${section ? `The user wants the rule added to section: ${section}` : "Choose the most appropriate section for this rule"}`;

		const userPrompt = `Update the following coding-standards.md by adding this new rule:

RULE TO ADD: ${rule}

CURRENT CONTENT:
${currentStandards}

Output the COMPLETE updated markdown content, including all existing content plus the new rule integrated in the appropriate place.`;

		const messages = [
			{ role: "system" as const, content: systemPrompt },
			{ role: "user" as const, content: userPrompt },
		];

		const options = {
			maxTokens: 5000,
			temperature: 0.2,
		};

		const response = await this.llmProvider.generate(messages, options);

		// Track cost
		this.costTracker.trackUsage(response);

		// Write updated standards
		fs.writeFileSync(codingStandardsPath, response.content, "utf-8");

		return this.success(
			[
				`✓ Updated coding-standards.md`,
				"",
				`Added rule: ${rule}`,
				section ? `Section: ${section}` : "",
				"",
				`File: ${codingStandardsPath}`,
			]
				.filter((s) => s.length > 0)
				.join("\n"),
			[
				"Next steps:",
				"",
				"1. Review the updated file to ensure the rule was added correctly",
				"2. Make manual adjustments if needed",
			].join("\n"),
		);
	}

	/**
	 * Manual update (fallback when LLM is not available)
	 */
	private manualUpdate(
		codingStandardsPath: string,
		rule: string,
		section?: string,
	): Promise<CommandResult> {
		return Promise.resolve(
			this.success(
				[
					`Coding standards file: ${codingStandardsPath}`,
					"",
					"TASK:",
					"─".repeat(60),
					"Add the following rule to coding-standards.md:",
					"",
					`RULE: ${rule}`,
					section
						? `SECTION: ${section}`
						: "SECTION: (Choose appropriate section)",
				].join("\n"),
				[
					"Manual steps:",
					"",
					`1. Open: ${codingStandardsPath}`,
					section
						? `2. Find the "${section}" section`
						: "2. Choose the most appropriate section",
					"3. Add the rule in a clear, enforceable format",
					"4. Include examples if helpful",
					"5. Save the file",
				].join("\n"),
			),
		);
	}
}
