/**
 * Base command infrastructure for AI-first command design
 * Every command returns structured guidance for AI agents
 */

import { ConfigLoader } from "../lib/config-loader.js";
import type { LLMProvider } from "../llm/base.js";
import { Phase } from "../llm/base.js";
import { type AIConfig, ProviderFactory } from "../llm/factory.js";

export interface CommandContext {
	projectRoot: string;
}

export interface CommandResult {
	success: boolean;
	output: string;
	nextSteps: string;
	aiGuidance?: string;
	contextFiles?: string[];
	warnings?: string[];
	errors?: string[];
}

export abstract class BaseCommand {
	protected llmProvider: LLMProvider | undefined;
	protected configLoader: ConfigLoader;

	constructor(protected context: CommandContext) {
		this.configLoader = new ConfigLoader(context.projectRoot);
		this.initializeLLMProvider();
	}

	/**
	 * Initialize LLM provider if configured
	 */
	private initializeLLMProvider(): void {
		try {
			const config = this.configLoader.load();

			// Check if AI is configured and enabled
			if (config.ai && "enabled" in config.ai && config.ai.enabled) {
				const aiConfig = config.ai as unknown as AIConfig;
				const selector = ProviderFactory.createSelector(aiConfig);
				if (selector.isConfigured()) {
					this.llmProvider = selector.getProvider(Phase.Planning);
				}
			}
		} catch {
			// LLM provider initialization failed gracefully
			this.llmProvider = void 0;
		}
	}

	/**
	 * Check if LLM is available
	 */
	protected isLLMAvailable(): boolean {
		return this.llmProvider?.isConfigured() === true;
	}

	/**
	 * Get LLM guidance for a given context
	 * Keeps guidance concise (200 words max)
	 */
	protected async getLLMGuidance(context: {
		task?: string;
		status?: string;
		files?: string[];
		errors?: string[];
		instructions?: string;
	}): Promise<string> {
		if (!this.isLLMAvailable() || !this.llmProvider) {
			return "";
		}

		try {
			const { task, status, files, errors, instructions } = context;

			const prompt = `Generate concise guidance (max 200 words) for:
${task ? `Task: ${task}` : ""}
${status ? `Status: ${status}` : ""}
${files && files.length > 0 ? `Files: ${files.slice(0, 5).join(", ")}` : ""}
${errors && errors.length > 0 ? `Errors: ${errors.slice(0, 3).join("; ")}` : ""}
${instructions ? `Instructions: ${instructions}` : ""}

Provide:
1. Key context to understand
2. Critical files to check
3. Common pitfalls to avoid
4. Recommended approach

Be concise and actionable.`;

			const response = await this.llmProvider.generate(
				[
					{
						role: "system",
						content:
							"You are a helpful coding assistant providing concise guidance.",
					},
					{ role: "user", content: prompt },
				],
				{ maxTokens: 300, temperature: 0.5 },
			);

			return this.truncateToWords(response.content, 200);
		} catch {
			// LLM call failed, return empty string
			return "";
		}
	}

	/**
	 * Get error analysis with LLM
	 * Groups errors by file and provides targeted fixes
	 */
	protected async getErrorAnalysis(
		errors: Array<{
			file: string;
			message: string;
			line?: number;
			code?: string;
		}>,
	): Promise<string> {
		if (!this.isLLMAvailable() || !this.llmProvider || errors.length === 0) {
			return "";
		}

		try {
			const groupedErrors = this.groupErrorsByFile(errors);

			const prompt = `Analyze these errors and provide targeted fixes:

${Object.entries(groupedErrors)
	.map(
		([file, fileErrors]) =>
			`\n${file}:\n${fileErrors.map((e) => `  ${e.message}`).join("\n")}`,
	)
	.join("\n")}

Provide:
1. Root cause analysis per file
2. Specific fix suggestions
3. File-by-file approach to resolve

Be concise and actionable.`;

			const response = await this.llmProvider.generate(
				[
					{
						role: "system",
						content: "You are a debugging assistant providing error analysis.",
					},
					{ role: "user", content: prompt },
				],
				{ maxTokens: 500, temperature: 0.3 },
			);

			return response.content;
		} catch {
			return "";
		}
	}

	/**
	 * Group errors by file
	 */
	private groupErrorsByFile(
		errors: Array<{
			file: string;
			message: string;
			line?: number;
			code?: string;
		}>,
	): Record<string, Array<{ message: string; line?: number; code?: string }>> {
		const grouped: Record<
			string,
			Array<{ message: string; line?: number; code?: string }>
		> = {};

		for (const error of errors) {
			if (!grouped[error.file]) {
				grouped[error.file] = [];
			}
			const entry: {
				message: string;
				line?: number;
				code?: string;
			} = {
				message: error.message,
			};
			if (error.line !== undefined) {
				entry.line = error.line;
			}
			if (error.code !== undefined) {
				entry.code = error.code;
			}
			const array = grouped[error.file];
			if (array) {
				array.push(entry);
			}
		}

		return grouped;
	}

	/**
	 * Truncate text to maximum word count
	 */
	private truncateToWords(text: string, maxWords: number): string {
		const words = text.split(/\s+/);
		if (words.length <= maxWords) {
			return text;
		}
		return words.slice(0, maxWords).join(" ");
	}

	abstract execute(...args: unknown[]): Promise<CommandResult>;

	/**
	 * Format command result for terminal output
	 * Returns formatted string with sections: OUTPUT, CONTEXT FILES, NEXT STEPS, AI GUIDANCE, WARNINGS
	 */
	protected formatOutput(result: CommandResult): string {
		const sections: string[] = [];
		const separator = "─".repeat(60);

		// OUTPUT section
		sections.push("OUTPUT:");
		sections.push(separator);
		sections.push(result.output);
		sections.push("");

		// CONTEXT FILES section (if any)
		if (result.contextFiles && result.contextFiles.length > 0) {
			sections.push("CONTEXT FILES (Read these before proceeding):");
			sections.push(separator);
			for (const [index, file] of result.contextFiles.entries()) {
				sections.push(`${index + 1}. ${file}`);
			}
			sections.push("");
		}

		// NEXT STEPS section
		sections.push("NEXT STEPS:");
		sections.push(separator);
		sections.push(result.nextSteps);
		sections.push("");

		// AI GUIDANCE section (if any)
		if (result.aiGuidance) {
			sections.push("AI GUIDANCE:");
			sections.push(separator);
			sections.push(result.aiGuidance);
			sections.push("");
		}

		// WARNINGS section (if any)
		if (result.warnings && result.warnings.length > 0) {
			sections.push("WARNINGS:");
			sections.push(separator);
			for (const warning of result.warnings) {
				sections.push(`⚠ ${warning}`);
			}
			sections.push("");
		}

		// ERRORS section (if any)
		if (result.errors && result.errors.length > 0) {
			sections.push("ERRORS:");
			sections.push(separator);
			for (const error of result.errors) {
				sections.push(`✗ ${error}`);
			}
			sections.push("");
		}

		return sections.join("\n");
	}

	/**
	 * Create a successful command result
	 */
	protected success(
		output: string,
		nextSteps: string,
		options?: {
			aiGuidance?: string;
			contextFiles?: string[];
			warnings?: string[];
		},
	): CommandResult {
		return {
			success: true,
			output,
			nextSteps,
			...options,
		};
	}

	/**
	 * Create a failed command result
	 */
	protected failure(
		output: string,
		errors: string[],
		nextSteps: string,
		options?: {
			aiGuidance?: string;
			warnings?: string[];
		},
	): CommandResult {
		return {
			success: false,
			output,
			nextSteps,
			errors,
			...options,
		};
	}
}
