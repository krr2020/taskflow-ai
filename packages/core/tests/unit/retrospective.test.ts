/**
 * Unit tests for retrospective module
 */

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
	isValidCategory,
	isValidCriticality,
	loadRetrospective,
	parseRetrospectiveContent,
	VALID_CATEGORIES,
	VALID_CRITICALITIES,
} from "../../src/lib/retrospective.js";
import { createTestDir } from "../setup.js";

describe("retrospective", () => {
	let testDir: string;
	let refDir: string;

	beforeEach(() => {
		testDir = createTestDir();
		refDir = path.join(testDir, ".taskflow", "ref");
		fs.mkdirSync(refDir, { recursive: true });
	});

	describe("parseRetrospectiveContent", () => {
		it("should parse table format retrospective", () => {
			const content = `# Retrospective

| ID | Category | Pattern | Solution | Count | Criticality |
|---|---|---|---|---|---|
| 1 | Type Error | Cannot find module | Use .js extension | 3 | High |
| 2 | Lint | Missing semicolon | Add semicolons | 1 | Low |`;

			const items = parseRetrospectiveContent(content);

			expect(items).toHaveLength(2);
			expect(items[0]?.id).toBe("1");
			expect(items[0]?.category).toBe("Type Error");
			expect(items[0]?.pattern).toBe("Cannot find module");
			expect(items[0]?.count).toBe(3);

			expect(items[1]?.id).toBe("2");
			expect(items[1]?.category).toBe("Lint");
		});

		it("should handle empty content", () => {
			const items = parseRetrospectiveContent("");
			expect(items).toHaveLength(0);
		});
	});

	describe("loadRetrospective", () => {
		it("should load retrospective from file", () => {
			const content = `# Retrospective

| ID | Category | Pattern | Solution | Count | Criticality |
|---|---|---|---|---|---|
| 1 | Type Error | module not found | Check path | 1 | High |`;

			fs.writeFileSync(path.join(refDir, "retrospective.md"), content);

			const items = loadRetrospective(refDir);

			expect(items).toHaveLength(1);
			expect(items[0]?.category).toBe("Type Error");
			expect(items[0]?.pattern).toBe("module not found");
		});

		it("should return empty array if file does not exist", () => {
			const items = loadRetrospective(refDir);
			expect(items).toHaveLength(0);
		});
	});

	describe("isValidCategory", () => {
		it("should validate correct categories", () => {
			for (const category of VALID_CATEGORIES) {
				expect(isValidCategory(category)).toBe(true);
			}
		});

		it("should reject invalid categories", () => {
			expect(isValidCategory("invalid")).toBe(false);
			expect(isValidCategory("")).toBe(false);
		});
	});

	describe("isValidCriticality", () => {
		it("should validate correct criticality levels", () => {
			for (const criticality of VALID_CRITICALITIES) {
				expect(isValidCriticality(criticality)).toBe(true);
			}
		});

		it("should reject invalid criticality levels", () => {
			expect(isValidCriticality("invalid")).toBe(false);
			expect(isValidCriticality("")).toBe(false);
		});
	});
});
