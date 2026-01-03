import { beforeEach, describe, expect, it, vi } from "vitest";
import { TechStackSuggester } from "@/lib/analysis/tech-stack-suggester";
import type { LLMGenerationResult, LLMProvider } from "@/llm/base";

describe("TechStackSuggester", () => {
	let mockLLMProvider: LLMProvider;
	let suggester: TechStackSuggester;

	beforeEach(() => {
		mockLLMProvider = {
			generate: vi.fn(),
		} as unknown as LLMProvider;
		suggester = new TechStackSuggester(mockLLMProvider);
	});

	it("should use increased maxTokens for generation", async () => {
		const mockResponse: LLMGenerationResult = {
			content: JSON.stringify({ options: [] }),
			model: "test-model",
			promptTokens: 10,
			completionTokens: 10,
			tokensUsed: 20,
		};
		(mockLLMProvider.generate as any).mockResolvedValue(mockResponse);

		await suggester.suggest("Test PRD content");

		expect(mockLLMProvider.generate).toHaveBeenCalledWith(
			expect.any(Array),
			expect.objectContaining({
				maxTokens: 8192,
			}),
		);
	});

	it("should throw formatted error on invalid JSON", async () => {
		const mockResponse: LLMGenerationResult = {
			content: '```json\n{\n  "', // Truncated JSON
			model: "test-model",
			promptTokens: 10,
			completionTokens: 10,
			tokensUsed: 20,
		};
		(mockLLMProvider.generate as any).mockResolvedValue(mockResponse);

		await expect(suggester.suggest("Test PRD content")).rejects.toThrow(
			/Failed to parse tech stack suggestions from LLM/,
		);

		// Should verify snippet is included
		await expect(suggester.suggest("Test PRD content")).rejects.toThrow(
			/Snippet:/,
		);
	});
});
