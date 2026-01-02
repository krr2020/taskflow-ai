/**
 * Rate Limiter for LLM API Calls
 * Implements rate limiting, exponential backoff, and retry logic
 */

import type {
	LLMGenerationOptions,
	LLMGenerationResult,
	LLMMessage,
	LLMProvider,
} from "./base.js";

/**
 * Rate limit configuration
 */
export interface RateLimitConfig {
	requestsPerMinute?: number; // Max requests per minute
	tokensPerMinute?: number; // Max tokens per minute
	maxRetries?: number; // Max retry attempts (default: 3)
	initialBackoffMs?: number; // Initial backoff in ms (default: 1000)
	maxBackoffMs?: number; // Max backoff in ms (default: 60000)
	backoffMultiplier?: number; // Backoff multiplier (default: 2)
}

/**
 * Request record for rate tracking
 */
interface RequestRecord {
	timestamp: Date;
	tokens: number;
}

/**
 * Retry error type
 */
export class RateLimitError extends Error {
	constructor(
		message: string,
		public readonly retryAfter?: number,
	) {
		super(message);
		this.name = "RateLimitError";
	}
}

/**
 * Rate Limiter class
 * Manages rate limits and retry logic for LLM providers
 */
export class RateLimiter {
	private config: Required<RateLimitConfig>;
	private requestHistory: RequestRecord[] = [];

	constructor(config?: RateLimitConfig) {
		this.config = {
			requestsPerMinute: config?.requestsPerMinute ?? Number.POSITIVE_INFINITY,
			tokensPerMinute: config?.tokensPerMinute ?? Number.POSITIVE_INFINITY,
			maxRetries: config?.maxRetries ?? 3,
			initialBackoffMs: config?.initialBackoffMs ?? 1000,
			maxBackoffMs: config?.maxBackoffMs ?? 60000,
			backoffMultiplier: config?.backoffMultiplier ?? 2,
		};
	}

	/**
	 * Clean up old request records (older than 1 minute)
	 */
	private cleanupHistory(): void {
		const oneMinuteAgo = new Date(Date.now() - 60 * 1000);
		this.requestHistory = this.requestHistory.filter(
			(record) => record.timestamp > oneMinuteAgo,
		);
	}

	/**
	 * Get current request count in the last minute
	 */
	private getRequestCount(): number {
		this.cleanupHistory();
		return this.requestHistory.length;
	}

	/**
	 * Get current token count in the last minute
	 */
	private getTokenCount(): number {
		this.cleanupHistory();
		return this.requestHistory.reduce((sum, record) => sum + record.tokens, 0);
	}

	/**
	 * Record a request
	 */
	private recordRequest(tokens: number): void {
		this.requestHistory.push({
			timestamp: new Date(),
			tokens,
		});
	}

	/**
	 * Check if we can make a request
	 */
	canMakeRequest(estimatedTokens = 0): boolean {
		const requestCount = this.getRequestCount();
		const tokenCount = this.getTokenCount();

		const requestsOk =
			requestCount < this.config.requestsPerMinute ||
			this.config.requestsPerMinute === Number.POSITIVE_INFINITY;
		const tokensOk =
			tokenCount + estimatedTokens < this.config.tokensPerMinute ||
			this.config.tokensPerMinute === Number.POSITIVE_INFINITY;

		return requestsOk && tokensOk;
	}

	/**
	 * Wait for capacity to become available
	 */
	async waitForCapacity(estimatedTokens = 0): Promise<void> {
		while (!this.canMakeRequest(estimatedTokens)) {
			// Wait a short time and check again
			await this.sleep(100);
			this.cleanupHistory();
		}
	}

	/**
	 * Sleep for specified milliseconds
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Calculate backoff time for retry attempt
	 */
	private calculateBackoff(attempt: number): number {
		const backoff = Math.min(
			this.config.initialBackoffMs * this.config.backoffMultiplier ** attempt,
			this.config.maxBackoffMs,
		);

		// Add jitter (±25%)
		const jitter = backoff * 0.25 * (Math.random() * 2 - 1);

		return Math.floor(backoff + jitter);
	}

	/**
	 * Check if error is a rate limit error
	 */
	private isRateLimitError(error: unknown): boolean {
		if (error instanceof RateLimitError) {
			return true;
		}

		if (error instanceof Error) {
			const message = error.message.toLowerCase();
			return (
				message.includes("rate limit") ||
				message.includes("429") ||
				message.includes("too many requests")
			);
		}

		// Check for status code in error object
		if (typeof error === "object" && error !== null && "status" in error) {
			const errorObj = error as { status?: number };
			return errorObj.status === 429;
		}

		return false;
	}

	/**
	 * Extract retry-after from error (if available)
	 */
	private extractRetryAfter(error: unknown): number | undefined {
		if (error instanceof RateLimitError && error.retryAfter) {
			return error.retryAfter;
		}

		// Try to extract from error message or headers
		// This is provider-specific and might need enhancement
		return undefined;
	}

	/**
	 * Execute function with retry logic
	 */
	async executeWithRetry<T>(
		fn: () => Promise<T>,
		options?: {
			estimatedTokens?: number;
			onRetry?: (attempt: number, error: unknown) => void;
		},
	): Promise<T> {
		const estimatedTokens = options?.estimatedTokens ?? 0;

		// Wait for capacity before first attempt
		await this.waitForCapacity(estimatedTokens);

		let lastError: unknown;

		for (let attempt = 0; attempt <= this.config.maxRetries; attempt++) {
			try {
				// Record request before making it
				this.recordRequest(estimatedTokens);

				// Execute the function
				const result = await fn();

				return result;
			} catch (error) {
				lastError = error;

				// Check if it's a rate limit error
				if (this.isRateLimitError(error)) {
					if (attempt < this.config.maxRetries) {
						// Calculate backoff
						const retryAfter =
							this.extractRetryAfter(error) ?? this.calculateBackoff(attempt);

						// Notify about retry
						if (options?.onRetry) {
							options.onRetry(attempt + 1, error);
						}

						// Wait before retry
						await this.sleep(retryAfter);

						// Wait for capacity again
						await this.waitForCapacity(estimatedTokens);

						// Continue to next attempt
						continue;
					}
				}

				// If not a rate limit error, or max retries reached, throw
				throw error;
			}
		}

		// Should never reach here, but TypeScript needs it
		throw lastError;
	}

	/**
	 * Wrap LLM provider with rate limiting
	 */
	wrap(provider: LLMProvider): LLMProvider {
		const rateLimiter = this;

		// Create a proxy that wraps the generate method
		return new Proxy(provider, {
			get(target, prop, receiver) {
				if (prop === "generate") {
					return async (
						messages: LLMMessage[],
						options?: LLMGenerationOptions,
					): Promise<LLMGenerationResult> => {
						// Estimate tokens for rate limiting
						const estimatedTokens = rateLimiter.estimateTokens(
							messages,
							options,
						);

						// Execute with retry logic
						return rateLimiter.executeWithRetry(
							() => target.generate(messages, options),
							{
								estimatedTokens,
								onRetry: (attempt, error) => {
									console.warn(
										`Rate limit hit, retrying (attempt ${attempt}/${rateLimiter.config.maxRetries})...`,
									);
									if (error instanceof Error) {
										console.warn(`  Error: ${error.message}`);
									}
								},
							},
						);
					};
				}

				return Reflect.get(target, prop, receiver);
			},
		});
	}

	/**
	 * Estimate tokens from messages (simple heuristic)
	 */
	private estimateTokens(
		messages: LLMMessage[],
		options?: LLMGenerationOptions,
	): number {
		// Estimate input tokens
		let inputTokens = 0;
		for (const msg of messages) {
			inputTokens += Math.ceil(msg.content.length / 4);
		}

		// Estimate output tokens
		const outputTokens = options?.maxTokens ?? 2000;

		return inputTokens + outputTokens;
	}

	/**
	 * Reset rate limiter state
	 */
	reset(): void {
		this.requestHistory = [];
	}

	/**
	 * Get current rate limit status
	 */
	getStatus(): {
		requestCount: number;
		tokenCount: number;
		requestLimit: number;
		tokenLimit: number;
		canMakeRequest: boolean;
	} {
		const requestCount = this.getRequestCount();
		const tokenCount = this.getTokenCount();

		return {
			requestCount,
			tokenCount,
			requestLimit: this.config.requestsPerMinute,
			tokenLimit: this.config.tokensPerMinute,
			canMakeRequest: this.canMakeRequest(),
		};
	}

	/**
	 * Get configuration
	 */
	getConfig(): Readonly<Required<RateLimitConfig>> {
		return { ...this.config };
	}

	/**
	 * Update configuration
	 */
	updateConfig(config: Partial<RateLimitConfig>): void {
		if (config.requestsPerMinute !== undefined) {
			this.config.requestsPerMinute = config.requestsPerMinute;
		}
		if (config.tokensPerMinute !== undefined) {
			this.config.tokensPerMinute = config.tokensPerMinute;
		}
		if (config.maxRetries !== undefined) {
			this.config.maxRetries = config.maxRetries;
		}
		if (config.initialBackoffMs !== undefined) {
			this.config.initialBackoffMs = config.initialBackoffMs;
		}
		if (config.maxBackoffMs !== undefined) {
			this.config.maxBackoffMs = config.maxBackoffMs;
		}
		if (config.backoffMultiplier !== undefined) {
			this.config.backoffMultiplier = config.backoffMultiplier;
		}
	}

	/**
	 * Create rate limiter for specific provider
	 */
	static forProvider(
		provider: "openai" | "anthropic" | "ollama" | "custom",
		customConfig?: RateLimitConfig,
	): RateLimiter {
		// Provider-specific rate limits
		// Based on public API documentation as of Jan 2025
		const providerConfigs: Record<string, RateLimitConfig> = {
			openai: {
				requestsPerMinute: 500,
				tokensPerMinute: 150_000,
				maxRetries: 3,
				initialBackoffMs: 1000,
				maxBackoffMs: 60000,
				backoffMultiplier: 2,
			},
			anthropic: {
				requestsPerMinute: 50,
				tokensPerMinute: 100_000,
				maxRetries: 3,
				initialBackoffMs: 1000,
				maxBackoffMs: 60000,
				backoffMultiplier: 2,
			},
			ollama: {
				// Local server - no rate limits typically
				requestsPerMinute: Number.POSITIVE_INFINITY,
				tokensPerMinute: Number.POSITIVE_INFINITY,
				maxRetries: 1,
				initialBackoffMs: 500,
				maxBackoffMs: 5000,
				backoffMultiplier: 2,
			},
			custom: {
				requestsPerMinute: 100,
				tokensPerMinute: 50_000,
				maxRetries: 3,
				initialBackoffMs: 1000,
				maxBackoffMs: 60000,
				backoffMultiplier: 2,
			},
		};

		const config = providerConfigs[provider] ?? providerConfigs.custom;

		// Merge with custom config if provided
		const finalConfig = customConfig ? { ...config, ...customConfig } : config;

		return new RateLimiter(finalConfig);
	}
}
