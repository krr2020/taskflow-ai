/**
 * Unit tests for validation module
 */

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
	assertValidationPassed,
	getLastValidationStatus,
	saveValidationStatus,
	type ValidationSummary,
} from "../../src/lib/validation.js";
import { createTestDir } from "../setup.js";

describe("validation", () => {
	let testDir: string;
	let logsDir: string;

	beforeEach(() => {
		testDir = createTestDir();
		logsDir = path.join(testDir, ".taskflow", "logs");
		fs.mkdirSync(logsDir, { recursive: true });
	});

	describe("saveValidationStatus", () => {
		it("should save validation status to file", () => {
			const taskId = "1.1.0";
			const passed = true;
			const failedChecks: string[] = [];

			saveValidationStatus(logsDir, taskId, passed, failedChecks);

			// Check that a file was created (file name includes timestamp)
			const files = fs.readdirSync(logsDir);
			const statusFile = files.find((f) =>
				f.startsWith("T1-1-0-validation-status"),
			);

			expect(statusFile).toBeDefined();
		});

		it("should save failed checks", () => {
			const taskId = "1.1.0";
			const passed = false;
			const failedChecks = ["typeCheck", "lint"];

			saveValidationStatus(logsDir, taskId, passed, failedChecks);

			// Find the created file
			const files = fs.readdirSync(logsDir);
			const statusFile = files.find((f) =>
				f.startsWith("T1-1-0-validation-status"),
			);

			expect(statusFile).toBeDefined();

			if (statusFile) {
				const content = fs.readFileSync(
					path.join(logsDir, statusFile),
					"utf-8",
				);
				expect(content).toContain("typeCheck");
				expect(content).toContain("lint");
			}
		});
	});

	describe("getLastValidationStatus", () => {
		it("should load saved validation status", () => {
			const taskId = "1.1.0";
			saveValidationStatus(logsDir, taskId, false, ["typeCheck"]);

			const loaded = getLastValidationStatus(logsDir, taskId);

			expect(loaded).not.toBeNull();
			expect(loaded?.taskId).toBe(taskId);
			expect(loaded?.passed).toBe(false);
			expect(loaded?.failedChecks).toContain("typeCheck");
		});

		it("should return null if no status saved", () => {
			const loaded = getLastValidationStatus(logsDir, "1.1.0");
			expect(loaded).toBeNull();
		});
	});

	describe("assertValidationPassed", () => {
		it("should throw error if validation check failed", () => {
			const summary: ValidationSummary = {
				passed: false,
				results: [],
				failedChecks: ["typeCheck"],
				allOutput: "",
			};

			expect(() => assertValidationPassed(summary, logsDir)).toThrow();
		});

		it("should not throw if all checks passed", () => {
			const summary: ValidationSummary = {
				passed: true,
				results: [],
				failedChecks: [],
				allOutput: "",
			};

			expect(() => assertValidationPassed(summary, logsDir)).not.toThrow();
		});
	});
});
