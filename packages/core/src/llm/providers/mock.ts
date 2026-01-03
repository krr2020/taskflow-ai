/**
 * Mock LLM Provider for Testing
 * Provides deterministic responses without making actual API calls
 */

import { LLMError } from "@/lib/core/errors";
import {
	type LLMGenerationOptions,
	type LLMGenerationResult,
	type LLMMessage,
	LLMProvider,
	LLMProviderType,
} from "../base.js";

export interface MockResponse {
	content: string;
	tokensUsed?: number;
	promptTokens?: number;
	completionTokens?: number;
	delay?: number; // Simulate API latency
}

export interface MockProviderConfig {
	model: string;
	responses?: MockResponse[];
	defaultResponse?: MockResponse;
	failAfter?: number; // Fail after N calls (for testing error handling)
	rateLimitAfter?: number; // Trigger rate limit after N calls
}

export class MockLLMProvider extends LLMProvider {
	private config: MockProviderConfig;
	private callCount = 0;
	private responseIndex = 0;
	private calls: Array<{
		messages: LLMMessage[];
		options?: LLMGenerationOptions;
	}> = [];

	constructor(config: MockProviderConfig) {
		super(LLMProviderType.OpenAICompatible, config.model);
		this.config = config;
	}

	/**
	 * Generate mock response
	 */
	async generate(
		messages: LLMMessage[],
		options?: LLMGenerationOptions,
	): Promise<LLMGenerationResult> {
		this.callCount++;
		if (options !== undefined) {
			this.calls.push({ messages, options });
		} else {
			this.calls.push({ messages });
		}

		// Check for rate limit simulation
		if (
			this.config.rateLimitAfter &&
			this.callCount > this.config.rateLimitAfter
		) {
			const error = new LLMError("Rate limit exceeded", "LLM_RATE_LIMIT");
			// biome-ignore lint/suspicious/noExplicitAny: Mocking internal property
			(error as any).status = 429;
			throw error;
		}

		// Check for failure simulation
		if (this.config.failAfter && this.callCount > this.config.failAfter) {
			throw new LLMError("Mock provider failure", "LLM_MOCK_FAILURE");
		}

		// Get response (either from list or default)
		let response: MockResponse;
		if (this.config.responses && this.config.responses.length > 0) {
			response =
				this.config.responses[
					this.responseIndex % this.config.responses.length
				] ?? this.getSmartResponse(messages);
			this.responseIndex++;
		} else {
			response = this.config.defaultResponse ?? this.getSmartResponse(messages);
		}

		// Simulate API delay
		if (response.delay) {
			await this.sleep(response.delay);
		}

		const estimatedTokens =
			response.tokensUsed ?? this.estimateTokens(messages, response.content);
		const estimatedPromptTokens =
			response.promptTokens ?? Math.ceil(estimatedTokens * 0.6);
		const estimatedCompletionTokens =
			response.completionTokens ?? Math.ceil(estimatedTokens * 0.4);

		return {
			content: response.content,
			model: this.config.model,
			tokensUsed: estimatedTokens,
			promptTokens: estimatedPromptTokens,
			completionTokens: estimatedCompletionTokens,
			finishReason: "stop",
		};
	}

	/**
	 * Generate mock stream response
	 */
	async *generateStream(
		messages: LLMMessage[],
		options?: LLMGenerationOptions,
	): AsyncGenerator<string, LLMGenerationResult, unknown> {
		// Use existing generate logic to get the full response
		const result = await this.generate(messages, options);

		// Split content into chunks to simulate streaming
		const chunkSize = 10;
		const content = result.content;

		for (let i = 0; i < content.length; i += chunkSize) {
			yield content.substring(i, i + chunkSize);
			await this.sleep(10); // Simulate network delay
		}

		return result;
	}

	/**
	 * Mock is always configured
	 */
	isConfigured(): boolean {
		return true;
	}

	/**
	 * Get call history for testing
	 */
	getCallHistory(): Array<{
		messages: LLMMessage[];
		options?: LLMGenerationOptions;
	}> {
		return [...this.calls];
	}

	/**
	 * Get call count
	 */
	getCallCount(): number {
		return this.callCount;
	}

	/**
	 * Reset mock state
	 */
	reset(): void {
		this.callCount = 0;
		this.responseIndex = 0;
		this.calls = [];
	}

	/**
	 * Get last call
	 */
	getLastCall():
		| { messages: LLMMessage[]; options?: LLMGenerationOptions }
		| undefined {
		return this.calls[this.calls.length - 1];
	}

	/**
	 * Sleep for testing delays
	 */
	private sleep(ms: number): Promise<void> {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}

	/**
	 * Estimate tokens for testing
	 */
	private estimateTokens(messages: LLMMessage[], response: string): number {
		const promptText = messages.map((m) => m.content).join(" ");
		const promptTokens = Math.ceil(promptText.length / 4);
		const completionTokens = Math.ceil(response.length / 4);
		return promptTokens + completionTokens;
	}

	/**
	 * Get smart response based on message content
	 */
	private getSmartResponse(messages: LLMMessage[]): MockResponse {
		const lastMessage =
			messages[messages.length - 1]?.content.toLowerCase() || "";
		const systemMessage =
			messages.find((m) => m.role === "system")?.content.toLowerCase() || "";
		const allContent = `${lastMessage} ${systemMessage}`;

		if (
			allContent.includes("task breakdown") ||
			allContent.includes("generate tasks") ||
			allContent.includes("refine")
		) {
			return {
				content: JSON.stringify({
					project: "test-project",
					features: [
						{
							id: "1",
							title: "Test Feature",
							description: "A test feature",
							status: "not-started",
							stories: [
								{
									id: "1.1",
									title: "Test Story",
									description: "A test story",
									status: "not-started",
									tasks: [
										{
											id: "1.1.0",
											title: "Test Task",
											skill: "backend",
											description: "A test task",
											status: "not-started",
											context: ["test.ts"],
											subtasks: [
												{
													id: "1",
													description: "Subtask 1",
													status: "pending",
												},
											],
											acceptanceCriteria: ["Works"],
											dependencies: [],
										},
									],
								},
							],
						},
					],
				}),
				tokensUsed: 300,
			};
		}

		if (
			allContent.includes("prd") ||
			allContent.includes("product requirement")
		) {
			return {
				content: `# PRD: Test Feature

**Created:** 2026-01-01
**Status:** Draft
**Owner:** TBD

## 1. Overview
### Problem Statement
This is a test PRD generated by the mock provider.

### Goals
- Test goal 1
- Test goal 2

### Non-Goals
- Out of scope item

## 2. User Stories
### Primary User Stories
- As a user, I want to test the PRD generation

## 3. Functional Requirements
### Core Features
- Feature 1
- Feature 2

## 4. Non-Functional Requirements
### Performance
- Fast

### Security
- Secure

## 5. Technical Considerations
### Architecture
- Well-designed

## 6. Success Criteria
### Acceptance Criteria
- Works correctly`,
				tokensUsed: 250,
			};
		}

		if (allContent.includes("coding standards")) {
			return {
				content:
					"# Coding Standards\n\n## General\n- Use TypeScript\n- Use async/await",
				tokensUsed: 50,
			};
		}

		if (allContent.includes("architecture rules")) {
			return {
				content: "# Architecture Rules\n\n## Structure\n- Modular design",
				tokensUsed: 50,
			};
		}

		if (allContent.includes("guidance")) {
			return {
				content: "Here is some guidance: Check the context files.",
				tokensUsed: 20,
			};
		}

		return this.getDefaultResponse();
	}

	/**
	 * Get default response
	 */
	private getDefaultResponse(): MockResponse {
		return {
			content: "This is a mock response from the test LLM provider.",
			tokensUsed: 20,
		};
	}

	/**
	 * Create mock provider for testing
	 */
	static createMock(config?: Partial<MockProviderConfig>): MockLLMProvider {
		const mockConfig: MockProviderConfig = {
			model: config?.model ?? "mock-model",
		};

		if (config?.responses !== undefined) {
			mockConfig.responses = config.responses;
		}
		if (config?.defaultResponse !== undefined) {
			mockConfig.defaultResponse = config.defaultResponse;
		}
		if (config?.failAfter !== undefined) {
			mockConfig.failAfter = config.failAfter;
		}
		if (config?.rateLimitAfter !== undefined) {
			mockConfig.rateLimitAfter = config.rateLimitAfter;
		}

		return new MockLLMProvider(mockConfig);
	}

	/**
	 * Create mock with predefined PRD response
	 */
	static createPRDMock(): MockLLMProvider {
		return new MockLLMProvider({
			model: "mock-prd-model",
			defaultResponse: {
				content: `# PRD: Test Feature

**Created:** 2026-01-01
**Status:** Draft
**Owner:** TBD

## 1. Overview
### Problem Statement
This is a test PRD generated by the mock provider.

### Goals
- Test goal 1
- Test goal 2

### Non-Goals
- Out of scope item

## 2. User Stories
### Primary User Stories
- As a user, I want to test the PRD generation

## 3. Functional Requirements
### Core Features
- Feature 1
- Feature 2

## 4. Non-Functional Requirements
### Performance
- Fast

### Security
- Secure

## 5. Technical Considerations
### Architecture
- Well-designed

## 6. Success Criteria
### Acceptance Criteria
- Works correctly`,
				tokensUsed: 250,
			},
		});
	}

	/**
	 * Create mock with predefined task breakdown response
	 */
	static createTasksMock(): MockLLMProvider {
		return new MockLLMProvider({
			model: "mock-tasks-model",
			defaultResponse: {
				content: JSON.stringify({
					project: "test-project",
					features: [
						{
							id: "1",
							title: "Test Feature",
							description: "A test feature",
							stories: [
								{
									id: "1.1",
									title: "Test Story",
									description: "A test story",
									tasks: [
										{
											id: "1.1.0",
											title: "Test Task",
											skill: "backend",
											description: "A test task",
											context: ["test.ts"],
											subtasks: [
												{
													id: "1",
													description: "Subtask 1",
													status: "pending",
												},
											],
											acceptanceCriteria: ["Works"],
											dependencies: [],
										},
									],
								},
							],
						},
					],
				}),
				tokensUsed: 300,
			},
		});
	}
}
