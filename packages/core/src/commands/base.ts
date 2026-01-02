/**
 * Base command infrastructure for AI-first command design
 * Every command returns structured guidance for AI agents
 */

import fs from "node:fs";
import path from "node:path";
import { ConfigLoader } from "../lib/config-loader.js";
import type { LLMProvider } from "../llm/base.js";
import { Phase } from "../llm/base.js";
import { LLMCache } from "../llm/cache.js";
import { CheckpointManager } from "../llm/checkpoint-manager.js";
import { ContextManager } from "../llm/context-manager.js";
import { CostTracker } from "../llm/cost-tracker.js";
import { type AIConfig, ProviderFactory } from "../llm/factory.js";
import { RateLimiter } from "../llm/rate-limiter.js";

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
	protected costTracker: CostTracker;
	protected contextManager: ContextManager | undefined;
	protected llmCache: LLMCache;
	protected rateLimiter: RateLimiter;
	protected checkpointManager: CheckpointManager;

	constructor(protected context: CommandContext) {
		this.configLoader = new ConfigLoader(context.projectRoot);
		this.costTracker = new CostTracker();
		this.llmCache = new LLMCache();
		this.rateLimiter = new RateLimiter();
		this.checkpointManager = new CheckpointManager({
			checkpointDir: `${context.projectRoot}/.taskflow/checkpoints`,
		});
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
					const baseProvider = selector.getProvider(Phase.Planning);

					// Wrap provider with rate limiter
					this.llmProvider = this.rateLimiter.wrap(baseProvider);

					// Initialize context manager for the model
					const modelName = selector.getModelName(Phase.Planning);
					this.contextManager = ContextManager.forModel(modelName);
				}
			}
		} catch (error) {
			// LLM provider initialization failed gracefully
			this.logError(error, "LLM provider initialization failed");
			this.llmProvider = void 0;
			this.contextManager = void 0;
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

		// Provider is guaranteed to be available after the check
		const llmProvider = this.llmProvider;

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

			const messages = [
				{
					role: "system" as const,
					content:
						"You are a helpful coding assistant providing concise guidance.",
				},
				{ role: "user" as const, content: prompt },
			];
			const options = { maxTokens: 300, temperature: 0.5 };

			// Check cache first
			const cached = this.llmCache.get(messages, options);
			if (cached) {
				// Cache hit - track as if it were a real call but with zero cost
				return this.truncateToWords(cached.content, 200);
			}

			// Cache miss - call LLM
			const response = await this.retryWithBackoff(() =>
				llmProvider.generate(messages, options),
			);

			// Cache the response
			this.llmCache.set(messages, options, response);

			// Track cost
			this.costTracker.trackUsage(response);

			return this.truncateToWords(response.content, 200);
		} catch (error) {
			// LLM call failed, return empty string
			this.logError(error, "getLLMGuidance failed");
			return "";
		}
	}

	/**
	 * Get error analysis with LLM
	 * Groups errors by file and provides targeted fixes
	 * Includes project context from retrospective and coding standards
	 */
	protected async getErrorAnalysis(
		errors: Array<{
			file: string;
			message: string;
			line?: number;
			code?: string;
		}>,
		refDir?: string,
	): Promise<string> {
		if (!this.isLLMAvailable() || !this.llmProvider || errors.length === 0) {
			return "";
		}

		// Provider is guaranteed to be available after check
		const llmProvider = this.llmProvider;

		try {
			const groupedErrors = this.groupErrorsByFile(errors);

			// Load project context if available
			let retrospectiveContext = "";
			let codingStandardsContext = "";

			if (refDir) {
				const fs = await import("node:fs");
				const path = await import("node:path");

				// Load retrospective for known error patterns
				const retrospectivePath = path.join(refDir, "retrospective.md");
				if (fs.existsSync(retrospectivePath)) {
					retrospectiveContext = fs.readFileSync(retrospectivePath, "utf-8");
				}

				// Load coding standards
				const codingStandardsPath = path.join(refDir, "coding-standards.md");
				if (fs.existsSync(codingStandardsPath)) {
					codingStandardsContext = fs.readFileSync(
						codingStandardsPath,
						"utf-8",
					);
				}
			}

			let prompt = `Analyze these errors and provide targeted fixes:

${Object.entries(groupedErrors)
	.map(
		([file, fileErrors]) =>
			`\n${file}:\n${fileErrors.map((e) => `  ${e.message}`).join("\n")}`,
	)
	.join("\n")}
`;

			// Add project context if available
			if (retrospectiveContext) {
				prompt += `\n\nKNOWN ERROR PATTERNS (from retrospective):\n${retrospectiveContext.slice(0, 1000)}\n`;
			}

			if (codingStandardsContext) {
				prompt += `\n\nPROJECT CODING STANDARDS:\n${codingStandardsContext.slice(0, 1000)}\n`;
			}

			prompt += `\nProvide:
1. Root cause analysis per file
2. Specific fix suggestions that align with project standards
3. File-by-file approach to resolve
4. Check if similar errors were already solved (see retrospective)

Be concise and actionable.`;

			const messages = [
				{
					role: "system" as const,
					content:
						"You are a debugging assistant providing error analysis. Use project retrospective and coding standards to provide context-aware solutions.",
				},
				{ role: "user" as const, content: prompt },
			];
			const options = { maxTokens: 800, temperature: 0.3 };

			// Check cache first
			const cached = this.llmCache.get(messages, options);
			if (cached) {
				return cached.content;
			}

			// Cache miss - call LLM
			const response = await this.retryWithBackoff(() =>
				llmProvider.generate(messages, options),
			);

			// Cache the response
			this.llmCache.set(messages, options, response);

			// Track cost
			this.costTracker.trackUsage(response);

			return response.content;
		} catch (error) {
			this.logError(error, "getErrorAnalysis failed");
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

	/**
	 * Get LLM cost summary for current session
	 */
	protected getCostSummary(): string {
		return this.costTracker.getSummary();
	}

	/**
	 * Get detailed cost report
	 */
	protected getCostReport(verbose = false): string {
		return this.costTracker.getReport(verbose);
	}

	/**
	 * Check if over budget
	 */
	protected isOverBudget(): boolean {
		return this.costTracker.isOverBudget();
	}

	/**
	 * Get cache statistics
	 */
	protected getCacheStats(): string {
		return this.llmCache.getStatsReport();
	}

	/**
	 * Clear LLM cache
	 */
	protected clearCache(): void {
		this.llmCache.clear();
	}

	/**
	 * Clear expired cache entries
	 */
	protected clearExpiredCache(): void {
		this.llmCache.clearExpired();
	}

	/**
	 * Verify LLM configuration
	 * Checks if provider is configured and API key is present
	 * Optionally checks network connectivity
	 */
	protected async verifyLLMConfiguration(
		checkConnection = false,
	): Promise<{ valid: boolean; error?: string }> {
		if (!this.llmProvider) {
			return { valid: false, error: "LLM provider not initialized" };
		}

		if (!this.llmProvider.isConfigured()) {
			return {
				valid: false,
				error: "LLM provider not configured (missing API key?)",
			};
		}

		if (checkConnection) {
			try {
				await this.llmProvider.generate([{ role: "user", content: "ping" }], {
					maxTokens: 1,
				});
			} catch (error) {
				const errorMessage =
					error instanceof Error ? error.message : String(error);
				return {
					valid: false,
					error: `LLM connection failed: ${errorMessage}`,
				};
			}
		}

		return { valid: true };
	}

	/**
	 * Execute an LLM operation with fallback
	 */
	protected async executeWithFallback<T>(
		operation: () => Promise<T>,
		fallback: () => T | Promise<T>,
		context: string,
	): Promise<T> {
		try {
			return await operation();
		} catch (error) {
			this.logError(error, `Fallback triggered for: ${context}`);
			return await fallback();
		}
	}

	/**
	 * Retry a function with exponential backoff
	 */
	protected async retryWithBackoff<T>(
		fn: () => Promise<T>,
		maxRetries = 3,
		initialDelay = 1000,
	): Promise<T> {
		let lastError: unknown;

		for (let attempt = 0; attempt <= maxRetries; attempt++) {
			try {
				return await fn();
			} catch (error) {
				lastError = error;
				if (attempt < maxRetries) {
					const delay = initialDelay * 2 ** attempt;
					await new Promise((resolve) => setTimeout(resolve, delay));
				}
			}
		}

		throw lastError;
	}

	/**
	 * Log error to file
	 */
	protected logError(error: unknown, context: string): void {
		try {
			const taskflowDir = path.join(this.context.projectRoot, ".taskflow");
			const logDir = path.join(taskflowDir, "logs");

			// Only create log directory if .taskflow already exists
			// Don't create directories during initialization or validation
			if (!fs.existsSync(taskflowDir)) {
				return;
			}

			if (!fs.existsSync(logDir)) {
				fs.mkdirSync(logDir, { recursive: true });
			}

			const timestamp = new Date().toISOString();
			let errorMessage = error instanceof Error ? error.message : String(error);
			let stack = error instanceof Error ? error.stack : "";

			// Sanitize API keys (basic patterns)
			const apiKeyRegex = /(sk-[a-zA-Z0-9]{20,})|([a-zA-Z0-9]{32,})/g;
			errorMessage = errorMessage.replace(apiKeyRegex, "***API_KEY***");
			if (stack) {
				stack = stack.replace(apiKeyRegex, "***API_KEY***");
			}

			const logEntry = `[${timestamp}] ${context}\nError: ${errorMessage}\n${stack}\n-------------------\n`;

			const logFile = path.join(logDir, "error.log");
			fs.appendFileSync(logFile, logEntry);
		} catch {
			// Fail silently if logging fails to avoid crashing the application
		}
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
