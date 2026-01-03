/**
 * Unit tests for data-access module
 */

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import {
	calculateFeatureStatus,
	calculateProgressStats,
	calculateStoryStatus,
	checkDependenciesMet,
	findActiveTask,
	findFeature,
	findNextAvailableTask,
	findStoryLocation,
	findTaskLocation,
	getUnmetDependencies,
	loadFeature,
	loadProjectIndex,
	loadTaskFile,
	saveFeature,
	saveProjectIndex,
	saveTaskFile,
} from "../../src/lib/core/data-access.js";
import {
	FileNotFoundError,
	InvalidFileFormatError,
} from "../../src/lib/core/errors.js";
import type {
	Feature,
	Story,
	TaskFileContent,
	TasksProgress,
} from "../../src/lib/core/types.js";
import { createTestDir } from "../setup.js";

describe("data-access", () => {
	let testDir: string;
	let tasksDir: string;

	beforeEach(() => {
		testDir = createTestDir();
		tasksDir = path.join(testDir, "tasks");
		fs.mkdirSync(tasksDir, { recursive: true });
	});

	// ============================================================================
	// Project Index Operations
	// ============================================================================

	describe("loadProjectIndex", () => {
		it("should load valid project index", () => {
			const projectIndex = {
				project: "test-project",
				features: [
					{
						id: "1",
						title: "Feature 1",
						status: "not-started",
						path: "F1",
					},
				],
			};

			fs.writeFileSync(
				path.join(tasksDir, "project-index.json"),
				JSON.stringify(projectIndex, null, 2),
			);

			const result = loadProjectIndex(tasksDir);

			expect(result.project).toBe("test-project");
			expect(result.features).toHaveLength(1);
			expect(result.features[0]?.id).toBe("1");
		});

		it("should throw FileNotFoundError if file does not exist", () => {
			expect(() => loadProjectIndex(tasksDir)).toThrow(FileNotFoundError);
		});

		it("should throw InvalidFileFormatError for invalid JSON", () => {
			fs.writeFileSync(
				path.join(tasksDir, "project-index.json"),
				"invalid json",
			);

			expect(() => loadProjectIndex(tasksDir)).toThrow(InvalidFileFormatError);
		});
	});

	describe("saveProjectIndex", () => {
		it("should save project index from tasks progress", () => {
			const tasksProgress: TasksProgress = {
				project: "my-project",
				features: [
					{
						id: "1",
						title: "User Auth",
						status: "not-started",
						path: "F1",
						stories: [],
					},
				],
			};

			saveProjectIndex(tasksDir, tasksProgress);

			const indexPath = path.join(tasksDir, "project-index.json");
			expect(fs.existsSync(indexPath)).toBe(true);

			const content = JSON.parse(fs.readFileSync(indexPath, "utf-8"));
			expect(content.project).toBe("my-project");
			expect(content.features[0]?.id).toBe("1");
			expect(content.features[0]?.path).toBe("F1");
		});

		it("should generate path if not provided", () => {
			const tasksProgress: TasksProgress = {
				project: "my-project",
				features: [
					{
						id: "1",
						title: "User Auth",
						status: "not-started",
						stories: [],
					},
				],
			};

			saveProjectIndex(tasksDir, tasksProgress);

			const content = JSON.parse(
				fs.readFileSync(path.join(tasksDir, "project-index.json"), "utf-8"),
			);
			expect(content.features[0]?.path).toBe("F1-user-auth");
		});
	});

	// ============================================================================
	// Feature File Operations
	// ============================================================================

	describe("loadFeature", () => {
		it("should load valid feature file", () => {
			const featureDir = path.join(tasksDir, "F1");
			fs.mkdirSync(featureDir, { recursive: true });

			const feature = {
				id: "1",
				title: "User Auth",
				status: "not-started",
				stories: [
					{
						id: "1.1",
						title: "Login",
						status: "not-started",
						tasks: [],
					},
				],
			};

			fs.writeFileSync(
				path.join(featureDir, "F1.json"),
				JSON.stringify(feature, null, 2),
			);

			const result = loadFeature(tasksDir, "F1");

			expect(result.id).toBe("1");
			expect(result.title).toBe("User Auth");
			expect(result.path).toBe("F1");
			expect(result.stories).toHaveLength(1);
		});

		it("should throw FileNotFoundError if feature file does not exist", () => {
			expect(() => loadFeature(tasksDir, "F1")).toThrow(FileNotFoundError);
		});
	});

	describe("saveFeature", () => {
		it("should save feature to file", () => {
			const featureDir = path.join(tasksDir, "F1");
			fs.mkdirSync(featureDir, { recursive: true });

			const feature: Feature = {
				id: "1",
				title: "User Auth",
				status: "not-started",
				path: "F1",
				stories: [],
			};

			saveFeature(tasksDir, feature);

			const filePath = path.join(featureDir, "F1.json");
			expect(fs.existsSync(filePath)).toBe(true);

			const content = JSON.parse(fs.readFileSync(filePath, "utf-8"));
			expect(content.id).toBe("1");
			expect(content.title).toBe("User Auth");
		});

		it("should throw error if path is not provided", () => {
			const feature: Feature = {
				id: "1",
				title: "User Auth",
				status: "not-started",
				stories: [],
			};

			expect(() => saveFeature(tasksDir, feature)).toThrow();
		});
	});

	// ============================================================================
	// Task File Operations
	// ============================================================================

	describe("loadTaskFile", () => {
		it("should load valid task file", () => {
			const taskFile = path.join(tasksDir, "task.json");
			const task: TaskFileContent = {
				id: "1.1.0",
				title: "Test Task",
				description: "Test description",
				status: "not-started",
				skill: "backend",
				subtasks: [],
				context: [],
			};

			fs.writeFileSync(taskFile, JSON.stringify(task, null, 2));

			const result = loadTaskFile(taskFile);

			expect(result).not.toBeNull();
			expect(result?.id).toBe("1.1.0");
			expect(result?.title).toBe("Test Task");
		});

		it("should return null if file does not exist", () => {
			const result = loadTaskFile(path.join(tasksDir, "nonexistent.json"));
			expect(result).toBeNull();
		});

		it("should return null for invalid JSON", () => {
			const taskFile = path.join(tasksDir, "task.json");
			fs.writeFileSync(taskFile, "invalid json");

			const result = loadTaskFile(taskFile);
			expect(result).toBeNull();
		});
	});

	describe("saveTaskFile", () => {
		it("should save task to file", () => {
			const taskFile = path.join(tasksDir, "task.json");
			const task: TaskFileContent = {
				id: "1.1.0",
				title: "Test Task",
				description: "Test description",
				status: "not-started",
				skill: "backend",
				subtasks: [],
				context: [],
			};

			saveTaskFile(taskFile, task);

			expect(fs.existsSync(taskFile)).toBe(true);

			const content = JSON.parse(fs.readFileSync(taskFile, "utf-8"));
			expect(content.id).toBe("1.1.0");
		});
	});

	// ============================================================================
	// Find/Search Operations
	// ============================================================================

	describe("findTaskLocation", () => {
		it("should find task location in tasks progress", () => {
			const tasksProgress: TasksProgress = {
				project: "test",
				features: [
					{
						id: "1",
						title: "Feature 1",
						status: "not-started",
						path: "F1",
						stories: [
							{
								id: "1.1",
								title: "Story 1",
								status: "not-started",
								tasks: [
									{
										id: "1.1.0",
										title: "Task 1",
										status: "not-started",
										dependencies: [],
										isIntermittent: false,
									},
								],
							},
						],
					},
				],
			};

			const location = findTaskLocation(tasksProgress, "1.1.0");

			expect(location).not.toBeNull();
			expect(location?.task.id).toBe("1.1.0");
			expect(location?.story.id).toBe("1.1");
			expect(location?.feature.id).toBe("1");
		});

		it("should return null if task not found", () => {
			const tasksProgress: TasksProgress = {
				project: "test",
				features: [],
			};

			const location = findTaskLocation(tasksProgress, "1.1.0");
			expect(location).toBeNull();
		});
	});

	describe("findStoryLocation", () => {
		it("should find story location", () => {
			const tasksProgress: TasksProgress = {
				project: "test",
				features: [
					{
						id: "1",
						title: "Feature 1",
						status: "not-started",
						path: "F1",
						stories: [
							{
								id: "1.1",
								title: "Story 1",
								status: "not-started",
								tasks: [],
							},
						],
					},
				],
			};

			const location = findStoryLocation(tasksProgress, "1.1");

			expect(location).not.toBeNull();
			expect(location?.story.id).toBe("1.1");
			expect(location?.feature.id).toBe("1");
		});
	});

	describe("findFeature", () => {
		it("should find feature by ID", () => {
			const tasksProgress: TasksProgress = {
				project: "test",
				features: [
					{
						id: "1",
						title: "Feature 1",
						status: "not-started",
						path: "F1",
						stories: [],
					},
				],
			};

			const feature = findFeature(tasksProgress, "1");

			expect(feature).not.toBeNull();
			expect(feature?.id).toBe("1");
		});

		it("should return null if feature not found", () => {
			const tasksProgress: TasksProgress = {
				project: "test",
				features: [],
			};

			const feature = findFeature(tasksProgress, "1");
			expect(feature).toBeNull();
		});
	});

	describe("findActiveTask", () => {
		it("should find task with active status", () => {
			// Create task file structure
			const featureDir = path.join(tasksDir, "F1");
			const storyDir = path.join(featureDir, "S1.1-story");
			fs.mkdirSync(storyDir, { recursive: true });

			const taskFile: TaskFileContent = {
				id: "1.1.0",
				title: "Task 1",
				description: "Test task",
				status: "implementing",
				skill: "backend",
				subtasks: [],
				context: [],
			};
			fs.writeFileSync(
				path.join(storyDir, "T1.1.0-task.json"),
				JSON.stringify(taskFile, null, 2),
			);

			const tasksProgress: TasksProgress = {
				project: "test",
				features: [
					{
						id: "1",
						title: "Feature 1",
						status: "in-progress",
						path: "F1",
						stories: [
							{
								id: "1.1",
								title: "Story 1",
								status: "in-progress",
								tasks: [
									{
										id: "1.1.0",
										title: "Task 1",
										status: "implementing",
										dependencies: [],
										isIntermittent: false,
									},
								],
							},
						],
					},
				],
			};

			const result = findActiveTask(tasksDir, tasksProgress);

			expect(result).not.toBeNull();
			expect(result?.taskId).toBe("1.1.0");
			expect(result?.content.status).toBe("implementing");
		});

		it("should return null if no active task", () => {
			const tasksProgress: TasksProgress = {
				project: "test",
				features: [],
			};

			const result = findActiveTask(tasksDir, tasksProgress);
			expect(result).toBeNull();
		});
	});

	// ============================================================================
	// Status Calculations
	// ============================================================================

	describe("calculateStoryStatus", () => {
		it("should return completed if all tasks completed", () => {
			const story: Story = {
				id: "1.1",
				title: "Story 1",
				status: "in-progress",
				tasks: [
					{
						id: "1.1.0",
						title: "Task 1",
						status: "completed",
						dependencies: [],
						isIntermittent: false,
					},
					{
						id: "1.1.1",
						title: "Task 2",
						status: "completed",
						dependencies: [],
						isIntermittent: false,
					},
				],
			};

			const status = calculateStoryStatus(story);
			expect(status).toBe("completed");
		});

		it("should return in-progress if any task is active", () => {
			const story: Story = {
				id: "1.1",
				title: "Story 1",
				status: "not-started",
				tasks: [
					{
						id: "1.1.0",
						title: "Task 1",
						status: "implementing",
						dependencies: [],
						isIntermittent: false,
					},
				],
			};

			const status = calculateStoryStatus(story);
			expect(status).toBe("in-progress");
		});

		it("should return not-started if all tasks not started", () => {
			const story: Story = {
				id: "1.1",
				title: "Story 1",
				status: "not-started",
				tasks: [
					{
						id: "1.1.0",
						title: "Task 1",
						status: "not-started",
						dependencies: [],
						isIntermittent: false,
					},
				],
			};

			const status = calculateStoryStatus(story);
			expect(status).toBe("not-started");
		});

		it("should return blocked if any task is blocked", () => {
			const story: Story = {
				id: "1.1",
				title: "Story 1",
				status: "in-progress",
				tasks: [
					{
						id: "1.1.0",
						title: "Task 1",
						status: "blocked",
						dependencies: [],
						isIntermittent: false,
					},
				],
			};

			const status = calculateStoryStatus(story);
			expect(status).toBe("blocked");
		});
	});

	describe("calculateFeatureStatus", () => {
		it("should return completed if all stories completed", () => {
			const feature: Feature = {
				id: "1",
				title: "Feature 1",
				status: "in-progress",
				path: "F1",
				stories: [
					{
						id: "1.1",
						title: "Story 1",
						status: "completed",
						tasks: [],
					},
				],
			};

			const status = calculateFeatureStatus(feature);
			expect(status).toBe("completed");
		});

		it("should return in-progress if any story is in progress", () => {
			const feature: Feature = {
				id: "1",
				title: "Feature 1",
				status: "not-started",
				path: "F1",
				stories: [
					{
						id: "1.1",
						title: "Story 1",
						status: "in-progress",
						tasks: [],
					},
				],
			};

			const status = calculateFeatureStatus(feature);
			expect(status).toBe("in-progress");
		});
	});

	// ============================================================================
	// Progress Calculations
	// ============================================================================

	describe("calculateProgressStats", () => {
		it("should calculate correct progress statistics", () => {
			const tasksProgress: TasksProgress = {
				project: "test",
				features: [
					{
						id: "1",
						title: "Feature 1",
						status: "in-progress",
						path: "F1",
						stories: [
							{
								id: "1.1",
								title: "Story 1",
								status: "in-progress",
								tasks: [
									{
										id: "1.1.0",
										title: "Task 1",
										status: "completed",
										dependencies: [],
										isIntermittent: false,
									},
									{
										id: "1.1.1",
										title: "Task 2",
										status: "implementing",
										dependencies: [],
										isIntermittent: false,
									},
									{
										id: "1.1.2",
										title: "Task 3",
										status: "not-started",
										dependencies: [],
										isIntermittent: false,
									},
								],
							},
						],
					},
				],
			};

			const stats = calculateProgressStats(tasksProgress);

			expect(stats.totalFeatures).toBe(1);
			expect(stats.completedFeatures).toBe(0);
			expect(stats.totalStories).toBe(1);
			expect(stats.completedStories).toBe(0);
			expect(stats.totalTasks).toBe(3);
			expect(stats.completedTasks).toBe(1);
		});

		it("should handle empty project", () => {
			const tasksProgress: TasksProgress = {
				project: "test",
				features: [],
			};

			const stats = calculateProgressStats(tasksProgress);

			expect(stats.totalFeatures).toBe(0);
			expect(stats.completedFeatures).toBe(0);
			expect(stats.totalStories).toBe(0);
			expect(stats.completedStories).toBe(0);
			expect(stats.totalTasks).toBe(0);
			expect(stats.completedTasks).toBe(0);
		});
	});

	// ============================================================================
	// Dependencies
	// ============================================================================

	describe("checkDependenciesMet", () => {
		it("should return true if all dependencies completed", () => {
			const tasksProgress: TasksProgress = {
				project: "test",
				features: [
					{
						id: "1",
						title: "Feature 1",
						status: "in-progress",
						path: "F1",
						stories: [
							{
								id: "1.1",
								title: "Story 1",
								status: "in-progress",
								tasks: [
									{
										id: "1.1.0",
										title: "Task 1",
										status: "completed",
										dependencies: [],
										isIntermittent: false,
									},
									{
										id: "1.1.1",
										title: "Task 2",
										status: "not-started",
										dependencies: ["1.1.0"],
										isIntermittent: false,
									},
								],
							},
						],
					},
				],
			};

			const task = tasksProgress.features[0]!.stories[0]!.tasks[1]!;
			const result = checkDependenciesMet(tasksProgress, task);
			expect(result).toBe(true);
		});

		it("should return false if dependencies not completed", () => {
			const tasksProgress: TasksProgress = {
				project: "test",
				features: [
					{
						id: "1",
						title: "Feature 1",
						status: "in-progress",
						path: "F1",
						stories: [
							{
								id: "1.1",
								title: "Story 1",
								status: "in-progress",
								tasks: [
									{
										id: "1.1.0",
										title: "Task 1",
										status: "implementing",
										dependencies: [],
										isIntermittent: false,
									},
									{
										id: "1.1.1",
										title: "Task 2",
										status: "not-started",
										dependencies: ["1.1.0"],
										isIntermittent: false,
									},
								],
							},
						],
					},
				],
			};

			const task = tasksProgress.features[0]!.stories[0]!.tasks[1]!;
			const result = checkDependenciesMet(tasksProgress, task);
			expect(result).toBe(false);
		});
	});

	describe("getUnmetDependencies", () => {
		it("should return list of unmet dependency IDs", () => {
			const tasksProgress: TasksProgress = {
				project: "test",
				features: [
					{
						id: "1",
						title: "Feature 1",
						status: "in-progress",
						path: "F1",
						stories: [
							{
								id: "1.1",
								title: "Story 1",
								status: "in-progress",
								tasks: [
									{
										id: "1.1.0",
										title: "Task 1",
										status: "implementing",
										dependencies: [],
										isIntermittent: false,
									},
									{
										id: "1.1.1",
										title: "Task 2",
										status: "not-started",
										dependencies: [],
										isIntermittent: false,
									},
									{
										id: "1.1.2",
										title: "Task 3",
										status: "not-started",
										dependencies: ["1.1.0", "1.1.1"],
										isIntermittent: false,
									},
								],
							},
						],
					},
				],
			};

			const task = tasksProgress.features[0]!.stories[0]!.tasks[2]!;
			const unmet = getUnmetDependencies(tasksProgress, task);

			expect(unmet).toHaveLength(2);
			expect(unmet).toContain("1.1.0");
			expect(unmet).toContain("1.1.1");
		});
	});

	// ============================================================================
	// Next Task Finding
	// ============================================================================

	describe("findNextAvailableTask", () => {
		it("should find first not-started task with met dependencies", () => {
			const tasksProgress: TasksProgress = {
				project: "test",
				features: [
					{
						id: "1",
						title: "Feature 1",
						status: "in-progress",
						path: "F1",
						stories: [
							{
								id: "1.1",
								title: "Story 1",
								status: "in-progress",
								tasks: [
									{
										id: "1.1.0",
										title: "Task 1",
										status: "completed",
										dependencies: [],
										isIntermittent: false,
									},
									{
										id: "1.1.1",
										title: "Task 2",
										status: "not-started",
										dependencies: ["1.1.0"],
										isIntermittent: false,
									},
								],
							},
						],
					},
				],
			};

			const result = findNextAvailableTask(tasksProgress);

			expect(result).not.toBeNull();
			expect(result?.task.id).toBe("1.1.1");
		});

		it("should return null if no available tasks", () => {
			const tasksProgress: TasksProgress = {
				project: "test",
				features: [
					{
						id: "1",
						title: "Feature 1",
						status: "completed",
						path: "F1",
						stories: [
							{
								id: "1.1",
								title: "Story 1",
								status: "completed",
								tasks: [
									{
										id: "1.1.0",
										title: "Task 1",
										status: "completed",
										dependencies: [],
										isIntermittent: false,
									},
								],
							},
						],
					},
				],
			};

			const result = findNextAvailableTask(tasksProgress);
			expect(result).toBeNull();
		});

		it("should skip tasks with unmet dependencies", () => {
			const tasksProgress: TasksProgress = {
				project: "test",
				features: [
					{
						id: "1",
						title: "Feature 1",
						status: "in-progress",
						path: "F1",
						stories: [
							{
								id: "1.1",
								title: "Story 1",
								status: "in-progress",
								tasks: [
									{
										id: "1.1.0",
										title: "Task 1",
										status: "not-started",
										dependencies: [],
										isIntermittent: false,
									},
									{
										id: "1.1.1",
										title: "Task 2",
										status: "not-started",
										dependencies: ["1.1.0"],
										isIntermittent: false,
									},
								],
							},
						],
					},
				],
			};

			const result = findNextAvailableTask(tasksProgress);

			// Should find 1.1.0 (no dependencies), not 1.1.1 (depends on 1.1.0)
			expect(result?.task.id).toBe("1.1.0");
		});
	});
});
