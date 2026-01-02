/**
 * PRD Update Architecture command - Add new rules to architecture-rules.md
 */

import fs from "node:fs";
import { ConfigLoader } from "../../lib/config-loader.js";
import { getRefFilePath, REF_FILES } from "../../lib/config-paths.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class PrdUpdateArchCommand extends BaseCommand {
	async execute(rule: string, section?: string): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();

		// Validate rule parameter
		if (!rule || rule.trim().length === 0) {
			return this.failure(
				"Rule is required",
				["You must specify the rule to add"],
				[
					"Add a rule to architecture rules:",
					"  taskflow prd update-arch <rule> [--section <section-name>]",
					"",
					"Example:",
					'  taskflow prd update-arch "API routes must use dependency injection" --section "Dependency Rules"',
				].join("\n"),
			);
		}

		// Get architecture-rules.md path
		const architectureRulesPath = getRefFilePath(
			paths.refDir,
			REF_FILES.architectureRules,
		);

		// Check if architecture-rules.md exists
		if (!fs.existsSync(architectureRulesPath)) {
			return this.failure(
				"Architecture rules file not found",
				[`File does not exist: ${architectureRulesPath}`],
				[
					"Generate architecture rules first:",
					"  taskflow prd generate-arch <prd-file>",
				].join("\n"),
			);
		}

		// Try to update with LLM if available
		if (this.isLLMAvailable()) {
			return this.executeWithFallback(
				() => this.updateArchWithLLM(architectureRulesPath, rule, section),
				() => this.manualUpdate(architectureRulesPath, rule, section),
				"Update Architecture Rules",
			);
		}

		// Fallback to manual update
		return this.manualUpdate(architectureRulesPath, rule, section);
	}

	/**
	 * Update architecture rules using LLM
	 */
	private async updateArchWithLLM(
		architectureRulesPath: string,
		rule: string,
		section?: string,
	): Promise<CommandResult> {
		if (!this.llmProvider) {
			throw new Error("LLM provider not available");
		}

		// Read current rules
		const currentRules = fs.readFileSync(architectureRulesPath, "utf-8");

		const systemPrompt = `You are an expert software architect tasked with updating architecture rules.

Your mission is to add a new architectural rule to the architecture-rules.md file in the most appropriate section.

CRITICAL RULES:
1. Preserve all existing content
2. Add the new rule in the appropriate section (or create a new section if needed)
3. Maintain the existing formatting and style
4. Make the rule clear, specific, and enforceable
5. Include architectural constraints and forbidden patterns

${section ? `The user wants the rule added to section: ${section}` : "Choose the most appropriate section for this rule"}`;

		const userPrompt = `Update the following architecture-rules.md by adding this new rule:

RULE TO ADD: ${rule}

CURRENT CONTENT:
${currentRules}

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

		// Write updated rules
		fs.writeFileSync(architectureRulesPath, response.content, "utf-8");

		return this.success(
			[
				`✓ Updated architecture-rules.md`,
				"",
				`Added rule: ${rule}`,
				section ? `Section: ${section}` : "",
				"",
				`File: ${architectureRulesPath}`,
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
		architectureRulesPath: string,
		rule: string,
		section?: string,
	): Promise<CommandResult> {
		return Promise.resolve(
			this.success(
				[
					`Architecture rules file: ${architectureRulesPath}`,
					"",
					"TASK:",
					"─".repeat(60),
					"Add the following rule to architecture-rules.md:",
					"",
					`RULE: ${rule}`,
					section
						? `SECTION: ${section}`
						: "SECTION: (Choose appropriate section)",
				].join("\n"),
				[
					"Manual steps:",
					"",
					`1. Open: ${architectureRulesPath}`,
					section
						? `2. Find the "${section}" section`
						: "2. Choose the most appropriate section",
					"3. Add the rule with architectural constraints",
					"4. Include forbidden patterns if relevant",
					"5. Save the file",
				].join("\n"),
			),
		);
	}
}
