/**
 * Integration test for task commands
 */

import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandContext } from "@/commands/base";
import { InitCommand } from "@/commands/init";
import { TasksAddCommand } from "@/commands/tasks/add";
import { TasksGenerateCommand } from "@/commands/tasks/generate";
import { TasksRefineCommand } from "@/commands/tasks/refine";
import type { MCPContext } from "@/lib/mcp/mcp-detector";
import { createTestDir } from "../setup.js";

describe("Task Commands Integration", () => {
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

	describe("Tasks Generate Command", () => {
		it("should fail if no PRDs exist", async () => {
			// Initialize project
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Try to generate without PRD
			const cmd = new TasksGenerateCommand(context);
			vi.spyOn(cmd as any, "isLLMAvailable").mockReturnValue(false);
			const result = await cmd.execute();

			expect(result.success).toBe(false);
			expect(result.output).toContain("No PRDs found");
		});

		it("should fail if specified PRD does not exist", async () => {
			// Initialize project
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Create PRDs directory but no PRD file
			const prdsDir = path.join(testDir, "tasks", "prds");
			fs.mkdirSync(prdsDir, { recursive: true });

			// Try to generate with non-existent PRD
			const cmd = new TasksGenerateCommand(context);
			vi.spyOn(cmd as any, "isLLMAvailable").mockReturnValue(false);
			const result = await cmd.execute("non-existent.md");

			expect(result.success).toBe(false);
			expect(result.output).toContain("No PRDs found");
		});

		it("should provide guidance when PRD exists but AI not configured", async () => {
			// Initialize project
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Create a PRD file
			const prdsDir = path.join(testDir, "tasks", "prds");
			fs.mkdirSync(prdsDir, { recursive: true });
			const prdPath = path.join(prdsDir, "test-prd.md");
			fs.writeFileSync(
				prdPath,
				"# Test PRD\n\n## Requirements\n\n- Feature A\n- Feature B",
			);

			// Create architecture files
			const refDir = path.join(testDir, ".taskflow", "ref");
			fs.writeFileSync(
				path.join(refDir, "coding-standards.md"),
				"# Coding Standards",
			);
			fs.writeFileSync(
				path.join(refDir, "architecture-rules.md"),
				"# Architecture Rules",
			);

			// Generate tasks (should provide guidance)
			const cmd = new TasksGenerateCommand(context);
			vi.spyOn(cmd as any, "isLLMAvailable").mockReturnValue(false);
			const result = await cmd.execute("test-prd.md");

			expect(result.success).toBe(true);
			expect(result.output).toContain("PRD LOADED: test-prd.md");
			expect(result.aiGuidance).toBeDefined();
			expect(result.aiGuidance).toContain("Generate Task Breakdown from PRD");
		});

		it("should show available PRDs when called without argument", async () => {
			// Initialize project
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Create multiple PRD files
			const prdsDir = path.join(testDir, "tasks", "prds");
			fs.mkdirSync(prdsDir, { recursive: true });
			fs.writeFileSync(path.join(prdsDir, "prd1.md"), "# PRD 1");
			fs.writeFileSync(path.join(prdsDir, "prd2.md"), "# PRD 2");

			// Generate without argument
			const cmd = new TasksGenerateCommand(context);
			vi.spyOn(cmd as any, "isLLMAvailable").mockReturnValue(false);
			const result = await cmd.execute();

			expect(result.success).toBe(true);
			expect(result.output).toContain("AVAILABLE PRDs");
			expect(result.output).toContain("prd1.md");
			expect(result.output).toContain("prd2.md");
		});
	});

	describe("Tasks Add Command", () => {
		it("should require all parameters", async () => {
			// Initialize project
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Try to add without parameters
			const cmd = new TasksAddCommand(context);
			const result = await cmd.execute("", "", "", {});

			expect(result.success).toBe(false);
			expect(result.output).toContain("Missing required parameters");
		});

		it("should fail if tasks not generated yet", async () => {
			// Initialize project
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Try to add task without generating first
			const cmd = new TasksAddCommand(context);
			const result = await cmd.execute("1", "1.1", "New Task", {});

			expect(result.success).toBe(false);
			expect(result.output).toContain("Tasks not generated yet");
		});

		it("should fail if feature does not exist", async () => {
			// Initialize project
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Create tasks progress file
			const progressFilePath = path.join(
				testDir,
				"tasks",
				"tasks-progress.json",
			);
			const progressData = {
				project: "test-project",
				features: [
					{
						id: "1",
						title: "Feature 1",
						description: "Test feature",
						status: "not-started",
						stories: [],
					},
				],
			};
			fs.writeFileSync(progressFilePath, JSON.stringify(progressData, null, 2));

			// Try to add to non-existent feature
			const cmd = new TasksAddCommand(context);
			const result = await cmd.execute("2", "2.1", "New Task", {});

			expect(result.success).toBe(false);
			expect(result.output).toContain("Feature not found");
		});

		it("should fail if story does not exist", async () => {
			// Initialize project
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Create tasks progress file
			const progressFilePath = path.join(
				testDir,
				"tasks",
				"tasks-progress.json",
			);
			const progressData = {
				project: "test-project",
				features: [
					{
						id: "1",
						title: "Feature 1",
						description: "Test feature",
						status: "not-started",
						stories: [
							{
								id: "1.1",
								title: "Story 1.1",
								description: "Test story",
								status: "not-started",
								tasks: [],
							},
						],
					},
				],
			};
			fs.writeFileSync(progressFilePath, JSON.stringify(progressData, null, 2));

			// Try to add to non-existent story
			const cmd = new TasksAddCommand(context);
			const result = await cmd.execute("1", "1.2", "New Task", {});

			expect(result.success).toBe(false);
			expect(result.output).toContain("Story not found");
		});

		it("should provide manual guidance when AI not configured", async () => {
			// Initialize project
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Create tasks progress file
			const progressFilePath = path.join(
				testDir,
				"tasks",
				"tasks-progress.json",
			);
			const progressData = {
				project: "test-project",
				features: [
					{
						id: "1",
						title: "Feature 1",
						description: "Test feature",
						status: "not-started",
						stories: [
							{
								id: "1.1",
								title: "Story 1.1",
								description: "Test story",
								status: "not-started",
								tasks: [],
							},
						],
					},
				],
			};
			fs.writeFileSync(progressFilePath, JSON.stringify(progressData, null, 2));

			// Add task (should provide manual guidance)
			const cmd = new TasksAddCommand(context);
			const result = await cmd.execute("1", "1.1", "New Task", {
				description: "Test task",
				skill: "backend",
			});

			expect(result.success).toBe(true);
			expect(result.output).toContain("Task details:");
			expect(result.output).toContain("ID: 1.1.0");
			expect(result.output).toContain("New Task");
			expect(result.nextSteps).toContain("Manual steps:");
		});
	});

	describe("Tasks Refine Command", () => {
		it("should require instructions parameter", async () => {
			// Initialize project
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Try to refine without instructions
			const cmd = new TasksRefineCommand(context);
			const result = await cmd.execute("");

			expect(result.success).toBe(false);
			expect(result.output).toContain("Instructions are required");
		});

		it("should fail if tasks not generated yet", async () => {
			// Initialize project
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Try to refine without tasks
			const cmd = new TasksRefineCommand(context);
			const result = await cmd.execute("Split large tasks");

			expect(result.success).toBe(false);
			expect(result.output).toContain("Tasks not generated yet");
		});

		it("should provide manual guidance when AI not configured", async () => {
			// Initialize project
			const initCmd = new InitCommand(context);
			await initCmd.execute("test-project");

			// Create tasks progress file
			const progressFilePath = path.join(
				testDir,
				"tasks",
				"tasks-progress.json",
			);
			const progressData = {
				project: "test-project",
				features: [
					{
						id: "1",
						title: "Feature 1",
						description: "Test feature",
						status: "not-started",
						stories: [
							{
								id: "1.1",
								title: "Story 1.1",
								description: "Test story",
								status: "not-started",
								tasks: [
									{
										id: "1.1.0",
										title: "Task 1",
										description: "Test task",
										skill: "backend",
										status: "not-started",
										estimatedHours: 2,
										dependencies: [],
										context: [],
										subtasks: [],
										acceptanceCriteria: [],
									},
								],
							},
						],
					},
				],
			};
			fs.writeFileSync(progressFilePath, JSON.stringify(progressData, null, 2));

			// Refine tasks (should provide manual guidance)
			const cmd = new TasksRefineCommand(context);
			const result = await cmd.execute("Split tasks into smaller ones");

			expect(result.success).toBe(true);
			expect(result.output).toContain("Refinement instructions:");
			expect(result.output).toContain("Split tasks into smaller ones");
			expect(result.nextSteps).toContain("Manual steps:");
		});
	});

	describe("End-to-End Task Workflow", () => {
		it("should complete full task generation workflow", async () => {
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
				[
					"# Test Feature PRD",
					"",
					"## Requirements",
					"",
					"- Implement user authentication",
					"- Add login form",
					"- Create user model",
					"",
					"## Tech Stack",
					"",
					"- TypeScript",
					"- Node.js",
					"- PostgreSQL",
				].join("\n"),
			);

			// 3. Create architecture files
			const refDir = path.join(testDir, ".taskflow", "ref");
			fs.writeFileSync(
				path.join(refDir, "coding-standards.md"),
				"# Coding Standards\n\n## Code Style\n\n- Use TypeScript\n- Use async/await",
			);
			fs.writeFileSync(
				path.join(refDir, "architecture-rules.md"),
				"# Architecture Rules\n\n## Dependency Rules\n\n- No circular dependencies",
			);

			// 4. Generate tasks (should provide guidance)
			const generateCmd = new TasksGenerateCommand(context);
			const generateResult = await generateCmd.execute("test-prd.md");
			expect(generateResult.success).toBe(true);
			expect(generateResult.aiGuidance).toBeDefined();

			// 5. Manually create tasks progress (simulating AI completion)
			const progressFilePath = path.join(
				testDir,
				"tasks",
				"tasks-progress.json",
			);
			const progressData = {
				project: "test-project",
				features: [
					{
						id: "1",
						title: "User Authentication",
						description: "Implement user authentication",
						status: "not-started",
						stories: [
							{
								id: "1.1",
								title: "User Login",
								description: "Implement user login flow",
								status: "not-started",
								tasks: [
									{
										id: "1.1.0",
										title: "Create User model",
										description: "Create database model for users",
										skill: "backend",
										status: "not-started",
										estimatedHours: 2,
										dependencies: [],
										context: [],
										subtasks: [],
										acceptanceCriteria: ["User model exists"],
									},
								],
							},
						],
					},
				],
			};
			fs.writeFileSync(progressFilePath, JSON.stringify(progressData, null, 2));

			// 6. Add a new task
			const addCmd = new TasksAddCommand(context);
			const addResult = await addCmd.execute(
				"1",
				"1.1",
				"Implement password hashing",
				{
					description: "Add bcrypt password hashing",
					skill: "backend",
				},
			);
			expect(addResult.success).toBe(true);

			// 7. Refine tasks
			const refineCmd = new TasksRefineCommand(context);
			const refineResult = await refineCmd.execute(
				"Add more detailed subtasks",
			);
			expect(refineResult.success).toBe(true);

			// Verify files exist
			expect(fs.existsSync(progressFilePath)).toBe(true);
		});
	});
});
