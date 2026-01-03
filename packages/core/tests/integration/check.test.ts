/**
 * Integration tests for check command
 * Tests error analysis, pre-validation guidance, AI validation, and pattern detection
 */

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandContext } from "@/commands/base";
import { CheckCommand } from "@/commands/workflow/check";
import { StartCommand } from "@/commands/workflow/start";
import type { MCPContext } from "@/lib/mcp/mcp-detector";
import { createTestDir } from "../setup.js";

// Mock git operations
vi.mock("@/lib/git/git", () => ({
	verifyBranch: vi.fn(),
	getCurrentBranch: vi.fn(() => "main"),
	branchExists: vi.fn(() => true),
}));

describe("check command integration", () => {
	let testDir: string;
	let context: CommandContext;
	let tasksDir: string;
	let refDir: string;

	beforeEach(() => {
		testDir = createTestDir();
		const mockMCPContext: MCPContext = {
			isMCP: false,
			detectionMethod: "none",
		};
		context = { projectRoot: testDir, mcpContext: mockMCPContext };
		tasksDir = path.join(testDir, "tasks");
		refDir = path.join(testDir, ".taskflow", "ref");

		// Create taskflow.config.json
		fs.writeFileSync(
			path.join(testDir, "taskflow.config.json"),
			JSON.stringify(
				{
					version: "1.0.0",
					project: {
						name: "test-project",
					},
					branching: {
						strategy: "per-story",
						base: "main",
						prefix: "story/",
					},
					ai: {
						enabled: false, // Tests run without LLM
					},
				},
				null,
				2,
			),
		);

		// Initialize project structure
		const featureDir = path.join(tasksDir, "features", "1-test");
		const storyDir = path.join(featureDir, "S1.1-test-story");

		fs.mkdirSync(storyDir, { recursive: true });
		fs.mkdirSync(refDir, { recursive: true });

		// Create project index
		fs.writeFileSync(
			path.join(tasksDir, "project-index.json"),
			JSON.stringify(
				{
					project: "test-project",
					features: [
						{
							id: "1",
							title: "Test Feature",
							status: "in-progress",
							path: "features/1-test",
						},
					],
				},
				null,
				2,
			),
		);

		// Create feature file
		fs.writeFileSync(
			path.join(featureDir, "1-test.json"),
			JSON.stringify(
				{
					id: "1",
					title: "Test Feature",
					status: "in-progress",
					stories: [
						{
							id: "1.1",
							title: "Test Story",
							status: "in-progress",
							tasks: [
								{
									id: "1.1.1",
									title: "Test Task",
									status: "not-started",
									dependencies: [],
								},
							],
						},
					],
				},
				null,
				2,
			),
		);

		// Create story file
		fs.writeFileSync(
			path.join(storyDir, "story.json"),
			JSON.stringify(
				{
					id: "1.1",
					title: "Test Story",
					status: "in-progress",
					tasks: [
						{
							id: "1.1.1",
							title: "Test Task",
							status: "not-started",
							dependencies: [],
						},
					],
				},
				null,
				2,
			),
		);

		// Create task file
		const taskContent = {
			id: "1.1.1",
			title: "Test Task",
			description: "Test task description",
			status: "not-started",
			skill: "backend",
			subtasks: [],
			context: [],
			notes: [],
			estimatedHours: 2,
		};
		fs.writeFileSync(
			path.join(storyDir, "T1.1.1-test-task.json"),
			JSON.stringify(taskContent, null, 2),
		);

		// Create progress.md
		fs.writeFileSync(
			path.join(testDir, "progress.md"),
			"# Progress\n\n## Pending\n- [ ] Task 1.1.1\n",
		);

		// Create reference files
		fs.writeFileSync(
			path.join(refDir, "coding-standards.md"),
			"# Coding Standards\n\n## TypeScript\n- Use strict mode\n- No any types\n",
		);

		fs.writeFileSync(
			path.join(refDir, "architecture-rules.md"),
			"# Architecture Rules\n\n## Layers\n- Controller -> Service -> Repository\n",
		);

		fs.writeFileSync(
			path.join(refDir, "retrospective.md"),
			"# Retrospective\n\n## Known Errors\n\n### Type Error\n**Pattern:** Property 'x' does not exist\n**Solution:** Add proper type definitions\n",
		);

		fs.writeFileSync(path.join(refDir, "ai-protocol.md"), "# AI Protocol\n");
		fs.writeFileSync(
			path.join(refDir, "task-executor.md"),
			"# Task Executor\n",
		);
	});

	describe("state transitions", () => {
		it("should advance from setup to planning", async () => {
			const taskPath = path.join(
				tasksDir,
				"features",
				"1-test",
				"S1.1-test-story",
				"T1.1.1-test-task.json",
			);

			// Start task
			const startCmd = new StartCommand(context);
			await startCmd.execute("1.1.1");

			// Verify status is 'setup'
			let taskContent = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
			expect(taskContent.status).toBe("setup");

			// Check to advance
			const checkCmd = new CheckCommand(context);
			const result = await checkCmd.execute();
			expect(result.success).toBe(true);

			// Verify status is 'planning'
			taskContent = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
			expect(taskContent.status).toBe("planning");
		});

		it("should advance from planning to implementing", async () => {
			const taskPath = path.join(
				tasksDir,
				"features",
				"1-test",
				"S1.1-test-story",
				"T1.1.1-test-task.json",
			);

			// Start task and advance to planning
			const startCmd = new StartCommand(context);
			await startCmd.execute("1.1.1");
			const checkCmd = new CheckCommand(context);
			await checkCmd.execute();

			// Create plan.md
			fs.writeFileSync(
				path.join(path.dirname(taskPath), "plan.md"),
				"# Plan\n1. Do this\n",
			);

			// Check to advance
			const result = await checkCmd.execute();
			expect(result.success).toBe(true);

			// Verify status is 'implementing'
			const taskContent = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
			expect(taskContent.status).toBe("implementing");
		});

		it("should advance through all states", async () => {
			const taskPath = path.join(
				tasksDir,
				"features",
				"1-test",
				"S1.1-test-story",
				"T1.1.1-test-task.json",
			);

			// Start task
			const startCmd = new StartCommand(context);
			await startCmd.execute("1.1.1");
			const checkCmd = new CheckCommand(context);

			// setup -> planning
			await checkCmd.execute();
			let taskContent = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
			expect(taskContent.status).toBe("planning");

			// Create plan.md
			fs.writeFileSync(
				path.join(path.dirname(taskPath), "plan.md"),
				"# Plan\n1. Do this\n",
			);

			// planning -> implementing
			await checkCmd.execute();
			taskContent = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
			expect(taskContent.status).toBe("implementing");

			// implementing -> verifying
			await checkCmd.execute();
			taskContent = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
			expect(taskContent.status).toBe("verifying");

			// verifying -> validating
			await checkCmd.execute();
			taskContent = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
			expect(taskContent.status).toBe("validating");

			// validating -> committing (requires validation to pass)
			const result = await checkCmd.execute();
			taskContent = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
			expect(taskContent.status).toBe("committing");
			expect(result.success).toBe(true);
		});
	});

	describe("error handling", () => {
		it("should fail if no active task", async () => {
			const checkCmd = new CheckCommand(context);

			await expect(checkCmd.execute()).rejects.toThrow("No active task");
		});

		it("should fail if task is already completed", async () => {
			const taskPath = path.join(
				tasksDir,
				"features",
				"1-test",
				"S1.1-test-story",
				"T1.1.1-test-task.json",
			);

			// Start task
			const startCmd = new StartCommand(context);
			await startCmd.execute("1.1.1");

			// Mark as completed
			const taskContent = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
			taskContent.status = "completed";
			fs.writeFileSync(taskPath, JSON.stringify(taskContent, null, 2));

			// Try to check - completed tasks are not "active" so it throws NoActiveSessionError
			const checkCmd = new CheckCommand(context);
			await expect(checkCmd.execute()).rejects.toThrow("No active task");
		});
	});

	describe("guidance and context", () => {
		it("should provide contextFiles in results", async () => {
			// Start task
			const startCmd = new StartCommand(context);
			const startResult = await startCmd.execute("1.1.1");

			// Context files should be provided
			expect(startResult.contextFiles).toBeDefined();
			expect(startResult.contextFiles?.length).toBeGreaterThan(0);
			expect(
				startResult.contextFiles?.some((f) => f.includes("ai-protocol")),
			).toBe(true);
		});

		it("should provide nextSteps guidance", async () => {
			// Start task
			const startCmd = new StartCommand(context);
			const result = await startCmd.execute("1.1.1");

			expect(result.nextSteps).toBeDefined();
			expect(result.nextSteps.length).toBeGreaterThan(0);
		});

		it("should provide warnings when appropriate", async () => {
			// Start task
			const startCmd = new StartCommand(context);
			const result = await startCmd.execute("1.1.1");

			expect(result.warnings).toBeDefined();
			expect(result.warnings?.length).toBeGreaterThan(0);
		});
	});
});
