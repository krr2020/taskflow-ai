/**
 * LLM Response Cache
 * Caches LLM responses to reduce API calls and costs
 */

import { createHash } from "node:crypto";
import type {
	LLMGenerationOptions,
	LLMGenerationResult,
	LLMMessage,
} from "./base.js";

/**
 * Cache entry with metadata
 */
export interface CacheEntry {
	key: string;
	result: LLMGenerationResult;
	createdAt: Date;
	expiresAt: Date;
	hits: number;
}

/**
 * Cache statistics
 */
export interface CacheStats {
	hits: number;
	misses: number;
	hitRate: number;
	entries: number;
	totalSize: number;
	costSaved: number; // Estimated cost savings from cache hits
	tokensSaved: number; // Tokens saved from cache hits
}

/**
 * Cache configuration
 */
export interface CacheConfig {
	ttl?: number; // Time to live in milliseconds (default: 1 hour)
	maxEntries?: number; // Maximum cache entries (default: 1000)
	enabled?: boolean; // Enable/disable caching (default: true)
}

/**
 * LLM Response Cache
 * In-memory cache for LLM responses with TTL-based expiration
 */
export class LLMCache {
	private cache: Map<string, CacheEntry> = new Map();
	private hits = 0;
	private misses = 0;
	private config: Required<CacheConfig>;

	constructor(config?: CacheConfig) {
		this.config = {
			ttl: config?.ttl ?? 60 * 60 * 1000, // 1 hour default
			maxEntries: config?.maxEntries ?? 1000,
			enabled: config?.enabled ?? true,
		};
	}

	/**
	 * Generate cache key from messages and options
	 */
	private generateKey(
		messages: LLMMessage[],
		options?: LLMGenerationOptions,
	): string {
		// Create a stable string representation
		const content = JSON.stringify({
			messages: messages.map((m) => ({
				role: m.role,
				content: m.content,
			})),
			options: options
				? {
						maxTokens: options.maxTokens,
						temperature: options.temperature,
						topP: options.topP,
						topK: options.topK,
					}
				: undefined,
		});

		// Hash the content
		return createHash("sha256").update(content).digest("hex");
	}

	/**
	 * Get cached result if available and not expired
	 */
	get(
		messages: LLMMessage[],
		options?: LLMGenerationOptions,
	): LLMGenerationResult | null {
		if (!this.config.enabled) {
			return null;
		}

		const key = this.generateKey(messages, options);
		const entry = this.cache.get(key);

		if (!entry) {
			this.misses++;
			return null;
		}

		// Check if expired
		if (new Date() > entry.expiresAt) {
			this.cache.delete(key);
			this.misses++;
			return null;
		}

		// Cache hit
		entry.hits++;
		this.hits++;

		return entry.result;
	}

	/**
	 * Set cache entry
	 */
	set(
		messages: LLMMessage[],
		options: LLMGenerationOptions | undefined,
		result: LLMGenerationResult,
	): void {
		if (!this.config.enabled) {
			return;
		}

		const key = this.generateKey(messages, options);
		const now = new Date();
		const expiresAt = new Date(now.getTime() + this.config.ttl);

		const entry: CacheEntry = {
			key,
			result,
			createdAt: now,
			expiresAt,
			hits: 0,
		};

		// Check cache size limit
		if (this.cache.size >= this.config.maxEntries && !this.cache.has(key)) {
			// Evict oldest entry
			this.evictOldest();
		}

		this.cache.set(key, entry);
	}

	/**
	 * Evict the oldest cache entry
	 */
	private evictOldest(): void {
		let oldestKey: string | null = null;
		let oldestTime = Number.POSITIVE_INFINITY;

		for (const [key, entry] of this.cache.entries()) {
			const time = entry.createdAt.getTime();
			if (time < oldestTime) {
				oldestTime = time;
				oldestKey = key;
			}
		}

		if (oldestKey) {
			this.cache.delete(oldestKey);
		}
	}

	/**
	 * Clear all cache entries
	 */
	clear(): void {
		this.cache.clear();
		this.hits = 0;
		this.misses = 0;
	}

	/**
	 * Clear expired entries
	 */
	clearExpired(): void {
		const now = new Date();
		const expiredKeys: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (now > entry.expiresAt) {
				expiredKeys.push(key);
			}
		}

		for (const key of expiredKeys) {
			this.cache.delete(key);
		}
	}

	/**
	 * Get cache statistics
	 */
	getStats(): CacheStats {
		const totalRequests = this.hits + this.misses;
		const hitRate = totalRequests > 0 ? (this.hits / totalRequests) * 100 : 0;

		// Calculate total cache size (approximate)
		let totalSize = 0;
		let tokensSaved = 0;

		for (const entry of this.cache.values()) {
			const entrySize = JSON.stringify(entry).length;
			totalSize += entrySize;

			// Tokens saved from cache hits
			if (entry.hits > 0) {
				const tokensPerHit = entry.result.tokensUsed ?? 0;
				tokensSaved += tokensPerHit * entry.hits;
			}
		}

		// Estimate cost savings (using conservative $0.001 per 1K tokens)
		const costSaved = (tokensSaved / 1000) * 0.001;

		return {
			hits: this.hits,
			misses: this.misses,
			hitRate,
			entries: this.cache.size,
			totalSize,
			costSaved,
			tokensSaved,
		};
	}

	/**
	 * Get formatted statistics report
	 */
	getStatsReport(): string {
		const stats = this.getStats();
		const lines: string[] = [];

		lines.push("=== LLM Cache Statistics ===");
		lines.push(`Enabled: ${this.config.enabled ? "Yes" : "No"}`);
		lines.push(`Entries: ${stats.entries}/${this.config.maxEntries}`);
		lines.push(
			`Hit Rate: ${stats.hitRate.toFixed(1)}% (${stats.hits} hits, ${stats.misses} misses)`,
		);
		lines.push(`Cache Size: ${(stats.totalSize / 1024).toFixed(2)} KB`);
		lines.push(`Tokens Saved: ${stats.tokensSaved.toLocaleString()}`);
		lines.push(`Cost Saved: $${stats.costSaved.toFixed(4)}`);

		return lines.join("\n");
	}

	/**
	 * Enable cache
	 */
	enable(): void {
		this.config.enabled = true;
	}

	/**
	 * Disable cache
	 */
	disable(): void {
		this.config.enabled = false;
	}

	/**
	 * Check if cache is enabled
	 */
	isEnabled(): boolean {
		return this.config.enabled;
	}

	/**
	 * Get cache configuration
	 */
	getConfig(): Readonly<Required<CacheConfig>> {
		return { ...this.config };
	}

	/**
	 * Update cache configuration
	 */
	updateConfig(config: Partial<CacheConfig>): void {
		if (config.ttl !== undefined) {
			this.config.ttl = config.ttl;
		}
		if (config.maxEntries !== undefined) {
			this.config.maxEntries = config.maxEntries;
		}
		if (config.enabled !== undefined) {
			this.config.enabled = config.enabled;
		}
	}

	/**
	 * Invalidate cache entries matching a predicate
	 */
	invalidate(predicate: (entry: CacheEntry) => boolean): number {
		const keysToDelete: string[] = [];

		for (const [key, entry] of this.cache.entries()) {
			if (predicate(entry)) {
				keysToDelete.push(key);
			}
		}

		for (const key of keysToDelete) {
			this.cache.delete(key);
		}

		return keysToDelete.length;
	}

	/**
	 * Invalidate cache entries older than specified time
	 */
	invalidateOlderThan(milliseconds: number): number {
		const cutoffTime = new Date(Date.now() - milliseconds);
		return this.invalidate((entry) => entry.createdAt < cutoffTime);
	}

	/**
	 * Get all cache entries (for debugging)
	 */
	getAllEntries(): CacheEntry[] {
		return Array.from(this.cache.values());
	}

	/**
	 * Get cache entry by messages and options
	 */
	getEntry(
		messages: LLMMessage[],
		options?: LLMGenerationOptions,
	): CacheEntry | null {
		const key = this.generateKey(messages, options);
		const entry = this.cache.get(key);
		return entry ?? null;
	}

	/**
	 * Check if cache has entry for messages and options
	 */
	has(messages: LLMMessage[], options?: LLMGenerationOptions): boolean {
		const key = this.generateKey(messages, options);
		const entry = this.cache.get(key);

		if (!entry) {
			return false;
		}

		// Check if expired
		if (new Date() > entry.expiresAt) {
			this.cache.delete(key);
			return false;
		}

		return true;
	}

	/**
	 * Export cache data for persistence
	 */
	export(): { entries: CacheEntry[]; stats: { hits: number; misses: number } } {
		return {
			entries: Array.from(this.cache.values()),
			stats: {
				hits: this.hits,
				misses: this.misses,
			},
		};
	}

	/**
	 * Import cache data from persistence
	 */
	import(data: {
		entries: CacheEntry[];
		stats: { hits: number; misses: number };
	}): void {
		this.cache.clear();
		const now = new Date();

		for (const entry of data.entries) {
			// Skip expired entries
			const expiresAt = new Date(entry.expiresAt);
			if (now <= expiresAt) {
				this.cache.set(entry.key, {
					...entry,
					createdAt: new Date(entry.createdAt),
					expiresAt,
				});
			}
		}

		this.hits = data.stats.hits;
		this.misses = data.stats.misses;
	}
}
