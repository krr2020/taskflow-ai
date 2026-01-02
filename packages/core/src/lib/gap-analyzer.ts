import type { GapAnalysis, MigrationPlan, RequirementMatch } from "./types.js";

/**
 * Analyzes gaps between requirements and implementation
 */
export class GapAnalyzer {
	/**
	 * Analyze gaps based on requirement matches
	 */
	analyzeGaps(matches: RequirementMatch[]): GapAnalysis {
		const total = matches.length;
		const implemented = matches.filter(
			(m) => m.status === "implemented",
		).length;
		const partial = matches.filter((m) => m.status === "partial").length;
		const missing = matches.filter((m) => m.status === "missing").length;

		// Calculate percentage (partial counts as 0.5)
		const score = implemented + partial * 0.5;
		const percentComplete = total > 0 ? Math.round((score / total) * 100) : 0;

		const gaps = matches
			.filter((m) => m.status !== "implemented")
			.map((m) => ({
				requirement: m.requirement,
				priority: this.calculatePriority(m),
				effort: this.estimateEffort(m),
				suggestion: this.generateSuggestion(m),
			}));

		return {
			summary: {
				total,
				implemented,
				partial,
				missing,
				percentComplete,
			},
			gaps,
		};
	}

	/**
	 * Generate a migration plan
	 */
	generateMigrationPlan(
		from: string,
		to: string,
		_context: string,
	): MigrationPlan {
		// This would typically use an LLM to generate specific steps
		// For now, we return a template structure
		return {
			from,
			to,
			steps: [
				{
					type: "install",
					target: to,
					description: `Install ${to} package`,
					code: `npm install ${to}`,
				},
				{
					type: "uninstall",
					target: from,
					description: `Remove ${from} package`,
					code: `npm uninstall ${from}`,
				},
				{
					type: "modify",
					target: "src/**/*.ts",
					description: `Replace imports from ${from} to ${to}`,
				},
			],
			risks: [
				"Breaking changes in API",
				"Configuration differences",
				"Potential runtime errors during transition",
			],
			estimatedEffort: "Medium - requires code changes and testing",
		};
	}

	/**
	 * Calculate priority based on requirement type
	 */
	private calculatePriority(
		match: RequirementMatch,
	): GapAnalysis["gaps"][0]["priority"] {
		if (match.requirement.type === "functional") {
			return "high";
		}
		return "medium";
	}

	/**
	 * Estimate effort based on match status
	 */
	private estimateEffort(
		match: RequirementMatch,
	): GapAnalysis["gaps"][0]["effort"] {
		if (match.status === "partial") {
			return "small";
		}
		return "medium";
	}

	/**
	 * Generate suggestion based on gap
	 */
	private generateSuggestion(match: RequirementMatch): string {
		if (match.status === "partial") {
			return "Review existing code and extend to cover full requirement.";
		}
		return "Implement new module or function to satisfy requirement.";
	}
}
