import type { AICallLogger } from "@/lib/ai/ai-call-logger";
import { DependencyCompatibilityChecker } from "@/lib/utils/dependency-compatibility";
import type { PackageValidator } from "@/lib/utils/package-validator";
import type { LLMProvider } from "@/llm/base";

export interface TechItem {
	name: string;
	package?: string;
	version?: string;
}

export interface TechStackOption {
	id: string;
	name: string;
	description: string;
	technologies: {
		frontend?: TechItem[];
		backend?: TechItem[];
		database?: TechItem[];
		devops?: TechItem[];
	};
	pros: string[];
	cons: string[];
	bestFor: string[];
	recommended?: boolean;
}

export class TechStackSuggester {
	constructor(
		private llmProvider: LLMProvider,
		private packageValidator?: PackageValidator,
		private dependencyChecker: DependencyCompatibilityChecker = new DependencyCompatibilityChecker(),
		private webSearchEnabled: boolean = true,
		private aiLogger?: AICallLogger,
	) {}

	/**
	 * Suggest tech stack options based on PRD analysis
	 */
	async suggest(prdContent: string): Promise<TechStackOption[]> {
		const systemPrompt = `You are a senior software architect specializing in technology selection.

Your task is to analyze a PRD and suggest appropriate tech stack options (usually 1-5 depending on the variety of suitable approaches).

CRITICAL RULES:
1. Suggest CURRENT technologies (2026, not outdated stacks), unless the PRD specifically requests older/simpler tech.
2. Match stack to PRD requirements (e.g., real-time → WebSockets).
3. **If the PRD has explicit strict technology constraints** (e.g., 'Vanilla JS only', 'No Frameworks'), prioritize that as the top recommendation and do not suggest conflicting frameworks unless necessary for specific reasons.
4. Provide specific versions where relevant.
5. Mark ONE option as recommended.
6. Keep descriptions concise (1-2 sentences).
7. Focus on proven, production-ready technologies.

Output ONLY valid JSON in this format:
{
  "options": [
    {
      "id": "1",
      "name": "Next.js + Supabase",
      "description": "Modern fullstack with built-in backend",
      "technologies": {
        "frontend": [
          { "name": "Next.js 14", "package": "next", "version": "14.0.0" },
          { "name": "React 18", "package": "react", "version": "18.2.0" },
          { "name": "TypeScript", "package": "typescript", "version": "5.3.0" },
          { "name": "Tailwind CSS", "package": "tailwindcss", "version": "3.4.0" }
        ],
        "backend": [
          { "name": "Next.js API Routes", "package": "next", "version": "14.0.0" },
          { "name": "Supabase", "package": "@supabase/supabase-js", "version": "2.39.0" }
        ],
        "database": [
          { "name": "PostgreSQL (via Supabase)" }
        ]
      },
      "pros": [
        "Fast development (BaaS)",
        "Built-in auth and real-time",
        "Great DX"
      ],
      "cons": [
        "Some vendor lock-in",
        "Less control over backend"
      ],
      "bestFor": [
        "MVPs",
        "Rapid prototyping",
        "Small-medium apps"
      ],
      "recommended": true
    }
  ]
}`;

		const userPrompt = `Analyze this PRD and suggest appropriate tech stack options:

${prdContent}

Consider:
- Project complexity
- Performance requirements
- Real-time needs
- Authentication needs
- Scalability requirements
- Team size/skill level (if mentioned)
- EXPLICIT CONSTRAINTS (e.g., 'Vanilla JS', 'No Database')

Suggest options from simple → complex.`;

		const startTime = Date.now();
		const response = await this.llmProvider.generate(
			[
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt },
			],
			{
				maxTokens: 8192,
				temperature: 0.3,
			},
		);

		if (this.aiLogger) {
			await this.aiLogger.logCall({
				timestamp: new Date().toISOString(),
				command: "TechStackSuggester",
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

		// Parse JSON response
		let jsonContent = response.content.trim();
		if (jsonContent.startsWith("```")) {
			jsonContent = jsonContent
				.replace(/```json\n?/g, "")
				.replace(/```\n?/g, "");
		}

		try {
			const parsed = JSON.parse(jsonContent);
			let options = parsed.options as TechStackOption[];

			if (this.packageValidator) {
				options = await this.validateAndEnhance(options);
			}

			return options;
		} catch (_e) {
			// Don't log to console.error to avoid double printing in CLI
			// Include a snippet of the invalid JSON for debugging purposes in the error message
			const snippet =
				jsonContent.length > 100
					? `${jsonContent.substring(0, 100)}...`
					: jsonContent;

			throw new Error(
				`Failed to parse tech stack suggestions from LLM. Response might be truncated or invalid JSON.\nSnippet: ${snippet}`,
			);
		}
	}

	private async validateAndEnhance(
		options: TechStackOption[],
	): Promise<TechStackOption[]> {
		const enhancedOptions = [...options];

		for (const option of enhancedOptions) {
			const packagesToValidate: { name: string; ecosystem: "npm" | "pypi" }[] =
				[];
			const packagesForCompat: { name: string; version: string }[] = [];

			const collectPackages = (items?: TechItem[]) => {
				if (!items) return;
				for (const item of items) {
					if (item.package) {
						// Simple heuristic to distinguish npm vs pypi if needed,
						// but for now assume npm unless specified otherwise (could add ecosystem field to TechItem)
						packagesToValidate.push({ name: item.package, ecosystem: "npm" });

						if (item.version) {
							packagesForCompat.push({
								name: item.package,
								version: item.version,
							});
						} else {
							// Try to extract version from name "Next.js 14"
							const match = item.name.match(/(\d+(\.\d+)*)/);
							if (match) {
								packagesForCompat.push({
									name: item.package,
									version: match[0],
								});
							}
						}
					}
				}
			};

			collectPackages(option.technologies.frontend);
			collectPackages(option.technologies.backend);
			collectPackages(option.technologies.database);
			collectPackages(option.technologies.devops);

			if (packagesToValidate.length > 0 && this.packageValidator) {
				const results =
					await this.packageValidator.validatePackages(packagesToValidate);

				for (const result of results) {
					if (result.validated.isDeprecated) {
						option.cons.push(
							`WARNING: ${result.package} is deprecated. ${result.recommendation || ""}`,
						);
					}
				}
			}

			if (packagesForCompat.length > 0) {
				const result =
					await this.dependencyChecker.checkCompatibility(packagesForCompat);
				for (const issue of result.issues) {
					option.cons.push(`WARNING: Compatibility issue: ${issue.message}`);
				}
			}
		}

		return enhancedOptions;
	}

	/**
	 * Enhance suggestions with web search (current best practices)
	 */
	async enhanceWithWebSearch(
		options: TechStackOption[],
	): Promise<TechStackOption[]> {
		if (!this.webSearchEnabled) {
			return options;
		}

		// TODO: Implement web search integration
		// For each option, search for:
		// - "[Tech] best practices 2026"
		// - "[Tech] architecture patterns 2026"
		// - "[Tech] vs alternatives"

		return options;
	}
}
