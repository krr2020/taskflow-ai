import { describe, expect, it } from "vitest";
import { GapAnalyzer } from "@/lib/analysis/gap-analyzer";
import type { RequirementMatch } from "@/lib/core/types";

describe("GapAnalyzer", () => {
	const analyzer = new GapAnalyzer();

	it("should analyze gaps correctly", () => {
		const matches: RequirementMatch[] = [
			{
				requirement: { id: "1", text: "Login", type: "functional" },
				status: "implemented",
				confidence: 0.9,
				evidence: [],
			},
			{
				requirement: { id: "2", text: "Payment", type: "functional" },
				status: "partial",
				confidence: 0.5,
				evidence: [],
			},
			{
				requirement: { id: "3", text: "Upload", type: "functional" },
				status: "missing",
				confidence: 0.1,
				evidence: [],
			},
		];

		const analysis = analyzer.analyzeGaps(matches);

		expect(analysis.summary.total).toBe(3);
		expect(analysis.summary.implemented).toBe(1);
		expect(analysis.summary.partial).toBe(1);
		expect(analysis.summary.missing).toBe(1);
		expect(analysis.summary.percentComplete).toBe(50); // (1 + 0.5) / 3 * 100 = 50%

		expect(analysis.gaps).toHaveLength(2);
		expect(analysis.gaps[0]?.requirement.text).toBe("Payment");
		expect(analysis.gaps[0]?.priority).toBe("high"); // Functional = high
		expect(analysis.gaps[0]?.effort).toBe("small"); // Partial = small

		expect(analysis.gaps[1]?.requirement.text).toBe("Upload");
		expect(analysis.gaps[1]?.effort).toBe("medium"); // Missing = medium
	});

	it("should generate migration plan", () => {
		const plan = analyzer.generateMigrationPlan(
			"express",
			"fastify",
			"context",
		);

		expect(plan.from).toBe("express");
		expect(plan.to).toBe("fastify");
		expect(plan.steps).toHaveLength(3);
		expect(plan.steps[0]?.type).toBe("install");
		expect(plan.steps[1]?.type).toBe("uninstall");
		expect(plan.steps[2]?.type).toBe("modify");
	});
});
