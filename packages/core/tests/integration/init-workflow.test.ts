/**
 * Integration test for init workflow
 */

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { CommandContext } from "../../src/commands/base.js";
import { InitCommand } from "../../src/commands/init.js";
import { StatusCommand } from "../../src/commands/workflow/status.js";
import { createTestDir } from "../setup.js";

describe("Init Workflow Integration", () => {
	let testDir: string;
	let context: CommandContext;

	beforeEach(() => {
		testDir = createTestDir();
		context = { projectRoot: testDir };
	});

	it("should initialize project successfully", async () => {
		const initCmd = new InitCommand(context);
		const result = await initCmd.execute("test-project");

		// Should succeed
		expect(result.success).toBe(true);
		expect(result.output).toContain("Created taskflow.config.json");

		// Should create config file
		const configPath = path.join(testDir, "taskflow.config.json");
		expect(fs.existsSync(configPath)).toBe(true);

		// Should create directories
		expect(fs.existsSync(path.join(testDir, "tasks"))).toBe(true);
		expect(fs.existsSync(path.join(testDir, ".taskflow", "ref"))).toBe(true);
		expect(fs.existsSync(path.join(testDir, ".taskflow", "logs"))).toBe(true);

		// Should copy template files
		const aiProtocol = path.join(testDir, ".taskflow", "ref", "ai-protocol.md");
		expect(fs.existsSync(aiProtocol)).toBe(true);

		// Should provide AI guidance
		expect(result.aiGuidance).toBeDefined();
		expect(result.aiGuidance).toContain("PRD");
	});

	it("should fail if already initialized", async () => {
		// Initialize once
		const initCmd1 = new InitCommand(context);
		await initCmd1.execute("test-project");

		// Try to initialize again
		const initCmd2 = new InitCommand(context);
		const result = await initCmd2.execute("test-project");

		// Should fail
		expect(result.success).toBe(false);
		expect(result.output).toContain("already initialized");
	});

	it("should work with status command after init", async () => {
		// Initialize
		const initCmd = new InitCommand(context);
		await initCmd.execute("test-project");

		// Create minimal project-index.json
		const projectIndex = {
			project: "test-project",
			features: [],
		};

		fs.writeFileSync(
			path.join(testDir, "tasks", "project-index.json"),
			JSON.stringify(projectIndex, null, 2),
		);

		// Run status command
		const statusCmd = new StatusCommand(context);
		const result = await statusCmd.execute();

		// Should succeed and show empty project
		expect(result.success).toBe(true);
		expect(result.output).toContain("PROJECT: test-project");
	});
});
