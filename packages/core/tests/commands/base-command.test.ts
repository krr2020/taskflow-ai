/**
 * BaseCommand Tests - LLM Validation
 */

import { beforeEach, describe, expect, it, vi } from "vitest";
import { BaseCommand, type CommandContext } from "../../src/commands/base.js";

// Create a test command that requires LLM
class TestCommandWithLLM extends BaseCommand {
	override requiresLLM = true;

	async execute(): Promise<any> {
		return { success: true, output: "Test", nextSteps: "" };
	}
}

// Create a test command that doesn't require LLM
class TestCommandWithoutLLM extends BaseCommand {
	override requiresLLM = false;

	async execute(): Promise<any> {
		return { success: true, output: "Test", nextSteps: "" };
	}
}

// Mock file system operations
vi.mock("node:fs", () => ({
	default: {
		existsSync: vi.fn(() => false),
		writeFileSync: vi.fn(),
		readFileSync: vi.fn(() => "{}"),
		mkdirSync: vi.fn(),
	},
}));

describe("BaseCommand - LLM Validation", () => {
	let mockContext: CommandContext;

	beforeEach(() => {
		mockContext = {
			projectRoot: "/test/project",
			mcpContext: {
				isMCP: false,
				detectionMethod: "none",
			},
		};
	});

	describe("validateLLM()", () => {
		it("should pass validation when LLM is available and not required", () => {
			const cmd = new TestCommandWithoutLLM(mockContext);
			expect(() => (cmd as any).validateLLM()).not.toThrow();
		});

		it("should pass validation when LLM is available and required", () => {
			const cmd = new TestCommandWithLLM(mockContext);
			// Mock LLM availability
			vi.spyOn(cmd as any, "isLLMAvailable").mockReturnValue(true);
			expect(() => (cmd as any).validateLLM()).not.toThrow();
		});

		it("should skip validation when in MCP mode", () => {
			mockContext.mcpContext.isMCP = true;
			mockContext.mcpContext.detectionMethod = "env_var";
			const cmd = new TestCommandWithLLM(mockContext);
			vi.spyOn(cmd as any, "isLLMAvailable").mockReturnValue(false);
			expect(() => (cmd as any).validateLLM()).not.toThrow();
		});

		it("should throw error when LLM is required but not available (CLI mode)", () => {
			const cmd = new TestCommandWithLLM(mockContext);
			vi.spyOn(cmd as any, "isLLMAvailable").mockReturnValue(false);

			expect(() => (cmd as any).validateLLM("test:command")).toThrow();
		});

		it("should throw error message containing command name", () => {
			const cmd = new TestCommandWithLLM(mockContext);
			vi.spyOn(cmd as any, "isLLMAvailable").mockReturnValue(false);

			try {
				(cmd as any).validateLLM("prd:create");
				expect.fail("Should have thrown error");
			} catch (error: any) {
				expect(error.message).toContain("prd:create");
			}
		});
	});

	describe("getLLMRequiredErrorMessage()", () => {
		it("should contain both MCP and CLI options", () => {
			const cmd = new TestCommandWithLLM(mockContext);
			const message = (cmd as any).getLLMRequiredErrorMessage("test-command");

			expect(message).toContain("MCP Server (Recommended)");
			expect(message).toContain("Configure Custom LLM Provider");
		});

		it("should contain specific configuration steps", () => {
			const cmd = new TestCommandWithLLM(mockContext);
			const message = (cmd as any).getLLMRequiredErrorMessage("test-command");

			expect(message).toContain("taskflow.config.json");
			expect(message).toContain("taskflow configure ai");
			expect(message).toContain("ANTHROPIC_API_KEY");
		});

		it("should contain link to documentation", () => {
			const cmd = new TestCommandWithLLM(mockContext);
			const message = (cmd as any).getLLMRequiredErrorMessage("test-command");

			expect(message).toContain("https://github.com/krr2020/taskflow");
		});
	});

	describe("Context-Aware Behavior", () => {
		it("should skip validation when isMCP is true", () => {
			mockContext.mcpContext.isMCP = true;
			mockContext.mcpContext.serverName = "taskflow-mcp";

			const cmd = new TestCommandWithLLM(mockContext);
			vi.spyOn(cmd as any, "isLLMAvailable").mockReturnValue(false);

			expect(() => (cmd as any).validateLLM()).not.toThrow();
		});

		it("should perform validation when isMCP is false", () => {
			mockContext.mcpContext.isMCP = false;

			const cmd = new TestCommandWithLLM(mockContext);
			vi.spyOn(cmd as any, "isLLMAvailable").mockReturnValue(false);

			expect(() => (cmd as any).validateLLM()).toThrow();
		});

		it("should store mcpContext from context", () => {
			mockContext.mcpContext.detectionMethod = "env_var";

			const cmd = new TestCommandWithLLM(mockContext);
			expect((cmd as any).mcpContext.detectionMethod).toBe("env_var");
		});
	});
});
