/**
 * Ollama LLM Provider
 * Supports local LLM models via Ollama API
 */

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
			throw new Error("Ollama provider is not configured properly");
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
			throw new Error(`Ollama API error: ${response.status} - ${error}`);
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
