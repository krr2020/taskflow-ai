/**
 * LLM Provider Factory
 * Factory for creating LLM providers and model selectors
 */

import { LLMError } from "../lib/core/errors.js";
import {
	type LLMGenerationOptions,
	type LLMGenerationResult,
	type LLMMessage,
	type LLMProvider,
	LLMProviderType,
} from "./base.js";
import { type AIConfig, ModelSelector } from "./model-selector.js";
import { AnthropicProvider } from "./providers/anthropic.js";
import { MockLLMProvider } from "./providers/mock.js";
import { OllamaProvider } from "./providers/ollama.js";
import { OpenAICompatibleProvider } from "./providers/openai-compatible.js";

export type { LLMMessage, LLMGenerationOptions, LLMGenerationResult };
export { LLMProvider, LLMProviderType } from "./base.js";
export { type AIConfig, ModelSelector } from "./model-selector.js";
export {
	AnthropicProvider,
	OllamaProvider,
	OpenAICompatibleProvider,
} from "./providers/index.js";

/**
 * Provider factory namespace
 * Functions for creating LLM providers and model selectors
 */
export const ProviderFactory = {
	/**
	 * Create a model selector from configuration
	 */
	createSelector(config: AIConfig): ModelSelector {
		return new ModelSelector(config);
	},

	/**
	 * Create a single provider (backward compatible)
	 */
	createProvider(
		type: LLMProviderType,
		model: string,
		apiKey?: string,
		baseUrl?: string,
	): LLMProvider {
		switch (type) {
			case LLMProviderType.OpenAICompatible: {
				const config: Record<string, string> = { model };
				if (apiKey) config.apiKey = apiKey;
				if (baseUrl) config.baseUrl = baseUrl;
				return OpenAICompatibleProvider.fromEnv(config);
			}

			case LLMProviderType.Anthropic: {
				const config: Record<string, string> = { model };
				if (apiKey) config.apiKey = apiKey;
				return AnthropicProvider.fromEnv(config);
			}

			case LLMProviderType.Ollama: {
				const config: Record<string, string> = { model };
				if (baseUrl) config.baseUrl = baseUrl;
				return OllamaProvider.fromEnv(config);
			}

			case LLMProviderType.Mock: {
				return MockLLMProvider.createMock({ model });
			}

			default:
				throw new LLMError(
					`Unknown provider type: ${type}`,
					"UNKNOWN_PROVIDER",
				);
		}
	},

	/**
	 * Test if a provider is configured and working
	 */
	async testProvider(
		provider: LLMProvider,
	): Promise<{ success: boolean; error?: string }> {
		try {
			if (!provider.isConfigured()) {
				return { success: false, error: "Provider not configured" };
			}

			// Simple test request
			await provider.generate(
				[
					{
						role: "user",
						content: "Hello, please respond with just 'OK'.",
					},
				],
				{ maxTokens: 10 },
			);

			return { success: true };
		} catch (error) {
			return {
				success: false,
				error: error instanceof Error ? error.message : String(error),
			};
		}
	},

	/**
	 * Get available providers
	 */
	getAvailableProviders(): string[] {
		return [
			LLMProviderType.OpenAICompatible,
			LLMProviderType.Anthropic,
			LLMProviderType.Ollama,
			LLMProviderType.Mock,
		];
	},

	/**
	 * Get default model for provider
	 */
	getDefaultModel(providerType: LLMProviderType): string {
		switch (providerType) {
			case LLMProviderType.OpenAICompatible:
				return "gpt-4o-mini";
			case LLMProviderType.Anthropic:
				return "claude-3-5-sonnet-20241022";
			case LLMProviderType.Ollama:
				return "llama2";
			case LLMProviderType.Mock:
				return "mock-model";
			default:
				throw new Error(`Unknown provider type: ${providerType}`);
		}
	},
};
