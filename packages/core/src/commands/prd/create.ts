/**
 * PRD Create command - Create a new PRD (Product Requirements Document)
 */

import fs from "node:fs";
import path from "node:path";
import { ConfigLoader } from "../../lib/config-loader.js";
import { getRefFilePath, REF_FILES } from "../../lib/config-paths.js";
import { ensureDir, exists } from "../../lib/file-utils.js";
import { buildPRDContext } from "../../llm/context-priorities.js";
import { validatePRD } from "../../llm/validators.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class PrdCreateCommand extends BaseCommand {
	async execute(
		featureName: string,
		description?: string,
		title?: string,
	): Promise<CommandResult> {
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
			console.log("Generating PRD with LLM...");
			prdContent = await this.executeWithFallback(
				async () => {
					const content = await this.generatePRDWithLLM(
						featureName,
						description || "",
						paths,
						title,
					);
					console.log("✓ PRD generated with LLM");
					return content;
				},
				() => {
					console.warn("LLM generation failed, falling back to template.");
					return this.generatePrdTemplate(featureName, description);
				},
				"PRD Generation",
			);
		} else {
			prdContent = this.generatePrdTemplate(featureName, description);
		}

		// Write PRD file
		fs.writeFileSync(prdFilePath, prdContent, "utf-8");

		const initialRequirements = description
			? [
					"",
					"INITIAL REQUIREMENTS PROVIDED:",
					"───────────────────────────────",
					description,
					"",
					"Use this as a starting point for the PRD.",
				]
			: [];

		const nextStepsBase = [
			`✓ PRD created: ${prdFilename}`,
			`✓ Location: ${prdFilePath}`,
			"",
			"NEXT:",
			"─".repeat(60),
			"1. Fill out the PRD document with feature requirements",
		];

		if (description) {
			nextStepsBase.push("   (Initial requirements already provided)");
		}

		nextStepsBase.push("2. Generate coding standards and architecture rules");
		nextStepsBase.push("3. Generate task breakdown from PRD");

		return this.success(
			nextStepsBase.join("\n"),
			[
				"1. Edit the PRD file to add feature details:",
				`   Open: ${prdFilePath}`,
				...initialRequirements,
				"",
				"2. Use AI to help fill out the PRD:",
				"   - Read .taskflow/ref/prd-generator.md for guidance",
				"   - Gather requirements through conversation",
				"   - Document goals, user stories, and acceptance criteria",
				"",
				"3. When PRD is complete, generate project standards:",
				`   taskflow prd generate-arch ${prdFilename}`,
				"",
				"4. Then generate task breakdown:",
				`   taskflow tasks generate ${prdFilename}`,
			].join("\n"),
			{
				aiGuidance: [
					"PRD Created - Ready to Fill Out",
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
					"Fill out the PRD template that was just created.",
					"",
					"CRITICAL - Read This First:",
					"────────────────────────────",
					`1. Read: ${getRefFilePath(paths.refDir, REF_FILES.prdGenerator)}`,
					"   This contains the complete PRD creation process",
					"",
					"2. Gather information from the user:",
					"   - What is the feature about?",
					"   - Who will use it?",
					"   - What problem does it solve?",
					"   - What are the key requirements?",
					"   - What are the acceptance criteria?",
					"",
					"3. Structure the PRD following the template sections:",
					"   - Overview and Goals",
					"   - User Stories",
					"   - Functional Requirements",
					"   - Non-Functional Requirements",
					"   - Technical Considerations",
					"   - Success Criteria",
					"",
					"IMPORTANT:",
					"───────────",
					"Do NOT create coding-standards.md or architecture-rules.md yet.",
					"Those will be generated in the next step using:",
					`  taskflow prd generate-arch ${prdFilename}`,
					"",
					"WORKFLOW:",
					"──────────",
					"1. ✓ PRD template created",
					"2. → Fill out PRD with requirements (you are here)",
					"3. → Generate coding standards and architecture rules",
					"4. → Generate task breakdown",
					"5. → Start executing tasks",
				].join("\n"),
				contextFiles: [
					`${prdFilePath} - PRD template to fill out`,
					`${getRefFilePath(paths.refDir, REF_FILES.prdGenerator)} - PRD creation guidelines`,
					`${getRefFilePath(paths.refDir, REF_FILES.aiProtocol)} - Core AI operating discipline`,
				],
				warnings: [
					"DO NOT skip the prd-generator.md - it contains critical guidance",
					"DO NOT guess at requirements - ask the user for clarification",
					"DO NOT create coding standards yet - wait for generate-arch command",
					"DO ensure PRD is complete before generating tasks",
				],
			},
		);
	}

	/**
	 * Generate PRD content using LLM with interactive Q&A
	 */
	private async generatePRDWithLLM(
		featureName: string,
		description: string,
		paths: ReturnType<ConfigLoader["getPaths"]>,
		title?: string,
	): Promise<string> {
		if (!this.llmProvider || !this.contextManager) {
			throw new Error("LLM provider or context manager not available");
		}

		// Provider is guaranteed to be available after the check
		const llmProvider = this.llmProvider;

		// Load context files
		const prdGuidelinesPath = getRefFilePath(
			paths.refDir,
			REF_FILES.prdGenerator,
		);
		const codingStandardsPath = getRefFilePath(
			paths.refDir,
			REF_FILES.codingStandards,
		);
		const architectureRulesPath = getRefFilePath(
			paths.refDir,
			REF_FILES.architectureRules,
		);

		const prdGuidelines = fs.existsSync(prdGuidelinesPath)
			? fs.readFileSync(prdGuidelinesPath, "utf-8")
			: "";
		const codingStandards = fs.existsSync(codingStandardsPath)
			? fs.readFileSync(codingStandardsPath, "utf-8")
			: "";
		const architectureRules = fs.existsSync(architectureRulesPath)
			? fs.readFileSync(architectureRulesPath, "utf-8")
			: "";

		// Build context with priorities
		const contextParams: {
			userRequest: string;
			codingStandards?: string;
			architectureRules?: string;
		} = {
			userRequest: `Feature: ${featureName}\nDescription: ${description || "No description provided"}`,
		};

		if (codingStandards) {
			contextParams.codingStandards = codingStandards;
		}

		if (architectureRules) {
			contextParams.architectureRules = architectureRules;
		}

		const contextItems = buildPRDContext(this.contextManager, contextParams);

		const { selectedItems, summary } =
			this.contextManager.buildContext(contextItems);

		console.log(`Context: ${summary}`);

		// Build system prompt with Q&A capability
		const systemPrompt = `You are a Product Requirements Document (PRD) generation specialist.

${prdGuidelines ? `PRD GUIDELINES:\n${prdGuidelines}\n` : ""}

INSTRUCTIONS:
1. If you need more information to create a complete PRD, ask clarifying questions
2. When asking questions, format them clearly with numbered list
3. Once you have sufficient information, generate a complete PRD following the template structure
4. Be specific and detailed based on the feature description
5. Include all required sections: Overview, Goals, User Stories, Functional Requirements, Non-Functional Requirements, Technical Considerations, Success Criteria
6. Use proper Markdown formatting
7. Fill in realistic content based on the feature description - do NOT leave placeholder comments

Q&A MODE:
If you need clarification, respond with:
QUESTIONS:
1. [Your question]
2. [Your question]
...

GENERATION MODE:
When ready to generate the PRD, respond with the complete PRD in Markdown format, starting with the title.`;

		// Build initial user prompt with context
		let initialPrompt = `Generate a complete PRD for this feature:

Title: ${title || featureName}
Description: ${description || `Build a new feature called ${featureName}`}

`;

		// Add context items
		for (const item of selectedItems) {
			if (item.priority <= 2) {
				// Essential, High, Medium
				initialPrompt += `\n${item.content}\n`;
			}
		}

		initialPrompt +=
			"\nIf you need more information, ask clarifying questions. Otherwise, generate the complete PRD following the structure in the guidelines.";

		// Interactive Q&A loop
		const conversationHistory: Array<{
			role: "system" | "user" | "assistant";
			content: string;
		}> = [
			{ role: "system", content: systemPrompt },
			{ role: "user", content: initialPrompt },
		];

		const maxIterations = 5;
		let iteration = 0;

		while (iteration < maxIterations) {
			iteration++;

			// Call LLM
			const response = await this.retryWithBackoff(() =>
				llmProvider.generate(conversationHistory, {
					maxTokens: 4000,
					temperature: 0.7,
				}),
			);

			// Add response to conversation history
			conversationHistory.push({
				role: "assistant",
				content: response.content,
			});

			// Check if this is a question or final PRD
			if (this.isQuestionResponse(response.content)) {
				// Extract and display questions
				const questions = this.extractQuestions(response.content);

				if (questions.length === 0) {
					// No valid questions found, treat as final PRD
					break;
				}

				console.log("\nThe AI has some questions to create a better PRD:");
				console.log("─".repeat(60));
				for (const question of questions) {
					console.log(question);
				}
				console.log("─".repeat(60));

				// Get user answers
				const answers = await this.getUserAnswers(questions);

				// Add answers to conversation
				let answerText = "Here are my answers:\n\n";
				for (let i = 0; i < questions.length; i++) {
					answerText += `Q${i + 1}: ${questions[i]}\nA${i + 1}: ${answers[i]}\n\n`;
				}
				answerText +=
					"Now please generate the complete PRD with this information.";

				conversationHistory.push({ role: "user", content: answerText });
			} else {
				// This is the final PRD
				// Validate response
				const validation = validatePRD(response.content);
				if (!validation.valid) {
					console.warn("\nPRD validation warnings:");
					for (const error of validation.errors) {
						console.warn(`  - ${error}`);
					}
					// Continue anyway - warnings are acceptable
				}

				// Display cost
				console.log(`\nCost: ${this.getCostSummary()}`);

				return response.content;
			}
		}

		// If we exhausted iterations, return the last response
		console.warn(`\nReached maximum Q&A iterations (${maxIterations})`);
		console.log(`Cost: ${this.getCostSummary()}`);

		const lastResponse = conversationHistory[conversationHistory.length - 1];
		if (lastResponse?.role === "assistant") {
			return lastResponse.content;
		}

		throw new Error("Failed to generate PRD after maximum iterations");
	}

	/**
	 * Check if LLM response contains questions
	 */
	private isQuestionResponse(content: string): boolean {
		// Check for explicit QUESTIONS: marker
		if (content.includes("QUESTIONS:")) {
			return true;
		}

		// Check for question patterns
		const lines = content.split("\n");
		let questionCount = 0;

		for (const line of lines) {
			const trimmed = line.trim();
			// Check for numbered questions or lines ending with ?
			if (
				(trimmed.match(/^\d+\.\s+.*\?/) || trimmed.match(/^-\s+.*\?/)) &&
				!trimmed.toLowerCase().includes("# prd:")
			) {
				questionCount++;
			}
		}

		// If we have 2+ questions and no PRD title, it's likely questions
		const hasPRDTitle = content.match(/^#\s+PRD:/m);
		return questionCount >= 2 && !hasPRDTitle;
	}

	/**
	 * Extract questions from LLM response
	 */
	private extractQuestions(content: string): string[] {
		const questions: string[] = [];

		// Try to find QUESTIONS: section
		const questionsMatch = content.match(/QUESTIONS:\s*\n([\s\S]*?)(?:\n\n|$)/);
		if (questionsMatch?.[1]) {
			const questionText = questionsMatch[1];
			const lines = questionText.split("\n");

			for (const line of lines) {
				const trimmed = line.trim();
				// Match numbered or bulleted questions
				const match = trimmed.match(/^(?:\d+\.|-)\s+(.+)/);
				if (match?.[1]) {
					questions.push(match[1]);
				}
			}
		} else {
			// Fallback: extract any lines that look like questions
			const lines = content.split("\n");
			for (const line of lines) {
				const trimmed = line.trim();
				const match = trimmed.match(/^(?:\d+\.|-)\s+(.+\?)/);
				if (match?.[1] && !trimmed.toLowerCase().includes("# prd:")) {
					questions.push(match[1]);
				}
			}
		}

		return questions;
	}

	/**
	 * Get user answers to questions
	 */
	private async getUserAnswers(questions: string[]): Promise<string[]> {
		const answers: string[] = [];
		const readline = await import("node:readline");
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		for (let i = 0; i < questions.length; i++) {
			const answer = await new Promise<string>((resolve) => {
				rl.question(`\nAnswer to Q${i + 1}: `, (ans) => {
					resolve(ans.trim());
				});
			});
			answers.push(answer || "No specific answer provided");
		}

		rl.close();
		return answers;
	}

	private generatePrdTemplate(
		featureName: string,
		description?: string,
	): string {
		const problemStatement = description
			? description.trim()
			: "<!-- What problem does this feature solve? -->";

		return `# PRD: ${featureName}

**Created:** ${new Date().toISOString().split("T")[0]}
**Status:** Draft
**Owner:** TBD

---

## 1. Overview

### Problem Statement
${problemStatement}

### Goals
<!-- What are we trying to achieve? -->

### Non-Goals
<!-- What is explicitly out of scope? -->

---

## 2. User Stories

### Primary User Stories
<!-- Format: As a [type of user], I want [goal] so that [benefit] -->

1.
2.
3.

### Secondary User Stories
<!-- Nice-to-have stories -->

1.
2.

---

## 3. Functional Requirements

### Core Features
<!-- What must this feature do? -->

1.
2.
3.

### User Flows
<!-- Describe key user interactions -->

#### Flow 1: [Name]
1.
2.
3.

---

## 4. Non-Functional Requirements

### Performance
<!-- Response times, throughput, scalability -->

### Security
<!-- Authentication, authorization, data protection -->

### Usability
<!-- User experience considerations -->

### Reliability
<!-- Uptime, error handling, recovery -->

---

## 5. Technical Considerations

### Architecture
<!-- High-level technical approach -->

### Dependencies
<!-- External systems, libraries, APIs -->

### Data Model
<!-- Key entities and relationships -->

### API Design
<!-- Endpoints, requests, responses -->

---

## 6. Success Criteria

### Acceptance Criteria
<!-- How do we know when this is done? -->

1.
2.
3.

### Metrics
<!-- How do we measure success? -->

-
-

---

## 7. Open Questions

<!-- Unresolved questions that need answers -->

1.
2.

---

## 8. Timeline and Phasing

### Phase 1 (MVP)
<!-- What's in the minimum viable product? -->

### Phase 2 (Enhancements)
<!-- What comes after MVP? -->

---

## Notes

<!-- Additional context, links, references -->
`;
	}
}
