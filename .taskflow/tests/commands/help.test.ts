import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { helpCommand } from "../../src/commands/help";

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
	printCommandResult: vi.fn((...args) => console.log(...args)),
	printOutputSection: vi.fn((...args) => console.log(...args)),
	printNextStepsSection: vi.fn((...args) => console.log(...args)),
	printAIWarning: vi.fn((...args) => console.log(...args)),
	printDivider: vi.fn((...args) => console.log(...args)),
	printSubheader: vi.fn((...args) => console.log(...args)),
	printKeyValue: vi.fn((...args) => console.log(...args)),
	printColoredLine: vi.fn((msg) => console.log(msg)),
	printEmptyLine: vi.fn((...args) => console.log(...args)),
	printLine: vi.fn((...args) => console.log(...args)),
	printSection: vi.fn((...args) => console.log(...args)),
	printHeader: vi.fn((...args) => console.log(...args)),
	printSuccess: vi.fn((...args) => console.log(...args)),
	printError: vi.fn((...args) => console.log(...args)),
	printWarning: vi.fn((...args) => console.log(...args)),
	printInfo: vi.fn((...args) => console.log(...args)),
	printMuted: vi.fn((...args) => console.log(...args)),
	printCommand: vi.fn((...args) => console.log(...args)),
	printTaskStarted: vi.fn((...args) => console.log(...args)),
	printTaskCompleted: vi.fn((...args) => console.log(...args)),
	printCurrentState: vi.fn((...args) => console.log(...args)),
	printNextStep: vi.fn((...args) => console.log(...args)),
	printNextSteps: vi.fn((...args) => console.log(...args)),
	printAction: vi.fn((...args) => console.log(...args)),
	printSetupInstructions: vi.fn((...args) => console.log(...args)),
	printVerifyInstructions: vi.fn((...args) => console.log(...args)),
	printValidateInstructions: vi.fn((...args) => console.log(...args)),
	printCommitInstructions: vi.fn((...args) => console.log(...args)),
	printPreHookFailure: vi.fn((...args) => console.log(...args)),
	SINGLE_LINE: "─".repeat(70),
	LINE_WIDTH: 70,
	DOUBLE_LINE: "═".repeat(70),
}));

describe("helpCommand", () => {
	let consoleSpy: ReturnType<typeof vi.spyOn>;

	beforeEach(() => {
		consoleSpy = vi.spyOn(console, "log").mockImplementation(() => {});
	});

	afterEach(() => {
		consoleSpy.mockRestore();
	});

	it("should display CLI title", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("TASK MANAGER CLI"),
		);
	});

	it("should display workflow commands section", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("WORKFLOW COMMANDS"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("pnpm task start"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("pnpm task do"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("pnpm task check"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("pnpm task commit"),
		);
	});

	it("should display navigation commands section", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("NAVIGATION COMMANDS"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("pnpm task status"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("pnpm task next"),
		);
	});

	it("should display recovery commands section", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("RECOVERY COMMANDS"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("pnpm task resume"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("pnpm task skip"),
		);
	});

	it("should display retrospective commands section", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("RETROSPECTIVE"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("pnpm task retro add"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("pnpm task retro list"),
		);
	});

	it("should display workflow states section", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("WORKFLOW STATES"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("SETUP"));
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("IMPLEMENTING"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("VERIFYING"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("VALIDATING"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("COMMITTING"),
		);
	});

	it("should display examples section", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("TYPICAL WORKFLOW"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("pnpm task start 1.1.1"),
		);
	});

	it("should display constraints section", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("CRITICAL RULES FOR AI AGENTS"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("NEVER read or modify"),
		);
		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("ALWAYS use pnpm task"),
		);
	});

	it("should describe start command", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("Start a new task session"),
		);
	});

	it("should describe do command", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("context-aware instructions"),
		);
	});

	it("should describe check command", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("validations"),
		);
	});

	it("should describe commit command", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("Commit and push"),
		);
	});

	it("should describe status command", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("project overview"),
		);
	});

	it("should describe next command", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("next available task"),
		);
	});

	it("should describe resume command", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("Resume an interrupted session"),
		);
	});

	it("should describe skip command", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("Mark a task as blocked"),
		);
	});

	it("should describe retro add command", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("Add a new error pattern"),
		);
	});

	it("should describe retro list command", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("List all known error patterns"),
		);
	});

	it("should mention mandatory retrospective updates", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining("MANDATORY"),
		);
	});

	it("should mention .taskflow directory constraint", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(
			expect.stringContaining(".taskflow"),
		);
	});

	it("should mention tasks directory constraint", async () => {
		await helpCommand();

		expect(consoleSpy).toHaveBeenCalledWith(expect.stringContaining("tasks"));
	});
});
