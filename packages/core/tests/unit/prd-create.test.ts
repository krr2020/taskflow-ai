import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrdCreateCommand } from "../../src/commands/prd/create.js";
import { ConfigLoader } from "../../src/lib/config-loader.js";

vi.mock("node:fs");
vi.mock("node:path");
vi.mock("../../src/lib/config-loader.js");
vi.mock("../../src/lib/prd-interactive-session.js", () => ({
	PRDInteractiveSession: class {
		start(featureName: string) {
			return Promise.resolve({
				featureName: featureName || "Test Feature",
				title: "Test Feature",
				summary: "Test Summary",
			});
		}
	},
}));

describe("PrdCreateCommand", () => {
	let command: PrdCreateCommand;
	const mockContext = {
		projectRoot: "/test/root",
		config: { project: { name: "test" } },
		mcpContext: { isMCP: true },
	};

	beforeEach(() => {
		vi.resetAllMocks();

		// Mock ConfigLoader
		vi.mocked(ConfigLoader).mockImplementation(function (this: any) {
			return {
				getPaths: () => ({
					tasksDir: "/test/root/.taskflow",
					prdsDir: "/test/root/.taskflow/prds",
				}),
				load: () => ({ project: { name: "test" } }),
			} as any;
		});

		command = new PrdCreateCommand(mockContext as any);

		// Mock path methods
		vi.mocked(path.join).mockImplementation((...args) => args.join("/"));
		vi.mocked(path.resolve).mockImplementation((...args) => args.join("/"));
		vi.mocked(path.dirname).mockImplementation(
			(p) => p.split("/").slice(0, -1).join("/") || "/",
		);
		(path as any).sep = "/";

		// Mock fs methods
		vi.mocked(fs.existsSync).mockReturnValue(false);
		vi.mocked(fs.writeFileSync).mockImplementation(() => {});
	});

	it("should create a PRD file with template content", async () => {
		// Mock interactive info
		// The mock class above handles this

		// Execute
		const result = await command.execute(
			"my-feature",
			undefined,
			undefined,
			true,
		);

		expect(result.success).toBe(true);
		expect(fs.writeFileSync).toHaveBeenCalled();

		const callArgs = vi.mocked(fs.writeFileSync).mock.calls[0];
		expect(callArgs![0]).toContain("my-feature");
		expect(callArgs![1]).toContain("# PRD: Test Feature");
		expect(callArgs![1]).toContain("Test Summary");
	});

	it("should fail if PRD file already exists", async () => {
		vi.mocked(fs.existsSync).mockReturnValue(true);

		const result = await command.execute("my-feature");

		expect(result.success).toBe(false);
		expect(result.output).toContain("PRD file already exists");
	});

	it("should include minimum 5 questions and reasoning requirement in system prompt", async () => {
		// Mock LLM Provider
		const mockGenerate = vi.fn().mockResolvedValue({
			content: "NO_QUESTIONS_NEEDED",
			usage: { promptTokens: 0, completionTokens: 0, totalTokens: 0 },
		});

		const mockLLMProvider = {
			generate: mockGenerate,
			isConfigured: vi.fn().mockReturnValue(true),
		};

		// Mock Context Manager
		const mockContextManager = {
			buildContext: vi.fn().mockReturnValue({ summary: "context summary" }),
		};

		// Set mocks on command
		(command as any).llmProvider = mockLLMProvider;
		(command as any).contextManager = mockContextManager;

		// Execute
		await command.execute("my-feature", undefined, undefined, true);

		// Verify generate was called
		expect(mockGenerate).toHaveBeenCalled();

		// Check the system prompt (first call, first arg is messages array, first message is system)
		const calls = mockGenerate.mock.calls;
		expect(calls[0]).toBeDefined();
		const messages = calls[0]![0];
		const systemMessage = messages.find((m: any) => m.role === "system");

		expect(systemMessage).toBeDefined();
		expect(systemMessage?.content).toContain(
			"Your goal is to ask at least 5 clarifying questions",
		);
		expect(systemMessage?.content).toContain(
			"provide recommended options with a short reason",
		);
	});
});
