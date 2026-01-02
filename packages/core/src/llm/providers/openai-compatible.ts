/**
 * OpenAI-compatible LLM Provider
 * Supports: OpenAI, Azure OpenAI, Together AI, Groq, DeepSeek, and any OpenAI-compatible API
 */

import { LLMError } from "../../lib/errors.js";
import {
	type LLMGenerationOptions,
	type LLMGenerationResult,
	type LLMMessage,
	LLMProvider,
	LLMProviderType,
} from "../base.js";

export interface OpenAICompatibleConfig {
	baseUrl: string;
	apiKey: string;
	model: string;
}

export class OpenAICompatibleProvider extends LLMProvider {
	private config: OpenAICompatibleConfig;

	constructor(config: OpenAICompatibleConfig) {
		super(LLMProviderType.OpenAICompatible, config.model);
		this.config = config;
	}

	/**
	 * Generate text using OpenAI-compatible API
	 */
	async generate(
		messages: LLMMessage[],
		options?: LLMGenerationOptions,
	): Promise<LLMGenerationResult> {
		if (!this.isConfigured()) {
			throw new LLMError(
				"OpenAI-compatible provider is not configured properly",
				"LLM_CONFIG_ERROR",
			);
		}

		const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.config.apiKey}`,
			},
			body: JSON.stringify({
				model: this.config.model,
				messages,
				max_tokens: options?.maxTokens,
				temperature: options?.temperature,
				top_p: options?.topP,
				stream: false,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new LLMError(
				`OpenAI-compatible API error: ${response.status} - ${error}`,
				"LLM_API_ERROR",
			);
		}

		const data = (await response.json()) as {
			choices: Array<{ message: { content: string }; finish_reason: string }>;
			model: string;
			usage?: {
				total_tokens: number;
				prompt_tokens: number;
				completion_tokens: number;
			};
		};
		const choice = data.choices[0];

		if (!choice) {
			throw new LLMError(
				"No choice returned from OpenAI API",
				"LLM_EMPTY_RESPONSE",
			);
		}

		return {
			content: choice.message.content,
			model: data.model,
			tokensUsed: data.usage?.total_tokens ?? 0,
			promptTokens: data.usage?.prompt_tokens ?? 0,
			completionTokens: data.usage?.completion_tokens ?? 0,
			finishReason: choice.finish_reason,
		};
	}

	/**
	 * Generate text stream using OpenAI-compatible API
	 */
	async *generateStream(
		messages: LLMMessage[],
		options?: LLMGenerationOptions,
	): AsyncGenerator<string, LLMGenerationResult, unknown> {
		if (!this.isConfigured()) {
			throw new LLMError(
				"OpenAI-compatible provider is not configured properly",
				"LLM_CONFIG_ERROR",
			);
		}

		const response = await fetch(`${this.config.baseUrl}/chat/completions`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
				Authorization: `Bearer ${this.config.apiKey}`,
			},
			body: JSON.stringify({
				model: this.config.model,
				messages,
				max_tokens: options?.maxTokens,
				temperature: options?.temperature,
				top_p: options?.topP,
				stream: true,
			}),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new LLMError(
				`OpenAI-compatible API error: ${response.status} - ${error}`,
				"LLM_API_ERROR",
			);
		}

		if (!response.body) {
			throw new LLMError("No response body", "LLM_EMPTY_RESPONSE");
		}

		const reader = response.body.getReader();
		const decoder = new TextDecoder();
		let buffer = "";

		let fullContent = "";
		let finishReason = "";
		let usage:
			| {
					total_tokens: number;
					prompt_tokens: number;
					completion_tokens: number;
			  }
			| undefined;

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || ""; // Keep incomplete line

				for (const line of lines) {
					if (line.trim() === "") continue;
					if (line.trim() === "data: [DONE]") continue;
					if (!line.startsWith("data: ")) continue;

					const data = line.slice(6); // Remove "data: "
					try {
						const parsed = JSON.parse(data);
						const delta = parsed.choices?.[0]?.delta?.content;
						if (delta) {
							fullContent += delta;
							yield delta;
						}

						if (parsed.choices?.[0]?.finish_reason) {
							finishReason = parsed.choices[0].finish_reason;
						}

						if (parsed.usage) {
							usage = parsed.usage;
						}
					} catch (e) {
						console.error("Error parsing SSE data:", e);
					}
				}
			}
		} finally {
			reader.releaseLock();
		}

		return {
			content: fullContent,
			model: this.config.model,
			tokensUsed: usage?.total_tokens ?? 0,
			promptTokens: usage?.prompt_tokens ?? 0,
			completionTokens: usage?.completion_tokens ?? 0,
			finishReason: finishReason || "stop",
		};
	}

	/**
	 * Check if provider is configured
	 */
	isConfigured(): boolean {
		return !!(this.config.apiKey && this.config.baseUrl);
	}

	/**
	 * Create provider from environment variables
	 */
	static fromEnv(config: {
		baseUrl?: string;
		apiKey?: string;
		model?: string;
	}): OpenAICompatibleProvider {
		const baseUrl =
			config.baseUrl ||
			process.env.OPENAI_BASE_URL ||
			process.env.AI_BASE_URL ||
			"https://api.openai.com/v1";
		const apiKey =
			config.apiKey ||
			process.env.OPENAI_API_KEY ||
			process.env.AI_API_KEY ||
			"";
		const model = config.model || process.env.AI_MODEL || "gpt-4o-mini";

		if (!apiKey) {
			console.warn("Warning: OpenAI-compatible provider missing API key");
		}

		return new OpenAICompatibleProvider({
			baseUrl,
			apiKey: expandEnvVar(apiKey),
			model,
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
