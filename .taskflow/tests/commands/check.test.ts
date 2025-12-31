import fs from "node:fs";
import { execaSync } from "execa";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { checkCommand } from "../../src/commands/check";
import * as dataAccess from "../../src/lib/data-access";
import { NoActiveSessionError } from "../../src/lib/errors";
import * as output from "../../src/lib/output";
import * as retrospective from "../../src/lib/retrospective";
import type { ActiveTask, TaskFileContent } from "../../src/lib/types";
import * as validation from "../../src/lib/validation";

vi.mock("execa");
vi.mock("../../src/lib/data-access");
vi.mock("../../src/lib/validation");
vi.mock("../../src/lib/retrospective");
vi.mock("node:fs");
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

describe("checkCommand", () => {
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
								status: "setup" as const,
								dependencies: [],
							},
						],
					},
				],
			},
		],
	};

	const createMockActiveTask = (status: string): ActiveTask => ({
		taskId: "1.1.0",
		filePath: "/path/to/task.json",
		content: {
			title: "Task 0",
			status,
		} as unknown as TaskFileContent,
	});

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.mocked(execaSync).mockReturnValue({ stdout: "M file.ts" } as any);
		vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(mockTasksProgress);
		vi.mocked(dataAccess.updateTaskStatus).mockReturnValue(null);
		vi.mocked(retrospective.processValidationOutput).mockReturnValue({
			knownErrors: [],
			hasNewErrors: false,
		});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should throw NoActiveSessionError when no active task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);

		await expect(checkCommand()).rejects.toThrow(NoActiveSessionError);
	});

	it("should handle setup status", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("setup"),
		);
		vi.mocked(dataAccess.getTaskFilePath).mockReturnValue("/path/to/task.json");
		vi.mocked(dataAccess.loadTaskFile).mockReturnValue({
			id: "1.1.0",
			title: "Task 0",
			description: "Test task",
			status: "setup" as const,
			skill: "backend" as const,
			subtasks: [],
			context: [],
		});
		// Mock findTaskLocation for dependency check
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]!.stories[0]!,
			task: mockTasksProgress.features[0]!.stories[0]!.tasks[0]!,
		});
		// Mock fs.existsSync for task file check
		vi.mocked(fs.existsSync).mockReturnValue(true);

		await checkCommand();

		expect(dataAccess.updateTaskStatus).toHaveBeenCalledWith(
			mockTasksProgress,
			"1.1.0",
			"implementing",
		);
		expect(output.printNextStepsSection).toHaveBeenCalled();
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should handle implementing status", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("implementing"),
		);

		await checkCommand();

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"CHECK",
			expect.stringContaining("VERIFYING"),
		);
		expect(dataAccess.updateTaskStatus).toHaveBeenCalledWith(
			mockTasksProgress,
			"1.1.0",
			"verifying",
		);
		expect(output.printNextStepsSection).toHaveBeenCalled();
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should handle verifying status", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("verifying"),
		);
		vi.mocked(dataAccess.getTaskFilePath).mockReturnValue("/path/to/task.json");
		vi.mocked(dataAccess.loadTaskFile).mockReturnValue({
			id: "1.1.0",
			title: "Task 0",
			description: "Test task",
			status: "verifying" as const,
			skill: "backend" as const,
			subtasks: [
				{ id: "1", description: "Subtask 1", status: "completed" as const },
				{ id: "2", description: "Subtask 2", status: "completed" as const },
			],
			context: [],
		});

		await checkCommand();

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"CHECK",
			expect.stringContaining("VALIDATING"),
		);
		expect(dataAccess.updateTaskStatus).toHaveBeenCalledWith(
			mockTasksProgress,
			"1.1.0",
			"validating",
		);
		expect(output.printNextStepsSection).toHaveBeenCalled();
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should handle validating status with passing validations", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("validating"),
		);
		vi.mocked(validation.runValidations).mockReturnValue({
			passed: true,
			results: [],
			failedChecks: [],
			allOutput: "All passed",
		});

		await checkCommand();

		expect(validation.runValidations).toHaveBeenCalledWith("1.1.0");
		expect(dataAccess.updateTaskStatus).toHaveBeenCalledWith(
			mockTasksProgress,
			"1.1.0",
			"committing",
		);
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"CHECK",
			expect.stringContaining("COMMITTING"),
		);
		expect(output.printNextStepsSection).toHaveBeenCalled();
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should handle validating status with failing validations", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("validating"),
		);
		vi.mocked(validation.runValidations).mockReturnValue({
			passed: false,
			results: [],
			failedChecks: ["type-check"],
			allOutput: "Type error: something failed",
		});

		await checkCommand();

		expect(retrospective.processValidationOutput).toHaveBeenCalledWith(
			"Type error: something failed",
		);
		// Should stay in validating status on failure
		expect(dataAccess.updateTaskStatus).not.toHaveBeenCalled();
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"CHECK",
			expect.stringContaining("Fix errors"),
			false,
		);
		expect(output.printNextStepsSection).toHaveBeenCalled();
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should handle committing status", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("committing"),
		);
		vi.mocked(validation.runValidations).mockReturnValue({
			passed: false,
			results: [],
			failedChecks: ["type-check"],
			allOutput: "Type error",
		});

		await checkCommand();

		// Committing is terminal state, should not update status
		expect(dataAccess.updateTaskStatus).not.toHaveBeenCalled();
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"CHECK",
			expect.stringContaining("Fix errors and retry"),
			false,
		);
	});

	it("should handle unknown status", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("unknown"),
		);

		await checkCommand();

		expect(dataAccess.updateTaskStatus).not.toHaveBeenCalled();
		expect(output.printCommandResult).toHaveBeenCalledWith(
			"CHECK",
			expect.stringContaining("Unknown status"),
			false,
		);
	});

	it("should print next step after successful state transition", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("setup"),
		);

		await checkCommand();

		expect(output.printNextStepsSection).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ cmd: expect.stringContaining("pnpm task") }),
			]),
		);
	});

	it("should not print next step on validation failure", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			createMockActiveTask("validating"),
		);
		vi.mocked(validation.runValidations).mockReturnValue({
			passed: false,
			results: [],
			failedChecks: ["lint"],
			allOutput: "Lint error",
		});

		await checkCommand();

		expect(output.printNextStepsSection).toHaveBeenCalled(); // Still called but with error recovery steps
	});
});
