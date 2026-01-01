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
		addModel?: string;
		removeModel?: string;
		setDefault?: string;
		setPlanning?: string;
		setExecution?: string;
		setAnalysis?: string;
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

		// Handle new model management options
		if (
			options.addModel ||
			options.removeModel ||
			options.setDefault ||
			options.setPlanning ||
			options.setExecution ||
			options.setAnalysis
		) {
			return this.handleModelManagement(config, configPath, options);
		}

		// Update basic configuration (legacy support)
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

		// Update per-phase models (legacy support)
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

		// Update per-phase providers (legacy support)
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

		// Update per-phase API keys (legacy support)
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
		const output = this.formatConfigOutput(
			config.ai as Record<string, unknown>,
		);
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

	private handleModelManagement(
		config: Record<string, unknown>,
		configPath: string,
		options: {
			addModel?: string;
			removeModel?: string;
			setDefault?: string;
			setPlanning?: string;
			setExecution?: string;
			setAnalysis?: string;
		},
	): CommandResult {
		// Initialize new config structure
		if (!config.ai || typeof config.ai !== "object") {
			return this.failure(
				"AI configuration not found",
				[
					"Please enable AI first with: taskflow configure ai --enable",
					"Then configure a default model before adding more models.",
				],
				"Run: taskflow configure ai --enable",
			);
		}

		const aiConfig = config.ai as Record<string, unknown>;

		// Handle remove model
		if (options.removeModel) {
			if (!aiConfig.models || typeof aiConfig.models !== "object") {
				return this.failure(
					"No models defined",
					["No models to remove in the configuration."],
					"Add a model first with: taskflow configure ai --addModel",
				);
			}

			const models = aiConfig.models as Record<string, unknown>;
			if (!(options.removeModel in models)) {
				return this.failure(
					`Model "${options.removeModel}" not found`,
					[`Available models: ${Object.keys(models).join(", ")}`],
					"List available models or check the spelling.",
				);
			}

			delete models[options.removeModel];
			this.saveConfig(config, configPath);

			return this.success(
				`Model "${options.removeModel}" removed successfully`,
				"Update your usage mappings to use different models if needed.",
				{
					aiGuidance: this.formatConfigOutput(
						config.ai as Record<string, unknown>,
					),
				},
			);
		}

		// Handle usage mapping updates
		if (
			options.setDefault ||
			options.setPlanning ||
			options.setExecution ||
			options.setAnalysis
		) {
			if (!aiConfig.usage || typeof aiConfig.usage !== "object") {
				return this.failure(
					"No usage mapping defined",
					["Define usage mappings after adding models."],
					"Add models first with: taskflow configure ai --addModel",
				);
			}

			const usage = aiConfig.usage as Record<string, unknown>;

			if (options.setDefault) {
				if (
					!aiConfig.models ||
					typeof aiConfig.models !== "object" ||
					!(options.setDefault in (aiConfig.models as Record<string, unknown>))
				) {
					return this.failure(
						`Model "${options.setDefault}" not found`,
						[
							"Available models: " +
								(aiConfig.models
									? Object.keys(
											aiConfig.models as Record<string, unknown>,
										).join(", ")
									: "none"),
						],
						"Check available models before setting as default.",
					);
				}
				usage.default = options.setDefault;
			}
			if (options.setPlanning) {
				if (
					!aiConfig.models ||
					typeof aiConfig.models !== "object" ||
					!(options.setPlanning in (aiConfig.models as Record<string, unknown>))
				) {
					return this.failure(
						`Model "${options.setPlanning}" not found`,
						[
							"Available models: " +
								(aiConfig.models
									? Object.keys(
											aiConfig.models as Record<string, unknown>,
										).join(", ")
									: "none"),
						],
						"Check available models before setting for planning.",
					);
				}
				usage.planning = options.setPlanning;
			}
			if (options.setExecution) {
				if (
					!aiConfig.models ||
					typeof aiConfig.models !== "object" ||
					!(
						options.setExecution in (aiConfig.models as Record<string, unknown>)
					)
				) {
					return this.failure(
						`Model "${options.setExecution}" not found`,
						[
							"Available models: " +
								(aiConfig.models
									? Object.keys(
											aiConfig.models as Record<string, unknown>,
										).join(", ")
									: "none"),
						],
						"Check available models before setting for execution.",
					);
				}
				usage.execution = options.setExecution;
			}
			if (options.setAnalysis) {
				if (
					!aiConfig.models ||
					typeof aiConfig.models !== "object" ||
					!(options.setAnalysis in (aiConfig.models as Record<string, unknown>))
				) {
					return this.failure(
						`Model "${options.setAnalysis}" not found`,
						[
							"Available models: " +
								(aiConfig.models
									? Object.keys(
											aiConfig.models as Record<string, unknown>,
										).join(", ")
									: "none"),
						],
						"Check available models before setting for analysis.",
					);
				}
				usage.analysis = options.setAnalysis;
			}

			this.saveConfig(config, configPath);
			return this.success(
				"Usage mapping updated successfully",
				"AI will now use the specified models for each phase.",
				{
					aiGuidance: this.formatConfigOutput(
						config.ai as Record<string, unknown>,
					),
				},
			);
		}

		// Handle add model
		if (options.addModel) {
			// Parse model definition from JSON string
			let modelDef: Record<string, unknown>;
			try {
				modelDef = JSON.parse(options.addModel) as Record<string, unknown>;
			} catch {
				return this.failure(
					"Invalid model definition",
					[
						"Model definition must be valid JSON.",
						'Example: \'{"provider":"anthropic","model":"claude-3-5-sonnet","apiKey":"${ANTHROPIC_API_KEY}"}\'',
					],
					"Provide valid JSON for model definition.",
				);
			}

			// Validate required fields
			if (!modelDef.provider || !modelDef.model) {
				return this.failure(
					"Missing required fields",
					["Model definition must include 'provider' and 'model' fields."],
					"Include provider and model in your JSON.",
				);
			}

			// Initialize models and usage objects
			if (!aiConfig.models || typeof aiConfig.models !== "object") {
				aiConfig.models = {};
			}
			const models = aiConfig.models as Record<string, Record<string, unknown>>;

			// Use model name as key if no name provided
			const modelKey = (modelDef.name as string) || (modelDef.model as string);
			models[modelKey] = modelDef;

			// Initialize usage if first model
			if (!aiConfig.usage || typeof aiConfig.usage !== "object") {
				aiConfig.usage = {
					default: modelKey,
				};
			} else {
				const usage = aiConfig.usage as Record<string, unknown>;
				if (!usage.default) {
					usage.default = modelKey;
				}
			}

			aiConfig.enabled = true;
			this.saveConfig(config, configPath);

			return this.success(
				`Model "${modelKey}" added successfully`,
				"Set usage mappings to use this model for specific phases.",
				{
					aiGuidance: this.formatConfigOutput(
						config.ai as Record<string, unknown>,
					),
					warnings: [
						"You may want to configure usage mappings for this model.",
					],
				},
			);
		}

		return this.failure(
			"Invalid model management request",
			[
				"Please specify an action: --addModel, --removeModel, or usage mapping options.",
			],
			"Check the available options for model management.",
		);
	}

	private formatConfigOutput(aiConfig: Record<string, unknown>): string {
		const lines: string[] = [];
		lines.push("AI Configuration:");
		lines.push("─".repeat(60));
		lines.push(`Enabled: ${(aiConfig.enabled as boolean) ? "✓" : "✗"}`);

		// New format: models and usage
		if (aiConfig.models && typeof aiConfig.models === "object") {
			lines.push("");
			lines.push("Model Definitions:");
			const models = aiConfig.models as Record<string, Record<string, unknown>>;
			for (const [key, model] of Object.entries(models)) {
				lines.push(`  ${key}:`);
				lines.push(`    Provider: ${model.provider}`);
				lines.push(`    Model: ${model.model}`);
				if (model.baseUrl) {
					lines.push(`    Base URL: ${model.baseUrl}`);
				}
				lines.push(
					`    API Key: ${model.apiKey ? "***configured***" : "Not configured"}`,
				);
			}

			if (aiConfig.usage && typeof aiConfig.usage === "object") {
				lines.push("");
				lines.push("Usage Mapping:");
				const usage = aiConfig.usage as Record<string, unknown>;
				lines.push(`  Default: ${usage.default || "Not configured"}`);
				lines.push(
					`  Planning: ${(usage.planning as string) || "Uses default"}`,
				);
				lines.push(
					`  Execution: ${(usage.execution as string) || "Uses default"}`,
				);
				lines.push(
					`  Analysis: ${(usage.analysis as string) || "Uses default"}`,
				);
			}
		} else {
			// Legacy format support
			lines.push("");
			lines.push(`Provider: ${aiConfig.provider || "Not configured"}`);
			lines.push(
				`API Key: ${aiConfig.apiKey ? "***configured***" : "Not configured"}`,
			);

			if (aiConfig.models && typeof aiConfig.models === "object") {
				const models = aiConfig.models as Record<string, unknown>;
				lines.push("");
				lines.push("Models (Legacy Format):");
				lines.push(`  Default: ${models.default || "Not configured"}`);
				lines.push(`  Planning: ${models.planning || "Uses default"}`);
				lines.push(`  Execution: ${models.execution || "Uses default"}`);
				lines.push(`  Analysis: ${models.analysis || "Uses default"}`);
			}

			lines.push("");
			lines.push("Per-Phase Providers (Legacy):");
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
		}

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
