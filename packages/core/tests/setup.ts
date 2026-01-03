/**
 * Test setup and utilities
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { afterEach } from "vitest";
import type { TaskFileContent, TasksProgress } from "../src/lib/core/types.js";

// Global test state
let testDir: string | null = null;

/**
 * Create a temporary test directory
 */
export function createTestDir(): string {
	testDir = fs.mkdtempSync(path.join(os.tmpdir(), "taskflow-test-"));
	return testDir;
}

/**
 * Clean up test directory
 */
export function cleanupTestDir(): void {
	if (testDir && fs.existsSync(testDir)) {
		fs.rmSync(testDir, { recursive: true, force: true });
		testDir = null;
	}
}

/**
 * Create a mock taskflow project structure
 */
export function createMockProject(projectRoot: string): void {
	// Create taskflow.config.json
	const config = {
		project: {
			name: "test-project",
			root: ".",
		},
		branching: {
			strategy: "per-story",
			base: "main",
			prefix: "story/",
		},
		validation: {
			commands: {
				format: "echo format",
				typeCheck: "echo typecheck",
				lint: "echo lint",
			},
		},
	};

	fs.writeFileSync(
		path.join(projectRoot, "taskflow.config.json"),
		JSON.stringify(config, null, 2),
	);

	// Create directories
	fs.mkdirSync(path.join(projectRoot, "tasks"), { recursive: true });
	fs.mkdirSync(path.join(projectRoot, ".taskflow", "ref"), {
		recursive: true,
	});
	fs.mkdirSync(path.join(projectRoot, ".taskflow", "logs"), {
		recursive: true,
	});
}

/**
 * Create a mock task file
 */
export function createMockTaskFile(
	projectRoot: string,
	taskId: string,
	content: TaskFileContent,
): void {
	const [featureId, storyId] = taskId.split(".");
	const taskDir = path.join(
		projectRoot,
		"tasks",
		`F${featureId}`,
		`S${featureId}.${storyId}`,
	);

	fs.mkdirSync(taskDir, { recursive: true });

	const taskFile = path.join(taskDir, `T${taskId}.json`);
	fs.writeFileSync(taskFile, JSON.stringify(content, null, 2));
}

/**
 * Create a mock tasks-progress.json file
 */
export function createMockTasksProgress(
	projectRoot: string,
	content: TasksProgress,
): void {
	const tasksDir = path.join(projectRoot, "tasks");
	fs.mkdirSync(tasksDir, { recursive: true });

	fs.writeFileSync(
		path.join(tasksDir, "tasks-progress.json"),
		JSON.stringify(content, null, 2),
	);
}

// Auto cleanup after each test
afterEach(() => {
	cleanupTestDir();
});
