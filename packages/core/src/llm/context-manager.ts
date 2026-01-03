/**
 * Context Manager for LLM Calls
 * Manages context window limits with priority-based truncation and summarization
 */

import type { LLMMessage } from "@/llm/base";

/**
 * Context priority levels
 */
export enum ContextPriority {
	Essential = 0, // Never truncate (system prompts, task description)
	High = 1, // Truncate only if necessary (current file, recent errors)
	Medium = 2, // Can truncate (related files, architecture)
	Low = 3, // First to truncate/summarize (history, guidelines)
}

/**
 * Context item with priority
 */
export interface ContextItem {
	id: string;
	content: string;
	priority: ContextPriority;
	tokens?: number; // Pre-calculated token count (optional)
	summarizable?: boolean; // Can this be summarized instead of truncated?
}

/**
 * Context window configuration
 */
export interface ContextWindowConfig {
	maxTokens: number; // Total context window size
	reservedForResponse?: number; // Tokens reserved for response
	systemMessageTokens?: number; // Tokens for system message
}

/**
 * Token estimation options
 */
export interface TokenEstimationOptions {
	model?: string; // Model name for more accurate estimation
	conservative?: boolean; // Use conservative (higher) estimates
}

/**
 * Context Manager class
 * Handles context window management with priority-based selection
 */
export class ContextManager {
	private config: ContextWindowConfig;
	private tokenCache: Map<string, number> = new Map();

	constructor(config: ContextWindowConfig) {
		this.config = config;
	}

	/**
	 * Estimate token count for text
	 * Uses a simple heuristic: ~4 characters per token
	 * This is conservative and works across most models
	 *
	 * Enhanced with caching for better performance
	 */
	estimateTokens(text: string, options?: TokenEstimationOptions): number {
		if (!text) {
			return 0;
		}

		// Check cache first (using content hash for cache key)
		const cacheKey = this.getCacheKey(text);
		const cached = this.tokenCache.get(cacheKey);

		if (cached !== undefined) {
			return cached;
		}

		// Calculate tokens
		const charsPerToken = options?.conservative ? 3.0 : 3.5;
		const tokens = Math.ceil(text.length / charsPerToken);

		// Cache the result (limit cache size to prevent memory issues)
		if (this.tokenCache.size < 1000) {
			this.tokenCache.set(cacheKey, tokens);
		} else {
			// Clear cache when it gets too large
			this.tokenCache.clear();
			this.tokenCache.set(cacheKey, tokens);
		}

		return tokens;
	}

	/**
	 * Generate cache key from text (simple hash)
	 */
	private getCacheKey(text: string): string {
		// Use first 100 + last 100 chars + length for a reasonable cache key
		// This is faster than hashing the entire content
		const start = text.slice(0, 100);
		const end = text.length > 100 ? text.slice(-100) : "";
		return `${start}:${end}:${text.length}`;
	}

	/**
	 * Clear the token cache
	 */
	clearTokenCache(): void {
		this.tokenCache.clear();
	}

	/**
	 * Estimate tokens for an array of messages
	 */
	estimateMessagesTokens(messages: LLMMessage[]): number {
		let total = 0;

		for (const msg of messages) {
			// Add role tokens (small overhead)
			total += 4;
			// Add content tokens
			total += this.estimateTokens(msg.content);
		}

		// Add message formatting overhead
		total += messages.length * 3;

		return total;
	}

	/**
	 * Build context from items within token limit
	 * Returns items that fit, prioritizing by ContextPriority
	 */
	buildContext(
		items: ContextItem[],
		additionalMessages?: LLMMessage[],
	): {
		selectedItems: ContextItem[];
		totalTokens: number;
		truncated: boolean;
		summary: string;
	} {
		// Calculate available tokens
		const responseTokens = this.config.reservedForResponse ?? 2000;
		const systemTokens = this.config.systemMessageTokens ?? 500;
		const additionalTokens = additionalMessages
			? this.estimateMessagesTokens(additionalMessages)
			: 0;

		const availableTokens =
			this.config.maxTokens - responseTokens - systemTokens - additionalTokens;

		// Pre-calculate tokens for all items
		const itemsWithTokens = items.map((item) => ({
			...item,
			tokens: item.tokens ?? this.estimateTokens(item.content),
		}));

		// Sort by priority (Essential first, Low last)
		const sortedItems = [...itemsWithTokens].sort(
			(a, b) => a.priority - b.priority,
		);

		// Select items within budget
		const selectedItems: ContextItem[] = [];
		let totalTokens = 0;
		let truncated = false;

		for (const item of sortedItems) {
			const itemTokens = item.tokens ?? 0;

			if (totalTokens + itemTokens <= availableTokens) {
				// Item fits completely
				selectedItems.push(item);
				totalTokens += itemTokens;
			} else if (item.priority === ContextPriority.Essential) {
				// Essential items must be included, even if over budget
				selectedItems.push(item);
				totalTokens += itemTokens;
			} else if (item.summarizable && availableTokens - totalTokens > 100) {
				// Try to summarize instead of dropping
				const summarized = this.summarizeContent(
					item.content,
					availableTokens - totalTokens,
				);
				selectedItems.push({
					...item,
					content: summarized,
					tokens: this.estimateTokens(summarized),
				});
				totalTokens += this.estimateTokens(summarized);
				truncated = true;
			} else {
				// Skip this item
				truncated = true;
			}
		}

		// Generate summary
		const summary = this.generateContextSummary(
			selectedItems,
			sortedItems,
			totalTokens,
			availableTokens,
		);

		return {
			selectedItems,
			totalTokens,
			truncated,
			summary,
		};
	}

	/**
	 * Build messages array from context items
	 */
	buildMessages(
		systemPrompt: string,
		contextItems: ContextItem[],
		userPrompt: string,
	): LLMMessage[] {
		const messages: LLMMessage[] = [];

		// System message
		messages.push({
			role: "system",
			content: systemPrompt,
		});

		// Add context items as user messages
		for (const item of contextItems) {
			messages.push({
				role: "user",
				content: item.content,
			});
		}

		// Final user prompt
		messages.push({
			role: "user",
			content: userPrompt,
		});

		return messages;
	}

	/**
	 * Summarize content to fit within token limit
	 * Simple truncation with ellipsis
	 */
	private summarizeContent(content: string, maxTokens: number): string {
		if (maxTokens <= 0) {
			return "";
		}

		// Convert tokens to approximate character count
		const maxChars = Math.floor(maxTokens * 3.5);

		if (content.length <= maxChars) {
			return content;
		}

		// Truncate at word boundary
		const truncated = content.substring(0, maxChars);
		const lastSpace = truncated.lastIndexOf(" ");

		if (lastSpace > 0) {
			return `${truncated.substring(0, lastSpace)}...`;
		}

		return `${truncated}...`;
	}

	/**
	 * Generate summary of context selection
	 */
	private generateContextSummary(
		selectedItems: ContextItem[],
		allItems: ContextItem[],
		totalTokens: number,
		availableTokens: number,
	): string {
		const essential = selectedItems.filter(
			(i) => i.priority === ContextPriority.Essential,
		).length;
		const high = selectedItems.filter(
			(i) => i.priority === ContextPriority.High,
		).length;
		const medium = selectedItems.filter(
			(i) => i.priority === ContextPriority.Medium,
		).length;
		const low = selectedItems.filter(
			(i) => i.priority === ContextPriority.Low,
		).length;

		const dropped = allItems.length - selectedItems.length;

		const parts: string[] = [];
		parts.push(`Context: ${totalTokens}/${availableTokens} tokens`);
		parts.push(
			`Items: ${essential} essential, ${high} high, ${medium} medium, ${low} low`,
		);

		if (dropped > 0) {
			parts.push(`Dropped: ${dropped} items`);
		}

		return parts.join(" | ");
	}

	/**
	 * Check if content fits within available context
	 */
	fitsInContext(content: string, overhead = 0): boolean {
		const tokens = this.estimateTokens(content);
		const responseTokens = this.config.reservedForResponse ?? 2000;
		const systemTokens = this.config.systemMessageTokens ?? 500;

		const availableTokens =
			this.config.maxTokens - responseTokens - systemTokens - overhead;

		return tokens <= availableTokens;
	}

	/**
	 * Get available tokens for context
	 */
	getAvailableTokens(): number {
		const responseTokens = this.config.reservedForResponse ?? 2000;
		const systemTokens = this.config.systemMessageTokens ?? 500;

		return this.config.maxTokens - responseTokens - systemTokens;
	}

	/**
	 * Create context item
	 */
	static createItem(
		id: string,
		content: string,
		priority: ContextPriority,
		options?: {
			summarizable?: boolean;
			tokens?: number;
		},
	): ContextItem {
		const item: ContextItem = {
			id,
			content,
			priority,
		};

		if (options?.summarizable !== undefined) {
			item.summarizable = options.summarizable;
		}

		if (options?.tokens !== undefined) {
			item.tokens = options.tokens;
		}

		return item;
	}

	/**
	 * Truncate text to fit within token limit
	 */
	truncateToTokens(text: string, maxTokens: number): string {
		const currentTokens = this.estimateTokens(text);

		if (currentTokens <= maxTokens) {
			return text;
		}

		// Calculate target character count
		const targetChars = Math.floor(maxTokens * 3.5);

		// Truncate at word boundary
		const truncated = text.substring(0, targetChars);
		const lastSpace = truncated.lastIndexOf(" ");

		if (lastSpace > 0) {
			return `${truncated.substring(0, lastSpace)}...`;
		}

		return `${truncated}...`;
	}

	/**
	 * Split large content into chunks that fit within token limit
	 */
	chunkContent(
		content: string,
		maxTokensPerChunk: number,
		overlap = 100,
	): string[] {
		const totalTokens = this.estimateTokens(content);

		if (totalTokens <= maxTokensPerChunk) {
			return [content];
		}

		const chunks: string[] = [];
		const charsPerChunk = Math.floor(maxTokensPerChunk * 3.5);
		const overlapChars = Math.floor(overlap * 3.5);

		let position = 0;

		while (position < content.length) {
			const chunkEnd = Math.min(position + charsPerChunk, content.length);
			let chunk = content.substring(position, chunkEnd);

			// Try to break at word boundary
			if (chunkEnd < content.length) {
				const lastSpace = chunk.lastIndexOf(" ");
				if (lastSpace > 0) {
					chunk = chunk.substring(0, lastSpace);
				}
			}

			chunks.push(chunk);

			// Move position with overlap
			position = chunkEnd - overlapChars;

			// Ensure we make progress
			if (position <= chunks.length * 10) {
				position = chunkEnd;
			}
		}

		return chunks;
	}

	/**
	 * Create a context manager for specific model
	 */
	static forModel(model: string): ContextManager {
		// Model-specific context window sizes
		const modelConfigs: Record<string, ContextWindowConfig> = {
			"gpt-4o": {
				maxTokens: 128_000,
				reservedForResponse: 4096,
				systemMessageTokens: 1000,
			},
			"gpt-4o-mini": {
				maxTokens: 128_000,
				reservedForResponse: 4096,
				systemMessageTokens: 1000,
			},
			"claude-3-5-sonnet-20241022": {
				maxTokens: 200_000,
				reservedForResponse: 4096,
				systemMessageTokens: 1000,
			},
			"claude-3-5-haiku-20241022": {
				maxTokens: 200_000,
				reservedForResponse: 4096,
				systemMessageTokens: 1000,
			},
			"claude-3-opus-20240229": {
				maxTokens: 200_000,
				reservedForResponse: 4096,
				systemMessageTokens: 1000,
			},
			"glm-4.7": {
				maxTokens: 128_000,
				reservedForResponse: 4096,
				systemMessageTokens: 1000,
			},
			"glm-4.1": {
				maxTokens: 128_000,
				reservedForResponse: 4096,
				systemMessageTokens: 1000,
			},
		};

		// Get config for model or use default
		const config = modelConfigs[model] ?? {
			maxTokens: 128_000,
			reservedForResponse: 4096,
			systemMessageTokens: 1000,
		};

		return new ContextManager(config);
	}
}
