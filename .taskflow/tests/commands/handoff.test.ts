import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { handoffCommand } from "../../src/commands/handoff";
import * as dataAccess from "../../src/lib/data-access";
import { NoActiveSessionError, TaskNotFoundError } from "../../src/lib/errors";
import * as output from "../../src/lib/output";
import type {
	ActiveTask,
	TaskFileContent,
	TaskLocation,
} from "../../src/lib/types";

vi.mock("node:fs");
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
					tasks: [
						{
							id: "1.1.0",
							title: "Task 0",
							status: "implementing" as const,
							dependencies: [],
						},
					],
				},
			],
		},
	],
};

const mockTaskContent = {
	title: "Task 0",
	status: "implementing",
	notes: [],
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, "log").mockImplementation(() => {});

	// Reset notes array to prevent accumulation across tests
	mockTaskContent.notes = [];

	vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(mockTasksProgress);
	vi.mocked(dataAccess.updateTaskStatus).mockReturnValue(null);
	vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
		feature: mockTasksProgress.features[0]!,
		story: mockTasksProgress.features[0]!.stories[0]!,
		task: mockTasksProgress.features[0]!.stories[0]!.tasks[0]!,
	} as unknown as TaskLocation);
	vi.mocked(dataAccess.getTaskFilePath).mockReturnValue("/path/to/task.json");
	vi.mocked(dataAccess.loadTaskFile).mockReturnValue(
		mockTaskContent as unknown as TaskFileContent,
	);
	vi.mocked(dataAccess.saveTaskFile).mockReturnValue(undefined);
	vi.mocked(fs.existsSync).mockReturnValue(false);
	vi.mocked(fs.mkdirSync).mockReturnValue(undefined);
	vi.mocked(fs.writeFileSync).mockReturnValue(undefined);
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("handoffCommand", () => {
	it("should throw NoActiveSessionError when no taskId and no active task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);

		await expect(handoffCommand({})).rejects.toThrow(NoActiveSessionError);
	});

	it("should throw TaskNotFoundError when taskId does not exist", async () => {
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue(null);

		await expect(
			handoffCommand({ taskId: "99.99.99", to: "Jane" }),
		).rejects.toThrow(TaskNotFoundError);
	});

	it("should show error when no recipient provided", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: mockTaskContent as unknown as TaskFileContent,
		} as unknown as ActiveTask);

		await handoffCommand({});

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"HANDOFF",
			"Recipient required",
			false,
		);
		expect(output.printColoredLine).toHaveBeenCalledWith(
			"You must specify who to hand off this task to.",
			expect.anything(),
		);
	});

	it("should handoff active task to specified person", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue({
			taskId: "1.1.0",
			filePath: "/path/to/task.json",
			content: mockTaskContent,
		} as any);

		await handoffCommand({ to: "Jane Doe" });

		expect(dataAccess.updateTaskStatus).toHaveBeenCalledWith(
			mockTasksProgress,
			"1.1.0",
			"not-started",
		);
		expect(dataAccess.saveTaskFile).toHaveBeenCalled();
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"HANDOFF",
			"Task 1.1.0 handed off to Jane Doe",
		);
		expect(output.printKeyValue).toHaveBeenCalledWith(
			"To",
			"[warning]Jane Doe[/warning]",
		);
	});

	it("should handoff specific task by ID", async () => {
		await handoffCommand({ taskId: "1.1.0", to: "John Smith" });

		expect(dataAccess.updateTaskStatus).toHaveBeenCalledWith(
			mockTasksProgress,
			"1.1.0",
			"not-started",
		);
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"HANDOFF",
			"Task 1.1.0 handed off to John Smith",
		);
	});

	it("should add handoff note to task file with notes", async () => {
		const notes = "Need to coordinate with design team";
		await handoffCommand({ taskId: "1.1.0", to: "Alice", notes });

		const savedContent = vi.mocked(dataAccess.saveTaskFile).mock.calls[0]?.[1];
		expect(savedContent?.notes).toHaveLength(1);
		expect(savedContent?.notes?.[0]).toMatchObject({
			type: "handoff",
			from: "current",
			to: "Alice",
			content: notes,
		});
	});

	it("should add handoff note to task file without notes", async () => {
		await handoffCommand({ taskId: "1.1.0", to: "Bob" });

		const savedContent = vi.mocked(dataAccess.saveTaskFile).mock.calls[0]?.[1];
		expect(savedContent?.notes).toHaveLength(1);
		expect(savedContent?.notes?.[0]?.content).toBe("No additional notes");
	});

	it("should log handoff to handoffs.json file", async () => {
		await handoffCommand({
			taskId: "1.1.0",
			to: "Charlie",
			notes: "Test handoff",
		});

		expect(fs.writeFileSync).toHaveBeenCalled();
		const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
		expect(writeCall?.[0]).toContain("handoffs.json");

		const loggedData = JSON.parse(writeCall?.[1] as string);
		expect(loggedData).toHaveLength(1);
		expect(loggedData[0]).toMatchObject({
			taskId: "1.1.0",
			taskTitle: "Task 0",
			from: "current",
			to: "Charlie",
			notes: "Test handoff",
		});
	});

	it("should append to existing handoffs.json if it exists", async () => {
		const existingHandoffs = [
			{
				taskId: "1.1.1",
				taskTitle: "Previous Task",
				from: "current",
				to: "Dave",
				timestamp: "2025-01-01T00:00:00.000Z",
			},
		];

		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockReturnValue(
			JSON.stringify(existingHandoffs),
		);

		await handoffCommand({ taskId: "1.1.0", to: "Eve" });

		const writeCall = vi.mocked(fs.writeFileSync).mock.calls[0];
		const loggedData = JSON.parse(writeCall?.[1] as string);
		expect(loggedData).toHaveLength(2);
		expect(loggedData[0]?.taskId).toBe("1.1.1");
		expect(loggedData[1]?.taskId).toBe("1.1.0");
	});

	it("should display notes when provided", async () => {
		const notes = "Important context about this task";
		await handoffCommand({ taskId: "1.1.0", to: "Frank", notes });

		expect(output.printColoredLine).toHaveBeenCalledWith(
			"Handoff Notes:",
			expect.anything(),
		);
		expect(output.printLine).toHaveBeenCalledWith(`  ${notes}`);
	});

	it("should always print AI warning at the end", async () => {
		await handoffCommand({ taskId: "1.1.0", to: "Grace" });

		expect(output.printAIWarning).toHaveBeenCalled();
	});
});
