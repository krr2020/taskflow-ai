/**
 * Unit tests for LLM providers
 */

import { describe, expect, it, vi } from "vitest";
import { LLMProviderType, Phase } from "../../src/llm/base.js";
import { ProviderFactory } from "../../src/llm/factory.js";
import { ModelSelector } from "../../src/llm/model-selector.js";
import { AnthropicProvider } from "../../src/llm/providers/anthropic.js";
import { OllamaProvider } from "../../src/llm/providers/ollama.js";
import { OpenAICompatibleProvider } from "../../src/llm/providers/openai-compatible.js";

describe("LLM Providers", () => {
	describe("OpenAI-compatible Provider", () => {
		it("should create provider with config", () => {
			const provider = new OpenAICompatibleProvider({
				baseUrl: "https://api.openai.com/v1",
				apiKey: "test-key",
				model: "gpt-4",
			});

			expect(provider.type).toBe(LLMProviderType.OpenAICompatible);
			expect(provider.model).toBe("gpt-4");
			expect(provider.isConfigured()).toBe(true);
		});

		it("should create provider from environment variables", () => {
			vi.stubEnv("OPENAI_API_KEY", "env-key");
			vi.stubEnv("AI_MODEL", "gpt-4o");

			const provider = OpenAICompatibleProvider.fromEnv({});

			expect(provider.model).toBe("gpt-4o");
			expect(provider.isConfigured()).toBe(true);

			vi.unstubAllEnvs();
		});

		it("should expand environment variables in API key", () => {
			vi.stubEnv("MY_API_KEY", "expanded-key");

			const provider = new OpenAICompatibleProvider({
				baseUrl: "https://api.openai.com/v1",
				apiKey: `$\{MY_API_KEY}`,
				model: "gpt-4",
			});

			expect(provider.isConfigured()).toBe(true);

			vi.unstubAllEnvs();
		});

		it("should not be configured without API key", () => {
			const provider = new OpenAICompatibleProvider({
				baseUrl: "https://api.openai.com/v1",
				apiKey: "",
				model: "gpt-4",
			});

			expect(provider.isConfigured()).toBe(false);
		});
	});

	describe("Anthropic Provider", () => {
		it("should create provider with config", () => {
			const provider = new AnthropicProvider({
				apiKey: "test-key",
				model: "claude-3-5-sonnet-20241022",
			});

			expect(provider.type).toBe(LLMProviderType.Anthropic);
			expect(provider.model).toBe("claude-3-5-sonnet-20241022");
			expect(provider.isConfigured()).toBe(true);
		});

		it("should create provider from environment variables", () => {
			vi.stubEnv("ANTHROPIC_API_KEY", "env-key");
			vi.stubEnv("ANTHROPIC_MODEL", "claude-3-opus-20240229");

			const provider = AnthropicProvider.fromEnv({});

			expect(provider.model).toBe("claude-3-opus-20240229");
			expect(provider.isConfigured()).toBe(true);

			vi.unstubAllEnvs();
		});

		it("should expand environment variables in API key", () => {
			vi.stubEnv("MY_API_KEY", "expanded-key");

			const provider = new AnthropicProvider({
				apiKey: `$\{MY_API_KEY}`,
				model: "claude-3-5-sonnet-20241022",
			});

			expect(provider.isConfigured()).toBe(true);

			vi.unstubAllEnvs();
		});

		it("should not be configured without API key", () => {
			const provider = new AnthropicProvider({
				apiKey: "",
				model: "claude-3-5-sonnet-20241022",
			});

			expect(provider.isConfigured()).toBe(false);
		});
	});

	describe("Ollama Provider", () => {
		it("should create provider with config", () => {
			const provider = new OllamaProvider({
				baseUrl: "http://localhost:11434",
				model: "llama2",
			});

			expect(provider.type).toBe(LLMProviderType.Ollama);
			expect(provider.model).toBe("llama2");
			expect(provider.isConfigured()).toBe(true);
		});

		it("should create provider from environment variables", () => {
			vi.stubEnv("OLLAMA_BASE_URL", "http://localhost:11434");
			vi.stubEnv("OLLAMA_MODEL", "llama3");

			const provider = OllamaProvider.fromEnv({});

			expect(provider.model).toBe("llama3");
			expect(provider.isConfigured()).toBe(true);

			vi.unstubAllEnvs();
		});

		it("should expand environment variables", () => {
			vi.stubEnv("OLLAMA_URL", "http://custom:11434");

			const provider = new OllamaProvider({
				baseUrl: `$\{OLLAMA_URL}`,
				model: "llama2",
			});

			expect(provider.isConfigured()).toBe(true);

			vi.unstubAllEnvs();
		});

		it("should not be configured without baseUrl and model", () => {
			const provider = new OllamaProvider({
				baseUrl: "",
				model: "",
			});

			expect(provider.isConfigured()).toBe(false);
		});
	});
});

describe("ModelSelector", () => {
	describe("with single provider", () => {
		it("should use default provider for all phases", () => {
			const selector = new ModelSelector({
				enabled: true,
				provider: LLMProviderType.Anthropic,
				apiKey: "test-key",
				models: {
					default: "claude-3-5-sonnet-20241022",
				},
			});

			expect(selector.getModelName(Phase.Planning)).toBe(
				"claude-3-5-sonnet-20241022",
			);
			expect(selector.getModelName(Phase.Execution)).toBe(
				"claude-3-5-sonnet-20241022",
			);
			expect(selector.getModelName(Phase.Analysis)).toBe(
				"claude-3-5-sonnet-20241022",
			);
		});

		it("should be configured if provider is configured", () => {
			const selector = new ModelSelector({
				enabled: true,
				provider: LLMProviderType.Anthropic,
				apiKey: "test-key",
				models: {
					default: "claude-3-5-sonnet-20241022",
				},
			});

			expect(selector.isConfigured()).toBe(true);
		});
	});

	describe("with per-phase models", () => {
		it("should use phase-specific models", () => {
			const selector = new ModelSelector({
				enabled: true,
				provider: LLMProviderType.Anthropic,
				apiKey: "test-key",
				models: {
					default: "claude-3-5-sonnet-20241022",
					planning: "claude-opus-4",
					execution: "gemini-pro-2.0",
					analysis: "claude-sonnet-4-20250514",
				},
			});

			expect(selector.getModelName(Phase.Planning)).toBe("claude-opus-4");
			expect(selector.getModelName(Phase.Execution)).toBe("gemini-pro-2.0");
			expect(selector.getModelName(Phase.Analysis)).toBe(
				"claude-sonnet-4-20250514",
			);
		});

		it("should fall back to default model if phase model not specified", () => {
			const selector = new ModelSelector({
				enabled: true,
				provider: LLMProviderType.Anthropic,
				apiKey: "test-key",
				models: {
					default: "claude-3-5-sonnet-20241022",
					planning: "claude-opus-4",
				},
			});

			expect(selector.getModelName(Phase.Planning)).toBe("claude-opus-4");
			expect(selector.getModelName(Phase.Execution)).toBe(
				"claude-3-5-sonnet-20241022",
			);
			expect(selector.getModelName(Phase.Analysis)).toBe(
				"claude-3-5-sonnet-20241022",
			);
		});
	});

	describe("with per-phase providers", () => {
		it("should use phase-specific providers", () => {
			const selector = new ModelSelector({
				enabled: true,
				provider: LLMProviderType.Anthropic,
				apiKey: "test-key",
				models: {
					default: "claude-3-5-sonnet-20241022",
					planning: "claude-opus-4",
					execution: "gpt-4o",
					analysis: "llama2",
				},
				planningProvider: LLMProviderType.Anthropic,
				planningApiKey: "anthropic-key",
				executionProvider: LLMProviderType.OpenAICompatible,
				executionApiKey: "openai-key",
				analysisProvider: LLMProviderType.Ollama,
			});

			const planningProvider = selector.getProvider(Phase.Planning);
			const executionProvider = selector.getProvider(Phase.Execution);
			const analysisProvider = selector.getProvider(Phase.Analysis);

			expect(planningProvider.type).toBe(LLMProviderType.Anthropic);
			expect(executionProvider.type).toBe(LLMProviderType.OpenAICompatible);
			expect(analysisProvider.type).toBe(LLMProviderType.Ollama);
		});
	});
});

describe("ProviderFactory", () => {
	it("should get available providers", () => {
		const providers = ProviderFactory.getAvailableProviders();

		expect(providers).toContain(LLMProviderType.OpenAICompatible);
		expect(providers).toContain(LLMProviderType.Anthropic);
		expect(providers).toContain(LLMProviderType.Ollama);
	});

	it("should get default model for provider", () => {
		expect(
			ProviderFactory.getDefaultModel(LLMProviderType.OpenAICompatible),
		).toBe("gpt-4o-mini");
		expect(ProviderFactory.getDefaultModel(LLMProviderType.Anthropic)).toBe(
			"claude-3-5-sonnet-20241022",
		);
		expect(ProviderFactory.getDefaultModel(LLMProviderType.Ollama)).toBe(
			"llama2",
		);
	});

	it("should create provider from factory", () => {
		const provider = ProviderFactory.createProvider(
			LLMProviderType.Anthropic,
			"claude-3-5-sonnet-20241022",
			"test-key",
		);

		expect(provider.type).toBe(LLMProviderType.Anthropic);
		expect(provider.model).toBe("claude-3-5-sonnet-20241022");
	});

	it("should create model selector from simple config", () => {
		const selector = ProviderFactory.createSelector({
			enabled: true,
			provider: LLMProviderType.Anthropic,
			apiKey: "test-key",
			models: {
				default: "claude-3-5-sonnet-20241022",
			},
		});

		expect(selector.getModelName(Phase.Planning)).toBe(
			"claude-3-5-sonnet-20241022",
		);
	});
});
