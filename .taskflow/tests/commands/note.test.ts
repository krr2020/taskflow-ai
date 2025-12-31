import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { noteCommand } from "../../src/commands/note";
import * as dataAccess from "../../src/lib/data-access";
import { NoActiveSessionError, TaskNotFoundError } from "../../src/lib/errors";
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
		successBold: (s: string) => `[successBold]${s}[/successBold]`,
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
	printCommandResult: vi.fn(),
	printOutputSection: vi.fn(),
	printNextStepsSection: vi.fn(),
	printAIWarning: vi.fn(),
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

describe("noteCommand", () => {
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
						status: "not-started" as const,
						tasks: [
							{
								id: "1.1.0",
								title: "Task 0",
								status: "not-started" as const,
								dependencies: [],
							},
						],
					},
				],
			},
		],
	};

	const mockTaskContent = {
		id: "1.1.0",
		title: "Task 0",
		description: "Test task",
		status: "implementing" as const,
		skill: "backend" as const,
		subtasks: [],
		context: [],
		notes: [],
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(mockTasksProgress);
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);
		vi.mocked(dataAccess.getTaskFilePath).mockReturnValue("/path/to/task.json");
		vi.mocked(dataAccess.loadTaskFile).mockReturnValue(mockTaskContent);
		vi.mocked(dataAccess.saveTaskFile).mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should throw NoActiveSessionError when no active task and no taskId provided", async () => {
		await expect(noteCommand({ note: "Test note" })).rejects.toThrow(
			NoActiveSessionError,
		);
	});

	it("should throw TaskNotFoundError for non-existent task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: mockTaskContent,
		});
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue(null);

		await expect(
			noteCommand({ taskId: "99.99.99", note: "Test note" }),
		).rejects.toThrow(TaskNotFoundError);
	});

	it("should use active task when taskId not provided", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: mockTaskContent,
		});
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]?.stories[0]!,
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0]!,
		} as any);

		await noteCommand({ note: "Test note" });

		expect(dataAccess.loadTaskFile).toHaveBeenCalledWith("/path/to/task.json");
	});

	it("should add note to task file", async () => {
		const freshTaskContent = { ...mockTaskContent, notes: [] };
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: freshTaskContent,
		});
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]?.stories[0]!,
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0]!,
		} as any);
		vi.mocked(dataAccess.loadTaskFile).mockReturnValue(freshTaskContent);

		await noteCommand({ taskId: "1.1.0", note: "Test note" });

		expect(dataAccess.loadTaskFile).toHaveBeenCalledWith("/path/to/task.json");
		const savedContent = vi.mocked(dataAccess.saveTaskFile).mock
			.calls[0]?.[1] as any;
		expect(savedContent).toBeDefined();
		expect(savedContent.notes).toHaveLength(1);
		expect(savedContent.notes[0]).toMatchObject({
			type: "note",
			content: "Test note",
		});
		expect(savedContent.notes[0].timestamp).toMatch(
			/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}\.\d{3}Z$/,
		);
	});

	it("should append note to existing notes", async () => {
		const taskWithNotes = {
			...mockTaskContent,
			notes: [
				{
					timestamp: "2024-01-01T00:00:00.000Z",
					type: "note" as const,
					content: "Existing note",
				},
			],
		};
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: taskWithNotes,
		});
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]?.stories[0]!,
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0]!,
		} as any);
		vi.mocked(dataAccess.loadTaskFile).mockReturnValue(taskWithNotes);

		await noteCommand({ taskId: "1.1.0", note: "New note" });

		expect(dataAccess.saveTaskFile).toHaveBeenCalledWith("/path/to/task.json", {
			...taskWithNotes,
			notes: [
				taskWithNotes.notes?.[0],
				{
					timestamp: expect.any(String),
					type: "note",
					content: "New note",
				},
			],
		});
	});

	it("should print note result with correct information", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: mockTaskContent,
		});
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]?.stories[0]!,
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0]!,
		} as any);

		await noteCommand({ taskId: "1.1.0", note: "Test note" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"NOTE",
			expect.stringContaining("1.1.0"),
		);
		expect(output.printOutputSection).toHaveBeenCalled();
		expect(output.printKeyValue).toHaveBeenCalledWith("Task ID", "1.1.0");
		expect(output.printKeyValue).toHaveBeenCalledWith("Title", "Task 0");
	});

	it("should show next steps to view task with notes", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: mockTaskContent,
		});
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]?.stories[0]!,
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0]!,
		} as any);

		await noteCommand({ taskId: "1.1.0", note: "Test note" });

		expect(output.printNextStepsSection).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ cmd: "pnpm task do" }),
			]),
		);
	});

	it("should print AI warning", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: mockTaskContent,
		});
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]?.stories[0]!,
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0]!,
		} as any);

		await noteCommand({ taskId: "1.1.0", note: "Test note" });

		expect(output.printAIWarning).toHaveBeenCalled();
	});
});
