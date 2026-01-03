/**
 * Content Manager
 *
 * Centralized content management system for mode-aware content delivery.
 * Handles messages, prompts, and templates with automatic mode filtering.
 */

import { MESSAGES } from "./messages.js";
import type {
	ContentBlock,
	ContentOptions,
	ModeAwareContent,
} from "./types.js";

export { MESSAGES } from "./messages.js";
export * from "./prompt-builder.js";
export { LLM_PROMPTS, TEMPLATE_SOURCES } from "./prompts.js";
export * from "./templates.js";
export * from "./types.js";

/**
 * Content Manager for mode-aware content delivery
 */
export const ContentManager = {
	/**
	 * Get simple content with mode-aware filtering
	 *
	 * @example
	 * const text = ContentManager.get('INIT.NEXT_STEPS', { mode: 'manual' });
	 */
	get(key: string, options: ContentOptions): string {
		const content = getContentAtPath(MESSAGES, key);

		if (!content) {
			throw new Error(`Content not found: ${key}`);
		}

		// If content is mode-aware, select appropriate variant
		if (isModeAware(content)) {
			return content[options.mode];
		}

		// If content is an array, join with newlines
		if (Array.isArray(content)) {
			return content.join("\n");
		}

		return String(content);
	},

	/**
	 * Get structured content block with mode-aware filtering
	 *
	 * @example
	 * const block = ContentManager.getStructured('PRD_CREATE.STEP_SUMMARY', { mode: 'manual' });
	 */
	getStructured(key: string, options: ContentOptions): ContentBlock {
		const content = getContentAtPath(MESSAGES, key);

		if (!content) {
			throw new Error(`Content not found: ${key}`);
		}

		// If it's already a ContentBlock, filter AI guidance
		if (isContentBlock(content)) {
			const block = { ...content };

			// Remove AI guidance in manual mode
			if (options.mode === "manual" && block.aiGuidance) {
				delete block.aiGuidance;
			}

			return block;
		}

		// Convert simple content to ContentBlock
		return {
			instructions: ContentManager.get(key, options),
		};
	},

	/**
	 * Get content with variable interpolation
	 *
	 * @example
	 * const text = ContentManager.interpolate('INIT.WELCOME', { mode: 'manual' }, {
	 *   projectName: 'my-app'
	 * });
	 */
	interpolate(
		key: string,
		options: ContentOptions,
		variables: Record<string, unknown>,
	): string {
		let content = ContentManager.get(key, options);

		// Replace {{variable}} placeholders
		for (const [varName, value] of Object.entries(variables)) {
			const pattern = new RegExp(`\\{\\{${varName}\\}\\}`, "g");
			content = content.replace(pattern, String(value));
		}

		return content;
	},
};

/**
 * Navigate nested object by dot-separated path
 */
function getContentAtPath(obj: Record<string, unknown>, path: string): unknown {
	const parts = path.split(".");
	// biome-ignore lint/suspicious/noExplicitAny: Recursive object navigation needs any
	let current: any = obj;

	for (const part of parts) {
		if (!current || typeof current !== "object") {
			return null;
		}
		current = current[part];
	}

	return current;
}

/**
 * Check if content is mode-aware
 */
function isModeAware(content: unknown): content is ModeAwareContent {
	return (
		typeof content === "object" &&
		content !== null &&
		"manual" in content &&
		"mcp" in content
	);
}

/**
 * Check if content is a ContentBlock
 */
function isContentBlock(content: unknown): content is ContentBlock {
	return (
		typeof content === "object" && content !== null && "instructions" in content
	);
}
