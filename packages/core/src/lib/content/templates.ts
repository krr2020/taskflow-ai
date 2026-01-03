/**
 * Template Loader
 *
 * Handles loading templates from files, URLs, or inline content.
 * Implements caching to avoid repeated network requests.
 */

import * as fs from "node:fs";
import type { TemplateSource } from "@/lib/content/types";

interface CachedTemplate {
	content: string;
	timestamp: number;
	hits: number;
}

const cache: Map<string, CachedTemplate> = new Map();
const CACHE_TTL = 1000 * 60 * 60; // 1 hour
const CACHE_MAX_SIZE = 50; // Maximum number of cached templates

export const TemplateCacheStats = {
	hits: 0,
	misses: 0,
	evictions: 0,

	getStats() {
		return {
			hits: this.hits,
			misses: this.misses,
			evictions: this.evictions,
			cacheSize: cache.size,
			hitRate:
				this.hits + this.misses > 0
					? (this.hits / (this.hits + this.misses)) * 100
					: 0,
		};
	},

	reset() {
		this.hits = 0;
		this.misses = 0;
		this.evictions = 0;
	},
};

export const TemplateLoader = {
	/**
	 * Load template from file, URL, or inline content
	 *
	 * @example
	 * const template = await TemplateLoader.load({
	 *   type: 'url',
	 *   source: 'https://example.com/template.md'
	 * });
	 */
	async load(source: string | TemplateSource): Promise<string> {
		// Handle simple string source (assume URL or file path)
		if (typeof source === "string") {
			if (source.startsWith("http://") || source.startsWith("https://")) {
				return loadFromURL(source);
			} else {
				return loadFromFile(source);
			}
		}

		// Handle TemplateSource object
		switch (source.type) {
			case "file":
				return loadFromFile(source.source);
			case "url":
				return loadFromURL(source.source);
			case "inline":
				return source.source;
			default:
				throw new Error(
					// biome-ignore lint/suspicious/noExplicitAny: Exhaustive check fallback
					`Unknown template source type: ${(source as any).type}`,
				);
		}
	},

	/**
	 * Merge template with data
	 *
	 * @example
	 * const result = TemplateLoader.merge(template, {
	 *   featureName: 'User Authentication',
	 *   author: 'John Doe'
	 * });
	 */
	merge(template: string, data: Record<string, unknown>): string {
		let result = template;

		// Replace {{variable}} placeholders
		for (const [key, value] of Object.entries(data)) {
			const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
			result = result.replace(pattern, String(value));
		}

		// Replace {{#if variable}}...{{/if}} blocks
		result = processConditionals(result, data);

		// Replace {{#each items}}...{{/each}} blocks
		result = processLoops(result, data);

		return result;
	},

	/**
	 * Clear the template cache
	 */
	clearCache(): void {
		cache.clear();
		TemplateCacheStats.reset();
	},

	/**
	 * Preload templates for faster access
	 */
	async preload(sources: Array<string | TemplateSource>): Promise<void> {
		const startTime = Date.now();
		const results = await Promise.allSettled(
			sources.map((source) => TemplateLoader.load(source)),
		);

		const successful = results.filter((r) => r.status === "fulfilled").length;
		const failed = results.filter((r) => r.status === "rejected");

		if (failed.length > 0) {
			console.warn(
				`Template preload: ${successful}/${sources.length} successful, ${failed.length} failed`,
			);
		}

		const duration = Date.now() - startTime;
		console.log(
			`Templates preloaded in ${duration}ms (${successful} templates)`,
		);
	},

	/**
	 * Get cache statistics
	 */
	getCacheStats() {
		return TemplateCacheStats.getStats();
	},

	/**
	 * Configure cache settings
	 */
	configureCacheTTL(ttlMs: number): void {
		// Note: This would require refactoring CACHE_TTL to be mutable
		// For now, this is a placeholder for future enhancement
		console.warn(
			`Cache TTL configuration is not yet implemented (requested: ${ttlMs}ms)`,
		);
	},
};

/**
 * Load template from file system
 */
async function loadFromFile(filepath: string): Promise<string> {
	// Check cache first
	const cached = getFromCache(filepath);
	if (cached) {
		return cached;
	}

	// Read from file
	if (!fs.existsSync(filepath)) {
		throw new Error(`Template file not found: ${filepath}`);
	}

	const content = fs.readFileSync(filepath, "utf-8");

	// Cache the result
	saveToCache(filepath, content);

	return content;
}

/**
 * Load template from URL
 */
async function loadFromURL(url: string): Promise<string> {
	// Check cache first
	const cached = getFromCache(url);
	if (cached) {
		return cached;
	}

	try {
		// Use native fetch (Node 18+) or fallback
		const response = await fetch(url);

		if (!response.ok) {
			throw new Error(`HTTP ${response.status}: ${response.statusText}`);
		}

		const content = await response.text();

		// Cache the result
		saveToCache(url, content);

		return content;
	} catch (error) {
		throw new Error(
			`Failed to load template from ${url}: ${
				error instanceof Error ? error.message : String(error)
			}`,
		);
	}
}

/**
 * Process conditional blocks
 */
function processConditionals(
	template: string,
	data: Record<string, unknown>,
): string {
	const ifPattern = /\{\{#if\s+(\w+)\}\}([\s\S]*?)\{\{\/if\}\}/g;

	return template.replace(ifPattern, (_match, varName, content) => {
		const value = data[varName];
		return value ? content : "";
	});
}

/**
 * Process loop blocks
 */
function processLoops(template: string, data: Record<string, unknown>): string {
	const eachPattern = /\{\{#each\s+(\w+)\}\}([\s\S]*?)\{\{\/each\}\}/g;

	return template.replace(eachPattern, (_match, varName, itemTemplate) => {
		const array = data[varName];

		if (!Array.isArray(array)) {
			return "";
		}

		return array
			.map((item, index) => {
				let itemContent = itemTemplate;

				// Replace {{this}} with item value
				if (typeof item !== "object") {
					itemContent = itemContent.replace(/\{\{this\}\}/g, String(item));
				} else {
					// Replace {{property}} with item.property
					for (const [key, value] of Object.entries(item)) {
						const pattern = new RegExp(`\\{\\{${key}\\}\\}`, "g");
						itemContent = itemContent.replace(pattern, String(value));
					}
				}

				// Replace {{@index}} with array index
				itemContent = itemContent.replace(/\{\{@index\}\}/g, String(index));

				return itemContent;
			})
			.join("");
	});
}

/**
 * Get template from cache if not expired
 */
function getFromCache(key: string): string | null {
	const cached = cache.get(key);

	if (!cached) {
		TemplateCacheStats.misses++;
		return null;
	}

	const age = Date.now() - cached.timestamp;
	if (age > CACHE_TTL) {
		cache.delete(key);
		TemplateCacheStats.misses++;
		TemplateCacheStats.evictions++;
		return null;
	}

	// Update hit count and stats
	cached.hits++;
	TemplateCacheStats.hits++;

	return cached.content;
}

/**
 * Save template to cache
 */
function saveToCache(key: string, content: string): void {
	// Check cache size and evict LRU if necessary
	if (cache.size >= CACHE_MAX_SIZE) {
		evictLRU();
	}

	cache.set(key, {
		content,
		timestamp: Date.now(),
		hits: 0,
	});
}

/**
 * Evict least recently used (LRU) template from cache
 */
function evictLRU(): void {
	let oldestKey: string | null = null;
	let oldestTime = Number.POSITIVE_INFINITY;

	for (const [key, entry] of cache.entries()) {
		// Use a combination of timestamp and hits for better eviction
		// Favor keeping frequently accessed templates
		const score = entry.timestamp + entry.hits * 10000;

		if (score < oldestTime) {
			oldestTime = score;
			oldestKey = key;
		}
	}

	if (oldestKey) {
		cache.delete(oldestKey);
		TemplateCacheStats.evictions++;
	}
}
