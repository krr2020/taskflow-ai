/**
 * Integration test for PRD standards commands
 */

import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandContext } from "@/commands/base";
import { InitCommand } from "@/commands/init";
import { PrdGenerateArchCommand } from "@/commands/prd/generate-arch";
import { PrdUpdateArchCommand } from "@/commands/prd/update-arch";
import { PrdUpdateStandardsCommand } from "@/commands/prd/update-standards";
import { ConfigLoader } from "@/lib/config/config-loader";
import type { MCPContext } from "@/lib/mcp/mcp-detector";
import { createTestDir } from "../setup.js";

const { existsSync, mkdirSync } = fs;

describe("PRD Standards Integration", () => {
	let testDir: string;
	let context: CommandContext;

	beforeEach(() => {
		testDir = createTestDir();
		const mockMCPContext: MCPContext = {
			isMCP: true,
			detectionMethod: "test",
			serverName: "test-mcp",
		};
		context = { projectRoot: testDir, mcpContext: mockMCPContext };
	});

	afterEach(() => {
		vi.clearAllMocks();
	});

	describe("Generate Architecture Standards", () => {
		it("should require PRD file parameter", async () => {
			// Initialize project first
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Try to generate without PRD file - command returns generic error
			const cmd = new PrdGenerateArchCommand(context);
			const result = await cmd.execute("");

			expect(result.success).toBe(false);
			expect(result.output).toContain("No PRDs found");
		});

		it("should fail if PRD file does not exist", async () => {
			// Initialize project first
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Create prds directory with at least one file so command can check for specific file
			const configLoader = new ConfigLoader(testDir);
			const paths = configLoader.getPaths();
			const prdsDir = path.join(paths.tasksDir, "prds");
			if (!existsSync(prdsDir)) {
				mkdirSync(prdsDir, { recursive: true });
			}
			// Create a dummy PRD so the command proceeds to check for the requested file
			fs.writeFileSync(path.join(prdsDir, "dummy.md"), "# Dummy PRD");

			// Try to generate with non-existent PRD
			const cmd = new PrdGenerateArchCommand(context);
			const result = await cmd.execute("non-existent.md");

			expect(result.success).toBe(false);
			expect(result.output).toContain("PRD file not found");
		});

		it("should fail if standards already exist", async () => {
			// Initialize project first
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Create a PRD file
			const prdsDir = path.join(testDir, "tasks", "prds");
			fs.mkdirSync(prdsDir, { recursive: true });
			const prdPath = path.join(prdsDir, "test-prd.md");
			fs.writeFileSync(prdPath, "# Test PRD\n\nSome content");

			// Create coding-standards.md
			const refDir = path.join(testDir, ".taskflow", "ref");
			const codingStandardsPath = path.join(refDir, "coding-standards.md");
			fs.writeFileSync(codingStandardsPath, "# Existing standards");

			// Try to generate
			const cmd = new PrdGenerateArchCommand(context);
			const result = await cmd.execute("test-prd.md");

			expect(result.success).toBe(false);
			expect(result.output).toContain("Architecture files already exist");
		});

		it("should provide AI guidance when AI not configured", async () => {
			// Initialize project first
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Delete template files created by init
			const refDir = path.join(testDir, ".taskflow", "ref");
			if (fs.existsSync(path.join(refDir, "coding-standards.md"))) {
				fs.unlinkSync(path.join(refDir, "coding-standards.md"));
			}
			if (fs.existsSync(path.join(refDir, "architecture-rules.md"))) {
				fs.unlinkSync(path.join(refDir, "architecture-rules.md"));
			}

			// Create a PRD file
			const prdsDir = path.join(testDir, "tasks", "prds");
			fs.mkdirSync(prdsDir, { recursive: true });
			const prdPath = path.join(prdsDir, "test-prd.md");
			fs.writeFileSync(
				prdPath,
				"# Test PRD\n\n## Requirements\n\n- Feature A\n- Feature B",
			);

			// Generate standards (should fall back to guidance)
			const cmd = new PrdGenerateArchCommand(context);
			vi.spyOn(cmd as any, "isLLMAvailable").mockReturnValue(false);
			const result = await cmd.execute("test-prd.md");

			expect(result.success).toBe(true);
			expect(result.output).toContain("PRD LOADED: test-prd.md");
			expect(result.aiGuidance).toBeDefined();
			expect(result.aiGuidance).toContain(
				"Generate Coding Standards and Architecture Rules",
			);
			expect(result.aiGuidance).toContain("STEP 1: READ THE PRD");
			expect(result.aiGuidance).toContain("STEP 2: ANALYZE CODEBASE");
			expect(result.aiGuidance).toContain("STEP 3: CREATE coding-standards.md");
			expect(result.aiGuidance).toContain(
				"STEP 4: CREATE architecture-rules.md",
			);
		});

		it("should accept optional instructions parameter", async () => {
			// Initialize project first
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Delete template files created by init
			const refDir = path.join(testDir, ".taskflow", "ref");
			if (fs.existsSync(path.join(refDir, "coding-standards.md"))) {
				fs.unlinkSync(path.join(refDir, "coding-standards.md"));
			}
			if (fs.existsSync(path.join(refDir, "architecture-rules.md"))) {
				fs.unlinkSync(path.join(refDir, "architecture-rules.md"));
			}

			// Create a PRD file
			const prdsDir = path.join(testDir, "tasks", "prds");
			fs.mkdirSync(prdsDir, { recursive: true });
			const prdPath = path.join(prdsDir, "test-prd.md");
			fs.writeFileSync(prdPath, "# Test PRD\n\nSome content");

			// Generate with instructions
			const cmd = new PrdGenerateArchCommand(context);
			vi.spyOn(cmd as any, "isLLMAvailable").mockReturnValue(false);
			const result = await cmd.execute(
				"test-prd.md",
				"Focus on API design patterns",
			);

			expect(result.success).toBe(true);
			expect(result.output).toContain("PRD LOADED: test-prd.md");
		});
	});

	describe("Update Standards Command", () => {
		it("should require rule parameter", async () => {
			// Initialize project first
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Try to update without rule
			const cmd = new PrdUpdateStandardsCommand(context);
			const result = await cmd.execute("");

			expect(result.success).toBe(false);
			expect(result.output).toContain("Rule is required");
		});

		it("should fail if coding-standards.md does not exist", async () => {
			// Initialize project first
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Delete the coding-standards.md file created by init
			const refDir = path.join(testDir, ".taskflow", "ref");
			const codingStandardsPath = path.join(refDir, "coding-standards.md");
			if (fs.existsSync(codingStandardsPath)) {
				fs.unlinkSync(codingStandardsPath);
			}

			// Try to update non-existent standards
			const cmd = new PrdUpdateStandardsCommand(context);
			const result = await cmd.execute("Use async/await");

			expect(result.success).toBe(false);
			expect(result.output).toContain("Coding standards file not found");
		});

		it("should provide manual update guidance when AI not configured", async () => {
			// Initialize project first
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Create coding-standards.md
			const refDir = path.join(testDir, ".taskflow", "ref");
			const codingStandardsPath = path.join(refDir, "coding-standards.md");
			fs.writeFileSync(
				codingStandardsPath,
				"# Coding Standards\n\n## Code Style\n\n- Use camelCase",
			);

			// Update standards (should fall back to manual)
			const cmd = new PrdUpdateStandardsCommand(context);
			const result = await cmd.execute("Use async/await instead of .then()");

			expect(result.success).toBe(true);
			expect(result.output).toContain("Coding standards file:");
			expect(result.output).toContain("Use async/await instead of .then()");
			expect(result.nextSteps).toContain("Manual steps:");
		});

		it("should accept optional section parameter", async () => {
			// Initialize project first
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Create coding-standards.md
			const refDir = path.join(testDir, ".taskflow", "ref");
			const codingStandardsPath = path.join(refDir, "coding-standards.md");
			fs.writeFileSync(
				codingStandardsPath,
				"# Coding Standards\n\n## Code Style\n\n- Use camelCase",
			);

			// Update with section
			const cmd = new PrdUpdateStandardsCommand(context);
			const result = await cmd.execute("Use async/await", "Error Handling");

			expect(result.success).toBe(true);
			expect(result.output).toContain("SECTION: Error Handling");
		});
	});

	describe("Update Architecture Command", () => {
		it("should require rule parameter", async () => {
			// Initialize project first
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Try to update without rule
			const cmd = new PrdUpdateArchCommand(context);
			const result = await cmd.execute("");

			expect(result.success).toBe(false);
			expect(result.output).toContain("Rule is required");
		});

		it("should fail if architecture-rules.md does not exist", async () => {
			// Initialize project first
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Delete architecture-rules.md file created by init
			const refDir = path.join(testDir, ".taskflow", "ref");
			const architectureRulesPath = path.join(refDir, "architecture-rules.md");
			if (fs.existsSync(architectureRulesPath)) {
				fs.unlinkSync(architectureRulesPath);
			}

			// Try to update non-existent rules
			const cmd = new PrdUpdateArchCommand(context);
			const result = await cmd.execute("API routes must use DI");

			expect(result.success).toBe(false);
			expect(result.output).toContain("Architecture rules file not found");
		});

		it("should provide manual update guidance when AI not configured", async () => {
			// Initialize project first
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Create architecture-rules.md
			const refDir = path.join(testDir, ".taskflow", "ref");
			const architectureRulesPath = path.join(refDir, "architecture-rules.md");
			fs.writeFileSync(
				architectureRulesPath,
				"# Architecture Rules\n\n## Dependency Rules\n\n- No circular dependencies",
			);

			// Update architecture (should fall back to manual)
			const cmd = new PrdUpdateArchCommand(context);
			const result = await cmd.execute(
				"API routes must use dependency injection",
			);

			expect(result.success).toBe(true);
			expect(result.output).toContain("Architecture rules file:");
			expect(result.output).toContain(
				"API routes must use dependency injection",
			);
			expect(result.nextSteps).toContain("Manual steps:");
		});

		it("should accept optional section parameter", async () => {
			// Initialize project first
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Create architecture-rules.md
			const refDir = path.join(testDir, ".taskflow", "ref");
			const architectureRulesPath = path.join(refDir, "architecture-rules.md");
			fs.writeFileSync(
				architectureRulesPath,
				"# Architecture Rules\n\n## Dependency Rules\n\n- No circular dependencies",
			);

			// Update with section
			const cmd = new PrdUpdateArchCommand(context);
			const result = await cmd.execute(
				"API routes must use DI",
				"Dependency Rules",
			);

			expect(result.success).toBe(true);
			expect(result.output).toContain("SECTION: Dependency Rules");
		});
	});

	describe("End-to-End Workflow", () => {
		it("should complete full standards workflow", async () => {
			// 1. Initialize project
			const initCmd = new InitCommand(context);
			const initResult = await initCmd.execute("test-project");
			expect(initResult.success).toBe(true);

			// 2. Create a PRD file
			const prdsDir = path.join(testDir, "tasks", "prds");
			fs.mkdirSync(prdsDir, { recursive: true });
			const prdPath = path.join(prdsDir, "test-prd.md");
			fs.writeFileSync(
				prdPath,
				"# Test PRD\n\n## Requirements\n\n- Feature A\n- Feature B\n\n## Tech Stack\n\n- TypeScript\n- Node.js",
			);

			// Delete template files created by init so generation doesn't fail
			const refDir = path.join(testDir, ".taskflow", "ref");
			if (fs.existsSync(path.join(refDir, "coding-standards.md"))) {
				fs.unlinkSync(path.join(refDir, "coding-standards.md"));
			}
			if (fs.existsSync(path.join(refDir, "architecture-rules.md"))) {
				fs.unlinkSync(path.join(refDir, "architecture-rules.md"));
			}

			// 3. Generate standards (should provide guidance)
			const generateCmd = new PrdGenerateArchCommand(context);
			vi.spyOn(generateCmd as any, "isLLMAvailable").mockReturnValue(false);
			const generateResult = await generateCmd.execute("test-prd.md");
			expect(generateResult.success).toBe(true);
			expect(generateResult.aiGuidance).toBeDefined();

			// 4. Manually create standards files (simulating AI completion)
			const codingStandardsPath = path.join(refDir, "coding-standards.md");
			const architectureRulesPath = path.join(refDir, "architecture-rules.md");

			fs.writeFileSync(
				codingStandardsPath,
				"# Coding Standards\n\n## Code Style\n\n- Use camelCase",
			);
			fs.writeFileSync(
				architectureRulesPath,
				"# Architecture Rules\n\n## Dependency Rules\n\n- No circular dependencies",
			);

			// 5. Update coding standards
			const updateStandardsCmd = new PrdUpdateStandardsCommand(context);
			const updateStandardsResult =
				await updateStandardsCmd.execute("Use async/await");
			expect(updateStandardsResult.success).toBe(true);

			// 6. Update architecture rules
			const updateArchCmd = new PrdUpdateArchCommand(context);
			const updateArchResult = await updateArchCmd.execute(
				"API routes must use DI",
			);
			expect(updateArchResult.success).toBe(true);

			// Verify all files exist
			expect(fs.existsSync(codingStandardsPath)).toBe(true);
			expect(fs.existsSync(architectureRulesPath)).toBe(true);
		});
	});
});
