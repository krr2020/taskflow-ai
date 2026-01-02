/**
 * PRD Create command - Create a new PRD (Product Requirements Document)
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import pc from "picocolors";
import { ConfigLoader } from "../../lib/config-loader.js";
import { getRefFilePath, REF_FILES } from "../../lib/config-paths.js";
import { LLMRequiredError } from "../../lib/errors.js";
import { ensureDir, exists } from "../../lib/file-utils.js";
import { PRDInteractiveSession } from "../../lib/prd-interactive-session.js";
import { ProgressIndicator } from "../../lib/progress-indicator.js";
import { StreamDisplay } from "../../lib/stream-display.js";
import { TerminalFormatter } from "../../lib/terminal-formatter.js";
import { buildPRDContext } from "../../llm/context-priorities.js";
import { validatePRD } from "../../llm/validators.js";
import { BaseCommand, type CommandResult } from "../base.js";

/**
 * Interactive info gathered from user
 */
interface InteractiveInfo {
	featureName: string;
	title: string;
	summary: string;
}

interface Question {
	number: number;
	text: string;
	type: "multiple-choice" | "open-ended";
	options?: string[]; // ['A. Option 1', 'B. Option 2']
}

/**
 * Gather interactive information from user for PRD creation
 */
async function gatherInteractiveInfo(
	command: BaseCommand,
	featureName?: string,
): Promise<InteractiveInfo> {
	const session = new PRDInteractiveSession(command);
	const sessionData = await session.start(featureName);

	return {
		featureName: sessionData.featureName,
		title: sessionData.title,
		summary: sessionData.summary,
	};
}

export class PrdCreateCommand extends BaseCommand {
	protected override requiresLLM = true;

	async execute(
		featureName: string,
		// optional params kept for signature compatibility but unused/deprecated
		_description?: string,
		_title?: string,
		_interactive?: boolean,
	): Promise<CommandResult> {
		// Validate LLM availability if not in MCP mode
		this.validateLLM("prd:create");

		// Always interactive mode for title + summary
		const interactiveInfo = await gatherInteractiveInfo(this, featureName);
		featureName = interactiveInfo.featureName;
		const title = interactiveInfo.title;
		const summary = interactiveInfo.summary;

		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();

		// Validate feature name
		if (!featureName || featureName.trim().length === 0) {
			return this.failure(
				"Feature name is required",
				["You must provide a name for the feature"],
				[
					"Create a PRD with a feature name:",
					"  taskflow prd create user-authentication",
					"  taskflow prd create payment-processing",
					"  taskflow prd create dashboard-redesign",
				].join("\n"),
			);
		}

		// Sanitize feature name for filename
		const sanitizedName = featureName
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "");

		// Create PRDs directory if it doesn't exist
		const prdsDir = path.join(paths.tasksDir, "prds");
		if (!exists(prdsDir)) {
			ensureDir(prdsDir);
		}

		// Generate PRD filename with timestamp
		const timestamp = new Date().toISOString().split("T")[0];
		const prdFilename = `${timestamp}-${sanitizedName}.md`;
		const prdFilePath = path.join(prdsDir, prdFilename);

		// Check if file already exists
		if (fs.existsSync(prdFilePath)) {
			return this.failure(
				"PRD file already exists",
				[`A PRD file already exists at: ${prdFilePath}`],
				[
					"Options:",
					"1. Use a different feature name",
					"2. Edit the existing PRD file",
					"3. Delete the existing file if you want to start over",
				].join("\n"),
			);
		}

		// Try to generate PRD with LLM if available
		let prdContent: string;

		if (this.isLLMAvailable()) {
			const progress = new ProgressIndicator();
			progress.start("Generating PRD with LLM...");

			try {
				prdContent = await this.executeWithFallback(
					async () => {
						progress.stop(); // Stop spinner before interactive parts
						const content = await this.generatePRDWithLLM(
							featureName,
							title,
							summary,
							paths,
						);

						progress.start("Validating generated PRD...");
						// Validate generated content
						const validation = validatePRD(content);
						if (!validation.valid) {
							progress.warn("Generated PRD has validation issues");
							console.log(
								TerminalFormatter.warning(
									`Issues: ${validation.errors.join(", ")}`,
								),
							);
						} else {
							progress.succeed("PRD generated and validated");
						}

						return content;
					},
					() => {
						progress.fail("LLM generation failed");
						console.log(TerminalFormatter.warning("Falling back to template"));
						return this.generatePrdTemplate(featureName, title, summary);
					},
					"PRD Generation",
				);
			} catch (error) {
				progress.fail("Error during PRD generation");
				throw error;
			}
		} else {
			prdContent = this.generatePrdTemplate(featureName, title, summary);
		}

		// Write PRD file
		fs.writeFileSync(prdFilePath, prdContent, "utf-8");

		const nextStepsBase = [
			TerminalFormatter.success(`PRD created: ${prdFilename}`),
			TerminalFormatter.listItem(`Location: ${prdFilePath}`),
			"",
			TerminalFormatter.section("NEXT STEPS"),
		];

		nextStepsBase.push(
			TerminalFormatter.listItem("1. Review the generated PRD"),
		);
		nextStepsBase.push(
			TerminalFormatter.listItem(
				"2. Generate coding standards and architecture rules",
			),
		);
		nextStepsBase.push(
			TerminalFormatter.listItem("3. Generate task breakdown from PRD"),
		);

		return this.success(
			nextStepsBase.join("\n"),
			[
				"1. Edit the PRD file if needed:",
				`   Open: ${prdFilePath}`,
				"",
				"2. When PRD is complete, generate project standards:",
				`   taskflow prd generate-arch ${prdFilename}`,
				"",
				"3. Then generate task breakdown:",
				`   taskflow tasks generate ${prdFilename}`,
			].join("\n"),
			{
				aiGuidance: [
					"PRD Created - Ready for Review",
					"",
					"WHAT IS A PRD?",
					"───────────────",
					"A Product Requirements Document (PRD) defines:",
					"- What you're building (goals and scope)",
					"- Why you're building it (business value)",
					"- Who it's for (target users)",
					"- How it should work (user stories, flows)",
					"- What success looks like (acceptance criteria)",
					"",
					"YOUR TASK:",
					"───────────",
					"Review the PRD that was just created.",
					"",
					"CRITICAL - Read This First:",
					"────────────────────────────",
					`1. Read: ${getRefFilePath(paths.refDir, REF_FILES.prdGenerator)}`,
					"   This contains the complete PRD creation process",
					"",
					"2. Verify the generated content:",
					"   - Does it match the user's intent?",
					"   - Are all sections complete?",
					"   - Are the requirements clear?",
					"",
					"3. Make any necessary manual edits.",
					"",
					"IMPORTANT:",
					"───────────",
					"Do NOT create coding-standards.md or architecture-rules.md yet.",
					"Those will be generated in the next step using:",
					`  taskflow prd generate-arch ${prdFilename}`,
					"",
					"WORKFLOW:",
					"──────────",
					"1. ✓ PRD created",
					"2. → Review and refine PRD (you are here)",
					"3. → Generate coding standards and architecture rules",
					"4. → Generate task breakdown",
					"5. → Start executing tasks",
				].join("\n"),
				contextFiles: [
					`${prdFilePath} - PRD to review`,
					`${getRefFilePath(paths.refDir, REF_FILES.prdGenerator)} - PRD creation guidelines`,
					`${getRefFilePath(paths.refDir, REF_FILES.aiProtocol)} - Core AI operating discipline`,
				],
			},
		);
	}

	/**
	 * Generate PRD content using LLM with single-pass Q&A
	 */
	private async generatePRDWithLLM(
		featureName: string,
		title: string,
		summary: string,
		paths: ReturnType<ConfigLoader["getPaths"]>,
	): Promise<string> {
		if (!this.llmProvider || !this.contextManager) {
			throw new LLMRequiredError(
				"LLM provider or context manager not available",
			);
		}

		console.log(
			TerminalFormatter.info(`Generating PRD for feature: ${featureName}`),
		);

		// Step 1: Generate questions
		const questions = await this.generateQuestions(title, summary);

		// If no questions, generate PRD directly
		if (questions.length === 0) {
			console.log(
				TerminalFormatter.success("Requirements are clear. Generating PRD..."),
			);
			return this.generatePRDDirectly(title, summary, paths);
		}

		// Step 2: Ask questions
		console.log("");
		this.displayQuestions(questions);

		// Step 3: Get answers
		const answers = await this.getUserAnswersAllAtOnce(questions);

		// Step 4: Generate final PRD
		console.log("");
		return this.generateFinalPRD(title, summary, questions, answers, paths);
	}

	/**
	 * Generate clarifying questions
	 */
	private async generateQuestions(
		title: string,
		summary: string,
	): Promise<Question[]> {
		const progress = new ProgressIndicator();
		progress.start("Analyzing requirements and generating questions...");

		const systemPrompt = this.buildSystemPromptForQuestions();
		const userPrompt = this.buildQuestionPrompt(title, summary);

		const messages = [
			{ role: "system" as const, content: systemPrompt },
			{ role: "user" as const, content: userPrompt },
		];

		const stream = this.generateStream(messages, {
			maxTokens: 2000,
			temperature: 0.7,
		});

		const display = new StreamDisplay("Generating Questions");
		let content = "";
		let isFirstChunk = true;

		for await (const chunk of stream) {
			if (isFirstChunk) {
				progress.stop();
				isFirstChunk = false;
			}
			display.handleChunk(chunk);
			content += chunk;
		}
		display.finish();

		if (!content || content.includes("NO_QUESTIONS_NEEDED")) {
			return [];
		}

		return this.parseAllQuestions(content);
	}

	/**
	 * Generate PRD directly without questions
	 */
	private async generatePRDDirectly(
		title: string,
		summary: string,
		paths: ReturnType<ConfigLoader["getPaths"]>,
	): Promise<string> {
		return this.generateFinalPRD(title, summary, [], [], paths);
	}

	/**
	 * Generate final PRD with context and answers
	 */
	private async generateFinalPRD(
		title: string,
		summary: string,
		questions: Question[],
		answers: string[],
		paths: ReturnType<ConfigLoader["getPaths"]>,
	): Promise<string> {
		const systemPrompt = this.buildSystemPromptForPRD(paths);
		const userPrompt = this.buildPRDPrompt(title, summary, questions, answers);

		const messages = [
			{ role: "system" as const, content: systemPrompt },
			{ role: "user" as const, content: userPrompt },
		];

		const stream = this.generateStream(messages, {
			maxTokens: 4000,
			temperature: 0.7,
		});

		const display = new StreamDisplay("Generating PRD");
		let content = "";
		for await (const chunk of stream) {
			display.handleChunk(chunk);
			content += chunk;
		}
		display.finish();

		if (!content) {
			throw new Error("Failed to generate PRD");
		}

		return content;
	}

	/**
	 * Build system prompt for question generation
	 */
	private buildSystemPromptForQuestions(): string {
		return `You are a Product Manager interviewing a stakeholder to create a PRD.
Your goal is to ask at least 5 clarifying questions to gather necessary requirements.
Do not ask about things already covered in the summary.
Focus on:
- Core functionality
- Edge cases
- Technical constraints
- User roles
- Success metrics

Output format MUST be:
QUESTIONS:
1. [Question text] (Type: open-ended)
2. [Question text] (Type: multiple-choice)
   A. [Option 1] (Reason: [Short reason for recommendation])
   B. [Option 2] (Reason: [Short reason for recommendation])
...

For multiple-choice questions, you MUST provide recommended options with a short reason for each option to guide the user.

If the summary is comprehensive and no questions are needed, reply with:
NO_QUESTIONS_NEEDED`;
	}

	/**
	 * Build user prompt for question generation
	 */
	private buildQuestionPrompt(title: string, summary: string): string {
		// Load context
		const contextParams = {
			userRequest: `Feature: ${title}\nSummary: ${summary}`,
		};
		let contextSummary = "";
		if (this.contextManager) {
			const contextItems = buildPRDContext(this.contextManager, contextParams);
			const result = this.contextManager.buildContext(contextItems);
			contextSummary = result.summary;
		}

		return `Feature Title: ${title}

Feature Summary:
${summary}

Context:
${contextSummary}

Please analyze this feature and generate clarifying questions if needed.`;
	}

	/**
	 * Parse questions from LLM response
	 */
	private parseAllQuestions(content: string): Question[] {
		if (content.includes("NO_QUESTIONS_NEEDED")) {
			return [];
		}

		const questions: Question[] = [];
		const lines = content.split("\n");
		let currentQuestion: Partial<Question> | null = null;

		for (const line of lines) {
			const trimmed = line.trim();

			// Match question line: "1. Question text (Type: ...)"
			const questionMatch = trimmed.match(
				/^(\d+)\.\s+(.+?)(?:\s+\(Type:\s*(.+?)\))?$/,
			);
			if (questionMatch) {
				// Save previous question
				if (currentQuestion?.text) {
					questions.push(currentQuestion as Question);
				}

				currentQuestion = {
					number: questionMatch[1] ? Number.parseInt(questionMatch[1], 10) : 0,
					text: questionMatch[2] || "",
					type:
						(questionMatch[3]?.toLowerCase() as
							| "multiple-choice"
							| "open-ended") || "open-ended",
					options: [],
				};
				continue;
			}

			// Match option line: "A. Option"
			const optionMatch = trimmed.match(/^([A-Z])\.\s+(.+)$/);
			if (optionMatch && currentQuestion) {
				if (!currentQuestion.options) {
					currentQuestion.options = [];
				}
				currentQuestion.options.push(trimmed);
			}
		}

		// Push last question
		if (currentQuestion?.text) {
			questions.push(currentQuestion as Question);
		}

		return questions;
	}

	/**
	 * Display questions to user
	 */
	private displayQuestions(questions: Question[]): void {
		console.log(TerminalFormatter.header("CLARIFYING QUESTIONS"));

		console.log(
			pc.dim(
				"Please answer the following questions to help generate a comprehensive PRD.\n",
			),
		);

		for (const q of questions) {
			console.log(TerminalFormatter.question(q.number, q.text));

			if (q.options && q.options.length > 0) {
				for (const opt of q.options) {
					console.log(TerminalFormatter.option(opt));
				}
			}

			if (q.type === "multiple-choice") {
				console.log(pc.dim(`   Type: Multiple Choice`));
			} else {
				console.log(pc.dim(`   Type: Open-ended`));
			}
		}

		console.log(pc.bold(pc.white(`\n${"─".repeat(60)}`)));
	}

	/**
	 * Get answers from user all at once
	 */
	private async getUserAnswersAllAtOnce(
		questions: Question[],
	): Promise<string[]> {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		console.log(TerminalFormatter.section("HOW TO ANSWER"));
		console.log(pc.dim("You can provide answers in the following formats:"));
		console.log(pc.white("  • Multiple choice: 1A, 2C, 3B"));
		console.log(pc.white("  • Open-ended: 3: My detailed answer here"));
		console.log(pc.white("  • Mixed: 1A, 2C, 3: My answer, 4B\n"));

		console.log(TerminalFormatter.prompt("Enter your answers:"));

		const answerText = await new Promise<string>((resolve) => {
			rl.question("", (ans) => {
				rl.close();
				resolve(ans.trim());
			});
		});

		// Validate answers
		if (!answerText) {
			console.log(
				TerminalFormatter.error("No answers provided. Please try again."),
			);
			return this.getUserAnswersAllAtOnce(questions);
		}

		console.log(
			TerminalFormatter.success(
				`Received answers for ${questions.length} questions`,
			),
		);

		return [answerText];
	}

	/**
	 * Build system prompt for PRD generation
	 */
	private buildSystemPromptForPRD(
		paths: ReturnType<ConfigLoader["getPaths"]>,
	): string {
		const prdGuidelinesPath = getRefFilePath(
			paths.refDir,
			REF_FILES.prdGenerator,
		);
		const prdGuidelines = fs.existsSync(prdGuidelinesPath)
			? fs.readFileSync(prdGuidelinesPath, "utf-8")
			: "";

		return `You are a Product Requirements Document (PRD) generation specialist.

${prdGuidelines ? `PRD GUIDELINES:\n${prdGuidelines}\n` : ""}

INSTRUCTIONS:
1. Generate a complete PRD following the template structure
2. Be specific and detailed based on the feature description and Q&A
3. Include all required sections:
   - Introduction/Overview
   - Goals
   - User Stories
   - Functional Requirements
   - Non-Goals
   - Success Metrics
4. Use proper Markdown formatting
5. Fill in realistic content - do NOT leave placeholder comments`;
	}

	/**
	 * Build user prompt for PRD generation
	 */
	private buildPRDPrompt(
		title: string,
		summary: string,
		questions: Question[],
		answers: string[],
	): string {
		let prompt = `Generate a complete PRD for this feature:

Title: ${title}
Summary: ${summary}
`;

		if (questions.length > 0) {
			prompt += "\nCLARIFICATION Q&A:\n";
			for (let i = 0; i < questions.length; i++) {
				const q = questions[i];
				if (!q) continue;

				prompt += `Q: ${q.text}\n`;
				if (q.options) {
					prompt += `Options: ${q.options.join(", ")}\n`;
				}
			}

			prompt += `\nUser Answers:\n${answers[0]}\n`;
		}

		return prompt;
	}

	private generatePrdTemplate(
		featureName: string,
		title: string,
		summary: string,
	): string {
		return `# PRD: ${title || featureName}

**Created:** ${new Date().toISOString().split("T")[0]}
**Status:** Draft

## 1. Introduction
${summary || "<!-- Overview of the feature -->"}

## 2. Goals
<!-- What are we trying to achieve? -->

## 3. User Stories
<!-- As a <user>, I want <action>, so that <benefit> -->

## 4. Functional Requirements
<!-- What must this feature do? -->

## 5. Non-Goals
<!-- What is explicitly out of scope? -->

## 6. Design Considerations
<!-- UI/UX requirements -->

## 7. Technical Considerations
<!-- Technical constraints, dependencies, API design -->

## 8. Success Metrics
<!-- How do we measure success? -->

## 9. Open Questions
<!-- Unresolved questions -->
`;
	}
}
