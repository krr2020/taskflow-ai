/**
 * Ollama LLM Provider
 * Supports local LLM models via Ollama API
 */

import { LLMError } from "../../lib/errors.js";
import {
	type LLMGenerationOptions,
	type LLMGenerationResult,
	type LLMMessage,
	LLMProvider,
	LLMProviderType,
} from "../base.js";

export interface OllamaConfig {
	baseUrl: string;
	model: string;
}

export class OllamaProvider extends LLMProvider {
	private config: OllamaConfig;

	constructor(config: OllamaConfig) {
		super(LLMProviderType.Ollama, config.model);
		this.config = config;
	}

	/**
	 * Generate text using Ollama API
	 */
	async generate(
		messages: LLMMessage[],
		options?: LLMGenerationOptions,
	): Promise<LLMGenerationResult> {
		if (!this.isConfigured()) {
			throw new LLMError(
				"Ollama provider is not configured properly",
				"LLM_CONFIG_ERROR",
			);
		}

		// Convert messages to Ollama format
		const prompt = messages
			.map((msg) => `${msg.role}: ${msg.content}`)
			.join("\n\n");

		const requestBody: Record<string, unknown> = {
			model: this.config.model,
			prompt,
			stream: false,
		};

		if (options?.temperature !== undefined) {
			requestBody.temperature = options.temperature;
		}

		if (options?.topP !== undefined) {
			requestBody.top_p = options.topP;
		}

		if (options?.topK !== undefined) {
			requestBody.top_k = options.topK;
		}

		if (options?.maxTokens) {
			requestBody.num_predict = options.maxTokens;
		}

		const response = await fetch(`${this.config.baseUrl}/api/generate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new LLMError(
				`Ollama API error: ${response.status} - ${error}`,
				"LLM_API_ERROR",
			);
		}

		const data = (await response.json()) as {
			response: string;
			model: string;
			eval_count: number;
			done: boolean;
		};

		return {
			content: data.response,
			model: data.model,
			tokensUsed: data.eval_count,
			finishReason: data.done ? "stop" : "length",
		};
	}

	/**
	 * Generate text stream using Ollama API
	 */
	async *generateStream(
		messages: LLMMessage[],
		options?: LLMGenerationOptions,
	): AsyncGenerator<string, LLMGenerationResult, unknown> {
		if (!this.isConfigured()) {
			throw new LLMError(
				"Ollama provider is not configured properly",
				"LLM_CONFIG_ERROR",
			);
		}

		// Convert messages to Ollama format
		const prompt = messages
			.map((msg) => `${msg.role}: ${msg.content}`)
			.join("\n\n");

		const requestBody: Record<string, unknown> = {
			model: this.config.model,
			prompt,
			stream: true,
		};

		if (options?.temperature !== undefined) {
			requestBody.temperature = options.temperature;
		}

		if (options?.topP !== undefined) {
			requestBody.top_p = options.topP;
		}

		if (options?.topK !== undefined) {
			requestBody.top_k = options.topK;
		}

		if (options?.maxTokens) {
			requestBody.num_predict = options.maxTokens;
		}

		const response = await fetch(`${this.config.baseUrl}/api/generate`, {
			method: "POST",
			headers: {
				"Content-Type": "application/json",
			},
			body: JSON.stringify(requestBody),
		});

		if (!response.ok) {
			const error = await response.text();
			throw new LLMError(
				`Ollama API error: ${response.status} - ${error}`,
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
		let tokensUsed = 0;
		let finishReason = "";

		try {
			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					if (line.trim() === "") continue;
					try {
						const parsed = JSON.parse(line);
						const delta = parsed.response;
						if (delta) {
							fullContent += delta;
							yield delta;
						}

						if (parsed.done) {
							finishReason = "stop";
							tokensUsed = parsed.eval_count || 0;
						}
					} catch (_e) {
						// Ignore parse errors for partial lines
					}
				}
			}
		} finally {
			reader.releaseLock();
		}

		return {
			content: fullContent,
			model: this.config.model,
			tokensUsed,
			finishReason,
		};
	}

	/**
	 * Check if provider is configured
	 */
	isConfigured(): boolean {
		return !!(this.config.baseUrl && this.config.model);
	}

	/**
	 * Create provider from environment variables
	 */
	static fromEnv(config: { baseUrl?: string; model?: string }): OllamaProvider {
		const baseUrl =
			config.baseUrl || process.env.OLLAMA_BASE_URL || "http://localhost:11434";
		const model = config.model || process.env.OLLAMA_MODEL || "llama2";

		return new OllamaProvider({
			baseUrl: expandEnvVar(baseUrl),
			model: expandEnvVar(model),
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
