/**
 * PRD Refine Command
 *
 * Allows users to refine an existing PRD with AI assistance.
 * Features:
 * - Interactive PRD file selection with arrow keys
 * - Natural language refinement requests
 * - Conversational Q&A if needed
 * - Markdown-rendered preview
 * - Confirmation before saving
 */

import fs from "node:fs";
import path from "node:path";
import { ConfigLoader } from "../../lib/config/config-loader.js";
import { MarkdownDisplay, ProgressDisplay } from "../../lib/display/index.js";
import { ConversationSession } from "../../lib/input/conversation.js";
import { InteractiveSelect } from "../../lib/input/index.js";
import { MultilineInput } from "../../lib/input/multiline.js";
import { Separator, Text } from "../../lib/ui/components.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class PrdRefineCommand extends BaseCommand {
	protected override requiresLLM = true;

	async execute(prdFile?: string): Promise<CommandResult> {
		// Validate LLM availability
		this.validateLLM("prd:refine");

		if (!this.llmProvider) {
			return this.failure(
				"LLM provider not available",
				["AI provider is required for PRD refinement"],
				this.getContent("ERRORS.LLM_REQUIRED"),
			);
		}

		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();
		const prdsDir = path.join(paths.tasksDir, "prds");

		// Check if PRDs directory exists
		if (!fs.existsSync(prdsDir)) {
			return this.failure(
				"No PRDs found",
				["PRDs directory does not exist"],
				"Create a PRD first using: taskflow prd create",
			);
		}

		// Get list of PRD files
		const prdFiles = fs
			.readdirSync(prdsDir)
			.filter((file) => file.endsWith(".md"))
			.sort()
			.reverse(); // Most recent first

		if (prdFiles.length === 0) {
			return this.failure(
				"No PRDs found",
				["No PRD files found in the prds directory"],
				"Create a PRD first using: taskflow prd create",
			);
		}

		// Interactive file selection if not provided
		let selectedFile: string;

		if (prdFile) {
			// Validate provided file
			const fullPath = prdFile.endsWith(".md")
				? path.join(prdsDir, prdFile)
				: path.join(prdsDir, `${prdFile}.md`);

			if (!fs.existsSync(fullPath)) {
				return this.failure(
					"PRD file not found",
					[`File not found: ${prdFile}`],
					`Available files:\n${prdFiles.map((f) => `  • ${f}`).join("\n")}`,
				);
			}

			selectedFile = fullPath;
		} else {
			// Interactive selection
			console.log(Text.heading("📄 Select PRD to Refine"));
			console.log(Separator.light(70));

			const choices = prdFiles.map((file) => {
				const stats = fs.statSync(path.join(prdsDir, file));
				return {
					name: file,
					value: file,
					description: `Modified: ${stats.mtime.toLocaleDateString()}`,
				};
			});

			const selected = await InteractiveSelect.single(
				"Select PRD file to refine:",
				choices,
			);

			selectedFile = path.join(prdsDir, selected);
		}

		// Read current PRD content
		const currentContent = fs.readFileSync(selectedFile, "utf-8");

		// Show current PRD
		console.log(Text.heading("📄 Current PRD"));
		console.log(Separator.light(70));
		console.log(MarkdownDisplay.render(currentContent));

		// Ask what to refine
		console.log(Text.heading("✏️  Refinement Request"));
		console.log(Separator.light(70));

		const needsConversation = await InteractiveSelect.confirm(
			"Do you need to discuss the refinement with AI before proceeding?",
			false,
		);

		let refinementRequest: string;

		if (needsConversation) {
			// Conversational mode
			console.log(Text.muted("\nEntering conversational mode..."));
			console.log(
				Text.muted('Discuss the refinement with AI. Type "done" when ready.\n'),
			);

			const conversation = new ConversationSession(this.llmProvider, {
				topic: "PRD Refinement Discussion",
				systemPrompt: `You are helping a user refine a Product Requirements Document (PRD).

The current PRD content is:
${currentContent}

Your role:
1. Discuss what the user wants to change or improve
2. Ask clarifying questions
3. Help them formulate a clear refinement request
4. When the user is ready, they will type "done"

Be concise and focused on understanding their refinement needs.`,
				initialContext:
					"What would you like to refine in this PRD? I can help you clarify your refinement request.",
			});

			await conversation.start();

			const history = conversation.getHistory();
			refinementRequest =
				"Based on our conversation, here is what I want to refine:\n\n" +
				history
					.filter((msg) => msg.role === "user")
					.map((msg) => msg.content)
					.join("\n\n");
		} else {
			// Direct input mode
			refinementRequest = await MultilineInput.prompt({
				message:
					"What would you like to refine or change in this PRD? (Describe the changes, additions, or improvements you want)",
			});
		}

		if (!refinementRequest || refinementRequest.trim().length === 0) {
			return this.failure(
				"No refinement request provided",
				["You must specify what you want to refine"],
				"Please provide a description of the changes you want",
			);
		}

		// Generate refined PRD
		console.log();
		const progress = new ProgressDisplay();
		progress.start("Refining PRD with AI...");

		try {
			const built = this.buildPrompt("PRD_REFINEMENT", {
				existingPRD: currentContent,
				refinementInstructions: refinementRequest,
			});

			const systemPrompt = built.system;

			const userPrompt = `Current PRD:
${currentContent}

Refinement Request:
${refinementRequest}

Please refine the PRD based on the user's request. Return the COMPLETE updated PRD in markdown format.`;

			const messages = [
				{ role: "system" as const, content: systemPrompt },
				{ role: "user" as const, content: userPrompt },
			];

			// Stream the refined PRD
			progress.succeed("Generating refined PRD...");

			const streamRenderer = MarkdownDisplay.createStreamRenderer();
			const stream = this.generateStream(messages, {
				maxTokens: 4000,
				temperature: 0.7,
			});

			let refinedContent = "";
			for await (const chunk of stream) {
				streamRenderer.addChunk(chunk);
				refinedContent += chunk;
			}
			streamRenderer.finish();

			if (!refinedContent || refinedContent.trim().length === 0) {
				return this.failure(
					"Failed to generate refined PRD",
					["LLM returned empty content"],
					"Please try again with a different refinement request",
				);
			}

			// Ask for confirmation
			console.log(Text.heading("✅ Review Refined PRD"));
			console.log(Separator.light(70));

			const approved = await InteractiveSelect.confirm(
				"Save this refined PRD?",
				true,
			);

			if (!approved) {
				return this.failure(
					"Refinement cancelled",
					["Changes were not saved"],
					"Run the command again to try a different refinement",
				);
			}

			// Save refined PRD
			const backupPath = `${selectedFile}.backup-${Date.now()}`;
			fs.writeFileSync(backupPath, currentContent, "utf-8");
			fs.writeFileSync(selectedFile, refinedContent, "utf-8");

			console.log();
			console.log(Text.success("✓ PRD refined successfully!"));
			console.log(Text.muted(`Location: ${selectedFile}`));
			console.log(Text.muted(`Backup: ${backupPath}`));

			return this.success(
				`PRD refined: ${path.basename(selectedFile)}`,
				this.getContent("PRD.REFINE.SUCCESS"),
				{
					aiGuidance: this.getContent("PRD.REFINE.AI_GUIDANCE"),
					contextFiles: [
						`${selectedFile} - Refined PRD`,
						`${backupPath} - Original PRD backup`,
					],
				},
			);
		} catch (error) {
			progress.fail("Refinement failed");
			return this.failure(
				"PRD refinement failed",
				[`Error: ${error instanceof Error ? error.message : String(error)}`],
				"Check the error message and try again",
			);
		}
	}
}
