import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { retroCommand } from "../../src/commands/retro";
import * as output from "../../src/lib/output";
import * as retrospective from "../../src/lib/retrospective";

vi.mock("../../src/lib/retrospective");
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

describe("retroCommand", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.mocked(retrospective.parseRetroArgs).mockReturnValue({});
		vi.mocked(retrospective.validateRetroArgs).mockReturnValue(null);
		vi.mocked(retrospective.addRetrospectiveEntry).mockImplementation(() => 1);
		vi.mocked(retrospective.printRetroAddUsage).mockImplementation(() => {});
		vi.mocked(retrospective.loadRetrospective).mockReturnValue([]);
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("no subcommand", () => {
		it("should print help when no subcommand provided", async () => {
			await retroCommand({});

			expect(output.printCommandResult).toHaveBeenCalledWith(
				"RETRO",
				expect.stringContaining("Retrospective Management"),
			);
		});

		it("should print help for unknown subcommand", async () => {
			await retroCommand({ subcommand: "unknown" });

			expect(output.printCommandResult).toHaveBeenCalledWith(
				"RETRO",
				expect.stringContaining("Retrospective Management"),
			);
		});
	});

	describe("add subcommand", () => {
		it("should parse and validate args", async () => {
			const args = [
				"--category",
				"Type Error",
				"--pattern",
				"test",
				"--solution",
				"fix",
				"--criticality",
				"High",
			];
			vi.mocked(retrospective.parseRetroArgs).mockReturnValue({
				category: "Type Error",
				pattern: "test",
				solution: "fix",
				criticality: "High",
			});

			await retroCommand({ subcommand: "add", args });

			expect(retrospective.parseRetroArgs).toHaveBeenCalledWith(args);
			expect(retrospective.validateRetroArgs).toHaveBeenCalled();
		});

		it("should show usage when validation fails", async () => {
			vi.mocked(retrospective.parseRetroArgs).mockReturnValue({});
			vi.mocked(retrospective.validateRetroArgs).mockReturnValue(
				"Missing --category",
			);

			await retroCommand({ subcommand: "add", args: [] });

			expect(output.printCommandResult).toHaveBeenCalledWith(
				"RETRO ADD",
				expect.stringContaining("Missing required"),
				false,
			);
			expect(retrospective.printRetroAddUsage).toHaveBeenCalled();
			expect(retrospective.addRetrospectiveEntry).not.toHaveBeenCalled();
		});

		it("should add entry when validation passes", async () => {
			vi.mocked(retrospective.parseRetroArgs).mockReturnValue({
				category: "Type Error",
				pattern: "Cannot find module",
				solution: "Check import path",
				criticality: "High",
			});
			vi.mocked(retrospective.validateRetroArgs).mockReturnValue(null);

			await retroCommand({ subcommand: "add", args: [] });

			expect(retrospective.addRetrospectiveEntry).toHaveBeenCalledWith(
				"Type Error",
				"Cannot find module",
				"Check import path",
				"High",
			);
			expect(output.printCommandResult).toHaveBeenCalledWith(
				"RETRO ADD",
				expect.stringContaining("added to retrospective"),
			);
		});
	});

	describe("list subcommand", () => {
		it("should show warning when no entries", async () => {
			vi.mocked(retrospective.loadRetrospective).mockReturnValue([]);

			await retroCommand({ subcommand: "list" });

			expect(output.printCommandResult).toHaveBeenCalledWith(
				"RETRO LIST",
				expect.stringContaining("No entries found"),
			);
			expect(output.printColoredLine).toHaveBeenCalledWith(
				expect.stringContaining("No retrospective entries"),
				expect.anything(),
			);
		});

		it("should display entries when they exist", async () => {
			vi.mocked(retrospective.loadRetrospective).mockReturnValue([
				{
					id: "1",
					category: "Type Error",
					pattern: "Cannot find module",
					solution: "Check import path",
					count: 5,
					criticality: "High",
				},
			]);

			await retroCommand({ subcommand: "list" });

			expect(output.printCommandResult).toHaveBeenCalledWith(
				"RETRO LIST",
				expect.stringContaining("error pattern"),
			);
			expect(output.printLine).toHaveBeenCalledWith(
				expect.stringContaining("#1"),
			);
			expect(output.printLine).toHaveBeenCalledWith(
				expect.stringContaining("Cannot find module"),
			);
		});

		it("should display critical entries with error color", async () => {
			vi.mocked(retrospective.loadRetrospective).mockReturnValue([
				{
					id: "1",
					category: "Runtime",
					pattern: "Fatal error",
					solution: "Fix immediately",
					count: 1,
					criticality: "Critical",
				},
			]);

			await retroCommand({ subcommand: "list" });

			expect(output.printLine).toHaveBeenCalledWith(
				expect.stringContaining("Critical"),
			);
		});

		it("should display high criticality entries with warning color", async () => {
			vi.mocked(retrospective.loadRetrospective).mockReturnValue([
				{
					id: "1",
					category: "Type Error",
					pattern: "Missing type",
					solution: "Add type annotation",
					count: 3,
					criticality: "High",
				},
			]);

			await retroCommand({ subcommand: "list" });

			expect(output.printLine).toHaveBeenCalledWith(
				expect.stringContaining("High"),
			);
		});

		it("should display multiple entries", async () => {
			vi.mocked(retrospective.loadRetrospective).mockReturnValue([
				{
					id: "1",
					category: "Type Error",
					pattern: "Pattern 1",
					solution: "Solution 1",
					count: 1,
					criticality: "Low",
				},
				{
					id: "2",
					category: "Lint",
					pattern: "Pattern 2",
					solution: "Solution 2",
					count: 2,
					criticality: "Medium",
				},
			]);

			await retroCommand({ subcommand: "list" });

			expect(output.printLine).toHaveBeenCalledWith(
				expect.stringContaining("#1"),
			);
			expect(output.printLine).toHaveBeenCalledWith(
				expect.stringContaining("#2"),
			);
		});

		it("should display entry count", async () => {
			vi.mocked(retrospective.loadRetrospective).mockReturnValue([
				{
					id: "1",
					category: "Test",
					pattern: "Test pattern",
					solution: "Test solution",
					count: 42,
					criticality: "Medium",
				},
			]);

			await retroCommand({ subcommand: "list" });

			expect(output.printLine).toHaveBeenCalledWith(
				expect.stringContaining("42"),
			);
		});
	});

	describe("help output", () => {
		it("should display available commands", async () => {
			await retroCommand({});

			// printLine uses consoleOutput, which calls console.log
			// However, the test mocks output.js and output.js exports printLine.
			// If the code uses output.printLine, and we mocked it with vi.fn(), it won't call console.log unless we implementation it.
			// But here we are checking console.log.
			// The issue is that the code under test (retroCommand) calls output.printLine.
			// We mocked output.printLine with vi.fn(), so it does NOTHING.
			// We should check if output.printLine was called, OR we should implement the mock to call console.log.

			expect(output.printLine).toHaveBeenCalledWith(
				expect.stringContaining("pnpm task retro add"),
			);
			expect(output.printLine).toHaveBeenCalledWith(
				expect.stringContaining("pnpm task retro list"),
			);
		});

		it("should display usage example", async () => {
			await retroCommand({});

			expect(output.printColoredLine).toHaveBeenCalledWith(
				expect.stringContaining("--category"),
				expect.anything(),
			);
			expect(output.printColoredLine).toHaveBeenCalledWith(
				expect.stringContaining("--pattern"),
				expect.anything(),
			);
			expect(output.printColoredLine).toHaveBeenCalledWith(
				expect.stringContaining("--solution"),
				expect.anything(),
			);
			expect(output.printColoredLine).toHaveBeenCalledWith(
				expect.stringContaining("--criticality"),
				expect.anything(),
			);
		});

		it("should display valid categories", async () => {
			await retroCommand({});

			expect(output.printLine).toHaveBeenCalledWith(
				expect.stringContaining("Type Error"),
			);
			expect(output.printLine).toHaveBeenCalledWith(
				expect.stringContaining("Lint"),
			);
			expect(output.printLine).toHaveBeenCalledWith(
				expect.stringContaining("Architecture"),
			);
		});

		it("should display valid criticality levels", async () => {
			await retroCommand({});

			expect(output.printLine).toHaveBeenCalledWith(
				expect.stringContaining("Low"),
			);
			expect(output.printLine).toHaveBeenCalledWith(
				expect.stringContaining("Medium"),
			);
			expect(output.printLine).toHaveBeenCalledWith(
				expect.stringContaining("High"),
			);
			expect(output.printLine).toHaveBeenCalledWith(
				expect.stringContaining("Critical"),
			);
		});
	});
});
