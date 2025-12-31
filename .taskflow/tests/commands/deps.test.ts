import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { depsCommand } from "../../src/commands/deps";
import * as dataAccess from "../../src/lib/data-access";
import { TaskNotFoundError } from "../../src/lib/errors";
import * as output from "../../src/lib/output";

vi.mock("../../src/lib/data-access");

vi.mock("../../src/lib/output", () => ({
	colors: {
		success: (s: string) => `[success]${s}[/success]`,
		error: (s: string) => `[error]${s}[/error]`,
		warning: (s: string) => `[warning]${s}[/warning]`,
		info: (s: string) => `[info]${s}[/info]`,
		highlight: (s: string) => `[highlight]${s}[/highlight]`,
		muted: (s: string) => `[muted]${s}[/muted]`,
		command: (s: string) => `[command]${s}[/command]`,
		task: (s: string) => `[task]${s}[/task]`,
		state: (s: string) => `[state]${s}[/state]`,
		successBold: (s: string) => `[successBold]${s}[/successBold]`,
	},
	printCommandResult: vi.fn(),
	printOutputSection: vi.fn(),
	printNextStepsSection: vi.fn(),
	printAIWarning: vi.fn(),
	printKeyValue: vi.fn(),
	printColoredLine: vi.fn(),
	printLine: vi.fn(),
	printEmptyLine: vi.fn(),
}));

const mockTasksProgress = {
	project: "test-project",
	features: [
		{
			id: "1",
			title: "Feature 1",
			status: "in-progress" as const,
			stories: [
				{
					id: "1.1",
					title: "Story 1",
					status: "in-progress" as const,
					stories: [],
					tasks: [
						{
							id: "1.1.0",
							title: "Setup Database Schema",
							status: "completed" as const,
							dependencies: [],
						},
						{
							id: "1.1.1",
							title: "Create Auth Endpoints",
							status: "implementing" as const,
							dependencies: ["1.1.0"],
						},
						{
							id: "1.1.2",
							title: "Add Authentication Middleware",
							status: "not-started" as const,
							dependencies: ["1.1.1"],
						},
						{
							id: "1.1.3",
							title: "Add Session Management",
							status: "not-started" as const,
							dependencies: ["1.1.0", "1.1.1"],
						},
					],
				},
			],
		},
	],
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, "log").mockImplementation(() => {});

	vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(mockTasksProgress);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("depsCommand", () => {
	it("should throw TaskNotFoundError when task does not exist", async () => {
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue(null);

		await expect(depsCommand({ taskId: "99.99.99" })).rejects.toThrow(
			TaskNotFoundError,
		);
	});

	it("should show task with no dependencies", async () => {
		vi.mocked(dataAccess.findTaskLocation).mockImplementation(
			(_, taskId: string) => {
				if (taskId === "1.1.0") {
					return {
						task: mockTasksProgress.features[0]!.stories[0]!.tasks[0]!,
						story: mockTasksProgress.features[0]!.stories[0]!,
						feature: mockTasksProgress.features[0]!,
					} as any;
				}
				return null;
			},
		);

		await depsCommand({ taskId: "1.1.0" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"DEPS",
			"Dependencies for task 1.1.0",
		);
		expect(output.printColoredLine).toHaveBeenCalledWith(
			"No direct dependencies.",
			expect.anything(),
		);
	});

	it("should show direct dependencies with status", async () => {
		vi.mocked(dataAccess.findTaskLocation).mockImplementation(
			(_, taskId: string) => {
				const task = mockTasksProgress.features[0]!.stories[0]!.tasks.find(
					(t) => t.id === taskId,
				);
				if (task) {
					return {
						task,
						story: mockTasksProgress.features[0]!.stories[0]!,
						feature: mockTasksProgress.features[0]!,
					} as any;
				}
				return null;
			},
		);

		await depsCommand({ taskId: "1.1.1" });

		expect(output.printColoredLine).toHaveBeenCalledWith(
			"Direct Dependencies (must complete first):",
			expect.anything(),
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("[task]1.1.0[/task]"),
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("Setup Database Schema"),
		);
	});

	it("should show reverse dependencies", async () => {
		vi.mocked(dataAccess.findTaskLocation).mockImplementation(
			(_, taskId: string) => {
				const task = mockTasksProgress.features[0]!.stories[0]!.tasks.find(
					(t) => t.id === taskId,
				);
				if (task) {
					return {
						task,
						story: mockTasksProgress.features[0]!.stories[0]!,
						feature: mockTasksProgress.features[0]!,
					} as any;
				}
				return null;
			},
		);

		await depsCommand({ taskId: "1.1.0" });

		expect(output.printColoredLine).toHaveBeenCalledWith(
			"Tasks that depend on this one (blocked by this task):",
			expect.anything(),
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("[task]1.1.1[/task]"),
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("[task]1.1.3[/task]"),
		);
	});

	it("should show multiple dependencies", async () => {
		vi.mocked(dataAccess.findTaskLocation).mockImplementation(
			(_, taskId: string) => {
				const task = mockTasksProgress.features[0]!.stories[0]!.tasks.find(
					(t) => t.id === taskId,
				);
				if (task) {
					return {
						task,
						story: mockTasksProgress.features[0]!.stories[0]!,
						feature: mockTasksProgress.features[0]!,
					} as any;
				}
				return null;
			},
		);

		await depsCommand({ taskId: "1.1.3" });

		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("[task]1.1.0[/task]"),
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("[task]1.1.1[/task]"),
		);
	});

	it("should build dependency tree", async () => {
		vi.mocked(dataAccess.findTaskLocation).mockImplementation(
			(_, taskId: string) => {
				const task = mockTasksProgress.features[0]!.stories[0]!.tasks.find(
					(t) => t.id === taskId,
				);
				if (task) {
					return {
						task,
						story: mockTasksProgress.features[0]!.stories[0]!,
						feature: mockTasksProgress.features[0]!,
					} as any;
				}
				return null;
			},
		);

		await depsCommand({ taskId: "1.1.2" });

		expect(output.printColoredLine).toHaveBeenCalledWith(
			"Dependency Tree:",
			expect.anything(),
		);
	});

	it('should show "ready to start" message when all dependencies are complete', async () => {
		// Create a modified version with task 1.1.1 completed
		const modifiedProgress = {
			...mockTasksProgress,
			features: [
				{
					...mockTasksProgress.features[0]!,
					stories: [
						{
							...mockTasksProgress.features[0]!.stories[0]!,
							tasks: mockTasksProgress.features[0]!.stories[0]!.tasks.map(
								(t) =>
									t.id === "1.1.1" ? { ...t, status: "completed" as const } : t,
							),
						},
					],
				},
			],
		};

		vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(modifiedProgress);
		vi.mocked(dataAccess.findTaskLocation).mockImplementation(
			(_, taskId: string) => {
				const task = modifiedProgress.features[0]!.stories[0]!.tasks.find(
					(t) => t.id === taskId,
				);
				if (task) {
					return {
						task,
						story: modifiedProgress.features[0]!.stories[0]!,
						feature: modifiedProgress.features[0]!,
					} as any;
				}
				return null;
			},
		);

		await depsCommand({ taskId: "1.1.2" });

		expect(output.printColoredLine).toHaveBeenCalledWith(
			"✅ All dependencies complete! This task is ready to start.",
			expect.anything(),
		);
	});

	it("should show warning when dependencies are not complete", async () => {
		vi.mocked(dataAccess.findTaskLocation).mockImplementation(
			(_, taskId: string) => {
				const task = mockTasksProgress.features[0]!.stories[0]!.tasks.find(
					(t) => t.id === taskId,
				);
				if (task) {
					return {
						task,
						story: mockTasksProgress.features[0]!.stories[0]!,
						feature: mockTasksProgress.features[0]!,
					} as any;
				}
				return null;
			},
		);

		await depsCommand({ taskId: "1.1.2" });

		expect(output.printColoredLine).toHaveBeenCalledWith(
			"⚠️  Some dependencies are not yet complete. Wait for them to finish.",
			expect.anything(),
		);
	});

	it("should show next step to start task when dependencies are met", async () => {
		// Use the task with no dependencies (1.1.0) which is not-started
		const modifiedProgress = {
			...mockTasksProgress,
			features: [
				{
					...mockTasksProgress.features[0]!,
					stories: [
						{
							...mockTasksProgress.features[0]!.stories[0]!,
							tasks: mockTasksProgress.features[0]!.stories[0]!.tasks.map(
								(t) =>
									t.id === "1.1.0"
										? { ...t, status: "not-started" as const }
										: t,
							),
						},
					],
				},
			],
		};

		vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(modifiedProgress);
		vi.mocked(dataAccess.findTaskLocation).mockImplementation(
			(_, taskId: string) => {
				const task = modifiedProgress.features[0]!.stories[0]!.tasks.find(
					(t) => t.id === taskId,
				);
				if (task) {
					return {
						task,
						story: modifiedProgress.features[0]!.stories[0]!,
						feature: modifiedProgress.features[0]!,
					} as any;
				}
				return null;
			},
		);

		await depsCommand({ taskId: "1.1.0" });

		expect(output.printNextStepsSection).toHaveBeenCalledWith([
			expect.objectContaining({
				cmd: "pnpm task start 1.1.0",
			}),
		]);
	});

	it("should always print AI warning at the end", async () => {
		vi.mocked(dataAccess.findTaskLocation).mockImplementation(
			(_, taskId: string) => {
				const task = mockTasksProgress.features[0]!.stories[0]!.tasks.find(
					(t) => t.id === taskId,
				);
				if (task) {
					return {
						task,
						story: mockTasksProgress.features[0]!.stories[0]!,
						feature: mockTasksProgress.features[0]!,
					} as any;
				}
				return null;
			},
		);

		await depsCommand({ taskId: "1.1.0" });

		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should handle missing dependency gracefully", async () => {
		const mockProgressWithMissingDep = {
			project: "test-project",
			features: [
				{
					id: "1",
					title: "Feature 1",
					status: "in-progress" as const,
					stories: [
						{
							id: "1.1",
							title: "Story 1",
							status: "in-progress" as const,
							tasks: [
								{
									id: "1.1.0",
									title: "Test Task",
									status: "not-started" as const,
									dependencies: ["1.1.99"], // Non-existent dependency
								},
							],
						},
					],
				},
			],
		};

		vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(
			mockProgressWithMissingDep,
		);
		vi.mocked(dataAccess.findTaskLocation).mockImplementation(
			(_, taskId: string) => {
				if (taskId === "1.1.0") {
					return {
						task: mockProgressWithMissingDep.features[0]!.stories[0]!.tasks[0]!,
						story: mockProgressWithMissingDep.features[0]!.stories[0]!,
						feature: mockProgressWithMissingDep.features[0]!,
					} as any;
				}
				return null;
			},
		);

		await depsCommand({ taskId: "1.1.0" });

		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("[warning]1.1.99[/warning]"),
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("Not found"),
		);
	});

	it("should display task info correctly", async () => {
		vi.mocked(dataAccess.findTaskLocation).mockImplementation(
			(_, taskId: string) => {
				const task = mockTasksProgress.features[0]!.stories[0]!.tasks.find(
					(t) => t.id === taskId,
				);
				if (task) {
					return {
						task,
						story: mockTasksProgress.features[0]!.stories[0]!,
						feature: mockTasksProgress.features[0]!,
					} as any;
				}
				return null;
			},
		);

		await depsCommand({ taskId: "1.1.0" });

		expect(output.printKeyValue).toHaveBeenCalledWith(
			"Task ID",
			"[task]1.1.0[/task]",
		);
		expect(output.printKeyValue).toHaveBeenCalledWith(
			"Title",
			"Setup Database Schema",
		);
		expect(output.printKeyValue).toHaveBeenCalledWith("Story", "1.1 - Story 1");
		expect(output.printKeyValue).toHaveBeenCalledWith(
			"Feature",
			"1 - Feature 1",
		);
	});
});
