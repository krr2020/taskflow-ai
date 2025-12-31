import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { nextCommand } from "../../src/commands/next";
import * as dataAccess from "../../src/lib/data-access";
import * as output from "../../src/lib/output";

vi.mock("../../src/lib/data-access");
vi.mock("../../src/lib/output", () => ({
	colors: {
		info: (s: string) => `[info]${s}[/info]`,
		command: (s: string) => `[command]${s}[/command]`,
		highlight: (s: string) => `[highlight]${s}[/highlight]`,
		success: (s: string) => `[success]${s}[/success]`,
		error: (s: string) => `[error]${s}[/error]`,
		warning: (s: string) => `[warning]${s}[/warning]`,
		muted: (s: string) => `[muted]${s}[/muted]`,
		file: (s: string) => `[file]${s}[/file]`,
		task: (s: string) => `[task]${s}[/task]`,
		state: (s: string) => `[state]${s}[/state]`,
		warningBold: (s: string) => `[warningBold]${s}[/warningBold]`,
		successBold: (s: string) => `[successBold]${s}[/successBold]`,
		infoBold: (s: string) => `[infoBold]${s}[/infoBold]`,
		errorBold: (s: string) => `[errorBold]${s}[/errorBold]`,
	},
	icons: {
		success: "✓",
		error: "✗",
		warning: "⚠",
		info: "ℹ",
		brain: "🧠",
		target: "🎯",
		architecture: "📐",
		code: "💻",
		search: "🔍",
		test: "🧪",
		save: "💾",
		stop: "🛑",
		arrow: "▸",
		alert: "🚨",
	},
	COMMON_COMMANDS: { noSession: [], activeSession: [] },
	// New standardized output functions
	printCommandResult: vi.fn(),
	printOutputSection: vi.fn(),
	printNextStepsSection: vi.fn(),
	printAIWarning: vi.fn(),
	printDivider: vi.fn(),
	printSubheader: vi.fn(),
	printKeyValue: vi.fn(),
	printColoredLine: vi.fn(),
	printEmptyLine: vi.fn(),
	printLine: vi.fn(),
	printSection: vi.fn(),
	printHeader: vi.fn(),
	printSuccess: vi.fn(),
	printError: vi.fn(),
	printWarning: vi.fn(),
	printInfo: vi.fn(),
	printMuted: vi.fn(),
	printCommand: vi.fn(),
	printTaskStarted: vi.fn(),
	printTaskCompleted: vi.fn(),
	printCurrentState: vi.fn(),
	printNextStep: vi.fn(),
	printNextSteps: vi.fn(),
	printAction: vi.fn(),
	printSetupInstructions: vi.fn(),
	printVerifyInstructions: vi.fn(),
	printValidateInstructions: vi.fn(),
	printCommitInstructions: vi.fn(),
	printPreHookFailure: vi.fn(),
}));

describe("nextCommand", () => {
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
								dependencies: [],
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

	it("should show active task when one exists", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: {
				title: "Task 0",
				status: "implementing",
			},
		} as any);

		await nextCommand();

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"NEXT",
			expect.stringContaining("Active task found"),
		);
		expect(output.printNextStepsSection).toHaveBeenCalled();
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should show next available task when no active task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findNextAvailableTask).mockReturnValue({
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[1] as any,
			story: mockTasksProgress.features[0]?.stories[0] as any,
			feature: mockTasksProgress.features[0] as any,
		});

		await nextCommand();

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"NEXT",
			expect.stringContaining("Next available task"),
		);
		expect(output.printNextStepsSection).toHaveBeenCalled();
	});

	it("should show continue message for implementing task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findNextAvailableTask).mockReturnValue({
			task: {
				id: "1.1.0",
				title: "Task 0",
				status: "implementing" as const,
				dependencies: [],
			},
			story: mockTasksProgress.features[0]?.stories[0] as any,
			feature: mockTasksProgress.features[0] as any,
		});

		await nextCommand();

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"NEXT",
			expect.stringContaining("Continue task"),
		);
	});

	it("should display task dependencies when present", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findNextAvailableTask).mockReturnValue({
			task: {
				id: "1.1.1",
				title: "Task 1",
				status: "not-started" as const,
				dependencies: ["1.1.0"],
			},
			story: mockTasksProgress.features[0]?.stories[0] as any,
			feature: mockTasksProgress.features[0] as any,
		});

		await nextCommand();

		expect(output.printKeyValue).toHaveBeenCalledWith("Dependencies", "1.1.0");
	});

	it("should show no available tasks message when none found", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findNextAvailableTask).mockReturnValue(null);

		await nextCommand();

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"NEXT",
			expect.stringContaining("No available tasks"),
			false,
		);
	});

	it("should show all tasks completed when project is done", async () => {
		const completedProgress = {
			project: "Test",
			features: [
				{
					id: "1",
					title: "Feature 1",
					status: "completed" as const,
					stories: [
						{
							id: "1.1",
							title: "Story 1.1",
							status: "completed" as const,
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
									status: "completed" as const,
									dependencies: [],
								},
							],
						},
					],
				},
			],
		};
		vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(completedProgress);
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findNextAvailableTask).mockReturnValue(null);

		await nextCommand();

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"NEXT",
			expect.stringContaining("All tasks completed"),
		);
	});

	it("should show blocked tasks when some exist", async () => {
		const blockedProgress = {
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
									status: "blocked" as const,
									dependencies: [],
								},
								{
									id: "1.1.1",
									title: "Task 1",
									status: "blocked" as const,
									dependencies: [],
								},
							],
						},
					],
				},
			],
		};
		vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(blockedProgress);
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findNextAvailableTask).mockReturnValue(null);

		await nextCommand();

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"NEXT",
			expect.anything(),
			false,
		);
		expect(output.printColoredLine).toHaveBeenCalledWith(
			expect.stringContaining("Some tasks are blocked"),
			expect.anything(),
		);
	});

	it("should limit blocked tasks display to 5", async () => {
		const manyBlockedTasks = Array.from({ length: 10 }, (_, i) => ({
			id: `1.1.${i}`,
			title: `Task ${i}`,
			status: "blocked" as const,
			dependencies: [],
		}));
		const blockedProgress = {
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
							tasks: manyBlockedTasks,
						},
					],
				},
			],
		};
		vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(blockedProgress);
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.findNextAvailableTask).mockReturnValue(null);

		await nextCommand();

		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("and 5 more"),
		);
	});

	it("should display status for active task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: {
				title: "Task 0",
				status: "validating",
			},
		} as any);

		await nextCommand();

		expect(output.printKeyValue).toHaveBeenCalledWith(
			"Status",
			expect.stringContaining("validating"),
		);
	});
});
