/**
 * Unit tests for retrospective module
 */

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { ParsedError } from "@/lib/analysis/log-parser";
import {
	appendNewPatternsToRetrospective,
	extractNewPatterns,
	isValidCategory,
	isValidCriticality,
	loadRetrospective,
	parseRetrospectiveContent,
	readRetrospectiveBeforeWork,
	VALID_CATEGORIES,
	VALID_CRITICALITIES,
} from "../../src/lib/utils/retrospective.js";
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

	// ============================================================================
	// Auto-Update Tests
	// ============================================================================

	describe("auto-update functionality", () => {
		describe("readRetrospectiveBeforeWork", () => {
			it("should return content if file exists", () => {
				const content = "test content";
				fs.writeFileSync(path.join(refDir, "retrospective.md"), content);

				const result = readRetrospectiveBeforeWork(refDir);
				expect(result).toBe(content);
			});

			it("should return empty string if file missing", () => {
				const result = readRetrospectiveBeforeWork(refDir);
				expect(result).toBe("");
			});
		});

		describe("extractNewPatterns", () => {
			it("should extract new patterns from errors", () => {
				const errors: ParsedError[] = [
					{
						message: "Cannot find module './foo'",
						severity: "error",
						file: "src/index.ts",
						line: 1,
						column: 1,
						code: "TS2307",
						raw: "src/index.ts:1:1 - error TS2307: Cannot find module './foo'",
					},
				];

				const patterns = extractNewPatterns(errors, refDir);

				expect(patterns).toHaveLength(1);
				expect(patterns[0]?.category).toBe("Type Error");
				expect(patterns[0]?.pattern).toBe("TS2307");
				expect(patterns[0]?.criticality).toBe("High");
				expect(patterns[0]?.errorCode).toBe("TS2307");
			});

			it("should ignore errors that match existing retrospective items", () => {
				// Create existing retro with TS2307
				const content = `# Retrospective

| ID | Category | Pattern | Solution | Count | Criticality |
|---|---|---|---|---|---|
| 1 | Type Error | TS2307 | Fix path | 1 | High |`;
				fs.writeFileSync(path.join(refDir, "retrospective.md"), content);

				const errors: ParsedError[] = [
					{
						message: "Cannot find module './foo'",
						severity: "error",
						file: "src/index.ts",
						line: 1,
						column: 1,
						code: "TS2307",
						raw: "src/index.ts:1:1 - error TS2307: Cannot find module './foo'",
					},
				];

				const patterns = extractNewPatterns(errors, refDir);

				expect(patterns).toHaveLength(0);
			});

			it("should group similar errors", () => {
				const errors: ParsedError[] = [
					{
						message: "Error one",
						severity: "error",
						code: "TS1234",
						file: "file1.ts",
						line: 1,
						column: 1,
						raw: "file1.ts:1:1 - error TS1234: Error one",
					},
					{
						message: "Error two",
						severity: "error",
						code: "TS1234", // Same code
						file: "file2.ts",
						line: 1,
						column: 1,
						raw: "file2.ts:1:1 - error TS1234: Error two",
					},
				];

				const patterns = extractNewPatterns(errors, refDir);

				expect(patterns).toHaveLength(1);
				expect(patterns[0]?.pattern).toBe("TS1234");
			});

			it("should infer category from message if no code", () => {
				const errors: ParsedError[] = [
					{
						message: "Missing semicolon (eslint)",
						severity: "warning",
						file: "src/index.ts",
						line: 1,
						column: 1,
						code: "eslint",
						raw: "src/index.ts:1:1 - warning: Missing semicolon (eslint)",
					},
				];

				const patterns = extractNewPatterns(errors, refDir);

				expect(patterns).toHaveLength(1);
				expect(patterns[0]?.category).toBe("Lint");
				expect(patterns[0]?.criticality).toBe("Low");
			});
		});

		describe("appendNewPatternsToRetrospective", () => {
			it("should append patterns to retrospective file", () => {
				// Initialize empty file
				fs.writeFileSync(
					path.join(refDir, "retrospective.md"),
					"# Retrospective\n\n| ID | Category | Pattern | Solution | Count | Criticality |\n|---|---|---|---|---|---|\n",
				);

				const patterns = [
					{
						category: "Type Error",
						pattern: "TS2307",
						solution: "Fix import",
						criticality: "High",
						affectedFiles: [],
					},
				];

				const ids = appendNewPatternsToRetrospective(refDir, patterns);

				expect(ids).toHaveLength(1);
				expect(ids[0]).toBe(1);

				const content = fs.readFileSync(
					path.join(refDir, "retrospective.md"),
					"utf-8",
				);
				expect(content).toContain(
					"| 1 | Type Error | TS2307 | Fix import | 1 | High |",
				);
			});

			it("should handle multiple patterns", () => {
				// Initialize empty file
				fs.writeFileSync(
					path.join(refDir, "retrospective.md"),
					"# Retrospective\n\n| ID | Category | Pattern | Solution | Count | Criticality |\n|---|---|---|---|---|---|\n",
				);

				const patterns = [
					{
						category: "Type Error",
						pattern: "TS1111",
						solution: "Fix 1",
						criticality: "High",
						affectedFiles: [],
					},
					{
						category: "Lint",
						pattern: "no-console",
						solution: "Remove console",
						criticality: "Low",
						affectedFiles: [],
					},
				];

				const ids = appendNewPatternsToRetrospective(refDir, patterns);

				expect(ids).toHaveLength(2);
				expect(ids[0]).toBe(1);
				expect(ids[1]).toBe(2);

				const content = fs.readFileSync(
					path.join(refDir, "retrospective.md"),
					"utf-8",
				);
				expect(content).toContain("| 1 | Type Error | TS1111");
				expect(content).toContain("| 2 | Lint | no-console");
			});
		});
	});
});
