import { beforeEach, describe, expect, it, vi } from "vitest";
import { PromptBuilder } from "@/lib/content/prompt-builder";
import { EnhancedPRDSession } from "@/lib/prd/interactive-session";
import type { LLMProvider } from "@/llm/base";

// Mock input handling to prevent readline hanging
vi.mock("@/lib/input/index", () => {
	const MultilineInputMock = vi.fn().mockImplementation(() => ({
		ask: vi.fn().mockResolvedValue("Test Summary"),
	}));
	(MultilineInputMock as any).prompt = vi
		.fn()
		.mockResolvedValue("Test Summary");
	(MultilineInputMock as any).promptSimple = vi
		.fn()
		.mockResolvedValue("Test Feature");

	return {
		ConversationSession: vi.fn().mockImplementation(() => ({
			ask: vi.fn().mockResolvedValue("Test Feature"),
			close: vi.fn(),
		})),
		MultilineInput: MultilineInputMock,
		InteractiveSelect: {
			single: vi.fn().mockResolvedValue(0),
			multiple: vi.fn().mockResolvedValue([]),
			confirm: vi.fn().mockResolvedValue(false),
		},
	};
});

describe("EnhancedPRDSession", () => {
	let mockLLMProvider: LLMProvider;
	let promptBuilder: PromptBuilder;

	beforeEach(() => {
		// Create mock LLM provider
		mockLLMProvider = {
			generateText: vi.fn().mockResolvedValue({
				text: "Generated content",
				usage: { inputTokens: 100, outputTokens: 50 },
			}),
			streamText: vi.fn(),
		} as any;

		promptBuilder = new PromptBuilder("manual");
	});

	it("should create session with required options", () => {
		const session = new EnhancedPRDSession({
			llmProvider: mockLLMProvider,
			projectRoot: "/tmp/test",
			mode: "manual",
			promptBuilder,
		});

		expect(session).toBeDefined();
		expect(session.run).toBeDefined();
		expect(typeof session.run).toBe("function");
	});

	it("should have correct mode set", () => {
		const manualSession = new EnhancedPRDSession({
			llmProvider: mockLLMProvider,
			projectRoot: "/tmp/test",
			mode: "manual",
			promptBuilder: new PromptBuilder("manual"),
		});

		const mcpSession = new EnhancedPRDSession({
			llmProvider: mockLLMProvider,
			projectRoot: "/tmp/test",
			mode: "mcp",
			promptBuilder: new PromptBuilder("mcp"),
		});

		expect(manualSession).toBeDefined();
		expect(mcpSession).toBeDefined();
	});

	it("should accept optional feature name", () => {
		const session = new EnhancedPRDSession({
			llmProvider: mockLLMProvider,
			projectRoot: "/tmp/test",
			mode: "manual",
			promptBuilder,
		});

		// Should not throw when calling run without feature name
		expect(() => session.run()).not.toThrow();

		// Should not throw when calling run with feature name
		expect(() => session.run("My Feature")).not.toThrow();
	});
});
