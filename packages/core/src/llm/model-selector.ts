/**
 * Model Selector
 * Selects the appropriate model for each phase (planning, execution, analysis)
 */

import { type LLMProvider, LLMProviderType, Phase } from "./base.js";
import { AnthropicProvider } from "./providers/anthropic.js";
import { OllamaProvider } from "./providers/ollama.js";
import { OpenAICompatibleProvider } from "./providers/openai-compatible.js";

export interface ModelSelection {
	planning: LLMProvider;
	execution: LLMProvider;
	analysis: LLMProvider;
}

export interface AIConfig {
	enabled: boolean;
	provider: LLMProviderType;
	apiKey?: string;
	models: {
		default: string;
		planning?: string;
		execution?: string;
		analysis?: string;
	};
	planningProvider?: LLMProviderType;
	planningApiKey?: string;
	executionProvider?: LLMProviderType;
	executionApiKey?: string;
	analysisProvider?: LLMProviderType;
	analysisApiKey?: string;
	ollamaBaseUrl?: string;
	openaiBaseUrl?: string;
}

/**
 * Model Selector class
 * Manages per-phase model selection and provider instantiation
 */
export class ModelSelector {
	private selection: ModelSelection;
	private modelNames: {
		planning: string;
		execution: string;
		analysis: string;
	};

	constructor(config: AIConfig) {
		this.selection = this.createSelection(config);
		this.modelNames = {
			planning: config.models.planning || config.models.default,
			execution: config.models.execution || config.models.default,
			analysis: config.models.analysis || config.models.default,
		};
	}

	/**
	 * Get the provider for a specific phase
	 */
	getProvider(phase: Phase): LLMProvider {
		switch (phase) {
			case Phase.Planning:
				return this.selection.planning;
			case Phase.Execution:
				return this.selection.execution;
			case Phase.Analysis:
				return this.selection.analysis;
			default:
				return this.selection.planning;
		}
	}

	/**
	 * Get the model name for a specific phase
	 */
	getModelName(phase: Phase): string {
		switch (phase) {
			case Phase.Planning:
				return this.modelNames.planning;
			case Phase.Execution:
				return this.modelNames.execution;
			case Phase.Analysis:
				return this.modelNames.analysis;
			default:
				return this.modelNames.planning;
		}
	}

	/**
	 * Check if any provider is configured
	 */
	isConfigured(): boolean {
		return (
			this.selection.planning.isConfigured() ||
			this.selection.execution.isConfigured() ||
			this.selection.analysis.isConfigured()
		);
	}

	/**
	 * Create provider from configuration
	 */
	private createProvider(
		providerType: LLMProviderType,
		model: string,
		apiKey?: string,
		baseUrl?: string,
	): LLMProvider {
		switch (providerType) {
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

			default:
				throw new Error(`Unknown provider type: ${providerType}`);
		}
	}

	/**
	 * Create model selection from configuration
	 */
	private createSelection(config: AIConfig): ModelSelection {
		const defaultProvider = this.createProvider(
			config.provider,
			config.models.default,
			config.apiKey,
			this.getBaseUrlForProvider(config, config.provider),
		);

		// Planning provider
		const planningProvider = config.planningProvider
			? this.createProvider(
					config.planningProvider,
					config.models.planning || config.models.default,
					config.planningApiKey,
					this.getBaseUrlForProvider(config, config.planningProvider),
				)
			: defaultProvider;

		// Execution provider
		const executionProvider = config.executionProvider
			? this.createProvider(
					config.executionProvider,
					config.models.execution || config.models.default,
					config.executionApiKey,
					this.getBaseUrlForProvider(config, config.executionProvider),
				)
			: defaultProvider;

		// Analysis provider
		const analysisProvider = config.analysisProvider
			? this.createProvider(
					config.analysisProvider,
					config.models.analysis || config.models.default,
					config.analysisApiKey,
					this.getBaseUrlForProvider(config, config.analysisProvider),
				)
			: defaultProvider;

		return {
			planning: planningProvider,
			execution: executionProvider,
			analysis: analysisProvider,
		};
	}

	/**
	 * Get base URL for provider
	 */
	private getBaseUrlForProvider(
		config: AIConfig,
		providerType: LLMProviderType,
	): string | undefined {
		if (providerType === LLMProviderType.Ollama) {
			return config.ollamaBaseUrl;
		}
		if (providerType === LLMProviderType.OpenAICompatible) {
			return config.openaiBaseUrl;
		}
		return undefined;
	}

	/**
	 * Create ModelSelector from minimal config (backward compatible)
	 */
	static fromSimpleConfig(config: {
		enabled: boolean;
		provider: LLMProviderType;
		apiKey?: string;
		model?: string;
	}): ModelSelector {
		return new ModelSelector({
			enabled: config.enabled,
			provider: config.provider,
			apiKey: config.apiKey ?? "",
			models: {
				default: config.model || "gpt-4o-mini",
			},
		});
	}
}
