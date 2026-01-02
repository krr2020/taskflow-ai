import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { BaseCommand, type CommandResult } from "../../src/commands/base.js";
import type { MCPContext } from "../../src/lib/mcp-detector";
import { type LLMGenerationResult, LLMProvider } from "../../src/llm/base.js";

// Mock implementation of BaseCommand for testing
class TestCommand extends BaseCommand {
	async execute(): Promise<CommandResult> {
		return this.success("Success", "");
	}

	// Expose protected methods for testing
	public async testVerifyLLMConfiguration(checkConnection = false) {
		return this.verifyLLMConfiguration(checkConnection);
	}

	public async testExecuteWithFallback<T>(
		operation: () => Promise<T>,
		fallback: () => T,
		context: string,
	) {
		return this.executeWithFallback(operation, fallback, context);
	}

	public async testRetryWithBackoff<T>(fn: () => Promise<T>, maxRetries = 3) {
		return this.retryWithBackoff(fn, maxRetries, 10); // Short delay for tests
	}

	public testLogError(error: unknown, context: string) {
		this.logError(error, context);
	}
}

// Mock LLM Provider
class MockProvider extends LLMProvider {
	constructor() {
		super("openai-compatible" as any, "test-model");
	}

	generate = vi.fn();
	isConfigured = vi.fn().mockReturnValue(true);
	async *generateStream(): AsyncGenerator<
		string,
		LLMGenerationResult,
		unknown
	> {
		yield "mock stream content";
		return {
			content: "mock stream content",
			model: "test-model",
			promptTokens: 0,
			completionTokens: 0,
			tokensUsed: 0,
		};
	}
}

describe("Error Handling", () => {
	let command: TestCommand;
	let mockProvider: MockProvider;
	const projectRoot = "/tmp/test-project";

	beforeEach(() => {
		// Mock fs
		vi.spyOn(fs, "existsSync").mockReturnValue(true);
		vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);
		vi.spyOn(fs, "appendFileSync").mockImplementation(() => undefined);

		mockProvider = new MockProvider();

		// Create command instance
		const mockMCPContext: MCPContext = {
			isMCP: false,
			detectionMethod: "none",
		};
		command = new TestCommand({ projectRoot, mcpContext: mockMCPContext });

		// Inject mock provider
		(command as any).llmProvider = mockProvider;
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("verifyLLMConfiguration", () => {
		it("should return valid when provider is configured", async () => {
			const result = await command.testVerifyLLMConfiguration();
			expect(result.valid).toBe(true);
		});

		it("should return invalid when provider is not initialized", async () => {
			(command as any).llmProvider = undefined;
			const result = await command.testVerifyLLMConfiguration();
			expect(result.valid).toBe(false);
			expect(result.error).toContain("not initialized");
		});

		it("should return invalid when provider is not configured", async () => {
			mockProvider.isConfigured.mockReturnValue(false);
			const result = await command.testVerifyLLMConfiguration();
			expect(result.valid).toBe(false);
			expect(result.error).toContain("not configured");
		});

		it("should check connection when requested", async () => {
			mockProvider.generate.mockResolvedValue({
				content: "pong",
				model: "test",
			});
			const result = await command.testVerifyLLMConfiguration(true);
			expect(result.valid).toBe(true);
			expect(mockProvider.generate).toHaveBeenCalledWith(
				expect.arrayContaining([{ role: "user", content: "ping" }]),
				expect.anything(),
			);
		});

		it("should fail connection check on error", async () => {
			mockProvider.generate.mockRejectedValue(new Error("Network error"));
			const result = await command.testVerifyLLMConfiguration(true);
			expect(result.valid).toBe(false);
			expect(result.error).toContain("LLM connection failed");
			expect(result.error).toContain("Network error");
		});
	});

	describe("executeWithFallback", () => {
		it("should return operation result on success", async () => {
			const operation = vi.fn().mockResolvedValue("Success");
			const fallback = vi.fn().mockReturnValue("Fallback");

			const result = await command.testExecuteWithFallback(
				operation,
				fallback,
				"Test",
			);

			expect(result).toBe("Success");
			expect(operation).toHaveBeenCalled();
			expect(fallback).not.toHaveBeenCalled();
		});

		it("should return fallback result on error", async () => {
			const operation = vi.fn().mockRejectedValue(new Error("Failure"));
			const fallback = vi.fn().mockReturnValue("Fallback");

			const result = await command.testExecuteWithFallback(
				operation,
				fallback,
				"Test",
			);

			expect(result).toBe("Fallback");
			expect(operation).toHaveBeenCalled();
			expect(fallback).toHaveBeenCalled();
			// Should log error
			expect(fs.appendFileSync).toHaveBeenCalled();
		});
	});

	describe("retryWithBackoff", () => {
		it("should return result immediately if successful", async () => {
			const fn = vi.fn().mockResolvedValue("Success");

			const result = await command.testRetryWithBackoff(fn);

			expect(result).toBe("Success");
			expect(fn).toHaveBeenCalledTimes(1);
		});

		it("should retry on failure and succeed", async () => {
			const fn = vi
				.fn()
				.mockRejectedValueOnce(new Error("Fail 1"))
				.mockRejectedValueOnce(new Error("Fail 2"))
				.mockResolvedValue("Success");

			const result = await command.testRetryWithBackoff(fn);

			expect(result).toBe("Success");
			expect(fn).toHaveBeenCalledTimes(3);
		});

		it("should fail after max retries", async () => {
			const fn = vi.fn().mockRejectedValue(new Error("Always fail"));

			await expect(command.testRetryWithBackoff(fn, 3)).rejects.toThrow(
				"Always fail",
			);
			expect(fn).toHaveBeenCalledTimes(4); // Initial + 3 retries
		});
	});

	describe("logError", () => {
		it("should log error to file", () => {
			command.testLogError(new Error("Test error"), "Test Context");

			expect(fs.appendFileSync).toHaveBeenCalledWith(
				expect.stringContaining("error.log"),
				expect.stringContaining("Test error"),
			);
			expect(fs.appendFileSync).toHaveBeenCalledWith(
				expect.stringContaining("error.log"),
				expect.stringContaining("Test Context"),
			);
		});

		it("should sanitize API keys", () => {
			const apiKey = "sk-1234567890abcdef1234567890abcdef";
			const error = new Error(`Invalid API key: ${apiKey}`);

			command.testLogError(error, "Auth Check");

			expect(fs.appendFileSync).toHaveBeenCalledWith(
				expect.stringContaining("error.log"),
				expect.not.stringContaining(apiKey),
			);
			expect(fs.appendFileSync).toHaveBeenCalledWith(
				expect.stringContaining("error.log"),
				expect.stringContaining("***API_KEY***"),
			);
		});
	});
});
