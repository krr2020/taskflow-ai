import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { doCommand } from "../../src/commands/do";
import * as dataAccess from "../../src/lib/data-access";
import { NoActiveSessionError } from "../../src/lib/errors";
import * as output from "../../src/lib/output";
import type {
	ActiveTask,
	TaskFileContent,
	TasksProgress,
} from "../../src/lib/types";

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
	printReferenceContent: vi.fn(),
	printTaskDetails: vi.fn(),
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
vi.mock("../../src/lib/config", () => ({
	getRefFilePath: vi.fn().mockReturnValue("/path/to/ref"),
	getSkillFilePath: vi.fn().mockReturnValue("/path/to/skill"),
	REF_FILES: {
		aiProtocol: "AI-PROTOCOL.md",
		architectureRules: "ARCHITECTURE-RULES.md",
		codingStandards: "CODING-STANDARDS.md",
		retrospective: "RETROSPECTIVE.md",
	},
}));

describe("doCommand", () => {
	const mockTasksProgress: TasksProgress = {
		project: "Test",
		features: [
			{
				id: "1",
				title: "Feature 1",
				status: "in-progress",
				stories: [
					{
						id: "1.1",
						title: "Story 1.1",
						status: "in-progress",
						tasks: [
							{
								id: "1.1.0",
								title: "Task 0",
								status: "setup",
								dependencies: [],
							},
						],
					},
				],
			},
		],
	};

	const mockActiveTask: ActiveTask = {
		taskId: "1.1.0",
		filePath: "/path/to/task.json",
		content: {
			title: "Task 0",
			status: "setup",
			skill: "backend",
			description: "Test description",
			subtasks: [],
			context: [],
		} as unknown as TaskFileContent,
	};

	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.mocked(dataAccess.loadTasksProgress).mockReturnValue(mockTasksProgress);
		vi.mocked(dataAccess.loadReferenceFile).mockReturnValue(
			"Reference content",
		);
		vi.mocked(output.printReferenceContent).mockImplementation(() => {});
		vi.mocked(output.printTaskDetails).mockImplementation(() => {});
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should throw NoActiveSessionError when no active task", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(null);

		await expect(doCommand()).rejects.toThrow(NoActiveSessionError);
	});

	it("should throw NoActiveSessionError when task location not found", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(mockActiveTask);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue(null);

		await expect(doCommand()).rejects.toThrow(NoActiveSessionError);
	});

	it("should handle setup status", async () => {
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(mockActiveTask);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]!.stories[0]!,
			task: mockTasksProgress.features[0]!.stories[0]!.tasks[0]!,
		});

		await doCommand();

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"DO",
			expect.stringContaining("SETUP"),
		);
		expect(output.printOutputSection).toHaveBeenCalled();
		expect(output.printKeyValue).toHaveBeenCalledWith(
			"Task ID",
			expect.anything(),
		);
		expect(output.printKeyValue).toHaveBeenCalledWith(
			"Status",
			expect.anything(),
		);
		expect(output.printReferenceContent).toHaveBeenCalled();
		expect(output.printTaskDetails).toHaveBeenCalled();
		expect(output.printNextStepsSection).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					cmd: expect.stringContaining("pnpm task check"),
				}),
			]),
		);
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should handle implementing status", async () => {
		const taskInImplement: ActiveTask = {
			...mockActiveTask,
			content: {
				...mockActiveTask.content,
				status: "implementing",
			} as unknown as TaskFileContent,
		};
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(taskInImplement);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]!.stories[0]!,
			task: mockTasksProgress.features[0]!.stories[0]!.tasks[0]!,
		});

		await doCommand();

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"DO",
			expect.stringContaining("IMPLEMENTING"),
		);
		expect(output.printTaskDetails).toHaveBeenCalled();
		expect(output.printNextStepsSection).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					cmd: expect.stringContaining("pnpm task check"),
				}),
			]),
		);
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should handle verifying status", async () => {
		const taskInVerify: ActiveTask = {
			...mockActiveTask,
			content: {
				...mockActiveTask.content,
				status: "verifying",
			} as unknown as TaskFileContent,
		};
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(taskInVerify);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]!.stories[0]!,
			task: mockTasksProgress.features[0]!.stories[0]!.tasks[0]!,
		});

		await doCommand();

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"DO",
			expect.stringContaining("VERIFYING"),
		);
		expect(output.printSubheader).toHaveBeenCalled();
		expect(output.printNextStepsSection).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					cmd: expect.stringContaining("pnpm task check"),
				}),
			]),
		);
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should handle validating status", async () => {
		const taskInValidate: ActiveTask = {
			...mockActiveTask,
			content: {
				...mockActiveTask.content,
				status: "validating",
			} as unknown as TaskFileContent,
		};
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(taskInValidate);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]!.stories[0]!,
			task: mockTasksProgress.features[0]!.stories[0]!.tasks[0]!,
		});

		await doCommand();

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"DO",
			expect.stringContaining("VALIDATING"),
		);
		expect(output.printNextStepsSection).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({ cmd: "pnpm task check" }),
			]),
		);
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should handle committing status", async () => {
		const taskInCommit: ActiveTask = {
			...mockActiveTask,
			content: {
				...mockActiveTask.content,
				status: "committing",
			} as unknown as TaskFileContent,
		};
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(taskInCommit);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]!.stories[0]!,
			task: mockTasksProgress.features[0]!.stories[0]!.tasks[0]!,
		});

		await doCommand();

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"DO",
			expect.stringContaining("COMMITTING"),
		);
		expect(output.printNextStepsSection).toHaveBeenCalledWith(
			expect.arrayContaining([
				expect.objectContaining({
					cmd: expect.stringContaining("pnpm task commit"),
				}),
			]),
		);
		expect(output.printAIWarning).toHaveBeenCalled();
	});

	it("should handle unknown status", async () => {
		const taskUnknown: ActiveTask = {
			...mockActiveTask,
			content: {
				...mockActiveTask.content,
				status: "unknown",
			} as unknown as TaskFileContent,
		};
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(taskUnknown);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0]!,
			story: mockTasksProgress.features[0]!.stories[0]!,
			task: mockTasksProgress.features[0]!.stories[0]!.tasks[0]!,
		});

		await doCommand();

		expect(output.printCommandResult).toHaveBeenCalledWith(
			"DO",
			expect.stringContaining("Unknown status"),
			false,
		);
	});

	it("should handle implementing status when reference files are missing", async () => {
		const taskInImplement = {
			...mockActiveTask,
			content: { ...mockActiveTask.content, status: "implementing" },
		};
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(
			taskInImplement as any,
		);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0],
			story: mockTasksProgress.features[0]?.stories[0],
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0],
		} as any);
		vi.mocked(dataAccess.loadReferenceFile).mockReturnValue("");

		await doCommand();

		expect(output.printTaskDetails).toHaveBeenCalled();
		expect(output.printNextStepsSection).toHaveBeenCalled();
	});

	it("should use default skill when not specified", async () => {
		const taskNoSkill = {
			...mockActiveTask,
			content: {
				...mockActiveTask.content,
				status: "implementing",
				skill: undefined,
			},
		};
		vi.mocked(dataAccess.findActiveTask).mockReturnValue(taskNoSkill as any);
		vi.mocked(dataAccess.findTaskLocation).mockReturnValue({
			feature: mockTasksProgress.features[0],
			story: mockTasksProgress.features[0]?.stories[0],
			task: mockTasksProgress.features[0]?.stories[0]?.tasks[0],
		} as any);

		await doCommand();

		expect(output.printTaskDetails).toHaveBeenCalledWith(
			expect.any(String),
			expect.any(String),
			"backend", // default skill
			expect.anything(),
			expect.anything(),
			expect.anything(),
		);
	});
});
