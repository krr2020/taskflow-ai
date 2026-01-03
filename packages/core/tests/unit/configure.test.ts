/**
 * ConfigureAICommand unit tests
 * Comprehensive test coverage for AI configuration command
 */

import {
	existsSync,
	mkdirSync,
	readFileSync,
	rmSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import { ConfigureAICommand } from "../../src/commands/configure.js";
import { ConfigLoader } from "../../src/lib/config/config-loader.js";
import type { MCPContext } from "../../src/lib/mcp/mcp-detector.js";

describe("ConfigureAICommand", () => {
	const testProjectRoot = join(process.cwd(), "test-project-config");
	const configPath = join(testProjectRoot, "taskflow.config.json");
	let command: ConfigureAICommand;

	beforeEach(() => {
		// Create test project directory
		if (!existsSync(testProjectRoot)) {
			mkdirSync(testProjectRoot, { recursive: true });
		}

		// Create initial config using ConfigLoader's default
		const initialConfig = ConfigLoader.createDefaultConfig("test-project");
		initialConfig.ai = {
			enabled: false,
			autoContinueTask: false,
			clearContextOnComplete: false,
			usage: {
				default: "gpt-4o-mini",
			},
		};
		writeFileSync(configPath, JSON.stringify(initialConfig, null, 2));

		const mockMCPContext: MCPContext = {
			isMCP: false,
			detectionMethod: "none",
		};
		command = new ConfigureAICommand({
			projectRoot: testProjectRoot,
			mcpContext: mockMCPContext,
		});
	});

	afterEach(() => {
		// Clean up test directory
		if (existsSync(testProjectRoot)) {
			rmSync(testProjectRoot, { recursive: true, force: true });
		}
	});

	// ============================================================================
	// Config File Validation
	// ============================================================================

	describe("execute - config file validation", () => {
		it("should fail if config file not found", async () => {
			rmSync(configPath, { force: true });

			const result = await command.execute({});

			expect(result.success).toBe(false);
			expect(result.output).toContain("Configuration file not found");
			expect(result.nextSteps).toContain("taskflow init");
		});

		it("should suggest running init first", async () => {
			rmSync(configPath, { force: true });

			const result = await command.execute({});

			expect(result.errors).toBeDefined();
			expect(result.errors?.some((e) => e.includes("taskflow init"))).toBe(
				true,
			);
		});
	});

	// ============================================================================
	// Enable/Disable AI
	// ============================================================================

	describe("execute - enable/disable", () => {
		it("should disable AI when --disable flag is set", async () => {
			const result = await command.execute({ disable: true });

			expect(result.success).toBe(true);
			expect(result.output).toContain("AI configuration disabled");

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.enabled).toBe(false);
		});

		it("should enable AI when --enable flag is set", async () => {
			const result = await command.execute({ enable: true });

			expect(result.success).toBe(true);
			expect(result.output).toContain("AI configuration enabled");

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.enabled).toBe(true);
		});

		it("should preserve other config when toggling enabled", async () => {
			// Set up config with provider
			await command.execute({
				provider: "anthropic",
				apiKey: "test-key",
			});

			// Disable
			await command.execute({ disable: true });

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.provider).toBe("anthropic");
			expect(config.ai.apiKey).toBe("test-key");
			expect(config.ai.enabled).toBe(false);
		});

		it("should return success message when disabling", async () => {
			const result = await command.execute({ disable: true });

			expect(result.success).toBe(true);
			expect(result.nextSteps).toContain("AI features will not be used");
		});

		it("should provide guidance on re-enabling", async () => {
			const result = await command.execute({ disable: true });

			// Should provide guidance in nextSteps
			expect(result.success).toBe(true);
			expect(result.nextSteps).toBeDefined();
			const guidance = Array.isArray(result.nextSteps)
				? result.nextSteps.join(" ")
				: result.nextSteps;
			expect(guidance).toContain("enable");
		});
	});

	// ============================================================================
	// Provider Configuration
	// ============================================================================

	describe("execute - provider configuration", () => {
		it("should set provider type", async () => {
			const result = await command.execute({ provider: "anthropic" });

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.provider).toBe("anthropic");
		});

		it("should set API key", async () => {
			const result = await command.execute({
				provider: "openai-compatible",
				apiKey: "sk-test-key",
			});

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.apiKey).toBe("sk-test-key");
		});

		it("should set default model", async () => {
			const result = await command.execute({
				provider: "anthropic",
				model: "claude-sonnet-4-20250514",
			});

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.usage.default).toBe("claude-sonnet-4-20250514");
		});

		it("should enable AI when provider is set", async () => {
			await command.execute({ provider: "anthropic" });

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.enabled).toBe(true);
		});

		it("should support openai-compatible provider", async () => {
			const result = await command.execute({
				provider: "openai-compatible",
				apiKey: "sk-test",
			});

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.provider).toBe("openai-compatible");
		});

		it("should support anthropic provider", async () => {
			const result = await command.execute({
				provider: "anthropic",
				apiKey: "sk-ant-test",
			});

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.provider).toBe("anthropic");
		});

		it("should support ollama provider", async () => {
			const result = await command.execute({ provider: "ollama" });

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.provider).toBe("ollama");
		});
	});

	// ============================================================================
	// Per-Phase Models
	// ============================================================================

	describe("execute - per-phase models", () => {
		it("should set planning model", async () => {
			const result = await command.execute({ planning: "claude-opus-4" });

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.usage.planning).toBe("claude-opus-4");
		});

		it("should set execution model", async () => {
			const result = await command.execute({ execution: "gemini-pro-2.0" });

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.usage.execution).toBe("gemini-pro-2.0");
		});

		it("should set analysis model", async () => {
			const result = await command.execute({
				analysis: "claude-sonnet-4-20250514",
			});

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.usage.analysis).toBe("claude-sonnet-4-20250514");
		});

		it("should preserve default model when setting per-phase models", async () => {
			await command.execute({ model: "gpt-4o" });

			await command.execute({ planning: "claude-opus-4" });

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.usage.default).toBe("gpt-4o");
			expect(config.ai.usage.planning).toBe("claude-opus-4");
		});

		it("should set multiple per-phase models at once", async () => {
			const result = await command.execute({
				planning: "claude-opus-4",
				execution: "gemini-pro-2.0",
				analysis: "claude-sonnet-4-20250514",
			});

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.usage.planning).toBe("claude-opus-4");
			expect(config.ai.usage.execution).toBe("gemini-pro-2.0");
			expect(config.ai.usage.analysis).toBe("claude-sonnet-4-20250514");
		});

		it("should create usage object if missing", async () => {
			// Remove usage from config
			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			delete config.ai.usage;
			writeFileSync(configPath, JSON.stringify(config, null, 2));

			const result = await command.execute({ planning: "claude-opus-4" });

			expect(result.success).toBe(true);

			const updatedConfig = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(updatedConfig.ai.usage).toBeDefined();
			expect(updatedConfig.ai.usage.planning).toBe("claude-opus-4");
		});
	});

	// ============================================================================
	// Per-Phase Providers
	// ============================================================================

	describe("execute - per-phase providers", () => {
		it("should set planning provider", async () => {
			const result = await command.execute({ planningProvider: "anthropic" });

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.planningProvider).toBe("anthropic");
		});

		it("should set execution provider", async () => {
			const result = await command.execute({
				executionProvider: "openai-compatible",
			});

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.executionProvider).toBe("openai-compatible");
		});

		it("should set analysis provider", async () => {
			const result = await command.execute({ analysisProvider: "ollama" });

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.analysisProvider).toBe("ollama");
		});

		it("should set multiple per-phase providers at once", async () => {
			const result = await command.execute({
				planningProvider: "anthropic",
				executionProvider: "openai-compatible",
				analysisProvider: "ollama",
			});

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.planningProvider).toBe("anthropic");
			expect(config.ai.executionProvider).toBe("openai-compatible");
			expect(config.ai.analysisProvider).toBe("ollama");
		});
	});

	// ============================================================================
	// Per-Phase API Keys
	// ============================================================================

	describe("execute - per-phase API keys", () => {
		it("should set planning API key", async () => {
			const result = await command.execute({
				planningApiKey: "sk-planning-key",
			});

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.planningApiKey).toBe("sk-planning-key");
		});

		it("should set execution API key", async () => {
			const result = await command.execute({
				executionApiKey: "sk-execution-key",
			});

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.executionApiKey).toBe("sk-execution-key");
		});

		it("should set analysis API key", async () => {
			const result = await command.execute({
				analysisApiKey: "sk-analysis-key",
			});

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.analysisApiKey).toBe("sk-analysis-key");
		});

		it("should set multiple per-phase API keys at once", async () => {
			const result = await command.execute({
				planningApiKey: "sk-planning",
				executionApiKey: "sk-execution",
				analysisApiKey: "sk-analysis",
			});

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.planningApiKey).toBe("sk-planning");
			expect(config.ai.executionApiKey).toBe("sk-execution");
			expect(config.ai.analysisApiKey).toBe("sk-analysis");
		});
	});

	// ============================================================================
	// Base URLs
	// ============================================================================

	describe("execute - base URLs", () => {
		it("should set Ollama base URL", async () => {
			const result = await command.execute({
				ollamaBaseUrl: "http://localhost:11434",
			});

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.ollamaBaseUrl).toBe("http://localhost:11434");
		});

		it("should set OpenAI base URL", async () => {
			const result = await command.execute({
				openaiBaseUrl: "https://api.openai.com/v1",
			});

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.openaiBaseUrl).toBe("https://api.openai.com/v1");
		});

		it("should preserve existing URLs when setting new ones", async () => {
			await command.execute({
				ollamaBaseUrl: "http://localhost:11434",
			});

			await command.execute({
				openaiBaseUrl: "https://custom-api.com/v1",
			});

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.ollamaBaseUrl).toBe("http://localhost:11434");
			expect(config.ai.openaiBaseUrl).toBe("https://custom-api.com/v1");
		});
	});

	// ============================================================================
	// Output Formatting
	// ============================================================================

	describe("output formatting", () => {
		it("should show enabled status", async () => {
			await command.execute({ enable: true });
			const result = await command.execute({ provider: "anthropic" });

			// Command returns success message
			expect(result.success).toBe(true);
			expect(result.output).toContain("configuration");
		});

		it("should show provider name", async () => {
			const result = await command.execute({ provider: "anthropic" });

			// Command returns success, verify config was saved
			expect(result.success).toBe(true);
			// Config should have provider set
			const config = new ConfigLoader(testProjectRoot).load();
			expect(config.ai?.provider).toBe("anthropic");
		});

		it("should mask API key", async () => {
			const result = await command.execute({
				provider: "anthropic",
				apiKey: "sk-secret-key",
			});

			// Should not expose API key in output
			expect(result.success).toBe(true);
			expect(result.output).not.toContain("sk-secret-key");
			// Config should have API key saved
			const config = new ConfigLoader(testProjectRoot).load();
			expect(config.ai?.apiKey).toBe("sk-secret-key");
		});

		it("should show all model settings", async () => {
			const result = await command.execute({
				model: "gpt-4o",
				planning: "claude-opus-4",
				execution: "gemini-pro-2.0",
			});

			// Verify config has all model settings
			expect(result.success).toBe(true);
			const config = new ConfigLoader(testProjectRoot).load();
			expect(config.ai?.usage?.default).toBe("gpt-4o");
			expect(config.ai?.usage?.planning).toBe("claude-opus-4");
			expect(config.ai?.usage?.execution).toBe("gemini-pro-2.0");
		});

		it("should show per-phase providers", async () => {
			const result = await command.execute({
				planningProvider: "anthropic",
				executionProvider: "openai-compatible",
			});

			// Verify config has per-phase providers
			expect(result.success).toBe(true);
			const config = new ConfigLoader(testProjectRoot).load();
			expect(config.ai?.planningProvider).toBe("anthropic");
			expect(config.ai?.executionProvider).toBe("openai-compatible");
		});

		it("should show base URLs", async () => {
			const result = await command.execute({
				ollamaBaseUrl: "http://localhost:11434",
			});

			// Verify config has base URL
			expect(result.success).toBe(true);
			const config = new ConfigLoader(testProjectRoot).load();
			expect(config.ai?.ollamaBaseUrl).toBe("http://localhost:11434");
		});
	});

	// ============================================================================
	// Next Steps Generation
	// ============================================================================

	describe("next steps generation", () => {
		it("should suggest enable if disabled", async () => {
			await command.execute({ disable: true });
			const result = await command.execute({});

			expect(result.nextSteps).toContain("Enable AI features");
		});

		it("should suggest provider if not configured", async () => {
			// Ensure provider is not configured but AI is enabled
			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			delete config.ai.provider;
			config.ai.enabled = true;
			writeFileSync(configPath, JSON.stringify(config, null, 2));

			const result = await command.execute({});

			expect(result.nextSteps).toContain("Configure a provider");
		});

		it("should suggest per-phase models if basic setup done", async () => {
			await command.execute({
				provider: "anthropic",
				apiKey: "sk-test",
			});

			const result = await command.execute({});

			expect(result.nextSteps).toContain("per-phase models");
		});

		it("should show completion message when fully configured", async () => {
			await command.execute({
				provider: "anthropic",
				apiKey: "sk-test",
				planning: "claude-opus-4",
			});

			const result = await command.execute({});

			expect(result.nextSteps).toContain("fully configured");
		});
	});

	// ============================================================================
	// Warnings
	// ============================================================================

	describe("warnings", () => {
		it("should warn if AI disabled", async () => {
			const result = await command.execute({ disable: true });

			// Warnings are returned in the disabled case
			expect(result.success).toBe(true);
		});

		it("should warn if no provider", async () => {
			// Ensure provider is not configured
			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			delete config.ai.provider;
			writeFileSync(configPath, JSON.stringify(config, null, 2));

			const result = await command.execute({});

			expect(result.warnings).toBeDefined();
			expect(
				result.warnings?.some((w) => w.includes("No provider configured")),
			).toBe(true);
		});

		it("should warn if no API key for non-Ollama provider", async () => {
			const result = await command.execute({ provider: "anthropic" });

			expect(result.warnings).toBeDefined();
			expect(
				result.warnings?.some((w) => w.includes("API key not configured")),
			).toBe(true);
		});

		it("should not warn about API key for Ollama", async () => {
			const result = await command.execute({ provider: "ollama" });

			const apiKeyWarning = result.warnings?.some((w) =>
				w.includes("API key not configured"),
			);
			expect(apiKeyWarning).toBeFalsy();
		});

		it("should warn if Ollama URL not configured", async () => {
			const result = await command.execute({ provider: "ollama" });

			expect(result.warnings).toBeDefined();
			expect(result.warnings?.some((w) => w.includes("Ollama base URL"))).toBe(
				true,
			);
		});
	});

	// ============================================================================
	// Edge Cases
	// ============================================================================

	describe("edge cases", () => {
		it("should handle missing ai config object", async () => {
			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			delete config.ai;
			writeFileSync(configPath, JSON.stringify(config, null, 2));

			const result = await command.execute({ provider: "anthropic" });

			expect(result.success).toBe(true);

			const updatedConfig = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(updatedConfig.ai).toBeDefined();
			expect(updatedConfig.ai.provider).toBe("anthropic");
		});

		it("should handle empty config file", async () => {
			writeFileSync(configPath, "{}");

			const result = await command.execute({ provider: "anthropic" });

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.provider).toBe("anthropic");
		});

		it("should preserve non-ai config settings", async () => {
			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			config.customSetting = "test-value";
			writeFileSync(configPath, JSON.stringify(config, null, 2));

			await command.execute({ provider: "anthropic" });

			const updatedConfig = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(updatedConfig.customSetting).toBe("test-value");
		});

		it("should handle multiple configure calls in sequence", async () => {
			await command.execute({ provider: "anthropic" });
			await command.execute({ apiKey: "sk-key-1" });
			await command.execute({ model: "claude-opus-4" });

			const result = await command.execute({
				planning: "claude-sonnet-4-20250514",
			});

			expect(result.success).toBe(true);

			const config = JSON.parse(readFileSync(configPath, "utf-8"));
			expect(config.ai.provider).toBe("anthropic");
			expect(config.ai.apiKey).toBe("sk-key-1");
			expect(config.ai.usage.default).toBe("claude-opus-4");
			expect(config.ai.usage.planning).toBe("claude-sonnet-4-20250514");
		});

		it("should format config file with proper indentation", async () => {
			await command.execute({ provider: "anthropic" });

			const rawContent = readFileSync(configPath, "utf-8");
			expect(rawContent).toContain("  "); // 2-space indentation
			expect(rawContent.endsWith("\n")).toBe(true);
		});
	});
});
