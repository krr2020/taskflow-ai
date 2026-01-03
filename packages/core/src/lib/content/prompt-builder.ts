/**
 * Prompt Builder
 *
 * Builds mode-aware prompts for LLM calls.
 * Automatically selects correct prompt variant based on execution mode.
 */

import { LLM_PROMPTS } from "@/lib/content/prompts";
import type {
	BuiltPrompt,
	ExecutionMode,
	ModeAwarePrompt,
	PromptConfig,
} from "./types.js";

export class PromptBuilder {
	private mode: ExecutionMode;

	constructor(mode: ExecutionMode) {
		this.mode = mode;
	}

	/**
	 * Build mode-aware LLM prompt
	 *
	 * @example
	 * const prompt = builder.build('PRD_QUESTION_GENERATION', {
	 *   template: templateContent,
	 *   summary: featureSummary,
	 *   referencedFiles: files
	 * });
	 *
	 * const result = await llmProvider.generate([
	 *   { role: 'system', content: prompt.system },
	 *   { role: 'user', content: prompt.user }
	 * ]);
	 *
	 * // In manual mode, use parsing rules:
	 * if (prompt.parsingRules) {
	 *   const parsed = parseWithRules(result.content, prompt.parsingRules);
	 * }
	 */
	// biome-ignore lint/suspicious/noExplicitAny: Generic context needs to be flexible
	build(promptKey: string, context: any): BuiltPrompt {
		const promptDef = this.getPromptDefinition(promptKey);

		if (!promptDef) {
			throw new Error(`Unknown prompt key: ${promptKey}`);
		}

		// Get mode-specific configuration
		const config: PromptConfig = promptDef[this.mode];

		if (!config) {
			throw new Error(
				`Prompt ${promptKey} does not have a ${this.mode} mode variant`,
			);
		}

		// Build the prompt
		const built: BuiltPrompt = {
			system: config.system(context),
			user: config.user(context),
		};

		// Include parsing rules only for manual mode
		if (this.mode === "manual" && config.parsingRules) {
			built.parsingRules = config.parsingRules;
		}

		return built;
	}

	/**
	 * Build multiple prompts at once
	 *
	 * Useful for operations that need multiple LLM calls
	 */
	// biome-ignore lint/suspicious/noExplicitAny: Generic context needs to be flexible
	buildMany(prompts: Array<{ key: string; context: any }>): BuiltPrompt[] {
		return prompts.map(({ key, context }) => this.build(key, context));
	}

	/**
	 * Get the current execution mode
	 */
	getMode(): ExecutionMode {
		return this.mode;
	}

	/**
	 * Check if current mode is manual
	 */
	isManual(): boolean {
		return this.mode === "manual";
	}

	/**
	 * Check if current mode is MCP
	 */
	isMCP(): boolean {
		return this.mode === "mcp";
	}

	/**
	 * Get prompt definition from nested object path
	 */
	private getPromptDefinition(key: string): ModeAwarePrompt | null {
		const parts = key.split(".");
		// biome-ignore lint/suspicious/noExplicitAny: Recursive object navigation needs any
		let def: any = LLM_PROMPTS;

		for (const part of parts) {
			if (!def || typeof def !== "object") {
				return null;
			}
			def = def[part];
		}

		// Validate it's a proper ModeAwarePrompt
		if (!def || typeof def !== "object") {
			return null;
		}

		if (!def.manual || !def.mcp) {
			return null;
		}

		return def as ModeAwarePrompt;
	}

	/**
	 * List all available prompt keys
	 */
	static getAvailablePrompts(): string[] {
		const keys: string[] = [];

		// biome-ignore lint/suspicious/noExplicitAny: Recursive object navigation needs any
		function traverse(obj: any, prefix = "") {
			for (const [key, value] of Object.entries(obj)) {
				const fullKey = prefix ? `${prefix}.${key}` : key;

				if (value && typeof value === "object") {
					// Check if it's a mode-aware prompt
					if ("manual" in value && "mcp" in value) {
						keys.push(fullKey);
					} else {
						// Recurse deeper
						traverse(value, fullKey);
					}
				}
			}
		}

		traverse(LLM_PROMPTS);
		return keys;
	}

	/**
	 * Validate that a prompt has both manual and MCP variants
	 */
	static validatePrompt(key: string): {
		valid: boolean;
		missing?: Array<"manual" | "mcp">;
	} {
		const parts = key.split(".");
		// biome-ignore lint/suspicious/noExplicitAny: Recursive object navigation needs any
		let def: any = LLM_PROMPTS;

		for (const part of parts) {
			if (!def || typeof def !== "object") {
				return { valid: false, missing: ["manual", "mcp"] };
			}
			def = def[part];
		}

		if (!def || typeof def !== "object") {
			return { valid: false, missing: ["manual", "mcp"] };
		}

		const missing: Array<"manual" | "mcp"> = [];

		if (!def.manual) missing.push("manual");
		if (!def.mcp) missing.push("mcp");

		if (missing.length === 0) {
			return { valid: true };
		}
		return { valid: false, missing };
	}
}
