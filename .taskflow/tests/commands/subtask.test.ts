import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { subtaskCommand } from "../../src/commands/subtask";
import * as dataAccess from "../../src/lib/data-access";
import { NoActiveSessionError } from "../../src/lib/errors";
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
	printLine: vi.fn(),
	printColoredLine: vi.fn(),
	printEmptyLine: vi.fn(),
}));

describe("subtaskCommand", () => {
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
		subtasks: [
			{ id: "1", description: "Subtask 1", status: "pending" as const },
			{ id: "2", description: "Subtask 2", status: "pending" as const },
		],
		context: [],
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

	it("should throw NoActiveSessionError when no active task", async () => {
		await expect(
			subtaskCommand({ taskId: "1.1.0", subtaskId: "1", status: "completed" }),
		).rejects.toThrow(NoActiveSessionError);
	});

	it("should show error when taskId does not match active task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: mockTaskContent,
		});

		await subtaskCommand({
			taskId: "1.1.1",
			subtaskId: "1",
			status: "completed",
		});

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"SUBTASK",
			expect.stringContaining("Can only update subtasks for active task"),
			false,
		);
		expect(output.printNextStepsSection).toHaveBeenCalled();
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should show error when task has no subtasks", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: mockTaskContent,
		});
		vi.mocked(dataAccess.loadTaskFile).mockReturnValue({
			...mockTaskContent,
			subtasks: [],
		});

		await subtaskCommand({
			taskId: "1.1.0",
			subtaskId: "1",
			status: "completed",
		});

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"SUBTASK",
			expect.stringContaining("not found"),
			false,
		);
		expect(output.printNextStepsSection).toHaveBeenCalled();
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should show error when subtaskId not found", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: mockTaskContent,
		});

		await subtaskCommand({
			taskId: "1.1.0",
			subtaskId: "99",
			status: "completed",
		});

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"SUBTASK",
			expect.stringContaining("not found"),
			false,
		);
		expect(output.printNextStepsSection).toHaveBeenCalled();
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should mark subtask as completed", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: mockTaskContent,
		});

		await subtaskCommand({
			taskId: "1.1.0",
			subtaskId: "1",
			status: "completed",
		});

		expect(dataAccess.loadTaskFile).toHaveBeenCalledWith("/path/to/task.json");
		expect(dataAccess.saveTaskFile).toHaveBeenCalledWith("/path/to/task.json", {
			...mockTaskContent,
			subtasks: [
				{ id: "1", description: "Subtask 1", status: "completed" },
				{ id: "2", description: "Subtask 2", status: "pending" },
			],
		});
	});

	it("should mark subtask as pending", async () => {
		const completedTaskContent = {
			...mockTaskContent,
			subtasks: [
				{ id: "1", description: "Subtask 1", status: "completed" as const },
				{ id: "2", description: "Subtask 2", status: "completed" as const },
			],
		};
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: completedTaskContent,
		});
		vi.mocked(dataAccess.loadTaskFile).mockReturnValue(completedTaskContent);

		await subtaskCommand({
			taskId: "1.1.0",
			subtaskId: "1",
			status: "pending",
		});

		expect(dataAccess.saveTaskFile).toHaveBeenCalledWith("/path/to/task.json", {
			...completedTaskContent,
			subtasks: [
				{ id: "1", description: "Subtask 1", status: "pending" },
				{ id: "2", description: "Subtask 2", status: "completed" },
			],
		});
	});

	it("should print subtask result with checklist", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: mockTaskContent,
		});

		await subtaskCommand({
			taskId: "1.1.0",
			subtaskId: "1",
			status: "completed",
		});

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"SUBTASK",
			expect.stringContaining("marked as COMPLETED"),
		);
		expect(output.printOutputSection).toHaveBeenCalled();
	});

	it("should suggest advancing to VERIFYING when all subtasks complete", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: mockTaskContent,
		});

		await subtaskCommand({
			taskId: "1.1.0",
			subtaskId: "2",
			status: "completed",
		});

		expect(output.printNextStepsSection).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ cmd: "pnpm task check" }),
			]),
		);
	});

	it("should suggest continuing when not all subtasks complete", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: mockTaskContent,
		});

		await subtaskCommand({
			taskId: "1.1.0",
			subtaskId: "1",
			status: "completed",
		});

		expect(output.printNextStepsSection).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ cmd: "pnpm task check" }),
			]),
		);
	});

	it("should print AI warning", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: mockTaskContent,
		});

		await subtaskCommand({
			taskId: "1.1.0",
			subtaskId: "1",
			status: "completed",
		});

		expect(output.printAIWarning).toHaveBeenCalled();
	});
});
