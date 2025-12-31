import { describe, expect, it } from "vitest";
import {
	calculateFeatureStatus,
	calculateProgressStats,
	calculateStoryStatus,
	checkDependenciesMet,
	findNextAvailableTask,
	getUnmetDependencies,
} from "../../src/lib/data-access";
import type {
	Feature,
	Story,
	TaskRef,
	TasksProgress,
} from "../../src/lib/types";

describe("data-access", () => {
	describe("calculateStoryStatus", () => {
		it("should return not-started for empty tasks", () => {
			const story: Story = {
				id: "1.1",
				title: "Test",
				status: "not-started",
				tasks: [],
			};
			expect(calculateStoryStatus(story)).toBe("not-started");
		});

		it("should return completed when all tasks completed", () => {
			const story: Story = {
				id: "1.1",
				title: "Test",
				status: "not-started",
				tasks: [
					{ id: "1.1.0", title: "T0", status: "completed", dependencies: [] },
					{ id: "1.1.1", title: "T1", status: "completed", dependencies: [] },
				],
			};
			expect(calculateStoryStatus(story)).toBe("completed");
		});

		it("should return implementing when some tasks active", () => {
			const story: Story = {
				id: "1.1",
				title: "Test",
				status: "not-started",
				tasks: [
					{
						id: "1.1.0",
						title: "T0",
						status: "implementing",
						dependencies: [],
					},
					{ id: "1.1.1", title: "T1", status: "not-started", dependencies: [] },
				],
			};
			expect(calculateStoryStatus(story)).toBe("in-progress");
		});

		it("should return implementing when some tasks completed", () => {
			const story: Story = {
				id: "1.1",
				title: "Test",
				status: "not-started",
				tasks: [
					{ id: "1.1.0", title: "T0", status: "completed", dependencies: [] },
					{ id: "1.1.1", title: "T1", status: "not-started", dependencies: [] },
				],
			};
			expect(calculateStoryStatus(story)).toBe("in-progress");
		});

		it("should return blocked when all tasks blocked", () => {
			const story: Story = {
				id: "1.1",
				title: "Test",
				status: "not-started",
				tasks: [
					{ id: "1.1.0", title: "T0", status: "blocked", dependencies: [] },
					{ id: "1.1.1", title: "T1", status: "blocked", dependencies: [] },
				],
			};
			expect(calculateStoryStatus(story)).toBe("blocked");
		});

		it("should return not-started when all tasks not-started", () => {
			const story: Story = {
				id: "1.1",
				title: "Test",
				status: "completed",
				tasks: [
					{ id: "1.1.0", title: "T0", status: "not-started", dependencies: [] },
					{ id: "1.1.1", title: "T1", status: "not-started", dependencies: [] },
				],
			};
			expect(calculateStoryStatus(story)).toBe("not-started");
		});
	});

	describe("calculateFeatureStatus", () => {
		it("should return not-started for empty stories", () => {
			const feature: Feature = {
				id: "1",
				title: "Test",
				status: "not-started",
				stories: [],
			};
			expect(calculateFeatureStatus(feature)).toBe("not-started");
		});

		it("should return completed when all stories completed", () => {
			const feature: Feature = {
				id: "1",
				title: "Test",
				status: "not-started",
				stories: [
					{ id: "1.1", title: "S1", status: "completed", tasks: [] },
					{ id: "1.2", title: "S2", status: "completed", tasks: [] },
				],
			};
			expect(calculateFeatureStatus(feature)).toBe("completed");
		});

		it("should return implementing when some stories active", () => {
			const feature: Feature = {
				id: "1",
				title: "Test",
				status: "not-started",
				stories: [
					{ id: "1.1", title: "S1", status: "in-progress", tasks: [] },
					{ id: "1.2", title: "S2", status: "not-started", tasks: [] },
				],
			};
			expect(calculateFeatureStatus(feature)).toBe("in-progress");
		});

		it("should return blocked when all stories blocked", () => {
			const feature: Feature = {
				id: "1",
				title: "Test",
				status: "not-started",
				stories: [
					{ id: "1.1", title: "S1", status: "blocked", tasks: [] },
					{ id: "1.2", title: "S2", status: "blocked", tasks: [] },
				],
			};
			expect(calculateFeatureStatus(feature)).toBe("blocked");
		});
	});

	describe("checkDependenciesMet", () => {
		const createTasksProgress = (
			tasks: Array<{ id: string; status: string }>,
		): TasksProgress => ({
			project: "Test",
			features: [
				{
					id: "1",
					title: "F1",
					status: "in-progress",
					stories: [
						{
							id: "1.1",
							title: "S1",
							status: "in-progress",
							tasks: tasks.map((t) => ({
								id: t.id,
								title: `Task ${t.id}`,
								status: t.status as any,
								dependencies: [],
							})),
						},
					],
				},
			],
		});

		it("should return true when no dependencies", () => {
			const task: TaskRef = {
				id: "1.1.0",
				title: "Test",
				status: "not-started",
				dependencies: [],
			};
			const progress = createTasksProgress([]);
			expect(checkDependenciesMet(progress, task)).toBe(true);
		});

		it("should return true when all dependencies completed", () => {
			const task: TaskRef = {
				id: "1.1.2",
				title: "Test",
				status: "not-started",
				dependencies: ["1.1.0", "1.1.1"],
			};
			const progress = createTasksProgress([
				{ id: "1.1.0", status: "completed" },
				{ id: "1.1.1", status: "completed" },
			]);
			expect(checkDependenciesMet(progress, task)).toBe(true);
		});

		it("should return false when some dependencies not completed", () => {
			const task: TaskRef = {
				id: "1.1.2",
				title: "Test",
				status: "not-started",
				dependencies: ["1.1.0", "1.1.1"],
			};
			const progress = createTasksProgress([
				{ id: "1.1.0", status: "completed" },
				{ id: "1.1.1", status: "in-progress" },
			]);
			expect(checkDependenciesMet(progress, task)).toBe(false);
		});

		it("should return false when dependency not found", () => {
			const task: TaskRef = {
				id: "1.1.1",
				title: "Test",
				status: "not-started",
				dependencies: ["1.1.0"],
			};
			const progress = createTasksProgress([]);
			expect(checkDependenciesMet(progress, task)).toBe(false);
		});
	});

	describe("getUnmetDependencies", () => {
		const createTasksProgress = (
			tasks: Array<{ id: string; status: string }>,
		): TasksProgress => ({
			project: "Test",
			features: [
				{
					id: "1",
					title: "F1",
					status: "in-progress",
					stories: [
						{
							id: "1.1",
							title: "S1",
							status: "in-progress",
							tasks: tasks.map((t) => ({
								id: t.id,
								title: `Task ${t.id}`,
								status: t.status as any,
								dependencies: [],
							})),
						},
					],
				},
			],
		});

		it("should return empty array when no dependencies", () => {
			const task: TaskRef = {
				id: "1.1.0",
				title: "Test",
				status: "not-started",
				dependencies: [],
			};
			const progress = createTasksProgress([]);
			expect(getUnmetDependencies(progress, task)).toEqual([]);
		});

		it("should return unmet dependencies", () => {
			const task: TaskRef = {
				id: "1.1.2",
				title: "Test",
				status: "not-started",
				dependencies: ["1.1.0", "1.1.1"],
			};
			const progress = createTasksProgress([
				{ id: "1.1.0", status: "completed" },
				{ id: "1.1.1", status: "in-progress" },
			]);
			expect(getUnmetDependencies(progress, task)).toEqual(["1.1.1"]);
		});

		it("should return missing dependencies", () => {
			const task: TaskRef = {
				id: "1.1.2",
				title: "Test",
				status: "not-started",
				dependencies: ["1.1.0", "1.1.1"],
			};
			const progress = createTasksProgress([
				{ id: "1.1.0", status: "completed" },
			]);
			expect(getUnmetDependencies(progress, task)).toEqual(["1.1.1"]);
		});
	});

	describe("findNextAvailableTask", () => {
		it("should return null for completed project", () => {
			const progress: TasksProgress = {
				project: "Test",
				features: [
					{
						id: "1",
						title: "F1",
						status: "completed",
						stories: [
							{
								id: "1.1",
								title: "S1",
								status: "completed",
								tasks: [
									{
										id: "1.1.0",
										title: "T0",
										status: "completed",
										dependencies: [],
									},
								],
							},
						],
					},
				],
			};
			expect(findNextAvailableTask(progress)).toBeNull();
		});

		it("should find active task first", () => {
			const progress: TasksProgress = {
				project: "Test",
				features: [
					{
						id: "1",
						title: "F1",
						status: "in-progress",
						stories: [
							{
								id: "1.1",
								title: "S1",
								status: "in-progress",
								tasks: [
									{
										id: "1.1.0",
										title: "Implementing",
										status: "implementing",
										dependencies: [],
									},
									{
										id: "1.1.1",
										title: "Not Started",
										status: "not-started",
										dependencies: [],
									},
								],
							},
						],
					},
				],
			};
			const result = findNextAvailableTask(progress);
			expect(result?.task.id).toBe("1.1.0");
		});

		it("should find not-started task in active story", () => {
			const progress: TasksProgress = {
				project: "Test",
				features: [
					{
						id: "1",
						title: "F1",
						status: "in-progress",
						stories: [
							{
								id: "1.1",
								title: "S1",
								status: "in-progress",
								tasks: [
									{
										id: "1.1.0",
										title: "Completed",
										status: "completed",
										dependencies: [],
									},
									{
										id: "1.1.1",
										title: "Not Started",
										status: "not-started",
										dependencies: [],
									},
								],
							},
						],
					},
				],
			};
			const result = findNextAvailableTask(progress);
			expect(result?.task.id).toBe("1.1.1");
		});

		it("should exclude specified task ID", () => {
			const progress: TasksProgress = {
				project: "Test",
				features: [
					{
						id: "1",
						title: "F1",
						status: "in-progress",
						stories: [
							{
								id: "1.1",
								title: "S1",
								status: "in-progress",
								tasks: [
									{
										id: "1.1.0",
										title: "T0",
										status: "implementing",
										dependencies: [],
									},
									{
										id: "1.1.1",
										title: "T1",
										status: "not-started",
										dependencies: [],
									},
								],
							},
						],
					},
				],
			};
			const result = findNextAvailableTask(progress, "1.1.0");
			expect(result?.task.id).toBe("1.1.1");
		});

		it("should respect dependencies", () => {
			const progress: TasksProgress = {
				project: "Test",
				features: [
					{
						id: "1",
						title: "F1",
						status: "in-progress",
						stories: [
							{
								id: "1.1",
								title: "S1",
								status: "in-progress",
								tasks: [
									{
										id: "1.1.0",
										title: "T0",
										status: "not-started",
										dependencies: [],
									},
									{
										id: "1.1.1",
										title: "T1",
										status: "not-started",
										dependencies: ["1.1.0"],
									},
								],
							},
						],
					},
				],
			};
			const result = findNextAvailableTask(progress);
			expect(result?.task.id).toBe("1.1.0"); // T1 has unmet dependency
		});
	});

	describe("calculateProgressStats", () => {
		it("should calculate empty stats", () => {
			const progress: TasksProgress = {
				project: "Test",
				features: [],
			};
			const stats = calculateProgressStats(progress);
			expect(stats).toEqual({
				totalFeatures: 0,
				completedFeatures: 0,
				totalStories: 0,
				completedStories: 0,
				totalTasks: 0,
				completedTasks: 0,
			});
		});

		it("should calculate stats correctly", () => {
			const progress: TasksProgress = {
				project: "Test",
				features: [
					{
						id: "1",
						title: "F1",
						status: "completed",
						stories: [
							{
								id: "1.1",
								title: "S1",
								status: "completed",
								tasks: [
									{
										id: "1.1.0",
										title: "T0",
										status: "completed",
										dependencies: [],
									},
								],
							},
						],
					},
					{
						id: "2",
						title: "F2",
						status: "in-progress",
						stories: [
							{
								id: "2.1",
								title: "S2.1",
								status: "in-progress",
								tasks: [
									{
										id: "2.1.0",
										title: "T2.1.0",
										status: "completed",
										dependencies: [],
									},
									{
										id: "2.1.1",
										title: "T2.1.1",
										status: "not-started",
										dependencies: [],
									},
								],
							},
							{
								id: "2.2",
								title: "S2.2",
								status: "not-started",
								tasks: [
									{
										id: "2.2.0",
										title: "T2.2.0",
										status: "not-started",
										dependencies: [],
									},
								],
							},
						],
					},
				],
			};
			const stats = calculateProgressStats(progress);
			expect(stats).toEqual({
				totalFeatures: 2,
				completedFeatures: 1,
				totalStories: 3,
				completedStories: 1,
				totalTasks: 4,
				completedTasks: 2,
			});
		});
	});
});
