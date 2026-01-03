import { describe, expect, it } from "vitest";
import { PRDMatcher } from "../../src/lib/analysis/prd-matcher.js";
import type { DiscoveredFeature } from "../../src/lib/core/types.js";

describe("PRDMatcher", () => {
	const mockFeatures: DiscoveredFeature[] = [
		{
			name: "Auth Feature",
			type: "auth",
			files: ["/src/auth.ts"],
			confidence: "high",
			patterns: [
				{
					pattern: "passport",
					matches: [
						{
							file: "/src/auth.ts",
							line: 1,
							snippet: "import passport from 'passport';",
						},
					],
				},
			],
		},
		{
			name: "Payment Feature",
			type: "payment",
			files: ["/src/payment.ts"],
			confidence: "medium",
			patterns: [
				{
					pattern: "stripe",
					matches: [
						{
							file: "/src/payment.ts",
							line: 10,
							snippet: "const stripe = require('stripe');",
						},
					],
				},
			],
		},
	];

	const matcher = new PRDMatcher();

	it("should extract functional requirements", async () => {
		const prdContent = `
# My PRD

## Functional Requirements
1. User must be able to login with passport
2. System must process payments via stripe
`;
		const matches = await matcher.matchRequirements(prdContent, mockFeatures);

		expect(matches).toHaveLength(2);
		expect(matches[0]?.requirement.text).toBe(
			"User must be able to login with passport",
		);
		expect(matches[0]?.requirement.type).toBe("functional");
	});

	it("should extract non-functional requirements", async () => {
		const prdContent = `
# My PRD

## Non-Functional Requirements
1. System must respond in 200ms
`;
		const matches = await matcher.matchRequirements(prdContent, mockFeatures);

		expect(matches).toHaveLength(1);
		expect(matches[0]?.requirement.text).toBe("System must respond in 200ms");
		expect(matches[0]?.requirement.type).toBe("non-functional");
	});

	it("should match requirements to features using keywords", async () => {
		const prdContent = `
# My PRD

## Functional Requirements
1. User must be able to login with passport
2. System must process payments via stripe
3. User must be able to upload files
`;
		const matches = await matcher.matchRequirements(prdContent, mockFeatures);

		// 1. Passport match
		const authMatch = matches.find((m) =>
			m.requirement.text.includes("passport"),
		);
		expect(authMatch).toBeDefined();
		expect(authMatch?.status).not.toBe("missing"); // Should be implemented or partial
		expect(authMatch?.evidence.length).toBeGreaterThan(0);

		// 2. Stripe match
		const paymentMatch = matches.find((m) =>
			m.requirement.text.includes("stripe"),
		);
		expect(paymentMatch).toBeDefined();
		expect(paymentMatch?.status).not.toBe("missing");

		// 3. Upload match (should be missing)
		const uploadMatch = matches.find((m) =>
			m.requirement.text.includes("upload"),
		);
		expect(uploadMatch).toBeDefined();
		expect(uploadMatch?.status).toBe("missing");
	});
});
