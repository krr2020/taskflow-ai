import pc from "picocolors";
import type { ModelUsage, SessionUsage } from "../llm/cost-tracker.js";

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
		options: { verbose?: boolean } = {},
	): void {
		const dim = pc.dim;
		const bold = pc.bold;
		const cyan = pc.cyan;

		// Calculate cost color based on amount (visual feedback)
		const getCostColor = (cost: number) => {
			if (cost < 0.01) return pc.green;
			if (cost < 0.1) return pc.yellow;
			return pc.red;
		};

		const costColor = getCostColor(usage.estimatedCost);
		const totalCostColor = session
			? getCostColor(session.totalCost)
			: getCostColor(0);

		console.log(dim("─".repeat(60)));

		// Single line summary for standard view
		if (!options.verbose) {
			const tokens = `${usage.totalTokens.toLocaleString()} tokens`;
			const cost = `$${usage.estimatedCost.toFixed(4)}`;
			const model = usage.model;

			let output = `${dim("LLM Usage:")} ${bold(tokens)} ${dim("|")} ${costColor(cost)} ${dim(`(${model})`)}`;

			if (session) {
				const sessionCost = `$${session.totalCost.toFixed(4)}`;
				output += ` ${dim("| Session Total:")} ${totalCostColor(sessionCost)}`;
			}

			console.log(output);
		} else {
			// Verbose view
			console.log(bold("LLM Usage Report"));
			console.log(`${dim("Model:")}      ${cyan(usage.model)}`);
			console.log(
				`${dim("Tokens:")}     ${usage.totalTokens.toLocaleString()} (${usage.promptTokens.toLocaleString()} in / ${usage.completionTokens.toLocaleString()} out)`,
			);
			console.log(
				`${dim("Cost:")}       ${costColor(`$${usage.estimatedCost.toFixed(5)}`)}`,
			);

			if (session) {
				console.log(dim("-".repeat(30)));
				console.log(`${dim("Session:")}    ${session.totalCalls} calls`);
				console.log(
					`${dim("Total Cost:")} ${totalCostColor(`$${session.totalCost.toFixed(4)}`)}`,
				);
			}
		}

		console.log(dim("─".repeat(60)));
	},

	/**
	 * Show a warning when context limit is approaching
	 */
	showContextWarning(used: number, limit: number): void {
		const percentage = (used / limit) * 100;
		const color = percentage > 90 ? pc.red : pc.yellow;

		console.log(
			color(
				`\n⚠️  Context usage high: ${used.toLocaleString()} / ${limit.toLocaleString()} tokens (${percentage.toFixed(1)}%)`,
			),
		);
		console.log(pc.dim("   Compacting context to prevent failure..."));
	},
};
