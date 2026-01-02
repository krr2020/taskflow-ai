/**
 * Base command infrastructure for AI-first command design
 * Every command returns structured guidance for AI agents
 */

import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { AICallLogger } from "../lib/ai-call-logger.js";
import { ConfigLoader } from "../lib/config-loader.js";
import { LLMRequiredError } from "../lib/errors.js";
import type { MCPContext } from "../lib/mcp-detector.js";
import { UsageDisplay } from "../lib/usage-display.js";
import {
	type LLMGenerationOptions,
	type LLMGenerationResult,
	type LLMMessage,
	type LLMProvider,
	Phase,
} from "../llm/base.js";
import { LLMCache } from "../llm/cache.js";
import { CheckpointManager } from "../llm/checkpoint-manager.js";
import { ContextManager } from "../llm/context-manager.js";
import { CostTracker } from "../llm/cost-tracker.js";
import { type AIConfig, ProviderFactory } from "../llm/factory.js";
import { RateLimiter } from "../llm/rate-limiter.js";

export interface CommandContext {
	projectRoot: string;
	mcpContext: MCPContext;
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
	protected mcpContext: MCPContext;
	protected aiLogger: AICallLogger;

	// Commands that require LLM (set in subclasses)
	protected requiresLLM: boolean = false;

	constructor(protected context: CommandContext) {
		this.mcpContext = context.mcpContext;
		this.configLoader = new ConfigLoader(context.projectRoot);
		this.costTracker = new CostTracker();
		this.llmCache = new LLMCache();
		this.rateLimiter = new RateLimiter();
		this.checkpointManager = new CheckpointManager({
			checkpointDir: `${context.projectRoot}/.taskflow/checkpoints`,
		});

		const debugEnabled = process.env.TASKFLOW_DEBUG === "true";
		this.aiLogger = new AICallLogger(context.projectRoot, debugEnabled);

		this.initializeLLMProvider();
	}

	/**
	 * Get project root directory
	 */
	getProjectRoot(): string {
		return this.context.projectRoot;
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
	 * Validate LLM availability before execution
	 * Throws an error if LLM is required but not available
	 */
	protected validateLLM(commandName?: string): void {
		if (!this.requiresLLM) {
			return;
		}

		// Skip validation if running in MCP mode (AI will handle it)
		if (this.mcpContext.isMCP) {
			return;
		}

		// Check if LLM is available
		if (!this.isLLMAvailable()) {
			const cmdName =
				commandName ||
				this.constructor.name.replace("Command", "").toLowerCase();
			throw new LLMRequiredError(this.getLLMRequiredErrorMessage(cmdName));
		}
	}

	/**
	 * Get user-friendly error message for LLM requirement
	 */
	private getLLMRequiredErrorMessage(commandName: string): string {
		return `
❌ LLM Provider Required

The '${commandName}' command requires an AI/LLM provider to function.

You have two options:

Option 1: Use via MCP Server (Recommended)
────────────────────────────────────────────
Use TaskFlow from Claude Desktop with the MCP server:
  npm install -g @krr2020/taskflow-mcp-server

Configure in Claude Desktop settings and interact via chat.

Option 2: Configure Custom LLM Provider
────────────────────────────────────────
Set up a custom LLM provider in taskflow.config.json:
  {
    "ai": {
      "enabled": true,
      "provider": "anthropic",
      "apiKey": "your-api-key",
      "model": "claude-sonnet-4"
    }
  }

Or set environment variable:
  export ANTHROPIC_API_KEY=your-key

Then configure:
  taskflow configure ai --provider anthropic --model claude-sonnet-4

For more info: https://github.com/krr2020/taskflow
`.trim();
	}

	/**
	 * Generate text stream with cost tracking and error handling
	 */
	protected async *generateStream(
		messages: LLMMessage[],
		options?: LLMGenerationOptions,
	): AsyncGenerator<string, string, unknown> {
		if (!this.isLLMAvailable() || !this.llmProvider) {
			return "";
		}

		const startTime = Date.now();

		try {
			// Check cache first
			const cached = this.llmCache.get(messages, options);
			if (cached) {
				yield cached.content;
				return cached.content;
			}

			// Call provider stream
			const generator = this.llmProvider.generateStream(messages, options);
			let fullContent = "";

			// Iterate through stream and capture return value
			let next = await generator.next();
			while (!next.done) {
				const chunk = next.value;
				fullContent += chunk;
				yield chunk;
				next = await generator.next();
			}

			// Process result (cost tracking and caching)
			const result = next.value as LLMGenerationResult;

			// Cache the response
			this.llmCache.set(messages, options, result);

			// Track cost
			this.costTracker.trackUsage(result);

			// Log AI call
			await this.aiLogger.logCall({
				timestamp: new Date().toISOString(),
				command: this.constructor.name,
				provider: "llm", // We don't have provider name easily accessible here without casting, but 'llm' is fine or we can try to get it
				model: result.model,
				prompt: {
					system: messages.find((m) => m.role === "system")?.content || "",
					user: messages.find((m) => m.role === "user")?.content || "",
				},
				response: {
					content: fullContent,
					usage: {
						promptTokens: result.promptTokens || 0,
						completionTokens: result.completionTokens || 0,
						totalTokens: result.tokensUsed || 0,
					},
				},
				duration: Date.now() - startTime,
			});

			return fullContent;
		} catch (error) {
			this.logError(error, "generateStream failed");
			throw error;
		}
	}

	/**
	 * Compact context using AI summarization if it exceeds limits
	 */
	protected async compactContextWithAI(
		content: string,
		contextDescription: string,
	): Promise<string> {
		if (!this.llmProvider || !this.contextManager) {
			return content;
		}

		const currentTokens = this.contextManager.estimateTokens(content);
		const availableTokens = this.contextManager.getAvailableTokens();

		// If we're using less than 70% of available tokens, don't compact
		if (currentTokens < availableTokens * 0.7) {
			return content;
		}

		UsageDisplay.showContextWarning(currentTokens, availableTokens);

		try {
			// Target 50% of original size
			const prompt = `Summarize the following ${contextDescription} to reduce its size by 50% while retaining all critical technical details, constraints, and requirements.
			
			Original Content:
			${content}`;

			const messages: LLMMessage[] = [
				{
					role: "system",
					content:
						"You are an expert technical summarizer. Reduce content length while preserving 100% of technical meaning.",
				},
				{
					role: "user",
					content: prompt,
				},
			];

			// Use a fast model for summarization if possible, or current provider
			// We intentionally don't stream this to keep it internal
			const startTime = Date.now();
			const result = await this.llmProvider.generate(messages, {
				maxTokens: Math.floor(availableTokens * 0.5), // Limit output
			});

			// Log AI call
			await this.aiLogger.logCall({
				timestamp: new Date().toISOString(),
				command: this.constructor.name,
				provider: "llm",
				model: result.model,
				prompt: {
					system: messages.find((m) => m.role === "system")?.content || "",
					user: messages.find((m) => m.role === "user")?.content || "",
				},
				response: {
					content: result.content,
					usage: {
						promptTokens: result.promptTokens || 0,
						completionTokens: result.completionTokens || 0,
						totalTokens: result.tokensUsed || 0,
					},
				},
				duration: Date.now() - startTime,
			});

			this.costTracker.trackUsage(result);

			// Show usage for compaction
			const modelUsage = this.costTracker.getModelUsage(result.model);
			if (modelUsage) {
				UsageDisplay.show(modelUsage, this.costTracker.getCurrentSession(), {
					verbose: true,
				});
			}

			return result.content;
		} catch (error) {
			this.logError(error, "Context compaction failed");
			// Fallback to original content if summarization fails
			return content;
		}
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
			const startTime = Date.now();
			const response = await this.retryWithBackoff(() =>
				llmProvider.generate(messages, options),
			);

			// Log AI call
			await this.aiLogger.logCall({
				timestamp: new Date().toISOString(),
				command: this.constructor.name,
				provider: "llm",
				model: response.model,
				prompt: {
					system: messages.find((m) => m.role === "system")?.content || "",
					user: messages.find((m) => m.role === "user")?.content || "",
				},
				response: {
					content: response.content,
					usage: {
						promptTokens: response.promptTokens || 0,
						completionTokens: response.completionTokens || 0,
						totalTokens: response.tokensUsed || 0,
					},
				},
				duration: Date.now() - startTime,
			});

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
			const startTime = Date.now();
			const response = await this.retryWithBackoff(() =>
				llmProvider.generate(messages, options),
			);

			// Log AI call
			await this.aiLogger.logCall({
				timestamp: new Date().toISOString(),
				command: this.constructor.name,
				provider: "llm",
				model: response.model,
				prompt: {
					system: messages.find((m) => m.role === "system")?.content || "",
					user: messages.find((m) => m.role === "user")?.content || "",
				},
				response: {
					content: response.content,
					usage: {
						promptTokens: response.promptTokens || 0,
						completionTokens: response.completionTokens || 0,
						totalTokens: response.tokensUsed || 0,
					},
				},
				duration: Date.now() - startTime,
			});

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

		// COST SUMMARY section (only if LLM was used)
		if (this.costTracker.getTotalTokens() > 0) {
			sections.push("SESSION USAGE:");
			sections.push(separator);
			sections.push(this.costTracker.getSummary());
			if (this.costTracker.isOverBudget()) {
				sections.push(pc.yellow("⚠️  Session budget exceeded"));
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
