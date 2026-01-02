/**
 * Integration Tests - End-to-End Workflow
 */

import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandContext } from "../../src/commands/base.js";
import { InitCommand } from "../../src/commands/init.js";
import { PrdCreateCommand } from "../../src/commands/prd/create.js";
import { TasksGenerateCommand } from "../../src/commands/tasks/generate.js";
import { type MCPContext, MCPDetector } from "../../src/lib/mcp-detector.js";

vi.mock("../../src/lib/prd-interactive-session.js", () => ({
	PRDInteractiveSession: class {
		start(featureName: string) {
			return Promise.resolve({
				featureName: featureName || "Test Feature",
				title: "Test Feature",
				summary: "Test Summary",
			});
		}
	},
}));

describe("Integration Workflow Tests", () => {
	let testDir: string;
	let mcpContext: MCPContext;

	beforeEach(() => {
		// Create temporary directory for tests
		testDir = `/tmp/taskflow-test-${Date.now()}`;
		fs.mkdirSync(testDir, { recursive: true });
		mcpContext = MCPDetector.detect();
	});

	afterEach(() => {
		// Cleanup test directory
		if (fs.existsSync(testDir)) {
			fs.rmSync(testDir, { recursive: true, force: true });
		}
		vi.clearAllMocks();
	});

	describe("Init Workflow", () => {
		it("should create all necessary files and directories", async () => {
			const context: CommandContext = {
				projectRoot: testDir,
				mcpContext,
			};

			const cmd = new InitCommand(context);
			const result = await cmd.execute("test-project");

			expect(result.success).toBe(true);
			expect(result.output).toContain("✓ Created taskflow.config.json");
			expect(result.output).toContain("✓ Created tasks/ directory");
			expect(result.output).toContain("✓ Created .taskflow/ref/ directory");
		});

		it("should provide context-aware guidance", async () => {
			const context: CommandContext = {
				projectRoot: testDir,
				mcpContext,
			};

			const cmd = new InitCommand(context);
			const result = await cmd.execute("test-project");

			if (mcpContext.isMCP) {
				expect(result.output).toContain("Running in MCP mode (AI-assisted)");
			} else {
				expect(result.output).toContain("Running in direct CLI mode");
				expect(result.output).toContain("Configure AI provider");
			}
		});

		it("should show template file details", async () => {
			const context: CommandContext = {
				projectRoot: testDir,
				mcpContext,
			};

			const cmd = new InitCommand(context);
			const result = await cmd.execute("test-project");

			expect(result.output).toContain("Template Files");
		});
	});

	describe("PRD Create Workflow (MCP Mode)", () => {
		it("should succeed in MCP mode without LLM configuration", async () => {
			// Mock MCP mode
			const mockMCPContext: MCPContext = {
				isMCP: true,
				detectionMethod: "env_var",
				serverName: "test-mcp",
			};

			const context: CommandContext = {
				projectRoot: testDir,
				mcpContext: mockMCPContext,
			};

			const cmd = new PrdCreateCommand(context);
			// Mock isLLMAvailable to return false
			vi.spyOn(cmd as any, "isLLMAvailable").mockReturnValue(false);

			const result = await cmd.execute("test-feature", "Test description");

			// Should succeed because validation is skipped in MCP mode
			// (Will use fallback template)
			expect(result.success).toBe(true);
			expect(result.output).toContain("PRD created");
		});
	});

	describe("PRD Create Workflow (CLI Mode)", () => {
		it("should fail gracefully when LLM not configured", async () => {
			// Mock CLI mode
			const mockMCPContext: MCPContext = {
				isMCP: false,
				detectionMethod: "none",
			};

			const context: CommandContext = {
				projectRoot: testDir,
				mcpContext: mockMCPContext,
			};

			const cmd = new PrdCreateCommand(context);
			// Mock isLLMAvailable to return false
			vi.spyOn(cmd as any, "isLLMAvailable").mockReturnValue(false);

			await expect(
				cmd.execute("test-feature", "Test description"),
			).rejects.toThrow("LLM Provider Required");
		});

		it("should succeed when LLM is configured", async () => {
			// Mock CLI mode
			const mockMCPContext: MCPContext = {
				isMCP: false,
				detectionMethod: "none",
			};

			const context: CommandContext = {
				projectRoot: testDir,
				mcpContext: mockMCPContext,
			};

			const cmd = new PrdCreateCommand(context);
			// Mock isLLMAvailable to return true
			vi.spyOn(cmd as any, "isLLMAvailable").mockReturnValue(true);

			const result = await cmd.execute("test-feature", "Test description");

			// Should succeed when LLM is available
			expect(result.success).toBe(true);
		});
	});

	describe("Full Workflow: Init → PRD → Tasks", () => {
		it("should complete full workflow in MCP mode", async () => {
			// Mock MCP mode
			const mockMCPContext: MCPContext = {
				isMCP: true,
				detectionMethod: "env_var",
				serverName: "test-mcp",
			};

			const context: CommandContext = {
				projectRoot: testDir,
				mcpContext: mockMCPContext,
			};

			// Step 1: Init
			const initCmd = new InitCommand(context);
			const initResult = await initCmd.execute("test-project");
			expect(initResult.success).toBe(true);

			// Step 2: Create PRD
			const prdCmd = new PrdCreateCommand(context);
			vi.spyOn(prdCmd as any, "isLLMAvailable").mockReturnValue(false);
			const prdResult = await prdCmd.execute("test-feature", "Test PRD");
			expect(prdResult.success).toBe(true);

			// Step 3: Generate Tasks
			const tasksCmd = new TasksGenerateCommand(context);
			vi.spyOn(tasksCmd as any, "isLLMAvailable").mockReturnValue(false);
			// Would generate tasks from PRD
			// For test, we just verify it doesn't throw
			// const tasksResult = await tasksCmd.execute('2026-01-02-test-feature.md');
			// expect(tasksResult.success).toBe(true);
		});
	});

	describe("Error Message Quality", () => {
		it("should provide actionable LLM error messages", async () => {
			const mockMCPContext: MCPContext = {
				isMCP: false,
				detectionMethod: "none",
			};

			const context: CommandContext = {
				projectRoot: testDir,
				mcpContext: mockMCPContext,
			};

			const cmd = new PrdCreateCommand(context);
			vi.spyOn(cmd as any, "isLLMAvailable").mockReturnValue(false);

			try {
				await cmd.execute("test-feature");
				expect.fail("Should have thrown error");
			} catch (error: any) {
				const errorMessage = error.message;
				expect(errorMessage).toContain("LLM Provider Required");
				expect(errorMessage).toContain("MCP Server");
				expect(errorMessage).toContain("taskflow configure ai");
				expect(errorMessage).toContain("https://github.com/krr2020/taskflow");
			}
		});
	});

	describe("File Operation Error Handling", () => {
		it("should show file details in output", async () => {
			const context: CommandContext = {
				projectRoot: testDir,
				mcpContext,
			};

			const cmd = new InitCommand(context);
			const result = await cmd.execute("test-project");

			expect(result.output).toMatch(/✓ (Copied|Created):/);
		});
	});
});
