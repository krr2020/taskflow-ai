import { Colors, Separator, Text } from "@/lib/ui/components";
import type { ModelUsage, SessionUsage } from "@/llm/cost-tracker";

/**
 * Create a progress bar for visual token usage representation
 */
function createProgressBar(used: number, total: number, width = 20): string {
	const percentage = Math.min((used / total) * 100, 100);
	const filled = Math.round((percentage / 100) * width);
	const empty = width - filled;

	const bar = "█".repeat(filled) + "░".repeat(empty);
	const percentText = `${percentage.toFixed(1)}%`;

	// Color based on usage
	let coloredBar: string;
	if (percentage < 50) {
		coloredBar = Colors.success(bar);
	} else if (percentage < 80) {
		coloredBar = Colors.warning(bar);
	} else {
		coloredBar = Colors.error(bar);
	}

	return `[${coloredBar}] ${percentText}`;
}

/**
 * Get typical context window size for common models
 */
function getContextLimit(model: string): number {
	// Common model context limits
	if (model.includes("gpt-4o")) return 128000;
	if (model.includes("gpt-4-turbo")) return 128000;
	if (model.includes("gpt-4")) return 8192;
	if (model.includes("gpt-3.5-turbo")) return 16385;
	if (model.includes("claude-3-5-sonnet")) return 200000;
	if (model.includes("claude-3-opus")) return 200000;
	if (model.includes("claude-3-sonnet")) return 200000;
	if (model.includes("claude-3-haiku")) return 200000;
	if (model.includes("claude-2")) return 100000;

	// Default fallback
	return 128000;
}

/**
 * Utility to display LLM usage and cost information
 */
export const UsageDisplay = {
	/**
	 * Display usage statistics for a specific operation
	 */
	show(
		usage: ModelUsage,
		session?: SessionUsage,
		options: { verbose?: boolean; showProgress?: boolean } = {},
	): void {
		const dim = Colors.muted;
		const bold = Colors.bold;
		const cyan = Colors.primary;

		// Calculate cost color based on amount (visual feedback)
		const getCostColor = (cost: number) => {
			if (cost < 0.01) return Colors.success;
			if (cost < 0.1) return Colors.warning;
			return Colors.error;
		};

		const costColor = getCostColor(usage.estimatedCost);
		const totalCostColor = session
			? getCostColor(session.totalCost)
			: getCostColor(0);

		// Enhanced display with progress bar
		if (options.verbose || options.showProgress) {
			console.log(Separator.heavy(70));
			console.log(Text.heading("💡 LLM Usage"));
			console.log(Separator.heavy(70));

			const contextLimit = getContextLimit(usage.model);
			const progressBar = createProgressBar(usage.totalTokens, contextLimit);

			console.log(
				`${bold("Tokens:")}     ${usage.totalTokens.toLocaleString()} / ${contextLimit.toLocaleString()}  ${progressBar}`,
			);
			console.log(
				`  ${dim("→ Input:")}  ${usage.promptTokens.toLocaleString()} tokens`,
			);
			console.log(
				`  ${dim("→ Output:")} ${usage.completionTokens.toLocaleString()} tokens`,
			);
			console.log(`${bold("Model:")}      ${cyan(usage.model)}`);
			console.log(
				`${bold("Cost:")}       ${costColor(`$${usage.estimatedCost.toFixed(4)}`)}`,
			);

			if (session) {
				console.log();
				console.log(
					`${bold("Session Total:")} ${session.totalCalls} calls | ${session.totalTokens.toLocaleString()} tokens | ${totalCostColor(`$${session.totalCost.toFixed(4)}`)}`,
				);
			}

			console.log(Separator.heavy(70));
		} else {
			// Compact single-line display
			console.log(dim("─".repeat(60)));

			const tokens = `${usage.totalTokens.toLocaleString()} tokens`;
			const cost = `$${usage.estimatedCost.toFixed(4)}`;
			const model = usage.model;

			let output = `${dim("LLM Usage:")} ${bold(tokens)} ${dim("|")} ${costColor(cost)} ${dim(`(${model})`)}`;

			if (session) {
				const sessionCost = `$${session.totalCost.toFixed(4)}`;
				output += ` ${dim("| Session:")} ${totalCostColor(sessionCost)}`;
			}

			console.log(output);
			console.log(dim("─".repeat(60)));
		}
	},

	/**
	 * Show a warning when context limit is approaching
	 */
	showContextWarning(used: number, limit: number): void {
		const percentage = (used / limit) * 100;
		const color = percentage > 90 ? Colors.error : Colors.warning;

		console.log(
			color(
				`\n⚠️  Context usage high: ${used.toLocaleString()} / ${limit.toLocaleString()} tokens (${percentage.toFixed(1)}%)`,
			),
		);
		console.log(Text.muted("   Compacting context to prevent failure..."));
	},
};
