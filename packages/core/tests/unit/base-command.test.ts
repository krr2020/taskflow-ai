import { describe, expect, it, vi } from "vitest";
import { BaseCommand, type CommandResult } from "@/commands/base";
import type { MCPContext } from "@/lib/mcp/mcp-detector";

// Concrete implementation for testing
class TestCommand extends BaseCommand {
	async execute(): Promise<CommandResult> {
		return this.success("done", "next");
	}

	// Public wrapper to access protected method
	async testExecuteWithFallback<T>(
		operation: () => Promise<T>,
		fallback: () => T | Promise<T>,
		context: string,
	): Promise<T> {
		return this.executeWithFallback(operation, fallback, context);
	}
}

describe("BaseCommand", () => {
	const mockMCPContext: MCPContext = {
		isMCP: false,
		detectionMethod: "none",
	};
	const mockContext = { projectRoot: "/tmp/test", mcpContext: mockMCPContext };

	it("should execute operation successfully", async () => {
		const command = new TestCommand(mockContext);
		const operation = vi.fn().mockResolvedValue("success");
		const fallback = vi.fn().mockReturnValue("fallback");

		const result = await command.testExecuteWithFallback(
			operation,
			fallback,
			"test",
		);

		expect(result).toBe("success");
		expect(operation).toHaveBeenCalled();
		expect(fallback).not.toHaveBeenCalled();
	});

	it("should trigger fallback on error", async () => {
		const command = new TestCommand(mockContext);
		const operation = vi.fn().mockRejectedValue(new Error("fail"));
		const fallback = vi.fn().mockReturnValue("fallback");

		const result = await command.testExecuteWithFallback(
			operation,
			fallback,
			"test",
		);

		expect(result).toBe("fallback");
		expect(operation).toHaveBeenCalled();
		expect(fallback).toHaveBeenCalled();
	});

	it("should support async fallback", async () => {
		const command = new TestCommand(mockContext);
		const operation = vi.fn().mockRejectedValue(new Error("fail"));
		const fallback = vi.fn().mockResolvedValue("async fallback");

		const result = await command.testExecuteWithFallback(
			operation,
			fallback,
			"test",
		);

		expect(result).toBe("async fallback");
		expect(operation).toHaveBeenCalled();
		expect(fallback).toHaveBeenCalled();
	});
});
