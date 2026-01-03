/**
 * Enhanced PRD Interactive Session
 *
 * Comprehensive PRD creation with file references, LLM-powered Q&A,
 * conversational mode, and iterative refinement.
 */

import type { LLMProvider } from "../../llm/base.js";
import { CostTracker } from "../../llm/cost-tracker.js";
import {
	type PromptBuilder,
	TEMPLATE_SOURCES,
	TemplateLoader,
} from "../content/index.js";
import { MarkdownDisplay, ProgressDisplay } from "../display/index.js";
import {
	ConversationSession,
	InteractiveSelect,
	MultilineInput,
} from "../input/index.js";
import { Separator, Text } from "../ui/components.js";
import { LoadingSpinner } from "../ui/spinner.js";
import {
	type FileReference,
	FileReferenceParser,
} from "../utils/file-reference.js";
import { UsageDisplay } from "../utils/usage-display.js";

export interface PRDQuestion {
	number: number;
	text: string;
	type: "open-ended" | "multiple-choice";
	options: Array<{ letter: string; text: string }>;
	recommended: { option: string; reason: string } | null;
}

export interface PRDAnswer {
	questionNumber: number;
	answer: string;
}

export interface PRDResult {
	featureName: string;
	summary: string;
	referencedFiles: FileReference[];
	questions: PRDQuestion[];
	answers: PRDAnswer[];
	content: string;
}

export interface PRDSessionOptions {
	llmProvider: LLMProvider;
	projectRoot: string;
	mode: "manual" | "mcp";
	promptBuilder: PromptBuilder;
}

export class EnhancedPRDSession {
	private llmProvider: LLMProvider;
	private projectRoot: string;
	private mode: "manual" | "mcp";
	private promptBuilder: PromptBuilder;
	private costTracker: CostTracker;

	constructor(options: PRDSessionOptions) {
		this.llmProvider = options.llmProvider;
		this.projectRoot = options.projectRoot;
		this.mode = options.mode;
		this.promptBuilder = options.promptBuilder;
		this.costTracker = new CostTracker();
	}

	/**
	 * Run the complete PRD creation session
	 */
	async run(initialFeatureName?: string): Promise<PRDResult> {
		console.log(Text.heading("📝 PRD Creation - Interactive Session"));
		console.log(Separator.heavy(70));
		console.log();

		// Step 1: Feature name
		const featureName = await this.getFeatureName(initialFeatureName);

		// Step 2: Feature summary with file references
		const summaryData = await this.getFeatureSummary();

		// Step 3: Generate questions
		const questions = await this.generateQuestions(
			featureName,
			summaryData.summary,
			summaryData.references,
		);

		// Step 4: Collect answers (if questions exist)
		let answers: PRDAnswer[] = [];
		if (questions.length > 0) {
			answers = await this.collectAnswers(questions, summaryData);
		}

		// Step 5: Generate PRD
		let prdContent = await this.generatePRD(
			featureName,
			summaryData.summary,
			summaryData.references,
			questions,
			answers,
		);

		// Step 6: Review loop
		prdContent = await this.reviewLoop(
			featureName,
			prdContent,
			summaryData,
			questions,
			answers,
		);

		return {
			featureName,
			summary: summaryData.summary,
			referencedFiles: summaryData.references,
			questions,
			answers,
			content: prdContent,
		};
	}

	/**
	 * Get feature name
	 */
	private async getFeatureName(initial?: string): Promise<string> {
		if (initial) {
			console.log(Text.subsection("Feature Name: ") + Text.info(initial));
			console.log();
			return initial;
		}

		console.log();
		console.log(Text.subsection("Step 1: Feature Name"));
		console.log(Separator.light(70));

		const name = await MultilineInput.promptSimple(
			"What is the name of the feature?",
		);

		if (!name.trim()) {
			console.log(Text.error("Feature name is required"));
			return this.getFeatureName();
		}

		console.log();
		return name.trim();
	}

	/**
	 * Get feature summary with file references
	 */
	private async getFeatureSummary(): Promise<{
		summary: string;
		references: FileReference[];
	}> {
		console.log();
		console.log(Text.subsection("Step 2: Feature Summary"));
		console.log(Separator.light(70));

		// Show help for file references
		console.log(
			Text.muted("For brownfield projects, you can reference files:"),
		);
		console.log(
			Text.bullet('Use @filepath syntax (e.g., "@src/auth/login.ts")'),
		);
		console.log(Text.bullet("Or select files interactively in the next step"));
		console.log();

		// Get summary
		const summary = await MultilineInput.prompt({
			message: "Provide a detailed summary of the feature:",
		});

		if (!summary.trim()) {
			console.log(Text.error("Summary is required"));
			return this.getFeatureSummary();
		}

		// Parse @filepath references
		const autoReferences = FileReferenceParser.parse(summary, this.projectRoot);

		if (autoReferences.length > 0) {
			console.log();
			console.log(
				Text.success(
					`✓ Found ${autoReferences.length} file reference(s) in summary`,
				),
			);
			for (const ref of autoReferences) {
				console.log(Text.bullet(`${ref.path} (${ref.language})`));
			}
		}

		// Ask if user wants to add more files
		console.log();
		const addMore = await InteractiveSelect.confirm(
			"Add more file references?",
			false,
		);

		let manualReferences: FileReference[] = [];
		if (addMore) {
			try {
				manualReferences = await FileReferenceParser.selectFiles(
					this.projectRoot,
					"Select files for LLM to review:",
					{ maxFiles: 100 },
				);

				console.log(
					Text.success(
						`✓ Selected ${manualReferences.length} additional file(s)`,
					),
				);
			} catch (error) {
				console.log(
					Text.warning(
						`No files selected or error occurred: ${(error as Error).message}`,
					),
				);
			}
		}

		const allReferences = [...autoReferences, ...manualReferences];

		// Check token limit
		if (allReferences.length > 0) {
			const tokenCheck = FileReferenceParser.checkTokenLimit(allReferences);

			if (!tokenCheck.withinLimit) {
				console.log();
				console.log(
					Text.warning(
						`⚠ Total tokens (${tokenCheck.totalTokens}) exceeds recommended limit (10000)`,
					),
				);
				console.log(
					Text.warning(
						`  This might cause context window issues with some LLM providers.`,
					),
				);

				const proceed = await InteractiveSelect.confirm(
					"Proceed anyway?",
					false,
				);

				if (!proceed) {
					const reduction = FileReferenceParser.suggestReduction(allReferences);
					console.log(
						Text.muted(
							`\nSuggestion: Remove ${reduction.remove.length} file(s) to fit within limit`,
						),
					);
					return this.getFeatureSummary();
				}
			}
		}

		console.log();
		return {
			summary: summary.trim(),
			references: allReferences,
		};
	}

	/**
	 * Generate clarifying questions using LLM
	 */
	private async generateQuestions(
		_featureName: string,
		summary: string,
		references: FileReference[],
	): Promise<PRDQuestion[]> {
		console.log();
		console.log(Text.subsection("Step 3: Clarifying Questions"));
		console.log(Separator.light(70));

		const spinner = new LoadingSpinner();
		spinner.start({
			text: "Analyzing feature and generating questions...",
			spinner: "dots",
			color: "cyan",
		});

		try {
			// Load PRD generator template
			const template = await TemplateLoader.load(
				TEMPLATE_SOURCES.PRD_GENERATOR,
			);

			// Build mode-aware prompt
			const prompt = this.promptBuilder.build("PRD_QUESTION_GENERATION", {
				template,
				summary,
				referencedFiles: references,
			});

			const result = await this.llmProvider.generate(
				[
					{ role: "system", content: prompt.system },
					{ role: "user", content: prompt.user },
				],
				{ temperature: 0.7, maxTokens: 2000 },
			);

			spinner.succeed("Questions generated");

			// Track usage
			if (result.tokensUsed) {
				this.costTracker.trackUsage(result);
				const usage = this.costTracker.getModelUsage(result.model);
				if (usage) {
					UsageDisplay.show(usage, this.costTracker.getCurrentSession());
				}
			}

			console.log();

			// Check if no questions needed
			if (result.content.includes("NO_QUESTIONS_NEEDED")) {
				console.log(
					Text.success(
						"✓ Feature summary is comprehensive, no clarifications needed",
					),
				);
				console.log();
				return [];
			}

			// Parse questions (only in manual mode)
			if (this.mode === "manual" && prompt.parsingRules) {
				return this.parseQuestions(result.content, prompt.parsingRules);
			}

			// MCP mode: return empty (agent handles directly)
			return [];
		} catch (error) {
			spinner.fail("Failed to generate questions");
			console.error(Text.error(`Error: ${(error as Error).message}`));
			throw error;
		}
	}

	/**
	 * Parse questions from LLM response (manual mode only)
	 */
	private parseQuestions(
		response: string,
		rules: Record<string, RegExp>,
	): PRDQuestion[] {
		const questions: PRDQuestion[] = [];
		const lines = response.split("\n");

		let currentQuestion: PRDQuestion | null = null;

		for (const line of lines) {
			// Check for question line
			const qMatch = rules.questionPattern
				? line.match(rules.questionPattern)
				: null;
			if (qMatch) {
				if (currentQuestion) {
					questions.push(currentQuestion);
				}

				currentQuestion = {
					number: questions.length + 1,
					text: qMatch[1] ?? "",
					type: (qMatch[2] as "open-ended" | "multiple-choice") ?? "open-ended",
					options: [],
					recommended: null,
				};
				continue;
			}

			if (!currentQuestion) continue;

			// Check for option line (multiple-choice only)
			const optMatch = rules.optionPattern
				? line.match(rules.optionPattern)
				: null;
			if (optMatch && currentQuestion.type === "multiple-choice") {
				currentQuestion.options.push({
					letter: optMatch[1] ?? "",
					text: optMatch[2] ?? "",
				});
				continue;
			}

			// Check for recommended line
			const recMatch = rules.recommendedPattern
				? line.match(rules.recommendedPattern)
				: null;
			if (recMatch?.[1] && recMatch[2]) {
				currentQuestion.recommended = {
					option: recMatch[1],
					reason: recMatch[2],
				};
			}
		}

		if (currentQuestion) {
			questions.push(currentQuestion);
		}

		return questions;
	}

	/**
	 * Collect answers to questions
	 */
	private async collectAnswers(
		questions: PRDQuestion[],
		summaryData: { summary: string; references: FileReference[] },
	): Promise<PRDAnswer[]> {
		console.log();
		console.log(Text.subsection("Step 4: Answer Questions"));
		console.log(Separator.light(70));

		// Display all questions first
		this.displayQuestions(questions);

		// Ask for answer approach
		const approach = await InteractiveSelect.single(
			"How would you like to answer?",
			[
				{
					name: "Use all recommended options",
					value: "recommended",
					description: "Quick start with sensible defaults",
				},
				{
					name: "Answer each question interactively",
					value: "interactive",
					description: "Review and customize each answer",
				},
				{
					name: "Conversational mode",
					value: "conversational",
					description: "Discuss with AI to explore options",
				},
			],
		);

		console.log();

		if (approach === "recommended") {
			return this.useRecommendedAnswers(questions);
		} else if (approach === "interactive") {
			return await this.collectInteractiveAnswers(questions);
		} else {
			return await this.collectConversationalAnswers(questions, summaryData);
		}
	}

	/**
	 * Display questions in readable format
	 */
	private displayQuestions(questions: PRDQuestion[]): void {
		for (const q of questions) {
			console.log(Text.question(q.number, q.text));

			if (q.type === "multiple-choice" && q.options.length > 0) {
				for (const opt of q.options) {
					console.log(Text.muted(`   ${opt.letter}. ${opt.text}`));
				}

				if (q.recommended) {
					console.log(
						Text.warning(
							`   Recommended: Option ${q.recommended.option} - ${q.recommended.reason}`,
						),
					);
				}
			}

			console.log();
		}
	}

	/**
	 * Use recommended answers for all questions
	 */
	private useRecommendedAnswers(questions: PRDQuestion[]): PRDAnswer[] {
		const answers: PRDAnswer[] = [];

		for (const q of questions) {
			if (q.type === "multiple-choice" && q.recommended) {
				answers.push({
					questionNumber: q.number,
					answer: `Option ${q.recommended.option}`,
				});
			} else {
				// For open-ended, use a placeholder
				answers.push({
					questionNumber: q.number,
					answer: "(To be determined)",
				});
			}
		}

		console.log(Text.success("✓ Using recommended options"));
		return answers;
	}

	/**
	 * Collect answers interactively
	 */
	private async collectInteractiveAnswers(
		questions: PRDQuestion[],
	): Promise<PRDAnswer[]> {
		const answers: PRDAnswer[] = [];

		for (const q of questions) {
			console.log();
			console.log(Separator.light(70));
			console.log(Text.question(q.number, q.text));
			console.log();

			let answer: string;

			if (q.type === "multiple-choice" && q.options.length > 0) {
				// Show options
				const choice = await InteractiveSelect.single(
					"Select an option:",
					q.options.map((opt) => ({
						name: `${opt.letter}. ${opt.text}`,
						value: opt.letter,
					})),
				);

				answer = `Option ${choice}`;
			} else {
				// Open-ended
				answer = await MultilineInput.prompt({
					message: "Your answer:",
				});
			}

			answers.push({
				questionNumber: q.number,
				answer,
			});

			// Display the answer with visual formatting
			console.log();
			console.log(Text.success("✓ Your Answer:"));
			console.log(Text.muted(`┌${"─".repeat(68)}┐`));
			const answerLines = answer.split("\n");
			for (const line of answerLines) {
				console.log(
					Text.muted("│ ") + Text.success(line.padEnd(67)) + Text.muted(" │"),
				);
			}
			console.log(Text.muted(`└${"─".repeat(68)}┘`));
			console.log();
		}

		return answers;
	}

	/**
	 * Collect answers through conversation
	 */
	private async collectConversationalAnswers(
		questions: PRDQuestion[],
		summaryData: { summary: string; references: FileReference[] },
	): Promise<PRDAnswer[]> {
		const systemPrompt = `You are helping create a Product Requirements Document.

Feature Summary:
${summaryData.summary}

Questions to discuss:
${questions.map((q) => `${q.number}. ${q.text}`).join("\n")}

Help the user explore these questions, discuss trade-offs, and finalize answers.
When they're ready, summarize the final answers.`;

		const conversation = new ConversationSession(this.llmProvider, {
			topic: "PRD Planning",
			systemPrompt,
			initialContext: `I have ${questions.length} questions about your feature. Let's discuss them to ensure we create a comprehensive PRD.`,
		});

		await conversation.start();

		console.log();
		console.log(Text.info("✓ Conversation complete"));
		console.log();

		// Now collect final answers
		return await this.collectInteractiveAnswers(questions);
	}

	/**
	 * Generate PRD content
	 */
	private async generatePRD(
		featureName: string,
		summary: string,
		references: FileReference[],
		questions: PRDQuestion[],
		answers: PRDAnswer[],
	): Promise<string> {
		console.log();
		console.log(Text.subsection("Step 5: Generating PRD"));
		console.log(Separator.light(70));
		console.log();

		const spinner = new LoadingSpinner();
		spinner.start({
			text: "Generating comprehensive PRD...",
			spinner: "dots",
			color: "cyan",
		});

		try {
			// Load template
			const template = await TemplateLoader.load(
				TEMPLATE_SOURCES.PRD_GENERATOR,
			);

			// Format Q&A
			const questionsAndAnswers = this.formatQuestionsAndAnswers(
				questions,
				answers,
			);

			// Build prompt
			const prompt = this.promptBuilder.build("PRD_GENERATION", {
				template,
				featureName,
				summary,
				questionsAndAnswers,
				referencedFiles: references,
			});

			// Generate via stream for better UX
			const streamRenderer = MarkdownDisplay.createStreamRenderer();
			spinner.stop();
			console.log(Text.info("Generating PRD (streaming):\n"));

			let totalTokens = 0;
			const stream = this.llmProvider.generateStream(
				[
					{ role: "system", content: prompt.system },
					{ role: "user", content: prompt.user },
				],
				{ temperature: 0.7, maxTokens: 4000 },
			);

			for await (const chunk of stream) {
				streamRenderer.addChunk(chunk);
			}

			streamRenderer.finish();
			const prdContent = streamRenderer.getBuffer();

			console.log();
			console.log(Text.success("✓ PRD generated"));

			// Track estimated usage (streaming doesn't always return token counts)
			// Estimate: ~1 token per 4 chars for input + output
			const estimatedPromptTokens = Math.ceil(
				(prompt.system.length + prompt.user.length) / 4,
			);
			const estimatedCompletionTokens = Math.ceil(prdContent.length / 4);
			totalTokens = estimatedPromptTokens + estimatedCompletionTokens;

			this.costTracker.trackUsage({
				content: prdContent,
				model: this.llmProvider.model,
				tokensUsed: totalTokens,
				promptTokens: estimatedPromptTokens,
				completionTokens: estimatedCompletionTokens,
			});

			const usage = this.costTracker.getModelUsage(this.llmProvider.model);
			if (usage) {
				UsageDisplay.show(usage, this.costTracker.getCurrentSession());
			}
			console.log();

			return prdContent;
		} catch (error) {
			spinner.fail("Failed to generate PRD");
			throw error;
		}
	}

	/**
	 * Format questions and answers for LLM
	 */
	private formatQuestionsAndAnswers(
		questions: PRDQuestion[],
		answers: PRDAnswer[],
	): string {
		if (questions.length === 0) return "";

		const lines: string[] = [];

		for (const q of questions) {
			const answer = answers.find((a) => a.questionNumber === q.number);

			lines.push(`${q.number}. ${q.text}`);
			if (answer) {
				lines.push(`   Answer: ${answer.answer}`);
			}
			lines.push("");
		}

		return lines.join("\n");
	}

	/**
	 * Review loop with markdown rendering
	 */
	private async reviewLoop(
		featureName: string,
		initialPRD: string,
		summaryData: { summary: string; references: FileReference[] },
		questions: PRDQuestion[],
		answers: PRDAnswer[],
	): Promise<string> {
		let currentPRD = initialPRD;

		while (true) {
			console.log(Separator.heavy(70));
			console.log(Text.heading("PRD REVIEW"));
			console.log(Separator.heavy(70));
			console.log();

			// Display with markdown rendering
			console.log(MarkdownDisplay.render(currentPRD));

			// Review options with improved spacing and formatting
			console.log();
			console.log(Text.subsection("Review Options:"));
			console.log(Separator.light(70));
			console.log();

			const choice = await InteractiveSelect.single(
				"What would you like to do?",
				[
					{
						name: "✓  Approve and Save",
						value: "approve",
						description: "PRD looks good, save to file",
					},
					{
						name: "✏️   Request Changes",
						value: "refine",
						description: "Provide feedback for improvements",
					},
					{
						name: "🔄  Regenerate",
						value: "regenerate",
						description: "Generate from scratch with same inputs",
					},
					{
						name: "💬  Discuss PRD",
						value: "discuss",
						description: "Ask questions about the PRD",
					},
				],
			);

			if (choice === "approve") {
				return currentPRD;
			}

			if (choice === "regenerate") {
				currentPRD = await this.generatePRD(
					featureName,
					summaryData.summary,
					summaryData.references,
					questions,
					answers,
				);
				continue;
			}

			if (choice === "discuss") {
				await this.discussPRD(currentPRD);
				continue;
			}

			if (choice === "refine") {
				currentPRD = await this.refinePRD(currentPRD, summaryData);
			}
		}
	}

	/**
	 * Discuss PRD with AI
	 */
	private async discussPRD(prdContent: string): Promise<void> {
		const conversation = new ConversationSession(this.llmProvider, {
			topic: "PRD Discussion",
			systemPrompt: `You are reviewing this PRD:

${prdContent}

Help the user understand the PRD, discuss edge cases, alternatives, and improvements.`,
		});

		await conversation.start();
	}

	/**
	 * Refine PRD based on feedback
	 */
	private async refinePRD(
		currentPRD: string,
		_summaryData: { summary: string; references: FileReference[] },
	): Promise<string> {
		console.log();
		const refinementInstructions = await MultilineInput.prompt({
			message: "What would you like to change or add?",
		});

		const progress = new ProgressDisplay();
		progress.start("Refining PRD based on your feedback...");

		try {
			const prompt = this.promptBuilder.build("PRD_REFINEMENT", {
				existingPRD: currentPRD,
				refinementInstructions,
			});

			const result = await this.llmProvider.generate(
				[
					{ role: "system", content: prompt.system },
					{ role: "user", content: prompt.user },
				],
				{ temperature: 0.7, maxTokens: 4000 },
			);

			progress.succeed("PRD refined");
			console.log();

			return result.content;
		} catch (error) {
			progress.fail("Refinement failed");
			throw error;
		}
	}
}
