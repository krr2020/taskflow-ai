import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { statusCommand } from "../../src/commands/status";
import * as dataAccess from "../../src/lib/data-access";
import { FeatureNotFoundError, StoryNotFoundError } from "../../src/lib/errors";
import * as output from "../../src/lib/output";
import type { TasksProgress } from "../../src/lib/types";

vi.mock("../../src/lib/data-access");
vi.mock("../../src/lib/output", () => ({
	colors: {
		highlight: (s: string) => `[highlight]${s}[/highlight]`,
		success: (s: string) => `[success]${s}[/success]`,
		info: (s: string) => `[info]${s}[/info]`,
		warning: (s: string) => `[warning]${s}[/warning]`,
		error: (s: string) => `[error]${s}[/error]`,
		command: (s: string) => `[command]${s}[/command]`,
		muted: (s: string) => `[muted]${s}[/muted]`,
		task: (s: string) => `[task]${s}[/task]`,
		state: (s: string) => `[state]${s}[/state]`,
	},
	COMMON_COMMANDS: { noSession: [], activeSession: [] },
	printProjectOverview: vi.fn(),
	printAvailableCommands: vi.fn(),
	printHeader: vi.fn(),
	printSection: vi.fn(),
	printKeyValue: vi.fn(),
	printEmptyLine: vi.fn(),
	printLine: vi.fn(),
	printColoredLine: vi.fn(),
	// New standardized output functions
	printCommandResult: vi.fn(),
	printOutputSection: vi.fn(),
	printNextStepsSection: vi.fn(),
	printAIWarning: vi.fn(),
}));
vi.mock("../../src/lib/types", async (importOriginal) => {
	const actual =
		await importOriginal<typeof import("../../src/lib/types.js")>();
	return {
		...actual,
		isValidStoryId: vi.fn(),
		isValidFeatureId: vi.fn(),
	};
});

import { isValidFeatureId, isValidStoryId } from "../../src/lib/types";

describe("statusCommand", () => {
	const mockTasksProgress = {
		project: "Test",
		features: [
			{
				id: "1",
				title: "Feature 1",
				status: "in-progress" as const,
				stories: [
					{
						id: "1.1",
						title: "Story 1.1",
						status: "in-progress" as const,
						tasks: [
							{
								id: "1.1.0",
								title: "Task 0",
								status: "completed" as const,
								dependencies: [],
							},
							{
								id: "1.1.1",
								title: "Task 1",
								status: "not-started" as const,
								dependencies: ["1.1.0"],
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
		vi.mocked(dataAccess.calculateProgressStats).mockReturnValue({
			totalFeatures: 1,
			completedFeatures: 0,
			totalStories: 1,
			completedStories: 0,
			totalTasks: 2,
			completedTasks: 1,
		});
		vi.mocked(isValidStoryId).mockReturnValue(false);
		vi.mocked(isValidFeatureId).mockReturnValue(false);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should show project overview when no target provided", async () => {
		await statusCommand({});

		expect(dataAccess.calculateProgressStats).toHaveBeenCalledWith(
			mockTasksProgress,
		);
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"STATUS",
			expect.stringContaining("1/2 tasks completed"),
		);
		expect(output.printNextStepsSection).toHaveBeenCalled();
	});

	it("should show story details when story ID provided", async () => {
		vi.mocked(isValidStoryId).mockReturnValue(true);
		vi.mocked(dataAccess.findStoryLocation).mockReturnValue({
			story: mockTasksProgress.features[0]?.stories[0]!,
			feature: mockTasksProgress.features[0]!,
		});

		await statusCommand({ target: "1.1" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"STATUS",
			expect.stringContaining("Story 1.1"),
		);
		expect(output.printKeyValue).toHaveBeenCalledWith("Title", "Story 1.1");
	});

	it("should throw StoryNotFoundError for non-existent story", async () => {
		vi.mocked(isValidStoryId).mockReturnValue(true);
		vi.mocked(dataAccess.findStoryLocation).mockReturnValue(null);

		await expect(statusCommand({ target: "99.99" })).rejects.toThrow(
			StoryNotFoundError,
		);
	});

	it("should show feature details when feature ID provided", async () => {
		vi.mocked(isValidFeatureId).mockReturnValue(true);
		vi.mocked(dataAccess.findFeature).mockReturnValue(
			mockTasksProgress.features[0]!,
		);

		await statusCommand({ target: "1" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"STATUS",
			expect.stringContaining("Feature 1"),
		);
		expect(output.printKeyValue).toHaveBeenCalledWith("Title", "Feature 1");
	});

	it("should throw FeatureNotFoundError for non-existent feature", async () => {
		vi.mocked(isValidFeatureId).mockReturnValue(true);
		vi.mocked(dataAccess.findFeature).mockReturnValue(null);

		await expect(statusCommand({ target: "99" })).rejects.toThrow(
			FeatureNotFoundError,
		);
	});

	it("should show error for invalid target format", async () => {
		vi.mocked(isValidStoryId).mockReturnValue(false);
		vi.mocked(isValidFeatureId).mockReturnValue(false);

		await statusCommand({ target: "invalid" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"STATUS",
			expect.stringContaining("Invalid target"),
			false,
		);
		expect(output.printNextStepsSection).toHaveBeenCalled();
	});

	it("should display tasks with dependencies", async () => {
		vi.mocked(isValidStoryId).mockReturnValue(true);
		vi.mocked(dataAccess.findStoryLocation).mockReturnValue({
			story: mockTasksProgress.features[0]?.stories[0]!,
			feature: mockTasksProgress.features[0]!,
		});

		await statusCommand({ target: "1.1" });

		expect(output.printColoredLine).toHaveBeenCalledWith(
			expect.stringContaining("Dependencies"),
			expect.anything(),
		);
	});

	it("should display stories with task counts", async () => {
		vi.mocked(isValidFeatureId).mockReturnValue(true);
		vi.mocked(dataAccess.findFeature).mockReturnValue(
			mockTasksProgress.features[0]!,
		);

		await statusCommand({ target: "1" });

		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("1/2"),
		);
	});

	it("should format status correctly for completed items", async () => {
		const completedProgress: TasksProgress = {
			project: "Test",
			features: [
				{
					id: "1",
					title: "Feature 1",
					status: "completed",
					stories: [
						{
							id: "1.1",
							title: "Story 1.1",
							status: "in-progress",
							tasks: [
								{
									id: "1.1.0",
									title: "Task 0",
									status: "completed",
									dependencies: [],
								},
								{
									id: "1.1.1",
									title: "Task 1",
									status: "not-started",
									dependencies: ["1.1.0"],
								},
							],
						},
					],
				},
			],
		};
		vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(completedProgress);
		vi.mocked(isValidFeatureId).mockReturnValue(true);
		vi.mocked(dataAccess.findFeature).mockReturnValue(
			completedProgress.features[0]!,
		);

		await statusCommand({ target: "1" });

		expect(output.printKeyValue).toHaveBeenCalledWith(
			"Status",
			expect.stringContaining("completed"),
		);
	});

	it("should format status correctly for blocked items", async () => {
		const blockedProgress: TasksProgress = {
			project: "Test",
			features: [
				{
					id: "1",
					title: "Feature 1",
					status: "blocked",
					stories: [
						{
							id: "1.1",
							title: "Story 1.1",
							status: "in-progress",
							tasks: [
								{
									id: "1.1.0",
									title: "Task 0",
									status: "completed",
									dependencies: [],
								},
								{
									id: "1.1.1",
									title: "Task 1",
									status: "not-started",
									dependencies: ["1.1.0"],
								},
							],
						},
					],
				},
			],
		};
		vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(blockedProgress);
		vi.mocked(isValidFeatureId).mockReturnValue(true);
		vi.mocked(dataAccess.findFeature).mockReturnValue(
			blockedProgress.features[0]!,
		);

		await statusCommand({ target: "1" });

		expect(output.printKeyValue).toHaveBeenCalledWith(
			"Status",
			expect.stringContaining("blocked"),
		);
	});

	it("should format status correctly for on-hold items", async () => {
		const onHoldProgress: TasksProgress = {
			project: "Test",
			features: [
				{
					id: "1",
					title: "Feature 1",
					status: "on-hold",
					stories: [
						{
							id: "1.1",
							title: "Story 1.1",
							status: "in-progress",
							tasks: [
								{
									id: "1.1.0",
									title: "Task 0",
									status: "completed",
									dependencies: [],
								},
								{
									id: "1.1.1",
									title: "Task 1",
									status: "not-started",
									dependencies: ["1.1.0"],
								},
							],
						},
					],
				},
			],
		};
		vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(onHoldProgress);
		vi.mocked(isValidFeatureId).mockReturnValue(true);
		vi.mocked(dataAccess.findFeature).mockReturnValue(
			onHoldProgress.features[0]!,
		);

		await statusCommand({ target: "1" });

		expect(output.printKeyValue).toHaveBeenCalledWith(
			"Status",
			expect.stringContaining("on-hold"),
		);
	});
});
