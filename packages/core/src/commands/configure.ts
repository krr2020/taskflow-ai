/**
 * Configure AI command
 * Configure LLM provider and per-phase model selection
 */

import fs from "node:fs";
import path from "node:path";
import { ProviderFactory } from "../llm/factory.js";
import { BaseCommand, type CommandResult } from "./base.js";

export class ConfigureAICommand extends BaseCommand {
	async execute(options: {
		provider?: string;
		apiKey?: string;
		model?: string;
		planning?: string;
		execution?: string;
		analysis?: string;
		planningProvider?: string;
		planningApiKey?: string;
		executionProvider?: string;
		executionApiKey?: string;
		analysisProvider?: string;
		analysisApiKey?: string;
		ollamaBaseUrl?: string;
		openaiBaseUrl?: string;
		enable?: boolean;
		disable?: boolean;
	}): Promise<CommandResult> {
		const configPath = path.join(
			this.context.projectRoot,
			"taskflow.config.json",
		);

		if (!fs.existsSync(configPath)) {
			return this.failure(
				"Configuration file not found",
				[
					`taskflow.config.json not found in ${this.context.projectRoot}`,
					"Run 'taskflow init' to initialize the project first",
				],
				"Initialize taskflow with 'taskflow init'",
			);
		}

		// Load existing config
		const raw = fs.readFileSync(configPath, "utf-8");
		const config = JSON.parse(raw);

		// Check for enable/disable flags
		if (options.disable) {
			config.ai = config.ai || {};
			config.ai.enabled = false;
			this.saveConfig(config, configPath);
			return this.success(
				"AI configuration disabled",
				"AI features will not be used. Commands will show guidance only.",
				{
					aiGuidance:
						"To re-enable, run: taskflow configure ai --enable\n" +
						"Or configure a provider: taskflow configure ai --provider anthropic --apiKey $${ANTHROPIC_API_KEY}",
				},
			);
		}

		if (options.enable) {
			config.ai = config.ai || { enabled: true };
			config.ai.enabled = true;
			this.saveConfig(config, configPath);
			return this.success(
				"AI configuration enabled",
				"AI features will be used when properly configured with a provider.",
				{
					aiGuidance:
						"Configure a provider: taskflow configure ai --provider anthropic --apiKey $${ANTHROPIC_API_KEY}",
				},
			);
		}

		// Ensure ai config exists
		if (!config.ai) {
			config.ai = {
				enabled: true,
			};
		}

		// Update basic configuration
		if (options.provider) {
			config.ai.provider = options.provider;
			config.ai.enabled = true;
		}

		if (options.apiKey) {
			config.ai.apiKey = options.apiKey;
		}

		if (options.model) {
			config.ai.models = config.ai.models || { default: "gpt-4o-mini" };
			config.ai.models.default = options.model;
		}

		// Update per-phase models
		if (options.planning || options.execution || options.analysis) {
			config.ai.models = config.ai.models || { default: "gpt-4o-mini" };

			const models = config.ai.models as {
				default: string;
				planning?: string;
				execution?: string;
				analysis?: string;
			};

			if (options.planning) {
				models.planning = options.planning;
			}
			if (options.execution) {
				models.execution = options.execution;
			}
			if (options.analysis) {
				models.analysis = options.analysis;
			}
		}

		// Update per-phase providers
		if (
			options.planningProvider ||
			options.executionProvider ||
			options.analysisProvider
		) {
			if (options.planningProvider) {
				config.ai.planningProvider = options.planningProvider;
			}
			if (options.executionProvider) {
				config.ai.executionProvider = options.executionProvider;
			}
			if (options.analysisProvider) {
				config.ai.analysisProvider = options.analysisProvider;
			}
		}

		// Update per-phase API keys
		if (
			options.planningApiKey ||
			options.executionApiKey ||
			options.analysisApiKey
		) {
			if (options.planningApiKey) {
				config.ai.planningApiKey = options.planningApiKey;
			}
			if (options.executionApiKey) {
				config.ai.executionApiKey = options.executionApiKey;
			}
			if (options.analysisApiKey) {
				config.ai.analysisApiKey = options.analysisApiKey;
			}
		}

		// Update base URLs
		if (options.ollamaBaseUrl) {
			config.ai.ollamaBaseUrl = options.ollamaBaseUrl;
		}
		if (options.openaiBaseUrl) {
			config.ai.openaiBaseUrl = options.openaiBaseUrl;
		}

		// Save config
		this.saveConfig(config, configPath);

		// Generate output
		const output = this.formatConfigOutput(config.ai);
		const nextSteps = this.generateNextSteps(config.ai);

		return this.success("AI configuration updated successfully", nextSteps, {
			aiGuidance: output,
			warnings: this.getWarnings(config.ai),
		});
	}

	private saveConfig(
		config: Record<string, unknown>,
		configPath: string,
	): void {
		fs.writeFileSync(configPath, `${JSON.stringify(config, null, 2)}\n`);
	}

	private formatConfigOutput(aiConfig: Record<string, unknown>): string {
		const lines: string[] = [];
		lines.push("AI Configuration:");
		lines.push("─".repeat(60));
		lines.push(`Enabled: ${(aiConfig.enabled as boolean) ? "✓" : "✗"}`);
		lines.push(`Provider: ${aiConfig.provider || "Not configured"}`);
		lines.push(
			`API Key: ${aiConfig.apiKey ? "***configured***" : "Not configured"}`,
		);
		lines.push("");
		lines.push("Models:");
		const models = aiConfig.models as {
			default?: string;
			planning?: string;
			execution?: string;
			analysis?: string;
		};
		lines.push(`  Default: ${models?.default || "Not configured"}`);
		lines.push(`  Planning: ${models?.planning || "Uses default"}`);
		lines.push(`  Execution: ${models?.execution || "Uses default"}`);
		lines.push(`  Analysis: ${models?.analysis || "Uses default"}`);
		lines.push("");
		lines.push("Per-Phase Providers:");
		lines.push(
			`  Planning: ${aiConfig.planningProvider || "Uses default provider"}`,
		);
		lines.push(
			`  Execution: ${aiConfig.executionProvider || "Uses default provider"}`,
		);
		lines.push(
			`  Analysis: ${aiConfig.analysisProvider || "Uses default provider"}`,
		);
		lines.push("");
		lines.push("Base URLs:");
		lines.push(
			`  Ollama: ${aiConfig.ollamaBaseUrl || "http://localhost:11434"}`,
		);
		lines.push(
			`  OpenAI: ${aiConfig.openaiBaseUrl || "https://api.openai.com/v1"}`,
		);

		return lines.join("\n");
	}

	private generateNextSteps(aiConfig: Record<string, unknown>): string {
		if (!aiConfig.enabled) {
			return "Enable AI features: taskflow configure ai --enable";
		}

		if (!aiConfig.provider || !aiConfig.apiKey) {
			const availableProviders = ProviderFactory.getAvailableProviders();
			const examples: string[] = [];

			if (availableProviders.includes("anthropic")) {
				examples.push(
					"  taskflow configure ai --provider anthropic --apiKey $${ANTHROPIC_API_KEY}",
				);
			}
			if (availableProviders.includes("openai-compatible")) {
				examples.push(
					"  taskflow configure ai --provider openai-compatible --apiKey $${OPENAI_API_KEY}",
				);
			}
			if (availableProviders.includes("ollama")) {
				examples.push("  taskflow configure ai --provider ollama");
			}

			return `Configure a provider:\n${examples.join("\n")}`;
		}

		const models = aiConfig.models as
			| { planning?: string; execution?: string; analysis?: string }
			| undefined;
		if (!models?.planning && !models?.execution && !models?.analysis) {
			return (
				"Configure per-phase models (optional):\n" +
				"  taskflow configure ai --planning claude-opus-4 --execution gemini-pro-2.0 --analysis claude-sonnet-4-20250514"
			);
		}

		return "AI is fully configured. Try running: taskflow tasks generate";
	}

	private getWarnings(aiConfig: Record<string, unknown>): string[] {
		const warnings: string[] = [];

		if (!aiConfig.enabled) {
			warnings.push("AI is disabled. Commands will show guidance only.");
		}

		if (!aiConfig.provider) {
			warnings.push("No provider configured. Set one with --provider option.");
		}

		if (
			aiConfig.provider &&
			!aiConfig.apiKey &&
			aiConfig.provider !== "ollama"
		) {
			warnings.push("API key not configured for this provider.");
		}

		if (aiConfig.provider === "ollama" && !aiConfig.ollamaBaseUrl) {
			warnings.push(
				"Ollama base URL not configured. Using default: http://localhost:11434",
			);
		}

		return warnings;
	}
}
