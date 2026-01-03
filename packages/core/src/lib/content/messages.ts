/**
 * Centralized Message Definitions
 *
 * All user-facing messages organized by command/feature.
 * Each message can have mode-specific variants (manual vs mcp).
 */

import type { ModeAwareContent } from "@/lib/content/types";

export const MESSAGES = {
	/**
	 * Init command messages
	 */
	INIT: {
		SUCCESS: {
			manual: "Taskflow initialized successfully!",
			mcp: "Taskflow initialized. Project structure created and templates copied.",
		} as ModeAwareContent,

		NEXT_STEPS: {
			manual: [
				"Configure AI provider: taskflow configure ai",
				"Create a PRD: taskflow prd create",
				"Or explore: taskflow --help",
			],
			mcp: [
				"Run: taskflow prd create",
				"Or: taskflow configure ai (to set up LLM provider)",
				"Agent will guide you through the workflow",
			],
		} as ModeAwareContent<string[]>,

		AI_GUIDANCE: {
			manual: null,
			mcp: `Guide the user through project initialization:
1. Explain the .taskflow directory structure
2. Mention the copied template files in .taskflow/ref/
3. Suggest next steps: PRD creation or AI configuration
4. If they need to configure AI, use the configure ai command`,
		} as ModeAwareContent<string | null>,

		ALREADY_INITIALIZED:
			"Project is already initialized. Use taskflow upgrade to update templates.",

		DIRECTORY_CREATED: (dir: string) => `Created directory: ${dir}`,
		FILE_COPIED: (file: string) => `Copied template: ${file}`,
	},

	/**
	 * Configure AI command messages
	 */
	CONFIGURE: {
		AI: {
			SUCCESS: {
				manual: "AI provider configured successfully!",
				mcp: "AI provider configuration saved to .taskflow/config.json",
			} as ModeAwareContent,

			NEXT_STEPS: {
				manual: [
					"Test configuration: taskflow prd create",
					"View config: cat .taskflow/config.json",
				],
				mcp: [
					"Configuration complete. You can now use AI-powered features.",
					"Next: taskflow prd create to start building your PRD",
				],
			} as ModeAwareContent<string[]>,

			PROVIDER_PROMPT: "Select AI provider:",
			MODEL_PROMPT: "Enter model name:",
			API_KEY_PROMPT: "Enter API key (or press Enter to skip):",
			BASE_URL_PROMPT: "Enter base URL (or press Enter for default):",
		},

		NOT_INITIALIZED: {
			manual: "Project not initialized. Run: taskflow init",
			mcp: "Project not initialized. Use taskflow init to set up the project first.",
		} as ModeAwareContent,
	},

	/**
	 * PRD creation messages
	 */
	PRD: {
		CREATE: {
			STEP_FEATURE_NAME: {
				manual: "Step 1: FEATURE NAME\nProvide a concise name for the feature:",
				mcp: "Step 1: Feature Name\nCollect a concise feature name from the user.",
			} as ModeAwareContent,

			STEP_SUMMARY: {
				manual: `Step 2: FEATURE SUMMARY
────────────────────────────────────────
Provide a detailed summary of the feature.

For brownfield projects, you can reference existing files:
  • Use @filepath syntax (e.g., "Extend auth in @src/auth/login.ts")
  • Referenced files will be included in LLM context
  • Or select files interactively in the next step`,

				mcp: `Step 2: Feature Summary
Collect a detailed feature summary from the user.

For brownfield projects:
  • Ask which existing files to review
  • Use read_file tool to gather context
  • Include relevant code in your analysis`,
			} as ModeAwareContent,

			FILE_REFERENCE_HELP: {
				manual: [
					"To reference existing files:",
					"  • Use @filepath syntax in your summary",
					'  • Example: "Extend the authentication in @src/auth/login.ts"',
					"  • Referenced files will be included in LLM context",
				],
				mcp: [
					"For brownfield projects, ask user which files to review.",
					"Use read_file tool to gather context from existing codebase.",
				],
			} as ModeAwareContent<string[]>,

			ADD_MORE_FILES_PROMPT: "Add more file references?",

			GENERATING_QUESTIONS:
				"Analyzing feature and generating clarifying questions...",
			QUESTIONS_GENERATED: "Questions generated",
			NO_QUESTIONS_NEEDED:
				"✓ Feature summary is comprehensive, no clarifications needed.",

			ANSWER_APPROACH_PROMPT: "How would you like to answer?",
			ANSWER_APPROACH_OPTIONS: {
				recommended: {
					name: "Use all recommended options",
					description: "Quick start with sensible defaults",
				},
				interactive: {
					name: "Answer each question interactively",
					description: "Review and customize each answer",
				},
				conversational: {
					name: "Conversational mode (ask follow-up questions)",
					description: "Interactive discussion with AI",
				},
			},

			GENERATING_PRD: "Generating Product Requirements Document...",
			PRD_GENERATED: "PRD generated",

			REVIEW_TITLE: "PRD REVIEW",
			REVIEW_PROMPT: "Review Options:",
			REVIEW_OPTIONS: {
				approve: {
					name: "✓ Approve and Save (Finalize)",
					description: "PRD looks good, save to file",
				},
				refine: {
					name: "✏️  Request Changes / Add Information",
					description: "Provide feedback for improvements",
				},
				regenerate: {
					name: "🔄 Regenerate Entirely",
					description: "Start over with same inputs",
				},
				discuss: {
					name: "💬 Ask Questions About PRD",
					description: "Discuss edge cases, alternatives, etc.",
				},
			},

			REFINE_PROMPT: "What would you like to change or add?",
			REFINING_PRD: "Refining PRD based on your feedback...",

			SUCCESS: (prdPath: string) => `PRD created: ${prdPath}`,

			AI_GUIDANCE: {
				manual: null,
				mcp: `Guide the user through PRD creation:
1. Collect feature name and summary
2. Help identify referenced files for brownfield projects
3. Generate thoughtful clarifying questions
4. Collect answers (be flexible with format)
5. Generate comprehensive PRD
6. Support iterative refinement
7. Save to .taskflow/prd/ when approved`,
			} as ModeAwareContent<string | null>,
		},

		GENERATE_ARCH: {
			SELECT_PRD_PROMPT: "Select PRD file:",
			NO_PRD_FILES: "No PRD files found. Run: taskflow prd create",

			DETECTING_TECH_STACK: "Analyzing PRD and detecting tech stack...",
			TECH_STACK_DETECTED: "Tech stack options generated",

			SELECT_TECH_STACK_PROMPT: "Select tech stack:",
			CUSTOM_TECH_STACK_OPTION: "Custom tech stack",
			CUSTOM_TECH_STACK_DESCRIPTION: "Provide detailed description",
			CUSTOM_TECH_STACK_PROMPT: "Describe your tech stack in detail:",

			GENERATING_ARCH_FILES: "Generating architecture documentation...",
			ARCH_FILES_GENERATED: "Architecture files generated",

			SUCCESS: "Architecture files generated successfully!",
			FILES_GENERATED: [
				".taskflow/ref/tech-stack.md",
				".taskflow/ref/coding-standards.md",
				".taskflow/ref/architecture-rules.md",
			],

			NEXT_STEPS: {
				manual: [
					"Review generated files in .taskflow/ref/",
					"Customize if needed",
					"Generate tasks: taskflow tasks generate",
				],
				mcp: [
					"Architecture documentation created in .taskflow/ref/",
					"Review and customize as needed",
					"Next: taskflow tasks generate",
				],
			} as ModeAwareContent<string[]>,

			AI_GUIDANCE: {
				manual: null,
				mcp: `Guide the user through architecture generation:
1. Help select PRD file
2. Analyze PRD and suggest appropriate tech stacks
3. Allow custom tech stack descriptions
4. Generate comprehensive architecture documentation
5. Create tech-stack.md, coding-standards.md, architecture-rules.md`,
			} as ModeAwareContent<string | null>,
		},
	},

	/**
	 * Task generation messages
	 */
	TASKS: {
		GENERATE: {
			SELECT_PRD_PROMPT: "Select PRD to generate tasks from:",
			NO_PRD_FILES: "No PRD files found. Run: taskflow prd create",

			GENERATING_TASKS:
				"Generating task breakdown (Features → Stories → Tasks)...",
			TASKS_GENERATED: "Task breakdown generated",

			REVIEW_PROMPT: "Review task breakdown:",
			APPROVE_OPTION: "Approve and save",
			REFINE_OPTION: "Request refinements",
			REGENERATE_OPTION: "Regenerate from scratch",

			SUCCESS: "Tasks generated successfully!",

			NEXT_STEPS: {
				manual: [
					"View tasks: taskflow tasks list",
					"Start working: taskflow workflow start",
				],
				mcp: [
					"Task breakdown saved to tasks/ directory",
					"Use taskflow tasks list to view all tasks",
					"Start implementation: taskflow workflow start",
				],
			} as ModeAwareContent<string[]>,
		},
	},

	/**
	 * Workflow messages
	 */
	WORKFLOW: {
		START: {
			SELECT_TASK_PROMPT: "Select task to start:",
			NO_TASKS: "No tasks available. Run: taskflow tasks generate",

			CREATING_BRANCH: "Creating feature branch...",
			LOADING_CONTEXT: "Loading task context...",

			SUCCESS: (taskId: string, branchName: string) =>
				`Started task ${taskId} on branch ${branchName}`,

			NEXT_STEPS: {
				manual: [
					"Review task details",
					"Read retrospective for similar issues",
					"Get next instruction: taskflow workflow do",
				],
				mcp: [
					"Task started. Context loaded.",
					"Guide user through implementation using workflow do command",
				],
			} as ModeAwareContent<string[]>,
		},
	},

	/**
	 * Error messages
	 */
	ERRORS: {
		LLM_REQUIRED: {
			manual: `This command requires an AI provider.

Configure one with: taskflow configure ai

Or use MCP mode with Claude Desktop.`,
			mcp: "LLM provider not configured. Use taskflow configure ai command first.",
		} as ModeAwareContent,

		LLM_CALL_FAILED: (error: string) => `LLM API call failed: ${error}`,

		FILE_NOT_FOUND: (path: string) => `File not found: ${path}`,

		INVALID_INPUT: (message: string) => `Invalid input: ${message}`,

		COMMAND_FAILED: (command: string, error: string) =>
			`Command failed: ${command}\nError: ${error}`,
	},

	/**
	 * General messages
	 */
	GENERAL: {
		LOADING: "Loading...",
		PROCESSING: "Processing...",
		SAVING: "Saving...",
		DONE: "Done!",

		CONFIRM_PROMPT: "Are you sure?",
		YES: "Yes",
		NO: "No",
		CANCEL: "Cancel",

		PRESS_ENTER: "Press Enter to continue...",
	},
};
