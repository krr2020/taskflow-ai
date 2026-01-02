/**
 * Base LLM Provider interface
 * All LLM providers must implement this interface
 */

export interface LLMMessage {
	role: "system" | "user" | "assistant";
	content: string;
}

export interface LLMGenerationOptions {
	maxTokens?: number;
	temperature?: number;
	topP?: number;
	topK?: number;
}

export interface LLMGenerationResult {
	content: string;
	model: string;
	tokensUsed?: number;
	promptTokens?: number;
	completionTokens?: number;
	finishReason?: string;
}

export enum LLMProviderType {
	OpenAICompatible = "openai-compatible",
	Anthropic = "anthropic",
	Ollama = "ollama",
	Mock = "mock",
}

export enum Phase {
	Planning = "planning",
	Execution = "execution",
	Analysis = "analysis",
}

/**
 * LLM Provider interface
 * Defines the contract for all LLM provider implementations
 */
export abstract class LLMProvider {
	public readonly type: LLMProviderType;
	public readonly model: string;

	constructor(type: LLMProviderType, model: string) {
		this.type = type;
		this.model = model;
	}

	/**
	 * Generate text from the LLM
	 */
	abstract generate(
		messages: LLMMessage[],
		options?: LLMGenerationOptions,
	): Promise<LLMGenerationResult>;

	/**
	 * Check if the provider is properly configured
	 */
	abstract isConfigured(): boolean;

	/**
	 * Get the model name for the specified phase
	 * Override if provider has phase-specific models
	 */
	getModelForPhase(_phase: Phase): string {
		return this.model;
	}
}
