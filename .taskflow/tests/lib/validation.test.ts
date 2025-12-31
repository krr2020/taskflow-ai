import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as dataAccess from "../../src/lib/data-access";
import { ValidationFailedError } from "../../src/lib/errors";
import * as output from "../../src/lib/output";
import {
	assertValidationPassed,
	executeCommand,
	getLastValidationStatus,
	quickAllChecks,
	quickArchCheck,
	quickLintCheck,
	quickTypeCheck,
	runArchCheck,
	runBiomeFix,
	runCommandWithLog,
	runLintCheck,
	runTypeCheck,
	runValidations,
	saveValidationStatus,
} from "../../src/lib/validation";

vi.mock("../../src/lib/data-access");
// vi.mock('node:fs') removed to allow spying on real module
vi.mock("../../src/lib/output", () => ({
	colors: {
		error: (s: string) => s,
		success: (s: string) => s,
		warning: (s: string) => s,
		info: (s: string) => s,
		muted: (s: string) => s,
		successBold: (s: string) => s,
		errorBold: (s: string) => s,
	},
	extractErrorSummary: vi.fn(),
	printValidationHeader: vi.fn(),
	printValidationStatus: vi.fn(),
	printValidationSummary: vi.fn(),
	printValidationResult: vi.fn(),
}));
vi.mock("../../src/lib/config", () => ({
	FIX_COMMAND: { cmd: "pnpm biome:fix", label: "biome-fix" },
	VALIDATION_COMMANDS: [
		{ cmd: "pnpm type-check", label: "type-check" },
		{ cmd: "pnpm biome:check", label: "biome-check" },
	],
	LOGS_DIR: "/path/to/logs",
	MAX_OUTPUT_BUFFER: 10 * 1024 * 1024,
	getLogFilePath: (taskId: string, label: string) =>
		`/path/to/logs/${taskId}_${label}.log`,
}));
vi.mock("execa", () => ({
	execaSync: vi.fn(),
}));

import { type ExecaSyncError, execaSync, type SyncResult } from "execa";

describe("validation", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.mocked(dataAccess.saveLogFile).mockImplementation(() => {});
		vi.mocked(output.extractErrorSummary).mockReturnValue("Error summary");
		vi.mocked(output.printValidationResult).mockImplementation(() => {});
		vi.mocked(output.printValidationHeader).mockImplementation(() => {});
		vi.mocked(output.printValidationStatus).mockImplementation(() => {});
		vi.mocked(output.printValidationSummary).mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("executeCommand", () => {
		it("should return success for passing command", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "Success output",
				stderr: "",
			} as unknown as SyncResult);

			const result = executeCommand("test", ["arg"]);

			expect(result.success).toBe(true);
			expect(result.stdout).toBe("Success output");
			expect(result.output).toContain("Success output");
		});

		it("should return failure for failing command", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 1,
				stdout: "",
				stderr: "Error output",
			} as unknown as SyncResult);

			const result = executeCommand("test", []);

			expect(result.success).toBe(false);
			expect(result.stderr).toBe("Error output");
		});

		it("should handle command exceptions", () => {
			vi.mocked(execaSync).mockImplementation(() => {
				throw new Error("Command failed");
			});

			const result = executeCommand("test", []);

			expect(result.success).toBe(false);
			expect(result.output).toContain("Command failed");
		});

		it("should handle exceptions with stdout/stderr", () => {
			vi.mocked(execaSync).mockImplementation(() => {
				const error = new Error("Command failed") as unknown as ExecaSyncError;
				error.stdout = "Some stdout";
				error.stderr = "Some stderr";
				throw error;
			});

			const result = executeCommand("test", []);

			expect(result.success).toBe(false);
			expect(result.stdout).toBe("Some stdout");
			expect(result.stderr).toBe("Some stderr");
		});
	});

	describe("runCommandWithLog", () => {
		it("should save log file", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "Output",
				stderr: "",
			} as unknown as SyncResult);

			runCommandWithLog("test cmd", "test-label", "1.1.0");

			expect(dataAccess.saveLogFile).toHaveBeenCalled();
		});

		it("should return success summary for passing command", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "Output",
				stderr: "",
			} as unknown as SyncResult);

			const result = runCommandWithLog("test", "label", "1.1.0");

			expect(result.success).toBe(true);
			expect(result.summary).toBe("Passed");
		});

		it("should extract error summary for failing command", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 1,
				stdout: "",
				stderr: "Error",
			} as unknown as SyncResult);

			const result = runCommandWithLog("test", "label", "1.1.0");

			expect(result.success).toBe(false);
			expect(output.extractErrorSummary).toHaveBeenCalled();
		});
	});

	describe("runValidations", () => {
		it("should run fix command first", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as unknown as SyncResult);

			runValidations("1.1.0");

			expect(execaSync).toHaveBeenCalledWith(
				"pnpm",
				["biome:fix"],
				expect.any(Object),
			);
		});

		it("should run all validation commands except duplicate biome-check", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as unknown as SyncResult);

			runValidations("1.1.0");

			expect(execaSync).toHaveBeenCalledWith(
				"pnpm",
				["type-check"],
				expect.any(Object),
			);
			expect(execaSync).not.toHaveBeenCalledWith(
				"pnpm",
				["biome:check"],
				expect.any(Object),
			);
		});

		it("should fail if fix command fails", () => {
			vi.mocked(execaSync)
				.mockReturnValueOnce({
					exitCode: 1,
					stdout: "",
					stderr: "Fix failed",
				} as unknown as SyncResult) // fix
				.mockReturnValue({
					exitCode: 0,
					stdout: "",
					stderr: "",
				} as unknown as SyncResult); // others

			const result = runValidations("1.1.0");

			expect(result.passed).toBe(false);
			expect(result.failedChecks).toContain("biome-fix");
		});

		it("should return passed when all checks pass", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as unknown as SyncResult);

			const result = runValidations("1.1.0");

			expect(result.passed).toBe(true);
			expect(result.failedChecks).toHaveLength(0);
		});

		it("should return failed when checks fail", () => {
			vi.mocked(execaSync)
				.mockReturnValueOnce({
					exitCode: 0,
					stdout: "",
					stderr: "",
				} as unknown as SyncResult) // fix
				.mockReturnValueOnce({
					exitCode: 1,
					stdout: "",
					stderr: "Error",
				} as unknown as SyncResult); // type-check

			const result = runValidations("1.1.0");

			expect(result.passed).toBe(false);
			expect(result.failedChecks).toContain("type-check");
		});

		it("should print validation summary", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as unknown as SyncResult);

			runValidations("1.1.0");

			// Check that console.log was called with success message
			expect(console.log).toHaveBeenCalledWith(
				expect.stringContaining("ALL VALIDATIONS PASSED"),
			);
		});

		it("should collect all output", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "Output line",
				stderr: "",
			} as unknown as SyncResult);

			const result = runValidations("1.1.0");

			// allOutput should contain logs for retrospective analysis
			expect(result.allOutput).toContain("Output line");
			// Verify logs were saved instead
			expect(dataAccess.saveLogFile).toHaveBeenCalled();
		});

		it("should save validation status", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as unknown as SyncResult);

			runValidations("1.1.0");

			expect(dataAccess.saveLogFile).toHaveBeenCalledWith(
				expect.stringContaining("validation-status.json"),
				"",
				expect.stringContaining('"passed": true'),
			);
		});
	});

	describe("assertValidationPassed", () => {
		it("should not throw when validation passed", () => {
			const summary = {
				passed: true,
				results: [],
				failedChecks: [],
				allOutput: "",
			};

			expect(() => assertValidationPassed(summary)).not.toThrow();
		});

		it("should throw ValidationFailedError when validation failed", () => {
			const summary = {
				passed: false,
				results: [],
				failedChecks: ["type-check"],
				allOutput: "",
			};

			expect(() => assertValidationPassed(summary)).toThrow(
				ValidationFailedError,
			);
		});
	});

	describe("validation status persistence", () => {
		it("should save validation status", () => {
			saveValidationStatus("1.1.0", true, ["check1"]);
			expect(dataAccess.saveLogFile).toHaveBeenCalledWith(
				expect.stringContaining("validation-status.json"),
				"",
				expect.stringContaining('"passed": true'),
			);
			expect(dataAccess.saveLogFile).toHaveBeenCalledWith(
				expect.stringContaining("validation-status.json"),
				"",
				expect.stringContaining('"failedChecks":'),
			);
		});

		it("should get last validation status when file exists", () => {
			const fs = require("node:fs");
			vi.spyOn(fs, "existsSync").mockReturnValue(true);
			vi.spyOn(fs, "readFileSync").mockReturnValue(
				JSON.stringify({
					taskId: "1.1.0",
					passed: true,
					timestamp: "2023-01-01",
					failedChecks: [],
				}),
			);

			const status = getLastValidationStatus("1.1.0");
			expect(status?.passed).toBe(true);
		});

		it("should return null when validation status file missing", () => {
			const fs = require("node:fs");
			vi.spyOn(fs, "existsSync").mockReturnValue(false);

			const status = getLastValidationStatus("1.1.0");
			expect(status).toBeNull();
		});

		it("should return null when validation status content invalid", () => {
			const fs = require("node:fs");
			vi.spyOn(fs, "existsSync").mockReturnValue(true);
			vi.spyOn(fs, "readFileSync").mockReturnValue("invalid json");

			const status = getLastValidationStatus("1.1.0");
			expect(status).toBeNull();
		});
	});

	describe("individual check functions", () => {
		it("should run type check", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as unknown as SyncResult);

			const result = runTypeCheck("1.1.0");

			expect(result.label).toBe("type-check");
		});

		it("should run lint check", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as unknown as SyncResult);

			const result = runLintCheck("1.1.0");

			expect(result.label).toBe("biome-check");
		});

		it("should run arch check", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as unknown as SyncResult);

			const result = runArchCheck("1.1.0");

			expect(result.label).toBe("arch-validate");
		});

		it("should run biome fix", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as unknown as SyncResult);

			const result = runBiomeFix("1.1.0");

			expect(result.label).toBe("biome-fix");
		});
	});

	describe("quick check functions", () => {
		it("quickTypeCheck should return true on success", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as unknown as SyncResult);

			expect(quickTypeCheck()).toBe(true);
		});

		it("quickTypeCheck should return false on failure", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 1,
				stdout: "",
				stderr: "",
			} as unknown as SyncResult);

			expect(quickTypeCheck()).toBe(false);
		});

		it("quickLintCheck should return true on success", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as unknown as SyncResult);

			expect(quickLintCheck()).toBe(true);
		});

		it("quickArchCheck should return true on success", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as unknown as SyncResult);

			expect(quickArchCheck()).toBe(true);
		});

		it("quickAllChecks should return true when all pass", () => {
			vi.mocked(execaSync).mockReturnValue({
				exitCode: 0,
				stdout: "",
				stderr: "",
			} as unknown as SyncResult);

			expect(quickAllChecks()).toBe(true);
		});

		it("quickAllChecks should return false when any fails", () => {
			vi.mocked(execaSync)
				.mockReturnValueOnce({
					exitCode: 0,
					stdout: "",
					stderr: "",
				} as unknown as SyncResult)
				.mockReturnValueOnce({
					exitCode: 1,
					stdout: "",
					stderr: "",
				} as unknown as SyncResult);

			expect(quickAllChecks()).toBe(false);
		});
	});
});
