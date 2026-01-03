import fs from "node:fs";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { PrdGenerateArchCommand } from "@/commands/prd/generate-arch";

// Hoist mocks - create mock functions that can be accessed in tests
const mocks = vi.hoisted(() => {
	const configLoaderMocks = {
		getPaths: vi.fn().mockReturnValue({
			tasksDir: "/test/root/tasks",
			refDir: "/test/root/.taskflow/ref",
		}),
		load: vi.fn().mockReturnValue({}),
		exists: vi.fn().mockReturnValue(true),
	};

	const detectorMocks = {
		detect: vi.fn().mockResolvedValue({
			languages: [],
			frameworks: [],
			databases: [],
			infrastructure: [],
		}),
		isGreenfield: vi.fn().mockReturnValue(true),
	};

	const suggesterMocks = {
		suggest: vi.fn().mockResolvedValue([
			{
				id: "test-stack",
				name: "Test Stack",
				description: "Test Description",
				technologies: {
					frontend: [{ name: "React" }],
					backend: [{ name: "Node.js" }],
				},
				pros: [],
				cons: [],
				bestFor: [],
				recommended: true,
			},
		]),
		suggestOptions: vi.fn().mockResolvedValue([]),
	};

	const generatorMocks = {
		generate: vi.fn().mockResolvedValue({ generated: true }),
	};

	// Mock classes that use the mock functions
	class MockConfigLoader {
		getPaths() {
			return configLoaderMocks.getPaths();
		}
		load() {
			return configLoaderMocks.load();
		}
		exists() {
			return configLoaderMocks.exists();
		}
	}

	class MockTechStackDetector {
		detect(...args: any[]) {
			return detectorMocks.detect(...args);
		}
		isGreenfield() {
			return detectorMocks.isGreenfield();
		}
		formatStack() {
			return [];
		}
	}

	class MockTechStackSuggester {
		suggest(...args: any[]) {
			return suggesterMocks.suggest(...args);
		}
		suggestOptions(...args: any[]) {
			return suggesterMocks.suggestOptions(...args);
		}
	}

	class MockTechStackGenerator {
		generate(...args: any[]) {
			return generatorMocks.generate(...args);
		}
	}

	return {
		MockConfigLoader,
		MockTechStackDetector,
		MockTechStackSuggester,
		MockTechStackGenerator,
		configLoader: configLoaderMocks,
		detector: detectorMocks,
		suggester: suggesterMocks,
		generator: generatorMocks,
	};
});

// Mock dependencies
vi.mock("node:fs");

vi.mock("@/lib/config-loader", () => ({
	ConfigLoader: mocks.MockConfigLoader as any,
}));

vi.mock("@/lib/analysis/tech-stack-detector.js", () => ({
	TechStackDetector: mocks.MockTechStackDetector as any,
}));

vi.mock("@/lib/analysis/tech-stack-suggester", () => ({
	TechStackSuggester: mocks.MockTechStackSuggester as any,
}));

vi.mock("@/lib/input/index", () => ({
	InteractiveSelect: {
		single: vi.fn().mockResolvedValue(0),
	},
}));

vi.mock("@/lib/tech-stack-generator", () => ({
	TechStackGenerator: mocks.MockTechStackGenerator as any,
}));

describe("PrdGenerateArchCommand", () => {
	let command: PrdGenerateArchCommand;
	let mockContext: any;

	beforeEach(() => {
		// Reset mocks (but not fs - we'll set those up again)
		mocks.configLoader.getPaths.mockReturnValue({
			tasksDir: "/test/root/tasks",
			refDir: "/test/root/.taskflow/ref",
		});
		mocks.detector.detect.mockResolvedValue({
			languages: [],
			frameworks: [],
			databases: [],
			infrastructure: [],
		});
		mocks.suggester.suggestOptions.mockResolvedValue([]);

		// Mock Context
		mockContext = {
			projectRoot: "/test/root",
			mcpContext: {
				isMCP: false,
				detectionMethod: "none",
			},
			llmProvider: {
				generate: vi.fn(),
				generateStream: vi.fn().mockImplementation(async function* () {
					yield "chunk1";
					yield "chunk2";
					return {
						model: "mock-model",
						promptTokens: 10,
						completionTokens: 20,
						tokensUsed: 30,
					};
				}),
				isConfigured: vi.fn().mockReturnValue(true),
			},
		};

		// Mock fs methods
		const existsSyncSpy = vi.spyOn(fs, "existsSync");
		existsSyncSpy.mockImplementation((path: any) => {
			const pathStr = path.toString();
			if (pathStr.includes("coding-standards.md")) return false;
			if (pathStr.includes("architecture-rules.md")) return false;
			if (pathStr.includes("tech-stack.md")) return false;
			return true;
		});
		vi.spyOn(fs, "readFileSync").mockImplementation((path: any) => {
			const pathStr = path.toString();
			// Return valid JSON for config files
			if (pathStr.includes("taskflow.config.json")) {
				return JSON.stringify({
					project: { name: "test", root: "." },
					branching: { strategy: "per-story", base: "main", prefix: "story/" },
					ai: { models: {} },
				});
			}
			// Return mock content for other files
			return "mock content" as any;
		});
		vi.spyOn(fs, "writeFileSync").mockImplementation(() => {});
		vi.spyOn(fs, "readdirSync").mockReturnValue(["test.md"] as any);

		// Spy on console.log
		vi.spyOn(console, "log").mockImplementation(() => {});
		vi.spyOn(console, "warn").mockImplementation(() => {});

		command = new PrdGenerateArchCommand(mockContext);
		// Inject mock LLM provider manually since BaseCommand initializes it from config
		(command as any).llmProvider = mockContext.llmProvider;
		(command as any).llmCache = { get: () => null, set: () => {} };
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should log info message when no existing tech stack is detected (Greenfield)", async () => {
		// Setup mock to return empty stack
		mocks.detector.detect.mockResolvedValue({
			languages: [],
			frameworks: [],
			databases: [],
			infrastructure: [],
		});

		// Mock confirmation to proceed
		vi.spyOn(command as any, "confirm").mockResolvedValue(true);

		// Mock generateStandardsWithLLM to avoid complexity
		vi.spyOn(command as any, "generateStandardsWithLLM").mockResolvedValue({
			success: true,
			message: "Success",
		});

		// Run execute
		await command.execute("test-prd.md");

		// Check if correct header was logged
		expect(console.log).toHaveBeenCalledWith(
			expect.stringContaining("EXISTING TECH STACK"),
		);
		expect(console.log).toHaveBeenCalledWith(
			expect.stringContaining(
				"No existing tech stack detected (Greenfield project).",
			),
		);
	});

	it("should use 8192 maxTokens for LLM generation", async () => {
		// We want to test that the options passed to generateStream have maxTokens: 8192

		// Mock generateStream on the command instance (or context)
		const generateStreamSpy = vi.spyOn(command as any, "generateStream");

		// We need to bypass confirm and other steps
		vi.spyOn(command as any, "confirm").mockResolvedValue(true);

		await command.execute("test-prd.md");

		// Check the calls to generateStream
		expect(generateStreamSpy).toHaveBeenCalledTimes(3);

		const firstCallArgs = generateStreamSpy.mock.calls[0];
		const secondCallArgs = generateStreamSpy.mock.calls[1];
		const thirdCallArgs = generateStreamSpy.mock.calls[2];

		if (!firstCallArgs || !secondCallArgs || !thirdCallArgs) {
			throw new Error("Expected 3 calls to generateStream");
		}

		// args[1] is options
		expect((firstCallArgs[1] as any).maxTokens).toBe(8192);
		expect((secondCallArgs[1] as any).maxTokens).toBe(8192);
		expect((thirdCallArgs[1] as any).maxTokens).toBe(8192);
	});
});
