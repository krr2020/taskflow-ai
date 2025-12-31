import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { findCommand } from "../../src/commands/find";
import * as dataAccess from "../../src/lib/data-access";
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
					],
				},
				{
					id: "1.2",
					title: "Story 2",
					status: "not-started" as const,
					tasks: [
						{
							id: "1.2.0",
							title: "Create Frontend Components",
							status: "blocked" as const,
							dependencies: [],
						},
					],
				},
			],
		},
		{
			id: "2",
			title: "Feature 2",
			status: "not-started" as const,
			stories: [
				{
					id: "2.1",
					title: "Story 3",
					status: "not-started" as const,
					tasks: [
						{
							id: "2.1.0",
							title: "Setup Database Migration",
							status: "not-started" as const,
							dependencies: [],
						},
					],
				},
			],
		},
	],
};

const mockTaskFiles: Record<string, any> = {
	"1.1.0": {
		title: "Setup Database Schema",
		skill: "backend",
		status: "completed",
	},
	"1.1.1": {
		title: "Create Auth Endpoints",
		skill: "backend",
		status: "implementing",
	},
	"1.1.2": {
		title: "Add Authentication Middleware",
		skill: "backend",
		status: "not-started",
	},
	"1.2.0": {
		title: "Create Frontend Components",
		skill: "frontend",
		status: "blocked",
	},
	"2.1.0": {
		title: "Setup Database Migration",
		skill: "database",
		status: "not-started",
	},
};

beforeEach(() => {
	vi.clearAllMocks();
	vi.spyOn(console, "log").mockImplementation(() => {});

	vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(mockTasksProgress);

	vi.mocked(dataAccess.getTaskFilePath).mockImplementation(
		(_, taskId: string) => {
			return `/path/to/${taskId}.json`;
		},
	);

	vi.mocked(dataAccess.loadTaskFile).mockImplementation((filePath: string) => {
		const taskId = filePath.match(/\/([^/]+)\.json$/)?.[1];
		return taskId ? mockTaskFiles[taskId] : null;
	});
});

afterEach(() => {
	vi.restoreAllMocks();
});

describe("findCommand", () => {
	it("should show error when no search criteria provided", async () => {
		await findCommand({});

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"FIND",
			"No search criteria provided",
			false,
		);
		expect(output.printColoredLine).toHaveBeenCalledWith(
			"You must specify at least one search criterion.",
			expect.anything(),
		);
	});

	it("should find tasks by status", async () => {
		await findCommand({ status: "not-started" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"FIND",
			"Found 2 task(s)",
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("[task]1.1.2[/task]"),
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("[task]2.1.0[/task]"),
		);
	});

	it("should find tasks by keyword (case-insensitive)", async () => {
		await findCommand({ keyword: "auth" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"FIND",
			"Found 2 task(s)",
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("Create Auth Endpoints"),
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("Add Authentication Middleware"),
		);
	});

	it("should find tasks by skill", async () => {
		await findCommand({ skill: "backend" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"FIND",
			"Found 3 task(s)",
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("[task]1.1.0[/task]"),
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("[task]1.1.1[/task]"),
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("[task]1.1.2[/task]"),
		);
	});

	it("should find tasks by story", async () => {
		await findCommand({ story: "1.1" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"FIND",
			"Found 3 task(s)",
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("[task]1.1.0[/task]"),
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("[task]1.1.1[/task]"),
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("[task]1.1.2[/task]"),
		);
	});

	it("should find tasks by feature", async () => {
		await findCommand({ feature: "2" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"FIND",
			"Found 1 task(s)",
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("[task]2.1.0[/task]"),
		);
	});

	it("should find tasks with multiple filters", async () => {
		await findCommand({ skill: "backend", status: "not-started" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"FIND",
			"Found 1 task(s)",
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("[task]1.1.2[/task]"),
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("Add Authentication Middleware"),
		);
	});

	it("should show no results when filters do not match", async () => {
		await findCommand({ skill: "backend", status: "blocked" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"FIND",
			"Found 0 task(s)",
		);
		expect(output.printColoredLine).toHaveBeenCalledWith(
			"No tasks match your criteria.",
			expect.anything(),
		);
	});

	it("should show story and feature details for each result", async () => {
		await findCommand({ status: "blocked" });

		expect(output.printLine).toHaveBeenCalledWith(
			"[task]1.2.0[/task] - Create Frontend Components",
		);
		expect(output.printLine).toHaveBeenCalledWith("  Story: 1.2 - Story 2");
		expect(output.printLine).toHaveBeenCalledWith("  Feature: 1 - Feature 1");
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("Status: [state]blocked[/state]"),
		);
	});

	it("should show active filters in output", async () => {
		await findCommand({ skill: "backend", status: "not-started" });

		expect(output.printColoredLine).toHaveBeenCalledWith(
			"Search Criteria:",
			expect.anything(),
		);
		expect(output.printKeyValue).toHaveBeenCalledWith(
			"  Skill",
			"[command]backend[/command]",
		);
		expect(output.printKeyValue).toHaveBeenCalledWith(
			"  Status",
			"[state]not-started[/state]",
		);
	});

	it("should always print AI warning at the end", async () => {
		await findCommand({ status: "completed" });

		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should display next steps for starting a task", async () => {
		await findCommand({ status: "not-started" });

		expect(output.printNextStepsSection).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ cmd: "pnpm task start <id>" }),
				expect.objectContaining({ cmd: "pnpm task status <id>" }),
			]),
		);
	});

	it('should find tasks by keyword "Database"', async () => {
		await findCommand({ keyword: "Database" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"FIND",
			"Found 2 task(s)",
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("Setup Database Schema"),
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("Setup Database Migration"),
		);
	});

	it("should handle frontend skill filter", async () => {
		await findCommand({ skill: "frontend" });

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"FIND",
			"Found 1 task(s)",
		);
		expect(output.printLine).toHaveBeenCalledWith(
			expect.stringContaining("Create Frontend Components"),
		);
	});
});
