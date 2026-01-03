/**
 * Cost Tracker for LLM Usage
 * Tracks token usage and calculates costs across different models and sessions
 */

import type { LLMGenerationResult } from "@/llm/base";

/**
 * Pricing per 1M tokens for common models
 * Update these as providers change pricing
 */
export interface ModelPricing {
	promptTokensPer1M: number;
	completionTokensPer1M: number;
}

/**
 * Default pricing for common models (USD per 1M tokens)
 * Sources: OpenAI, Anthropic, Z.AI pricing pages as of Jan 2025
 */
export const DEFAULT_MODEL_PRICING: Record<string, ModelPricing> = {
	// OpenAI GPT-4o
	"gpt-4o": {
		promptTokensPer1M: 2.5,
		completionTokensPer1M: 10.0,
	},
	"gpt-4o-mini": {
		promptTokensPer1M: 0.15,
		completionTokensPer1M: 0.6,
	},

	// Anthropic Claude
	"claude-3-5-sonnet-20241022": {
		promptTokensPer1M: 3.0,
		completionTokensPer1M: 15.0,
	},
	"claude-3-5-haiku-20241022": {
		promptTokensPer1M: 0.8,
		completionTokensPer1M: 4.0,
	},
	"claude-3-opus-20240229": {
		promptTokensPer1M: 15.0,
		completionTokensPer1M: 75.0,
	},

	// Z.AI GLM Models
	"glm-4.7": {
		promptTokensPer1M: 1.0,
		completionTokensPer1M: 1.0,
	},
	"glm-4.1": {
		promptTokensPer1M: 1.5,
		completionTokensPer1M: 1.5,
	},

	// Generic fallback (conservative estimate)
	default: {
		promptTokensPer1M: 2.0,
		completionTokensPer1M: 8.0,
	},
};

/**
 * Usage statistics for a single model
 */
export interface ModelUsage {
	model: string;
	calls: number;
	promptTokens: number;
	completionTokens: number;
	totalTokens: number;
	estimatedCost: number;
}

/**
 * Session-level usage tracking
 */
export interface SessionUsage {
	sessionId: string;
	startTime: Date;
	endTime?: Date;
	models: Record<string, ModelUsage>;
	totalCost: number;
	totalTokens: number;
	totalCalls: number;
}

/**
 * Budget configuration
 */
export interface BudgetConfig {
	maxCostPerSession?: number;
	maxCostPerDay?: number;
	maxCostPerMonth?: number;
	warnThreshold?: number; // Percentage (e.g., 80 = warn at 80%)
}

/**
 * Cost Tracker class
 * Tracks LLM usage and calculates costs
 */
export class CostTracker {
	private currentSession: SessionUsage;
	private sessionHistory: SessionUsage[] = [];
	private customPricing: Record<string, ModelPricing>;
	private budgetConfig?: BudgetConfig;

	constructor(
		sessionId?: string,
		customPricing?: Record<string, ModelPricing>,
		budgetConfig?: BudgetConfig,
	) {
		this.currentSession = {
			sessionId: sessionId ?? this.generateSessionId(),
			startTime: new Date(),
			models: {},
			totalCost: 0,
			totalTokens: 0,
			totalCalls: 0,
		};
		this.customPricing = customPricing ?? {};
		if (budgetConfig !== undefined) {
			this.budgetConfig = budgetConfig;
		}
	}

	/**
	 * Track a single LLM generation result
	 */
	trackUsage(result: LLMGenerationResult): void {
		const model = result.model;
		const promptTokens = result.promptTokens ?? 0;
		const completionTokens = result.completionTokens ?? 0;
		const totalTokens = result.tokensUsed ?? promptTokens + completionTokens;

		// Get or create model usage entry
		if (!this.currentSession.models[model]) {
			this.currentSession.models[model] = {
				model,
				calls: 0,
				promptTokens: 0,
				completionTokens: 0,
				totalTokens: 0,
				estimatedCost: 0,
			};
		}

		const usage = this.currentSession.models[model];
		usage.calls++;
		usage.promptTokens += promptTokens;
		usage.completionTokens += completionTokens;
		usage.totalTokens += totalTokens;

		// Calculate cost
		const cost = this.calculateCost(model, promptTokens, completionTokens);
		usage.estimatedCost += cost;

		// Update session totals
		this.currentSession.totalCalls++;
		this.currentSession.totalTokens += totalTokens;
		this.currentSession.totalCost += cost;

		// Check budget warnings
		this.checkBudgetWarnings();
	}

	/**
	 * Calculate cost for a specific model and token usage
	 */
	calculateCost(
		model: string,
		promptTokens: number,
		completionTokens: number,
	): number {
		const pricing = this.getPricing(model);

		const promptCost = (promptTokens / 1_000_000) * pricing.promptTokensPer1M;
		const completionCost =
			(completionTokens / 1_000_000) * pricing.completionTokensPer1M;

		return promptCost + completionCost;
	}

	/**
	 * Get pricing for a specific model
	 */
	private getPricing(model: string): ModelPricing {
		// Check custom pricing first
		const customPrice = this.customPricing[model];
		if (customPrice) {
			return customPrice;
		}

		// Check default pricing
		const defaultPrice = DEFAULT_MODEL_PRICING[model];
		if (defaultPrice) {
			return defaultPrice;
		}

		// Fall back to default pricing
		const fallbackPrice = DEFAULT_MODEL_PRICING.default;
		if (fallbackPrice) {
			return fallbackPrice;
		}

		// Ultimate fallback (should never happen, but makes TypeScript happy)
		return {
			promptTokensPer1M: 2.0,
			completionTokensPer1M: 8.0,
		};
	}

	/**
	 * Get current session usage
	 */
	getCurrentSession(): SessionUsage {
		return { ...this.currentSession };
	}

	/**
	 * Get total cost for current session
	 */
	getTotalCost(): number {
		return this.currentSession.totalCost;
	}

	/**
	 * Get total tokens for current session
	 */
	getTotalTokens(): number {
		return this.currentSession.totalTokens;
	}

	/**
	 * Get usage for a specific model
	 */
	getModelUsage(model: string): ModelUsage | undefined {
		const usage = this.currentSession.models[model];
		return usage !== undefined ? usage : undefined;
	}

	/**
	 * Get all model usage statistics
	 */
	getAllModelUsage(): ModelUsage[] {
		return Object.values(this.currentSession.models);
	}

	/**
	 * Generate a formatted cost report
	 */
	getReport(verbose = false): string {
		const lines: string[] = [];

		lines.push("=== LLM Cost Report ===");
		lines.push(`Session: ${this.currentSession.sessionId}`);
		lines.push(
			`Duration: ${this.currentSession.startTime.toISOString()} - ${this.currentSession.endTime?.toISOString() ?? "ongoing"}`,
		);
		lines.push("");

		// Per-model breakdown
		if (verbose) {
			lines.push("Model Breakdown:");
			for (const usage of Object.values(this.currentSession.models)) {
				lines.push(`  ${usage.model}:`);
				lines.push(`    Calls: ${usage.calls}`);
				lines.push(`    Tokens: ${usage.totalTokens.toLocaleString()}`);
				lines.push(
					`    Prompt: ${usage.promptTokens.toLocaleString()} | Completion: ${usage.completionTokens.toLocaleString()}`,
				);
				lines.push(`    Cost: $${usage.estimatedCost.toFixed(4)}`);
			}
			lines.push("");
		}

		// Session totals
		lines.push("Session Totals:");
		lines.push(`  Total Calls: ${this.currentSession.totalCalls}`);
		lines.push(
			`  Total Tokens: ${this.currentSession.totalTokens.toLocaleString()}`,
		);
		lines.push(`  Total Cost: $${this.currentSession.totalCost.toFixed(4)}`);

		// Budget status
		if (this.budgetConfig?.maxCostPerSession) {
			const percentage =
				(this.currentSession.totalCost / this.budgetConfig.maxCostPerSession) *
				100;
			lines.push("");
			lines.push("Budget Status:");
			lines.push(
				`  Session Budget: $${this.budgetConfig.maxCostPerSession.toFixed(2)}`,
			);
			lines.push(
				`  Used: $${this.currentSession.totalCost.toFixed(4)} (${percentage.toFixed(1)}%)`,
			);
		}

		return lines.join("\n");
	}

	/**
	 * Get a concise one-line summary
	 */
	getSummary(): string {
		return `${this.currentSession.totalCalls} calls | ${this.currentSession.totalTokens.toLocaleString()} tokens | $${this.currentSession.totalCost.toFixed(4)}`;
	}

	/**
	 * Check if budget warnings should be displayed
	 */
	private checkBudgetWarnings(): void {
		if (!this.budgetConfig) {
			return;
		}

		const warnThreshold = this.budgetConfig.warnThreshold ?? 80;

		// Check session budget
		if (this.budgetConfig.maxCostPerSession) {
			const percentage =
				(this.currentSession.totalCost / this.budgetConfig.maxCostPerSession) *
				100;

			if (percentage >= 100) {
				console.warn(
					`⚠️  SESSION BUDGET EXCEEDED: $${this.currentSession.totalCost.toFixed(4)} / $${this.budgetConfig.maxCostPerSession.toFixed(2)}`,
				);
			} else if (percentage >= warnThreshold) {
				console.warn(
					`⚠️  Session budget warning: $${this.currentSession.totalCost.toFixed(4)} / $${this.budgetConfig.maxCostPerSession.toFixed(2)} (${percentage.toFixed(1)}%)`,
				);
			}
		}
	}

	/**
	 * Check if over budget
	 */
	isOverBudget(): boolean {
		if (!this.budgetConfig?.maxCostPerSession) {
			return false;
		}

		return this.currentSession.totalCost > this.budgetConfig.maxCostPerSession;
	}

	/**
	 * Get remaining budget
	 */
	getRemainingBudget(): number | null {
		if (!this.budgetConfig?.maxCostPerSession) {
			return null;
		}

		return Math.max(
			0,
			this.budgetConfig.maxCostPerSession - this.currentSession.totalCost,
		);
	}

	/**
	 * End current session and start a new one
	 */
	endSession(): SessionUsage {
		this.currentSession.endTime = new Date();
		const endedSession = { ...this.currentSession };
		this.sessionHistory.push(endedSession);

		// Start new session
		const newSessionId = this.generateSessionId();
		this.currentSession = {
			sessionId: newSessionId,
			startTime: new Date(),
			models: {},
			totalCost: 0,
			totalTokens: 0,
			totalCalls: 0,
		};

		return endedSession;
	}

	/**
	 * Get session history
	 */
	getSessionHistory(): SessionUsage[] {
		return [...this.sessionHistory];
	}

	/**
	 * Export usage data for persistence
	 */
	export(): {
		currentSession: SessionUsage;
		sessionHistory: SessionUsage[];
	} {
		return {
			currentSession: { ...this.currentSession },
			sessionHistory: [...this.sessionHistory],
		};
	}

	/**
	 * Import usage data from persistence
	 */
	import(data: {
		currentSession: SessionUsage;
		sessionHistory: SessionUsage[];
	}): void {
		this.currentSession = { ...data.currentSession };
		this.sessionHistory = [...data.sessionHistory];
	}

	/**
	 * Generate a unique session ID
	 */
	private generateSessionId(): string {
		return `session-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
	}

	/**
	 * Reset current session
	 */
	reset(): void {
		this.currentSession = {
			sessionId: this.generateSessionId(),
			startTime: new Date(),
			models: {},
			totalCost: 0,
			totalTokens: 0,
			totalCalls: 0,
		};
	}

	/**
	 * Set budget configuration
	 */
	setBudget(budgetConfig: BudgetConfig): void {
		this.budgetConfig = budgetConfig;
	}

	/**
	 * Update custom pricing
	 */
	updatePricing(model: string, pricing: ModelPricing): void {
		if (pricing !== undefined) {
			this.customPricing[model] = pricing;
		}
	}
}
