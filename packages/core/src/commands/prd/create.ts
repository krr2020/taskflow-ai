/**
 * Enhanced PRD Create Command
 *
 * Uses the new EnhancedPRDSession with all improvements:
 * - File references for brownfield projects
 * - Conversational Q&A mode
 * - Markdown-rendered review loop
 * - Mode-aware prompts
 */

import fs from "node:fs";
import path from "node:path";
import { ConfigLoader } from "../../lib/config/config-loader.js";
import { ProgressDisplay } from "../../lib/display/index.js";
import { EnhancedPRDSession } from "../../lib/prd/index.js";
import { Text } from "../../lib/ui/components.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class PrdCreateCommand extends BaseCommand {
	protected override requiresLLM = true;

	async execute(featureName?: string): Promise<CommandResult> {
		// Validate LLM availability
		this.validateLLM("prd:create");

		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();

		// Create PRDs directory if it doesn't exist
		const prdsDir = path.join(paths.tasksDir, "prds");
		if (!fs.existsSync(prdsDir)) {
			fs.mkdirSync(prdsDir, { recursive: true });
		}

		try {
			// In MCP mode without LLM, use fallback template
			if (this.mcpContext.isMCP && !this.isLLMAvailable()) {
				return this.createFallbackPRD(prdsDir, featureName);
			}

			// Require LLM for non-MCP mode or when using enhanced session
			if (!this.isLLMAvailable()) {
				return this.failure(
					"LLM provider not available",
					["AI provider is required for PRD creation"],
					this.getContent("ERRORS.LLM_REQUIRED"),
				);
			}

			// Run enhanced PRD session
			if (!this.llmProvider) {
				return this.failure(
					"LLM provider not available",
					["AI provider is required for PRD creation"],
					this.getContent("ERRORS.LLM_REQUIRED"),
				);
			}

			const session = new EnhancedPRDSession({
				llmProvider: this.llmProvider,
				projectRoot: this.context.projectRoot,
				mode: this.mcpContext.isMCP ? "mcp" : "manual",
				promptBuilder: this.promptBuilder,
			});

			const result = await session.run(featureName);

			// Generate filename
			const sanitizedName = result.featureName
				.toLowerCase()
				.replace(/[^a-z0-9-]/g, "-")
				.replace(/-+/g, "-")
				.replace(/^-|-$/g, "");

			const timestamp = new Date().toISOString().split("T")[0];
			const prdFilename = `${timestamp}-${sanitizedName}.md`;
			const prdFilePath = path.join(prdsDir, prdFilename);

			// Check if file already exists
			if (fs.existsSync(prdFilePath)) {
				const overwrite = await import("../../lib/input/index.js").then((m) =>
					m.InteractiveSelect.confirm(
						"PRD file already exists. Overwrite?",
						false,
					),
				);

				if (!overwrite) {
					return this.failure(
						"PRD creation cancelled",
						[`File already exists: ${prdFilePath}`],
						"Use a different feature name or delete the existing file",
					);
				}
			}

			// Write PRD file
			const progress = new ProgressDisplay();
			progress.start("Saving PRD to file...");
			fs.writeFileSync(prdFilePath, result.content, "utf-8");
			progress.succeed(`PRD saved: ${prdFilename}`);

			console.log();
			console.log(Text.success("✓ PRD created successfully!"));
			console.log(Text.muted(`Location: ${prdFilePath}`));

			if (result.referencedFiles.length > 0) {
				console.log();
				console.log(
					Text.info(
						`📎 ${result.referencedFiles.length} file(s) were referenced in the PRD`,
					),
				);
				for (const ref of result.referencedFiles.slice(0, 5)) {
					console.log(Text.bullet(`${ref.path}`));
				}
				if (result.referencedFiles.length > 5) {
					console.log(
						Text.muted(`  ... and ${result.referencedFiles.length - 5} more`),
					);
				}
			}

			console.log();

			return this.success(
				`PRD created: ${prdFilename}`,
				this.getContent("PRD.CREATE.SUCCESS"),
				{
					aiGuidance: this.getContent("PRD.CREATE.AI_GUIDANCE"),
					contextFiles: [
						`${prdFilePath} - Generated PRD`,
						`${paths.refDir}/prd-generator.md - PRD guidelines`,
						`${paths.refDir}/ai-protocol.md - AI operating discipline`,
					],
				},
			);
		} catch (error) {
			return this.failure(
				"PRD creation failed",
				[`Error: ${error instanceof Error ? error.message : String(error)}`],
				"Check the error message and try again",
			);
		}
	}

	/**
	 * Create a fallback PRD when LLM is not available in MCP mode
	 */
	private createFallbackPRD(
		prdsDir: string,
		featureName?: string,
	): CommandResult {
		const name = featureName || "Untitled Feature";
		const sanitizedName = name
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "");

		const timestamp = new Date().toISOString().split("T")[0];
		const prdFilename = `${timestamp}-${sanitizedName}.md`;
		const prdFilePath = path.join(prdsDir, prdFilename);

		// Check if file already exists
		if (fs.existsSync(prdFilePath)) {
			return this.failure(
				"PRD file already exists",
				[`File already exists: ${prdFilePath}`],
				"Use a different feature name or delete the existing file",
			);
		}

		// Create basic PRD template
		const prdContent = `# PRD: ${name}

## Introduction/Overview
This document outlines the requirements for the "${name}" feature.

## Goals
- [ ] Define the primary objectives for this feature
- [ ] Identify success criteria
- [ ] Establish measurable outcomes

## User Stories
- As a user, I want to [describe the primary action] so that [explain the benefit]

## Functional Requirements
1. The system shall [requirement 1]
2. The system shall [requirement 2]
3. The system shall [requirement 3]

## Non-Goals (Out of Scope)
- Features that are intentionally excluded from this implementation

## Success Metrics
- Metric 1: [Description and target value]
- Metric 2: [Description and target value]

## Open Questions
- Question 1: [What needs clarification?]
- Question 2: [What needs clarification?]

---
*Generated by TaskFlow in MCP mode (fallback template)*
`;

		// Write PRD file
		fs.writeFileSync(prdFilePath, prdContent, "utf-8");

		console.log();
		console.log(
			Text.success("✓ PRD created successfully! (Fallback Template)"),
		);
		console.log(Text.muted(`Location: ${prdFilePath}`));
		console.log();
		console.log(
			Text.info(
				"ℹ️  This is a basic PRD template. Review and expand it with your specific requirements.",
			),
		);
		console.log();

		return this.success(
			`PRD created: ${prdFilename}`,
			"1. Review and expand the PRD with specific requirements\n2. Fill in user stories and functional requirements\n3. Define success metrics and success criteria\n4. Consider design and technical considerations",
		);
	}
}
