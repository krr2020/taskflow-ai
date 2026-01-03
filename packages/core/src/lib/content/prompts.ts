/**
 * Mode-Aware LLM Prompts
 *
 * CRITICAL: Prompts differ based on execution mode:
 *
 * MANUAL MODE:
 * - Strict output formats (for CLI parsing)
 * - Structured responses (numbered lists, specific markers)
 * - Limited iterations (parse once, display in terminal)
 *
 * MCP MODE:
 * - Natural, flexible outputs (AI agent handles files directly)
 * - Conversational responses (no parsing needed)
 * - Iterative refinement (agent can call tools multiple times)
 */

import type { ModeAwarePrompt } from "./types.js";

export const LLM_PROMPTS: Record<string, ModeAwarePrompt> = {
	/**
	 * PRD Question Generation
	 * Generates clarifying questions to gather requirements
	 */
	PRD_QUESTION_GENERATION: {
		// MANUAL MODE: Need structured output for CLI parsing
		manual: {
			system: (
				template: string,
			) => `You are a Product Manager using this template:

${template}

Your goal is to ask clarifying questions to gather necessary requirements.
Focus on: core functionality, edge cases, technical constraints, user roles, success metrics.

CRITICAL OUTPUT FORMAT (must follow exactly):
QUESTIONS:
1. [Question text] (Type: open-ended)
2. [Question text] (Type: multiple-choice)
   A. [Option 1]
   B. [Option 2]
   C. [Option 3]
   Recommended: Option A - [Brief reason why]
...

If no questions needed, reply ONLY with:
NO_QUESTIONS_NEEDED`,

			user: (context: {
				summary: string;
				referencedFiles?: Array<{ path: string; content: string }>;
			}) => {
				let prompt = `Feature Summary:\n${context.summary}\n\n`;

				if (context.referencedFiles && context.referencedFiles.length > 0) {
					prompt += "## Referenced Files\n\n";
					for (const ref of context.referencedFiles) {
						prompt += `### ${ref.path}\n\`\`\`\n${ref.content}\n\`\`\`\n\n`;
					}
				}

				prompt += `\nGenerate 3-5 clarifying questions in the required format above.`;
				return prompt;
			},

			parsingRules: {
				questionPattern:
					/^\d+\.\s+(.+?)\s+\(Type:\s+(open-ended|multiple-choice)\)/,
				optionPattern: /^\s+([A-Z])\.\s+(.+)/,
				recommendedPattern: /^Recommended:\s+Option\s+([A-Z])\s+-\s+(.+)/,
			},
		},

		// MCP MODE: Natural conversation, AI agent handles everything
		mcp: {
			system: (
				template: string,
			) => `You are a Product Manager helping create a PRD using this template:

${template}

Your goal is to ask clarifying questions to gather comprehensive requirements.
Focus on: core functionality, edge cases, technical constraints, user roles, success metrics.

Ask questions naturally. For questions with clear options, provide recommendations with brief rationale.
The AI agent will handle file editing and iterations, so focus on gathering complete information.

If the summary is already comprehensive, indicate that no questions are needed.`,

			user: (context: {
				summary: string;
				referencedFiles?: Array<{ path: string; content: string }>;
			}) => {
				let prompt = `Feature Summary:\n${context.summary}\n\n`;

				if (context.referencedFiles && context.referencedFiles.length > 0) {
					prompt += "## Referenced Files\n\n";
					for (const ref of context.referencedFiles) {
						prompt += `### ${ref.path}\n\`\`\`\n${ref.content}\n\`\`\`\n\n`;
					}
				}

				prompt += `\nAsk 3-5 clarifying questions to create a comprehensive PRD. If the summary is already complete, indicate no questions are needed.`;
				return prompt;
			},
		},
	},

	/**
	 * PRD Generation
	 * Creates the actual PRD document
	 */
	PRD_GENERATION: {
		// MANUAL MODE: Generate complete PRD in one shot
		manual: {
			system: (
				template: string,
			) => `Generate a Product Requirements Document using this template:

${template}

IMPORTANT: Use today's date (${new Date().toISOString().split("T")[0]}) for the PRD creation date.

Generate a complete, well-structured PRD in markdown format.
The output will be saved directly to a file and reviewed by the user.

Use proper markdown formatting: headers, lists, code blocks, etc.
Be comprehensive but concise.`,

			user: (context: {
				featureName: string;
				summary: string;
				questionsAndAnswers?: string;
				referencedFiles?: Array<{ path: string; content: string }>;
			}) => {
				let prompt = `Feature: ${context.featureName}\n\nSummary:\n${context.summary}\n\n`;

				if (context.questionsAndAnswers) {
					prompt += `Clarifications:\n${context.questionsAndAnswers}\n\n`;
				}

				if (context.referencedFiles && context.referencedFiles.length > 0) {
					prompt += "## Referenced Files\n\n";
					for (const ref of context.referencedFiles) {
						prompt += `### ${ref.path}\n\`\`\`\n${ref.content}\n\`\`\`\n\n`;
					}
				}

				prompt += `\nGenerate the complete PRD now.`;
				return prompt;
			},
		},

		// MCP MODE: More iterative, agent can refine
		mcp: {
			system: (
				template: string,
			) => `Generate a Product Requirements Document using this template:

${template}

IMPORTANT: Use today's date (${new Date().toISOString().split("T")[0]}) for the PRD creation date.

Work iteratively with the user to create a comprehensive PRD.
You can ask follow-up questions, suggest improvements, and refine sections as needed.
The AI agent will handle file operations, so focus on content quality.

Use proper markdown formatting throughout.`,

			user: (context: {
				featureName: string;
				summary: string;
				questionsAndAnswers?: string;
				referencedFiles?: Array<{ path: string; content: string }>;
			}) => {
				let prompt = `Feature: ${context.featureName}\n\nSummary:\n${context.summary}\n\n`;

				if (context.questionsAndAnswers) {
					prompt += `Clarifications:\n${context.questionsAndAnswers}\n\n`;
				}

				if (context.referencedFiles && context.referencedFiles.length > 0) {
					prompt += "## Referenced Files\n\n";
					for (const ref of context.referencedFiles) {
						prompt += `### ${ref.path}\n\`\`\`\n${ref.content}\n\`\`\`\n\n`;
					}
				}

				prompt += `\nGenerate a comprehensive PRD. Feel free to ask follow-up questions if needed.`;
				return prompt;
			},
		},
	},

	/**
	 * PRD Refinement
	 * Improves an existing PRD based on feedback
	 */
	PRD_REFINEMENT: {
		manual: {
			system:
				() => `You are refining a Product Requirements Document based on user feedback.

Maintain the existing structure and formatting.
Apply the requested changes precisely.
Keep unchanged sections as they are.

Output the complete refined PRD in markdown format.`,

			user: (context: {
				existingPRD: string;
				refinementInstructions: string;
				followUpAnswers?: string;
			}) => {
				let prompt = `Existing PRD:\n${context.existingPRD}\n\n`;
				prompt += `Refinement Instructions:\n${context.refinementInstructions}\n\n`;

				if (context.followUpAnswers) {
					prompt += `Follow-up Information:\n${context.followUpAnswers}\n\n`;
				}

				prompt += `\nGenerate the refined PRD now.`;
				return prompt;
			},
		},

		mcp: {
			system:
				() => `You are refining a Product Requirements Document based on user feedback.

Work collaboratively to improve the PRD.
Ask clarifying questions if the feedback is unclear.
Suggest alternative approaches if appropriate.

The AI agent will handle saving the refined version.`,

			user: (context: {
				existingPRD: string;
				refinementInstructions: string;
				followUpAnswers?: string;
			}) => {
				let prompt = `Existing PRD:\n${context.existingPRD}\n\n`;
				prompt += `Refinement Instructions:\n${context.refinementInstructions}\n\n`;

				if (context.followUpAnswers) {
					prompt += `Follow-up Information:\n${context.followUpAnswers}\n\n`;
				}

				prompt += `\nRefine the PRD based on this feedback. Ask questions if anything is unclear.`;
				return prompt;
			},
		},
	},

	/**
	 * Task Generation
	 * Breaks down PRD into Features → Stories → Tasks
	 */
	TASK_GENERATION: {
		// MANUAL MODE: Structured JSON output
		manual: {
			system: (
				protocol: string,
			) => `You are a task breakdown specialist using this protocol:

${protocol}

Generate a hierarchical task breakdown in STRICT JSON format:
{
  "features": [
    {
      "id": "F1",
      "name": "Feature Name",
      "description": "Brief description",
      "stories": [
        {
          "id": "F1-S1",
          "name": "Story Name",
          "description": "User story",
          "tasks": [
            {
              "id": "F1-S1-T1",
              "name": "Task Name",
              "description": "Implementation details",
              "type": "setup|planning|implementing|verifying|validating",
              "estimatedComplexity": "simple|moderate|complex"
            }
          ]
        }
      ]
    }
  ]
}

Output ONLY valid JSON, no additional text or markdown formatting.`,

			user: (context: { prdContent: string; codingStandards?: string }) => {
				let prompt = `PRD:\n${context.prdContent}\n\n`;

				if (context.codingStandards) {
					prompt += `Coding Standards:\n${context.codingStandards}\n\n`;
				}

				prompt += `\nGenerate the task breakdown in strict JSON format.`;
				return prompt;
			},
		},

		// MCP MODE: Natural structure, can iterate
		mcp: {
			system: (
				protocol: string,
			) => `You are a task breakdown specialist using this protocol:

${protocol}

Generate a hierarchical breakdown of Features → Stories → Tasks.
Work iteratively to ensure all requirements are covered.
The AI agent will format and save the tasks, so focus on comprehensive coverage.

Break down into logical, actionable units.
Ensure each task is properly scoped and has clear acceptance criteria.`,

			user: (context: { prdContent: string; codingStandards?: string }) => {
				let prompt = `PRD:\n${context.prdContent}\n\n`;

				if (context.codingStandards) {
					prompt += `Coding Standards:\n${context.codingStandards}\n\n`;
				}

				prompt += `\nCreate a comprehensive task breakdown. Break down into Features, Stories, and Tasks.
Ensure each task is actionable and properly scoped.`;
				return prompt;
			},
		},
	},

	/**
	 * Tech Stack Detection
	 * Analyzes PRD and suggests appropriate tech stacks
	 */
	TECH_STACK_DETECTION: {
		manual: {
			system:
				() => `Analyze the PRD and suggest 2-3 appropriate tech stack options.

Output format:
TECH_STACKS:
1. [Stack Name]
   Description: [Brief description]
   Languages: [comma-separated list]
   Frameworks: [comma-separated list]
   Justification: [Why this stack fits]

2. [Stack Name]
   ...`,

			user: (prdContent: string) =>
				`PRD:\n${prdContent}\n\nSuggest 2-3 appropriate tech stacks in the required format.`,

			parsingRules: {
				stackPattern: /^\d+\.\s+(.+)/,
				descriptionPattern: /^\s+Description:\s+(.+)/,
				languagesPattern: /^\s+Languages:\s+(.+)/,
				frameworksPattern: /^\s+Frameworks:\s+(.+)/,
				justificationPattern: /^\s+Justification:\s+(.+)/,
			},
		},

		mcp: {
			system: () => `Analyze the PRD and suggest appropriate tech stack options.

Consider:
- Project requirements and complexity
- Team expertise (if mentioned)
- Performance requirements
- Scalability needs
- Development speed vs production needs

Suggest 2-3 viable options with pros/cons for each.`,

			user: (prdContent: string) =>
				`PRD:\n${prdContent}\n\nSuggest appropriate tech stacks with justification.`,
		},
	},

	/**
	 * Architecture Documentation
	 * Generates tech-stack.md, coding-standards.md, architecture-rules.md
	 */
	ARCHITECTURE_GENERATION: {
		manual: {
			system: (
				techStack: unknown,
			) => `Generate architecture documentation for this tech stack:

${JSON.stringify(techStack, null, 2)}

Generate complete markdown content for three files.

Output format with clear delimiters:
===== tech-stack.md =====
[Complete markdown content for tech stack documentation]

===== coding-standards.md =====
[Complete markdown content for coding standards]

===== architecture-rules.md =====
[Complete markdown content for architecture rules]

Ensure proper markdown formatting in each section.`,

			user: (prdContent: string) =>
				`PRD Context:\n${prdContent}\n\nGenerate all three architecture documentation files with the delimiters specified above.`,

			parsingRules: {
				fileDelimiter: /^=====\s+(.+?)\s+=====/,
			},
		},

		mcp: {
			system: (
				techStack: unknown,
			) => `Generate architecture documentation for this tech stack:

${JSON.stringify(techStack, null, 2)}

Create comprehensive documentation covering:
- Technology stack choices and justification
- Coding standards and conventions
- Architecture patterns and rules
- Module structure and organization
- Data flow and state management

The AI agent will create and organize the files, so focus on comprehensive, practical content.`,

			user: (prdContent: string) =>
				`PRD Context:\n${prdContent}\n\nGenerate comprehensive architecture documentation.
Be thorough and consider the specific needs of this project.`,
		},
	},

	/**
	 * Error Analysis
	 * Analyzes errors and provides solutions
	 */
	ERROR_ANALYSIS: {
		manual: {
			system: () => `Analyze the error and provide a structured report.

Output format:
ROOT CAUSE:
[One-line explanation of the root cause]

SOLUTION:
[Step-by-step instructions to fix]

PREVENTION:
[How to avoid this error in the future]`,

			user: (context: { error: string; taskContext?: string }) => {
				let prompt = `Error:\n${context.error}\n\n`;

				if (context.taskContext) {
					prompt += `Context:\n${context.taskContext}\n\n`;
				}

				prompt += `\nProvide structured analysis in the format specified above.`;
				return prompt;
			},
		},

		mcp: {
			system: () => `Analyze the error and help the user fix it.

Provide:
1. Clear explanation of the root cause
2. Step-by-step solution
3. Prevention tips for the future

Be conversational and helpful. The AI agent will assist with implementing the fix.`,

			user: (context: { error: string; taskContext?: string }) => {
				let prompt = `Error:\n${context.error}\n\n`;

				if (context.taskContext) {
					prompt += `Context:\n${context.taskContext}\n\n`;
				}

				prompt += `\nHelp me understand and fix this error.`;
				return prompt;
			},
		},
	},

	/**
	 * Validation Feedback
	 * Reviews implementation against requirements
	 */
	VALIDATION_FEEDBACK: {
		manual: {
			system: () => `Review the implementation and provide feedback.

Output format:
✓ PASSED:
- [item that meets requirements]
- [another passing item]

✗ FAILED:
- [item that fails] - [what needs to be fixed]
- [another failure] - [fix needed]

⚠ WARNINGS:
- [item with concerns] - [suggestion for improvement]`,

			user: (context: { code: string; requirements: string }) =>
				`Code:\n${context.code}\n\nRequirements:\n${context.requirements}\n\nProvide validation feedback in the format above.`,
		},

		mcp: {
			system: () => `Review the implementation against requirements.

Provide clear, constructive feedback on:
- What works well
- What needs fixing
- Suggestions for improvement

Be thorough but encouraging. The AI agent will help apply changes.`,

			user: (context: { code: string; requirements: string }) =>
				`Code:\n${context.code}\n\nRequirements:\n${context.requirements}\n\nReview the implementation and provide feedback.`,
		},
	},
};

/**
 * Template URLs for external templates
 */
export const TEMPLATE_SOURCES = {
	PRD_GENERATOR:
		"https://raw.githubusercontent.com/snarktank/ai-dev-tasks/refs/heads/main/create-prd.md",
	// Add more template sources as needed
};
