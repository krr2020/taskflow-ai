import type { AICallLogger } from "@/lib/ai/ai-call-logger";
import type { TechStackOption } from "@/lib/analysis/tech-stack-suggester";
import type { LLMProvider } from "@/llm/base";

export class TechStackGenerator {
	constructor(
		private llmProvider: LLMProvider,
		private aiLogger?: AICallLogger,
	) {}

	/**
	 * Generate tech-stack.md from selected option
	 */
	async generate(
		selectedOption: TechStackOption,
		prdContent: string,
	): Promise<string> {
		const systemPrompt = `You are a technical documentation specialist.

Generate a concise tech-stack.md file (MAX 125 lines) that documents:
1. All technologies in the stack (with versions)
2. Key architectural decisions
3. Rationale for each choice (tied to PRD requirements)
4. Compatibility Matrix & Constraints
5. References to official docs

Format:
# Tech Stack Summary

**Project**: [Project name]
**Created**: [Date]
**Last Validated**: [Date]

## Frontend
- **Framework**: [Name + version]
- **UI**: [Libraries]
...

## Compatibility Matrix

| Package | Version | Peer Dependencies | Status |
|---------|---------|-------------------|--------|
| next | 14.1.0 | react: ^18.2.0 or ^19.0.0 | ✅ |

## Version Constraints
### Critical Exact Matches
- React + React DOM: 18.2.0 = 18.2.0 ✅

## Key Decisions

### 1. [Decision]
**Decision**: [What]
**Reason**: [Why - tied to PRD requirement]
**Trade-off**: [Cons]

## References
- [Official docs links]

CRITICAL: Keep under 125 lines, be specific, no fluff.`;

		const userPrompt = `Generate tech-stack.md for:

SELECTED STACK:
${JSON.stringify(selectedOption, null, 2)}

PRD:
${prdContent}

Include:
- Specific versions
- Compatibility Matrix (explicit version constraints)
- WHY each tech was chosen (link to PRD requirements)
- Trade-offs made (including any warnings in 'cons')
- Key dependencies list`;

		const startTime = Date.now();
		const response = await this.llmProvider.generate(
			[
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt },
			],
			{
				maxTokens: 2000,
				temperature: 0.3,
			},
		);

		if (this.aiLogger) {
			await this.aiLogger.logCall({
				timestamp: new Date().toISOString(),
				command: "TechStackGenerator",
				provider: "llm",
				model: response.model,
				prompt: {
					system: systemPrompt,
					user: userPrompt,
				},
				response: {
					content: response.content,
					usage: {
						promptTokens: response.promptTokens || 0,
						completionTokens: response.completionTokens || 0,
						totalTokens: response.tokensUsed || 0,
					},
				},
				duration: Date.now() - startTime,
			});
		}

		return response.content;
	}
}
