/**
 * Model Selector
 * Selects the appropriate model for each phase (planning, execution, analysis)
 */

import { type LLMProvider, LLMProviderType, Phase } from "./base.js";
import { LLMError } from "../lib/errors.js";
import { AnthropicProvider } from "./providers/anthropic.js";
import { MockLLMProvider } from "./providers/mock.js";
import { OllamaProvider } from "./providers/ollama.js";
import { OpenAICompatibleProvider } from "./providers/openai-compatible.js";

export interface ModelSelection {
	planning: LLMProvider;
	execution: LLMProvider;
	analysis: LLMProvider;
}

import type { ModelDefinition, ModelUsage } from "../lib/types.js";

export interface AIConfig {
	enabled: boolean;
	models?: Record<string, ModelDefinition>;
	usage?: ModelUsage;
	provider?: LLMProviderType;
	apiKey?: string;
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

	constructor(config: AIConfig) {
		this.selection = this.createSelection(config);
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
		const provider = this.getProvider(phase);
		return provider.model;
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
	 * Expand environment variable in string (e.g., "${VAR_NAME}" -> actual value)
	 */
	private expandEnvVar(value: string): string {
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

	/**
	 * Create provider from model definition
	 */
	private createProviderFromDefinition(
		definition: ModelDefinition,
	): LLMProvider {
		const providerType = definition.provider as LLMProviderType;
		const model = definition.model;
		const apiKey = definition.apiKey
			? this.expandEnvVar(definition.apiKey)
			: undefined;
		const baseUrl = definition.baseUrl
			? this.expandEnvVar(definition.baseUrl)
			: undefined;

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

			case LLMProviderType.Mock: {
				return MockLLMProvider.createMock({ model });
			}

			default:
				throw new LLMError(`Unknown provider type: ${providerType}`, "UNKNOWN_PROVIDER");
		}
	}

	/**
	 * Resolve model reference from usage to actual model definition
	 */
	private resolveModelDefinition(
		config: AIConfig,
		phase: "planning" | "execution" | "analysis",
	): ModelDefinition | null {
		if (!config.models || typeof config.models !== "object") {
			// Old config format: backward compatibility
			if (config.provider) {
				return this.createLegacyModelDefinition(config, phase);
			}
			return null;
		}

		const models = config.models as Record<string, unknown>;

		// New config format with usage mapping
		if (config.usage && typeof config.usage === "object") {
			const usage = config.usage as Record<string, string>;
			const modelKey = usage[phase] || usage.default;
			const definition = modelKey ? models[modelKey] : null;
			if (definition && typeof definition === "object") {
				return definition as ModelDefinition;
			}
		}

		// Simpler format: models directly keyed by phase name
		// Check if models has phase-specific keys (default, planning, execution, analysis)
		const phaseModel = models[phase];
		if (phaseModel && typeof phaseModel === "object") {
			return phaseModel as ModelDefinition;
		}

		// Legacy string format: models are strings (model names)
		// Need to create model definition from provider + model name
		if (phaseModel && typeof phaseModel === "string") {
			const modelName = phaseModel as string;
			const providerType =
				(config[`${phase}Provider`] as LLMProviderType) ||
				config.provider ||
				"openai-compatible";
			const apiKey = (config[`${phase}ApiKey`] as string) || config.apiKey;

			let baseUrl: string | undefined;
			if (providerType === LLMProviderType.Ollama) {
				baseUrl = config.ollamaBaseUrl;
			} else if (providerType === LLMProviderType.OpenAICompatible) {
				baseUrl = config.openaiBaseUrl;
			}

			return {
				provider: providerType as "anthropic" | "openai-compatible" | "ollama",
				model: modelName,
				apiKey,
				baseUrl,
			};
		}

		// Fall back to default model
		const defaultModel = models.default;
		if (defaultModel && typeof defaultModel === "object") {
			return defaultModel as ModelDefinition;
		}

		// Legacy string format for default
		if (defaultModel && typeof defaultModel === "string") {
			const modelName = defaultModel as string;
			const providerType = config.provider || "openai-compatible";
			const apiKey = config.apiKey;

			let baseUrl: string | undefined;
			if (providerType === LLMProviderType.Ollama) {
				baseUrl = config.ollamaBaseUrl;
			} else if (providerType === LLMProviderType.OpenAICompatible) {
				baseUrl = config.openaiBaseUrl;
			}

			return {
				provider: providerType as "anthropic" | "openai-compatible" | "ollama",
				model: modelName,
				apiKey,
				baseUrl,
			};
		}

		// Old config format: backward compatibility
		if (config.provider) {
			return this.createLegacyModelDefinition(config, phase);
		}

		return null;
	}

	/**
	 * Create model definition from legacy config format
	 */
	private createLegacyModelDefinition(
		config: AIConfig,
		phase: "planning" | "execution" | "analysis",
	): ModelDefinition {
		const providerType = (config.provider ||
			config.planningProvider ||
			config.executionProvider ||
			config.analysisProvider ||
			"openai-compatible") as LLMProviderType;
		const apiKey =
			config.apiKey ||
			config.planningApiKey ||
			config.executionApiKey ||
			config.analysisApiKey;

		let baseUrl: string | undefined;
		if (providerType === LLMProviderType.Ollama) {
			baseUrl = config.ollamaBaseUrl;
		} else if (providerType === LLMProviderType.OpenAICompatible) {
			baseUrl = config.openaiBaseUrl;
		}

		// Get model name from legacy config
		let modelName = "gpt-4o-mini";
		if (phase === "planning" && config.planningProvider) {
			modelName = "gpt-4o";
		} else if (phase === "execution" && config.executionProvider) {
			modelName = "gpt-4o";
		} else if (phase === "analysis" && config.analysisProvider) {
			modelName = "gpt-4o";
		}

		return {
			provider: providerType as "anthropic" | "openai-compatible" | "ollama",
			model: modelName,
			apiKey,
			baseUrl,
		};
	}

	/**
	 * Create model selection from configuration
	 */
	private createSelection(config: AIConfig): ModelSelection {
		const planningDef = this.resolveModelDefinition(config, "planning");
		const executionDef = this.resolveModelDefinition(config, "execution");
		const analysisDef = this.resolveModelDefinition(config, "analysis");

		if (!planningDef || !executionDef || !analysisDef) {
			throw new Error(
				"Invalid AI configuration: missing model definitions or usage mapping",
			);
		}

		return {
			planning: this.createProviderFromDefinition(planningDef),
			execution: this.createProviderFromDefinition(executionDef),
			analysis: this.createProviderFromDefinition(analysisDef),
		};
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
		});
	}
}
