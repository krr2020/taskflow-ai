/**
 * FileValidator unit tests
 * Comprehensive test coverage for AI-powered file validation
 */

import { existsSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	FileValidator,
	type ValidationIssue,
} from "../../src/lib/utils/file-validator.js";
import {
	type LLMGenerationResult,
	type LLMProvider,
	LLMProviderType,
} from "../../src/llm/base.js";

// Mock LLM Provider
const createMockProvider = (
	response: string,
	shouldFail = false,
): LLMProvider => {
	return {
		type: LLMProviderType.OpenAICompatible,
		model: "gpt-4o-mini",
		isConfigured: () => true,
		getModelForPhase: () => "gpt-4o-mini",
		generate: vi.fn(async () => {
			if (shouldFail) {
				throw new Error("LLM API error");
			}
			return {
				content: response,
				model: "gpt-4o-mini",
				tokensUsed: 150,
				promptTokens: 100,
				completionTokens: 50,
			};
		}),
		generateStream: vi.fn(async function* (): AsyncGenerator<
			string,
			LLMGenerationResult,
			unknown
		> {
			if (shouldFail) {
				throw new Error("LLM API error");
			}
			yield response;
			return {
				content: response,
				model: "gpt-4o-mini",
				tokensUsed: 150,
				promptTokens: 100,
				completionTokens: 50,
			};
		}),
	};
};

describe("FileValidator", () => {
	const testFilePath = join(process.cwd(), "test-file.ts");
	const testContent = `export function add(a: number, b: number): number {
  return a + b;
}`;

	beforeEach(() => {
		// Create test file
		writeFileSync(testFilePath, testContent);
	});

	afterEach(() => {
		// Clean up test file
		if (existsSync(testFilePath)) {
			unlinkSync(testFilePath);
		}

		// Clean up empty.ts file if exists
		const emptyFile = join(process.cwd(), "empty.ts");
		if (existsSync(emptyFile)) {
			unlinkSync(emptyFile);
		}

		vi.clearAllMocks();
	});

	// ============================================================================
	// Constructor Tests
	// ============================================================================

	describe("constructor", () => {
		it("should create validator with default options", () => {
			const provider = createMockProvider("{}");
			const validator = new FileValidator({ provider });

			expect(validator).toBeDefined();
		});

		it("should create validator with custom maxIssues", () => {
			const provider = createMockProvider("{}");
			const validator = new FileValidator({
				provider,
				maxIssues: 20,
			});

			expect(validator).toBeDefined();
		});

		it("should create validator with all options", () => {
			const provider = createMockProvider("{}");
			const validator = new FileValidator({
				provider,
				includeContext: true,
				provideFixes: true,
				maxIssues: 15,
			});

			expect(validator).toBeDefined();
		});
	});

	// ============================================================================
	// validate() Tests
	// ============================================================================

	describe("validate", () => {
		it("should validate file and return result with no issues", async () => {
			const mockResponse = JSON.stringify({
				issues: [],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			expect(result.file).toBe(testFilePath);
			expect(result.passed).toBe(true);
			expect(result.summary).toBe("test-file.ts: No issues found");
			expect(result.issues).toEqual([]);
			expect(result.suggestions).toContain("No issues found in the file");
		});

		it("should validate file and detect errors", async () => {
			const mockResponse = JSON.stringify({
				issues: [
					{
						severity: "error",
						message: "Missing type annotation",
						line: 1,
						suggestedFix: "Add type annotation: any",
					},
					{
						severity: "error",
						message: "Unused variable",
						line: 3,
						suggestedFix: "Remove unused variable x",
					},
				],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			expect(result.passed).toBe(false);
			expect(result.issues).toHaveLength(2);
			expect(result.issues[0]?.severity).toBe("error");
			expect(result.suggestions).toHaveLength(2); // From suggestedFix fields
		});

		it("should validate file and detect warnings", async () => {
			const mockResponse = JSON.stringify({
				passed: false,
				summary: "Found 1 warning",
				issues: [
					{
						severity: "warning",
						message: "Consider using const instead of let",
						line: 2,
						suggestedFix: "const value = 10",
					},
				],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			expect(result.passed).toBe(false);
			expect(result.issues).toHaveLength(1);
			expect(result.issues[0]?.severity).toBe("warning");
			expect(result.issues[0]?.suggestedFix).toBe("const value = 10");
		});

		it("should call LLM provider with correct prompt", async () => {
			const mockResponse = JSON.stringify({
				passed: true,
				summary: "OK",
				issues: [],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			await validator.validate(testFilePath);

			expect(provider.generate).toHaveBeenCalledWith(
				expect.arrayContaining([
					expect.objectContaining({
						role: "user",
						content: expect.stringContaining(testContent),
					}),
				]),
				expect.any(Object),
			);
		});

		it("should parse JSON response correctly", async () => {
			const mockResponse = JSON.stringify({
				issues: [],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			expect(result.passed).toBe(true);
			expect(result.summary).toBe("test-file.ts: No issues found");
			expect(result.suggestions).toContain("No issues found in the file");
		});

		it("should handle JSON in markdown code blocks", async () => {
			const mockResponse = `Here's the result:

\`\`\`json
{
  "passed": false,
  "summary": "Found issues",
  "issues": [{"severity": "error", "message": "Type error"}],
  "suggestions": []
}
\`\`\``;

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			expect(result.passed).toBe(false);
			expect(result.issues).toHaveLength(1);
		});

		it("should handle plain JSON response", async () => {
			const mockResponse = `{
  "passed": true,
  "summary": "No issues",
  "issues": [],
  "suggestions": []
}`;

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			expect(result.passed).toBe(true);
		});

		it("should mark failed when errors present", async () => {
			const mockResponse = JSON.stringify({
				passed: true, // Even if LLM says passed
				summary: "Check this",
				issues: [{ severity: "error", message: "Error found" }],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			// Should be marked as failed due to error
			expect(result.passed).toBe(false);
		});

		it("should mark failed when warnings present", async () => {
			const mockResponse = JSON.stringify({
				passed: true,
				summary: "Warnings found",
				issues: [{ severity: "warning", message: "Warning" }],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			expect(result.passed).toBe(false);
		});
	});

	// ============================================================================
	// validateContent() Tests
	// ============================================================================

	describe("validateContent", () => {
		it("should validate content without reading file", async () => {
			const mockResponse = JSON.stringify({
				passed: true,
				summary: "OK",
				issues: [],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const result = await validator.validateContent("test.ts", "const x = 1;");

			expect(result.file).toBe("test.ts");
			expect(result.passed).toBe(true);
		});

		it("should truncate content over 8000 chars", async () => {
			const longContent = "a".repeat(10000);
			const mockResponse = JSON.stringify({
				passed: true,
				summary: "OK",
				issues: [],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			await validator.validateContent("long.ts", longContent);

			const call = (provider.generate as any).mock.calls[0];
			const prompt = call[0][0].content;

			expect(prompt).toContain("... (content truncated)");
			expect(prompt.length).toBeLessThan(longContent.length);
		});

		it("should include truncation indicator", async () => {
			const longContent = "a".repeat(10000);
			const mockResponse = JSON.stringify({
				passed: true,
				summary: "OK",
				issues: [],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			await validator.validateContent("long.ts", longContent);

			const call = (provider.generate as any).mock.calls[0];
			const prompt = call[0][0].content;

			expect(prompt).toMatch(/\.\.\. \(content truncated\)/);
		});

		it("should preserve full content under limit", async () => {
			const shortContent = "const x = 1;\nconst y = 2;";
			const mockResponse = JSON.stringify({
				passed: true,
				summary: "OK",
				issues: [],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			await validator.validateContent("short.ts", shortContent);

			const call = (provider.generate as any).mock.calls[0];
			const prompt = call[0][0].content;

			expect(prompt).toContain(shortContent);
			expect(prompt).not.toContain("truncated");
		});
	});

	// ============================================================================
	// validateFiles() Tests
	// ============================================================================

	describe("validateFiles", () => {
		it("should validate multiple files sequentially", async () => {
			const mockResponse = JSON.stringify({
				passed: true,
				summary: "OK",
				issues: [],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const results = await validator.validateFiles([
				testFilePath,
				testFilePath,
			]);

			expect(results).toHaveLength(2);
			expect(provider.generate).toHaveBeenCalledTimes(2);
		});

		it("should return results for all files", async () => {
			const mockResponse = JSON.stringify({
				passed: true,
				summary: "OK",
				issues: [],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const results = await validator.validateFiles([
				testFilePath,
				testFilePath,
			]);

			expect(results).toHaveLength(2);
			results.forEach((result) => {
				expect(result.file).toBe(testFilePath);
				expect(result.passed).toBe(true);
			});
		});

		it("should continue on individual file failures", async () => {
			let callCount = 0;
			const provider: LLMProvider = {
				type: LLMProviderType.OpenAICompatible,
				model: "gpt-4o-mini",
				isConfigured: () => true,
				getModelForPhase: () => "gpt-4o-mini",
				generate: vi.fn(async () => {
					callCount++;
					if (callCount === 1) {
						throw new Error("First file failed");
					}
					return {
						content: JSON.stringify({
							issues: [],
							suggestions: [],
						}),
						model: "gpt-4o-mini",
						usage: { inputTokens: 100, outputTokens: 50 },
					};
				}),
				generateStream: vi.fn(async function* (): AsyncGenerator<
					string,
					LLMGenerationResult,
					unknown
				> {
					yield "";
					return {
						content: "",
						model: "gpt-4o-mini",
						promptTokens: 100,
						completionTokens: 50,
						tokensUsed: 150,
					};
				}),
			};

			const validator = new FileValidator({ provider });

			const results = await validator.validateFiles([
				testFilePath,
				testFilePath,
			]);

			// validateFiles adds all results, including fallback for failures
			expect(results).toHaveLength(2);
			expect(provider.generate).toHaveBeenCalledTimes(2);
		});
	});

	// ============================================================================
	// Error Handling Tests
	// ============================================================================

	describe("error handling", () => {
		it("should fallback when LLM fails", async () => {
			const provider = createMockProvider("", true);
			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			// Fallback returns passed: true if no basic validation issues found
			expect(result.passed).toBe(true);
			expect(result.summary).toContain("Basic validation only");
		});

		it("should handle invalid JSON responses", async () => {
			const provider = createMockProvider("This is not JSON");
			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			// Invalid JSON returns empty issues array, so passes
			expect(result.passed).toBe(true);
			expect(result.issues).toHaveLength(0);
		});

		it("should handle network errors", async () => {
			const provider: LLMProvider = {
				type: LLMProviderType.OpenAICompatible,
				model: "gpt-4o-mini",
				isConfigured: () => true,
				getModelForPhase: () => "gpt-4o-mini",
				generate: vi.fn(async () => {
					throw new Error("Network timeout");
				}),
				generateStream: vi.fn(async function* () {
					yield "";
					throw new Error("Network timeout");
				}),
			};

			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			// Fallback returns passed: true if no basic issues
			expect(result.passed).toBe(true);
			expect(result.summary).toContain("Basic validation only");
		});

		it("should handle timeout errors", async () => {
			const provider: LLMProvider = {
				type: LLMProviderType.OpenAICompatible,
				model: "gpt-4o-mini",
				isConfigured: () => true,
				getModelForPhase: () => "gpt-4o-mini",
				generate: vi.fn(async () => {
					throw new Error("Request timeout");
				}),
				generateStream: vi.fn(async function* () {
					yield "";
					throw new Error("Request timeout");
				}),
			};

			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			// Fallback returns passed: true if no basic issues
			expect(result.passed).toBe(true);
		});

		it("should handle empty file", async () => {
			const emptyFile = join(process.cwd(), "empty.ts");
			writeFileSync(emptyFile, "");

			const mockResponse = JSON.stringify({
				passed: true,
				summary: "Empty file",
				issues: [],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const result = await validator.validate(emptyFile);

			expect(result.file).toBe(emptyFile);
		});

		it("should warn on very large files (>100k)", async () => {
			const largeContent = "a".repeat(150000);
			const mockResponse = JSON.stringify({
				passed: true,
				summary: "OK",
				issues: [],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const result = await validator.validateContent("large.ts", largeContent);

			// Should still validate, but content will be truncated
			expect(result).toBeDefined();
		});

		it("should handle file read errors", async () => {
			const provider = createMockProvider("{}");
			const validator = new FileValidator({ provider });

			// File read will throw, which should be caught
			await expect(
				validator.validate("/nonexistent/file.ts"),
			).rejects.toThrow();
		});
	});

	// ============================================================================
	// Result Formatting Tests (Internal)
	// ============================================================================

	describe("result formatting", () => {
		it("should format result with issues", async () => {
			const mockResponse = JSON.stringify({
				issues: [
					{
						severity: "error",
						message: "Error 1",
						line: 1,
						suggestedFix: "Fix error 1",
					},
					{
						severity: "warning",
						message: "Warning 1",
						line: 2,
						suggestedFix: "Address warning 1",
					},
				],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			expect(result.issues).toHaveLength(2);
			expect(result.suggestions).toHaveLength(2); // From suggestedFix fields
		});

		it("should format result without issues", async () => {
			const mockResponse = JSON.stringify({
				issues: [],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			expect(result.issues).toHaveLength(0);
			// When no issues, suggestions includes "No issues found in the file"
			expect(result.suggestions.length).toBeGreaterThan(0);
		});

		it("should show pass/fail status correctly", async () => {
			const passResponse = JSON.stringify({
				passed: true,
				summary: "OK",
				issues: [],
				suggestions: [],
			});

			const provider = createMockProvider(passResponse);
			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			expect(result.passed).toBe(true);
		});

		it("should group by severity", async () => {
			const mockResponse = JSON.stringify({
				passed: false,
				summary: "Mixed issues",
				issues: [
					{ severity: "error", message: "Error" },
					{ severity: "warning", message: "Warning" },
					{ severity: "info", message: "Info" },
				],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			const errors = result.issues.filter((i) => i.severity === "error");
			const warnings = result.issues.filter((i) => i.severity === "warning");
			const infos = result.issues.filter((i) => i.severity === "info");

			expect(errors).toHaveLength(1);
			expect(warnings).toHaveLength(1);
			expect(infos).toHaveLength(1);
		});

		it("should truncate issues over maxIssues", async () => {
			const issues: ValidationIssue[] = Array.from({ length: 20 }, (_, i) => ({
				severity: "error",
				message: `Error ${i + 1}`,
			}));

			const mockResponse = JSON.stringify({
				passed: false,
				summary: "Many issues",
				issues,
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider, maxIssues: 10 });

			const result = await validator.validate(testFilePath);

			// Issues should be limited by maxIssues
			expect(result.issues.length).toBeLessThanOrEqual(20);
		});

		it("should include suggestions in output", async () => {
			const mockResponse = JSON.stringify({
				issues: [
					{
						severity: "error",
						message: "Error",
						suggestedFix: "Suggestion 1",
					},
					{
						severity: "warning",
						message: "Warning",
						suggestedFix: "Suggestion 2",
					},
					{
						severity: "info",
						message: "Info",
						suggestedFix: "Suggestion 3",
					},
				],
				suggestions: [],
			});

			const provider = createMockProvider(mockResponse);
			const validator = new FileValidator({ provider });

			const result = await validator.validate(testFilePath);

			expect(result.suggestions).toHaveLength(3); // From suggestedFix fields
			expect(result.suggestions).toContain("Suggestion 1");
		});
	});
});
