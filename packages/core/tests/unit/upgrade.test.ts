/**
 * Unit tests for UpgradeCommand
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import type { CommandContext } from "../../src/commands/base.js";
import { UpgradeCommand } from "../../src/commands/upgrade.js";
import { createTestDir } from "../setup.js";

describe("UpgradeCommand", () => {
	let testDir: string;
	let context: CommandContext;

	beforeEach(() => {
		testDir = createTestDir();
		context = { projectRoot: testDir };

		// Create basic .taskflow structure
		const taskflowDir = path.join(testDir, ".taskflow");
		const refDir = path.join(taskflowDir, "ref");
		fs.mkdirSync(refDir, { recursive: true });
	});

	describe("execute", () => {
		it("should fail if .taskflow directory does not exist", async () => {
			// Create a fresh temporary directory that's NOT the testDir
			// This test needs to verify command fails when .taskflow doesn't exist
			const emptyDir = fs.mkdtempSync(
				path.join(os.tmpdir(), "taskflow-test-empty-"),
			);
			const cmd = new UpgradeCommand({ projectRoot: emptyDir });

			const result = await cmd.execute();

			expect(result.success).toBe(false);
			expect(result.output).toContain("No .taskflow directory found");

			// Clean up
			fs.rmSync(emptyDir, { recursive: true, force: true });
		});

		it("should report already up to date if versions match", async () => {
			// Create version file with current version
			const versionFile = path.join(testDir, ".taskflow", ".version");
			fs.writeFileSync(
				versionFile,
				JSON.stringify(
					{
						templateVersion: "0.1.0",
						installedAt: new Date().toISOString(),
						customized: [],
					},
					null,
					2,
				),
			);

			const cmd = new UpgradeCommand(context);
			const result = await cmd.execute();

			expect(result.success).toBe(true);
			expect(result.output).toContain("Already on latest version");
		});

		it("should create backup directory before upgrade", async () => {
			// Create old version file
			const versionFile = path.join(testDir, ".taskflow", ".version");
			fs.writeFileSync(
				versionFile,
				JSON.stringify(
					{
						templateVersion: "0.0.1",
						installedAt: new Date().toISOString(),
						customized: [],
					},
					null,
					2,
				),
			);

			// Create a test file in ref
			const refFile = path.join(testDir, ".taskflow", "ref", "test.md");
			fs.writeFileSync(refFile, "test content");

			const cmd = new UpgradeCommand(context);
			const result = await cmd.execute({ auto: true });

			expect(result.success).toBe(true);
			expect(result.output).toContain("Backup created:");

			// Check backup exists
			const backupDir = path.join(testDir, ".taskflow", "backups");
			expect(fs.existsSync(backupDir)).toBe(true);
		});

		it("should update version file after upgrade", async () => {
			// Create old version file
			const versionFile = path.join(testDir, ".taskflow", ".version");
			fs.writeFileSync(
				versionFile,
				JSON.stringify(
					{
						templateVersion: "0.0.1",
						installedAt: new Date().toISOString(),
						customized: [],
					},
					null,
					2,
				),
			);

			const cmd = new UpgradeCommand(context);
			await cmd.execute({ auto: true });

			// Check version was updated
			const updatedVersion = JSON.parse(fs.readFileSync(versionFile, "utf-8"));
			expect(updatedVersion.templateVersion).toBe("0.1.0");
		});

		it("should show diff summary with --diff flag", async () => {
			const versionFile = path.join(testDir, ".taskflow", ".version");
			fs.writeFileSync(
				versionFile,
				JSON.stringify(
					{
						templateVersion: "0.0.1",
						installedAt: new Date().toISOString(),
						customized: [],
					},
					null,
					2,
				),
			);

			const cmd = new UpgradeCommand(context);
			const result = await cmd.execute({ diff: true });

			expect(result.success).toBe(true);
			expect(result.output).toContain("Diff Summary");
		});
	});
});
