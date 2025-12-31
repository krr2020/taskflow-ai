import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	COMMON_COMMANDS,
	colors,
	extractErrorSummary,
	icons,
} from "../../src/lib/output";

describe("output", () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	describe("colors", () => {
		it("should have status colors", () => {
			expect(colors.success).toBeDefined();
			expect(colors.error).toBeDefined();
			expect(colors.warning).toBeDefined();
			expect(colors.info).toBeDefined();
			expect(colors.muted).toBeDefined();
		});

		it("should have semantic colors", () => {
			expect(colors.task).toBeDefined();
			expect(colors.state).toBeDefined();
			expect(colors.command).toBeDefined();
			expect(colors.file).toBeDefined();
			expect(colors.highlight).toBeDefined();
		});

		it("should have combined colors", () => {
			expect(colors.successBold).toBeDefined();
			expect(colors.errorBold).toBeDefined();
			expect(colors.warningBold).toBeDefined();
			expect(colors.infoBold).toBeDefined();
		});

		it("should apply colors to strings", () => {
			const result = colors.success("test");
			expect(typeof result).toBe("string");
			// picocolors adds ANSI codes
			expect(result).toContain("test");
		});

		it("should apply combined colors", () => {
			const result = colors.successBold("test");
			expect(typeof result).toBe("string");
			expect(result).toContain("test");
		});
	});

	describe("icons", () => {
		it("should have all icons defined", () => {
			expect(icons.success).toBeDefined();
			expect(icons.error).toBeDefined();
			expect(icons.warning).toBeDefined();
			expect(icons.info).toBeDefined();
			expect(icons.rocket).toBeDefined();
			expect(icons.celebration).toBeDefined();
			expect(icons.brain).toBeDefined();
			expect(icons.target).toBeDefined();
			expect(icons.architecture).toBeDefined();
			expect(icons.code).toBeDefined();
			expect(icons.memo).toBeDefined();
			expect(icons.search).toBeDefined();
			expect(icons.test).toBeDefined();
			expect(icons.save).toBeDefined();
			expect(icons.stop).toBeDefined();
			expect(icons.alert).toBeDefined();
		});

		it("should have unicode icons", () => {
			expect(icons.success).toBe("\u2713");
			expect(icons.error).toBe("\u2717");
		});
	});

	describe("COMMON_COMMANDS", () => {
		it("should have noSession commands", () => {
			expect(COMMON_COMMANDS.noSession).toBeDefined();
			expect(Array.isArray(COMMON_COMMANDS.noSession)).toBe(true);
			expect(COMMON_COMMANDS.noSession.length).toBeGreaterThan(0);
			expect(COMMON_COMMANDS.noSession[0]).toHaveProperty("cmd");
			expect(COMMON_COMMANDS.noSession[0]).toHaveProperty("desc");
		});

		it("should have activeSession commands", () => {
			expect(COMMON_COMMANDS.activeSession).toBeDefined();
			expect(Array.isArray(COMMON_COMMANDS.activeSession)).toBe(true);
		});

		it("should have all commands", () => {
			expect(COMMON_COMMANDS.all).toBeDefined();
			expect(COMMON_COMMANDS.all.length).toBeGreaterThan(
				COMMON_COMMANDS.noSession.length,
			);
		});
	});

	describe("extractErrorSummary", () => {
		it("should extract error lines", () => {
			const output = `
Some normal output
error: Something went wrong
more output
TypeError: Cannot read property 'x' of undefined
final output
`;
			const summary = extractErrorSummary(output, "test-cmd");
			expect(summary).toContain("error:");
			expect(summary).toContain("TypeError:");
		});

		it("should include context lines", () => {
			const output = `line1
line2
error: test error
line4
line5
line6`;
			const summary = extractErrorSummary(output, "test");
			// Should include line before and 2 after
			expect(summary).toContain("line2");
			expect(summary).toContain("error: test error");
		});

		it("should handle FAIL patterns", () => {
			const output = "FAIL tests/example.test.ts";
			const summary = extractErrorSummary(output, "test");
			expect(summary).toContain("FAIL");
		});

		it("should handle warning patterns", () => {
			const output = "warning: Deprecated API usage";
			const summary = extractErrorSummary(output, "test");
			expect(summary).toContain("warning:");
		});

		it("should limit output to MAX_SUMMARY_LINES", () => {
			const lines = Array(100).fill("error: repeated error").join("\n");
			const summary = extractErrorSummary(lines, "test");
			const lineCount = summary.split("\n").length;
			expect(lineCount).toBeLessThanOrEqual(51); // 50 + truncation message
		});

		it("should return default message when no error patterns match", () => {
			// Input without any error patterns like "error", "fail", "TypeError", etc.
			const output = "All tests passed successfully\nBuild complete";
			const summary = extractErrorSummary(output, "test-cmd");
			expect(summary).toContain("No specific errors extracted");
			expect(summary).toContain("test-cmd");
		});

		it("should handle Cannot find pattern", () => {
			const output = "Cannot find module './missing'";
			const summary = extractErrorSummary(output, "test");
			expect(summary).toContain("Cannot find");
		});

		it("should handle SyntaxError", () => {
			const output = "SyntaxError: Unexpected token";
			const summary = extractErrorSummary(output, "test");
			expect(summary).toContain("SyntaxError:");
		});

		it("should deduplicate error lines", () => {
			const output = `error: same
error: same
error: same`;
			const summary = extractErrorSummary(output, "test");
			const errorCount = (summary.match(/error: same/g) || []).length;
			expect(errorCount).toBe(1);
		});
	});
});
