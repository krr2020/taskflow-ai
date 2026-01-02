/**
 * Anthropic Claude LLM Provider
 * Supports Claude models via Anthropic API
 */

import {
	type LLMGenerationOptions,
	type LLMGenerationResult,
	type LLMMessage,
	LLMProvider,
	LLMProviderType,
} from "../base.js";
import { LLMError } from "../../lib/errors.js";

export interface AnthropicConfig {
	apiKey: string;
	model: string;
	maxTokens?: number;
}

export class AnthropicProvider extends LLMProvider {
	private config: AnthropicConfig;
	private readonly DEFAULT_MAX_TOKENS = 4096;

	constructor(config: AnthropicConfig) {
		super(LLMProviderType.Anthropic, config.model);
		this.config = config;
		this.config.maxTokens = config.maxTokens || this.DEFAULT_MAX_TOKENS;
	}

	/**
	 * Generate text using Anthropic Claude API
	 */
	async generate(
		messages: LLMMessage[],
		options?: LLMGenerationOptions,
	): Promise<LLMGenerationResult> {
		if (!this.isConfigured()) {
			throw new LLMError("Anthropic provider is not configured properly", "LLM_CONFIG_ERROR");
		}

		// Extract system message (Anthropic separates system message)
		let systemMessage = "";
		const apiMessages: LLMMessage[] = [];

		for (const msg of messages) {
			if (msg.role === "system") {
				systemMessage = msg.content;
			} else {
				apiMessages.push(msg);
			}
		}

		const requestBody: Record<string, unknown> = {
			model: this.config.model,
			messages: apiMessages,
			max_tokens: options?.maxTokens || this.config.maxTokens,
			stream: false,
		};

		if (systemMessage) {
			requestBody.system = systemMessage;
		}

		if (options?.temperature !== undefined) {
			requestBody.temperature = options.temperature;
		}

		if (options?.topP !== undefined) {
			requestBody.top_p = options.topP;
		}

		if (options?.topK !== undefined) {
			requestBody.top_k = options.topK;
		}

		const response = await fetch("https://api.anthropic.com/v1/messages", {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				"x-api-key": this.config.apiKey,
				"anthropic-version": "2023-06-01",
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new LLMError(`Anthropic API error: ${response.status} - ${error}`, "LLM_API_ERROR");
		}

		const data = (await response.json()) as {
			content: Array<{ text: string }>;
			model: string;
			usage?: { input_tokens: number; output_tokens: number };
			stop_reason: string;
		};

		const contentItem = data.content[0];
		if (!contentItem) {
			throw new LLMError("No content returned from Anthropic API", "LLM_EMPTY_RESPONSE");
		}

		return {
			content: contentItem.text,
			model: data.model,
			tokensUsed:
				(data.usage?.input_tokens ?? 0) + (data.usage?.output_tokens ?? 0),
			promptTokens: data.usage?.input_tokens ?? 0,
			completionTokens: data.usage?.output_tokens ?? 0,
			finishReason: data.stop_reason,
		};
	}

	/**
	 * Check if provider is configured
	 */
	isConfigured(): boolean {
		return !!this.config.apiKey;
	}

	/**
	 * Create provider from environment variables
	 */
	static fromEnv(config: {
		apiKey?: string;
		model?: string;
		maxTokens?: number;
	}): AnthropicProvider {
		const apiKey = config.apiKey || process.env.ANTHROPIC_API_KEY || "";
		const model =
			config.model ||
			process.env.ANTHROPIC_MODEL ||
			"claude-3-5-sonnet-20241022";
		const maxTokensValue =
			config.maxTokens ||
			Number.parseInt(process.env.ANTHROPIC_MAX_TOKENS || "4096", 10);

		if (!apiKey) {
			console.warn("Warning: Anthropic provider missing API key");
		}

		const maxTokens = Number.isNaN(maxTokensValue) ? undefined : maxTokensValue;

		return new AnthropicProvider({
			apiKey: expandEnvVar(apiKey),
			model,
			maxTokens: maxTokens ?? 4096,
		});
	}
}

/**
 * Expand environment variable in string (e.g., "${VAR_NAME}" -> actual value)
 */
function expandEnvVar(value: string): string {
	if (!value) {
		return value;
	}
	const envVarMatch = value.match(/^\$\{([^}]+)\}$/);
	if (envVarMatch?.[1]) {
		const envVar = envVarMatch[1];
		const envValue = process.env[envVar];
		return envValue ?? value;
	}
	return value;
}
