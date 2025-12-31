/**
 * Integration test for workflow commands
 */

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { CommandContext } from "../../src/commands/base.js";
import { InitCommand } from "../../src/commands/init.js";
import { StatusCommand } from "../../src/commands/workflow/status.js";
import { createTestDir } from "../setup.js";

describe("status command", () => {
	let testDir: string;
	let context: CommandContext;

	beforeEach(() => {
		testDir = createTestDir();
		context = { projectRoot: testDir };
	});

	it("should show status after initialization", async () => {
		// Initialize
		const initCmd = new InitCommand(context);
		await initCmd.execute("test-project");

		// Create empty project-index.json so status command works
		// (InitCommand doesn't create this file, but StatusCommand expects it)
		const projectIndex = {
			project: "test-project",
			features: [],
		};
		fs.writeFileSync(
			path.join(testDir, "tasks", "project-index.json"),
			JSON.stringify(projectIndex, null, 2),
		);

		// Show status (will succeed even with empty project)
		const statusCmd = new StatusCommand(context);
		const result = await statusCmd.execute();

		expect(result.success).toBe(true);
		expect(result.output).toContain("PROJECT: test-project");
	});

	it("should fail status if project not initialized", async () => {
		const freshDir = createTestDir();
		const freshContext = { projectRoot: freshDir };

		const statusCmd = new StatusCommand(freshContext);

		// StatusCommand throws FileNotFoundError when project-index.json doesn't exist
		await expect(statusCmd.execute()).rejects.toThrow("File not found");
	});
});
