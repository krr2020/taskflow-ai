/**
 * MCP Detector Tests
 */

import { afterEach, describe, expect, it } from "vitest";
import { MCPDetector } from "../../src/lib/mcp/mcp-detector.js";

// Store original env vars
const originalEnv = { ...process.env };

describe("MCPDetector", () => {
	afterEach(() => {
		// Restore original env vars
		for (const key in process.env) {
			delete process.env[key];
		}
		Object.assign(process.env, originalEnv);
	});

	describe("detect()", () => {
		it("should detect CLI mode when no MCP indicators present", () => {
			const context = MCPDetector.detect();
			expect(context.isMCP).toBe(false);
			expect(context.detectionMethod).toBe("none");
		});

		it("should detect MCP mode via MCP_SERVER_NAME", () => {
			process.env.MCP_SERVER_NAME = "taskflow-server";
			const context = MCPDetector.detect();
			expect(context.isMCP).toBe(true);
			expect(context.detectionMethod).toBe("env_var");
			expect(context.serverName).toBe("taskflow-server");
		});

		it("should detect MCP mode via MCP_SERVER_VERSION", () => {
			process.env.MCP_SERVER_VERSION = "1.0.0";
			const context = MCPDetector.detect();
			expect(context.isMCP).toBe(true);
			expect(context.detectionMethod).toBe("env_var");
			expect(context.serverVersion).toBe("1.0.0");
		});

		it("should detect MCP mode via MCP_CLIENT_NAME", () => {
			process.env.MCP_CLIENT_NAME = "Claude Desktop";
			const context = MCPDetector.detect();
			expect(context.isMCP).toBe(true);
			expect(context.detectionMethod).toBe("env_var");
			expect(context.clientInfo?.name).toBe("Claude Desktop");
		});

		it("should detect MCP mode via MCP_CLIENT_VERSION", () => {
			process.env.MCP_CLIENT_VERSION = "1.2.3";
			const context = MCPDetector.detect();
			expect(context.isMCP).toBe(true);
			expect(context.detectionMethod).toBe("env_var");
			expect(context.clientInfo?.version).toBe("1.2.3");
		});

		it("should detect MCP mode via npm taskflow mcp event", () => {
			process.env.npm_lifecycle_event = "taskflow-mcp";
			const context = MCPDetector.detect();
			expect(context.isMCP).toBe(true);
			expect(context.detectionMethod).toBe("parent_process");
		});

		it("should detect MCP mode via MCP_PROTOCOL", () => {
			process.env.MCP_PROTOCOL = "stdio";
			process.stdin.isTTY = false;
			const context = MCPDetector.detect();
			expect(context.isMCP).toBe(true);
			expect(context.detectionMethod).toBe("stdio");
		});

		it("should combine multiple env vars", () => {
			process.env.MCP_SERVER_NAME = "taskflow-server";
			process.env.MCP_SERVER_VERSION = "1.0.0";
			process.env.MCP_CLIENT_NAME = "Claude Desktop";
			const context = MCPDetector.detect();
			expect(context.isMCP).toBe(true);
			expect(context.serverName).toBe("taskflow-server");
			expect(context.serverVersion).toBe("1.0.0");
			expect(context.clientInfo?.name).toBe("Claude Desktop");
		});
	});

	describe("isMCPMode()", () => {
		it("should return true when in MCP mode", () => {
			process.env.MCP_SERVER_NAME = "taskflow-server";
			expect(MCPDetector.isMCPMode()).toBe(true);
		});

		it("should return false when in CLI mode", () => {
			expect(MCPDetector.isMCPMode()).toBe(false);
		});
	});

	describe("getExecutionMode()", () => {
		it('should return "mcp" when in MCP mode', () => {
			process.env.MCP_SERVER_NAME = "taskflow-server";
			expect(MCPDetector.getExecutionMode()).toBe("mcp");
		});

		it('should return "cli" when in CLI mode', () => {
			expect(MCPDetector.getExecutionMode()).toBe("cli");
		});
	});

	describe("getDetectionExplanation()", () => {
		it("should return explanation for CLI mode", () => {
			const explanation = MCPDetector.getDetectionExplanation();
			expect(explanation).toContain("Running in direct CLI mode");
		});

		it("should return explanation for env var detection", () => {
			process.env.MCP_SERVER_NAME = "taskflow-server";
			const explanation = MCPDetector.getDetectionExplanation();
			expect(explanation).toContain("Running in MCP mode");
			expect(explanation).toContain("environment variables");
		});

		it("should return explanation for parent process detection", () => {
			process.env.npm_lifecycle_event = "taskflow-mcp";
			const explanation = MCPDetector.getDetectionExplanation();
			expect(explanation).toContain("Running in MCP mode");
			expect(explanation).toContain("parent process");
		});

		it("should return explanation for stdio detection", () => {
			process.env.MCP_PROTOCOL = "stdio";
			const explanation = MCPDetector.getDetectionExplanation();
			expect(explanation).toContain("Running in MCP mode");
			expect(explanation).toContain("stdio JSON-RPC");
		});
	});
});
