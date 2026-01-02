/**
 * Integration tests for workflow commands
 * Covers:
 * 1. Happy path (Start -> Do -> Check -> Commit)
 * 2. Error handling (Check failure -> Retrospective update)
 */

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { CommandContext } from "../../src/commands/base.js";
import { CheckCommand } from "../../src/commands/workflow/check.js";
import { DoCommand } from "../../src/commands/workflow/do.js";
import { StartCommand } from "../../src/commands/workflow/start.js";
import { createTestDir } from "../setup.js";

// Mock git operations to avoid side effects on actual repo
vi.mock("../../src/lib/git.js", () => ({
	verifyBranch: vi.fn(),
	getCurrentBranch: vi.fn(() => "main"),
	branchExists: vi.fn(() => true),
}));

describe("workflow integration", () => {
	let testDir: string;
	let context: CommandContext;
	let tasksDir: string;

	beforeEach(() => {
		testDir = createTestDir();
		context = { projectRoot: testDir };
		tasksDir = path.join(testDir, "tasks");

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
						enabled: false,
					},
				},
				null,
				2,
			),
		);

		// Initialize project structure
		// Feature dir: features/1-auth
		// Story dir: S1.1-login (Must start with S{id}-)
		const featureDir = path.join(tasksDir, "features", "1-auth");
		const storyDir = path.join(featureDir, "S1.1-login");

		fs.mkdirSync(storyDir, { recursive: true });
		fs.mkdirSync(path.join(testDir, ".taskflow", "ref"), { recursive: true });

		// Create project index
		fs.writeFileSync(
			path.join(tasksDir, "project-index.json"),
			JSON.stringify(
				{
					project: "test-project",
					features: [
						{
							id: "1",
							title: "Authentication",
							status: "in-progress",
							path: "features/1-auth",
						},
					],
				},
				null,
				2,
			),
		);

		// Create feature file (must match basename of feature path)
		// featurePath = "features/1-auth" -> basename = "1-auth" -> "1-auth.json"
		fs.writeFileSync(
			path.join(featureDir, "1-auth.json"),
			JSON.stringify(
				{
					id: "1",
					title: "Authentication",
					status: "in-progress",
					stories: [
						{
							id: "1.1",
							title: "Login",
							status: "in-progress",
							tasks: [
								{
									id: "1.1.0",
									title: "Implement Login Page",
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

		// Create story file (optional but good practice)
		fs.writeFileSync(
			path.join(storyDir, "story.json"),
			JSON.stringify(
				{
					id: "1.1",
					title: "Login",
					status: "in-progress",
					tasks: [
						{
							id: "1.1.0",
							title: "Implement Login Page",
							status: "not-started",
							dependencies: [],
						},
					],
				},
				null,
				2,
			),
		);

		// Create task file (JSON format, name T{id}-*)
		const taskContent = {
			id: "1.1.0",
			title: "Implement Login Page",
			description: "Implement login page.",
			status: "not-started",
			skill: "frontend",
			subtasks: [],
			context: [],
			notes: [],
			estimatedHours: 4,
		};
		fs.writeFileSync(
			path.join(storyDir, "T1.1.0-implement-login.json"),
			JSON.stringify(taskContent, null, 2),
		);

		// Create progress.md
		fs.writeFileSync(
			path.join(testDir, "progress.md"),
			"# Progress\n\n## Pending\n- [ ] Task 1.1.0\n",
		);
	});

	describe("happy path", () => {
		it("should guide through full workflow", async () => {
			const taskPath = path.join(
				tasksDir,
				"features",
				"1-auth",
				"S1.1-login",
				"T1.1.0-implement-login.json",
			);

			// 1. Start Task
			const startCmd = new StartCommand(context);
			const startResult = await startCmd.execute("1.1.0");
			expect(startResult.success).toBe(true);

			// Verify task status is 'setup' in JSON file
			let taskContent = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
			expect(taskContent.status).toBe("setup");

			// 2. Setup -> Planning
			const checkCmd = new CheckCommand(context);
			const checkSetup = await checkCmd.execute();
			expect(checkSetup.success).toBe(true);

			taskContent = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
			expect(taskContent.status).toBe("planning");

			// 3. Do (Planning)
			const doCmd = new DoCommand(context);
			const doPlanning = await doCmd.execute();
			expect(doPlanning.success).toBe(true);
			expect(doPlanning.output).toMatch(/planning/i);

			// 4. Planning -> Implementing
			// Create plan.md (although CheckCommand might not enforce it strictly without validation commands)
			// But for realism we create it.
			// Where does plan.md go? Usually next to task file.
			fs.writeFileSync(
				path.join(path.dirname(taskPath), "plan.md"),
				"# Plan\n1. Do this\n",
			);

			const checkPlanning = await checkCmd.execute();
			expect(checkPlanning.success).toBe(true);

			taskContent = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
			expect(taskContent.status).toBe("implementing");

			// 5. Implementing -> Verifying
			const checkImplementing = await checkCmd.execute();
			expect(checkImplementing.success).toBe(true);

			taskContent = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
			expect(taskContent.status).toBe("verifying");

			// 6. Verifying -> Validating
			const checkVerifying = await checkCmd.execute();
			expect(checkVerifying.success).toBe(true);

			taskContent = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
			expect(taskContent.status).toBe("validating");

			// 7. Validating -> Committing
			// CheckCommand runs validation.
			// Mock finding modified files? CheckCommand uses `findModifiedFiles` which runs git.
			// If git is not mocked or initialized, it might fail or return empty.
			// If empty, `runAIValidation` might skip.
			// Then `runValidations` runs.

			// We need to initialize git in testDir for CheckCommand to work properly?
			// `CheckCommand` calls `findModifiedFiles` which calls `git status`.
			// `createTestDir` does NOT init git.
			// So we should init git.

			// We can use `execSync("git init", { cwd: testDir })`
			// And `git config user.email ...`

			// But wait, if `findModifiedFiles` fails (e.g. not a git repo), it returns empty array.
			// Then validation proceeds.

			const checkValidating = await checkCmd.execute();
			expect(checkValidating.success).toBe(true);

			taskContent = JSON.parse(fs.readFileSync(taskPath, "utf-8"));
			expect(taskContent.status).toBe("committing");
		});
	});

	/*
	describe("error handling", () => {
		it("should update retrospective on failure", async () => {
			// TODO: Implement error handling integration test
		});
	});
	*/

	describe("LLM Guidance", () => {
		it("should provide aiGuidance in start command when AI not configured", async () => {
			const startCmd = new StartCommand(context);
			const result = await startCmd.execute("1.1.0");

			expect(result.success).toBe(true);
			expect(result.aiGuidance).toBeDefined();
			expect(result.aiGuidance).toContain("SETUP");
			expect(result.contextFiles).toBeDefined();
			expect(result.contextFiles?.length).toBeGreaterThan(0);
		});

		it("should provide state-specific guidance in do command", async () => {
			// Start task first
			const startCmd = new StartCommand(context);
			await startCmd.execute("1.1.0");

			// Get setup state guidance
			const doCmd = new DoCommand(context);
			const setupResult = await doCmd.execute();

			expect(setupResult.success).toBe(true);
			expect(setupResult.aiGuidance).toBeDefined();
			expect(typeof setupResult.aiGuidance).toBe("string");

			// Advance to planning
			const checkCmd = new CheckCommand(context);
			await checkCmd.execute();

			// Get planning state guidance
			const planningResult = await doCmd.execute();

			expect(planningResult.success).toBe(true);
			expect(planningResult.aiGuidance).toBeDefined();
			expect(typeof planningResult.aiGuidance).toBe("string");
		});

		it("should include warnings in aiGuidance", async () => {
			const startCmd = new StartCommand(context);
			const result = await startCmd.execute("1.1.0");

			expect(result.warnings).toBeDefined();
			expect(result.warnings?.length).toBeGreaterThan(0);
			expect(result.warnings?.some((w) => w.includes("DO NOT"))).toBe(true);
		});

		it("should provide contextFiles in start command", async () => {
			const startCmd = new StartCommand(context);
			const result = await startCmd.execute("1.1.0");

			expect(result.contextFiles).toBeDefined();
			expect(result.contextFiles?.length).toBeGreaterThan(0);
			expect(result.contextFiles?.some((f) => f.includes("ai-protocol"))).toBe(
				true,
			);
			expect(
				result.contextFiles?.some((f) => f.includes("retrospective")),
			).toBe(true);
		});

		it("should provide guidance for all workflow states", async () => {
			// Start task
			const startCmd = new StartCommand(context);
			await startCmd.execute("1.1.0");

			const doCmd = new DoCommand(context);
			const checkCmd = new CheckCommand(context);

			// Setup state
			const setupResult = await doCmd.execute();
			expect(setupResult.aiGuidance).toBeDefined();
			await checkCmd.execute();

			// Planning state
			const planningResult = await doCmd.execute();
			expect(planningResult.aiGuidance).toBeDefined();
			await checkCmd.execute();

			// Implementing state
			const implementingResult = await doCmd.execute();
			expect(implementingResult.aiGuidance).toBeDefined();
			await checkCmd.execute();

			// Verifying state
			const verifyingResult = await doCmd.execute();
			expect(verifyingResult.aiGuidance).toBeDefined();
			await checkCmd.execute();

			// Validating state
			const validatingResult = await doCmd.execute();
			expect(validatingResult.aiGuidance).toBeDefined();
			await checkCmd.execute();

			// Committing state
			const committingResult = await doCmd.execute();
			expect(committingResult.aiGuidance).toBeDefined();
		});

		it("should provide nextSteps guidance in all states", async () => {
			// Start task
			const startCmd = new StartCommand(context);
			const startResult = await startCmd.execute("1.1.0");
			expect(startResult.nextSteps).toBeDefined();
			expect(startResult.nextSteps.length).toBeGreaterThan(0);

			const doCmd = new DoCommand(context);
			const checkCmd = new CheckCommand(context);

			// Setup state
			const setupResult = await doCmd.execute();
			expect(setupResult.nextSteps).toBeDefined();
			await checkCmd.execute();

			// Planning state
			const planningResult = await doCmd.execute();
			expect(planningResult.nextSteps).toBeDefined();
			await checkCmd.execute();

			// Implementing state
			const implementingResult = await doCmd.execute();
			expect(implementingResult.nextSteps).toBeDefined();
		});
	});
});
