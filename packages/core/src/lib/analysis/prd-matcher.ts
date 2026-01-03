import type { LLMProvider } from "../../llm/base.js";
import type {
	DiscoveredFeature,
	Requirement,
	RequirementMatch,
} from "../core/types.js";

/**
 * Matches PRD requirements against discovered features
 */
export class PRDMatcher {
	private llmProvider: LLMProvider | null;

	constructor(llmProvider: LLMProvider | null = null) {
		this.llmProvider = llmProvider;
	}

	/**
	 * Match requirements from PRD content against discovered features
	 */
	async matchRequirements(
		prdContent: string,
		discoveredFeatures: DiscoveredFeature[],
	): Promise<RequirementMatch[]> {
		const requirements = this.extractRequirements(prdContent);
		const matches: RequirementMatch[] = [];

		for (const req of requirements) {
			const match = await this.matchRequirement(req, discoveredFeatures);
			matches.push(match);
		}

		return matches;
	}

	/**
	 * Extract requirements from PRD content
	 * Simple regex-based extraction for now, could be enhanced with LLM
	 */
	private extractRequirements(prdContent: string): Requirement[] {
		const requirements: Requirement[] = [];
		const lines = prdContent.split("\n");
		let section = "";
		let count = 0;

		for (const line of lines) {
			// Track sections
			if (line.startsWith("#")) {
				section = line.toLowerCase();
				continue;
			}

			// Extract functional requirements
			if (
				(section.includes("functional requirements") &&
					!section.includes("non-functional")) ||
				section.includes("user stories")
			) {
				const match = line.match(/^(\d+\.|-|\*)\s+(.+)/);
				if (match?.[2]) {
					count++;
					requirements.push({
						id: `REQ-${count}`,
						text: match[2].trim(),
						type: "functional",
					});
				}
			}

			// Extract non-functional requirements
			if (section.includes("non-functional requirements")) {
				const match = line.match(/^(\d+\.|-|\*)\s+(.+)/);
				if (match?.[2]) {
					count++;
					requirements.push({
						id: `NFR-${count}`,
						text: match[2].trim(),
						type: "non-functional",
					});
				}
			}
		}

		return requirements;
	}

	/**
	 * Match a single requirement against discovered features
	 */
	private async matchRequirement(
		req: Requirement,
		features: DiscoveredFeature[],
	): Promise<RequirementMatch> {
		// Use LLM if available for semantic matching
		if (this.llmProvider) {
			return this.matchWithLLM(req, features);
		}

		// Fallback to keyword matching
		return this.matchWithKeywords(req, features);
	}

	/**
	 * Match using keywords
	 */
	private matchWithKeywords(
		req: Requirement,
		features: DiscoveredFeature[],
	): RequirementMatch {
		const keywords = req.text
			.toLowerCase()
			.split(" ")
			.filter((w) => w.length > 4); // Filter short words
		let bestConfidence = 0;
		const evidence: RequirementMatch["evidence"] = [];

		for (const feature of features) {
			for (const pattern of feature.patterns) {
				// Check if requirement mentions the pattern explicitly
				if (req.text.toLowerCase().includes(pattern.pattern.toLowerCase())) {
					const confidence = 0.8;
					if (confidence > bestConfidence) {
						bestConfidence = confidence;
					}
					evidence.push({
						file: pattern.matches[0]?.file || "",
						line: pattern.matches[0]?.line || 0,
						reason: `Requirement explicitly mentions pattern: ${pattern.pattern}`,
					});
				}

				// Check if pattern snippet contains keywords
				for (const match of pattern.matches) {
					const matchCount = keywords.filter((k) =>
						match.snippet.toLowerCase().includes(k),
					).length;
					const confidence = matchCount / keywords.length;

					if (confidence > 0.3) {
						// Threshold
						if (confidence > bestConfidence) {
							bestConfidence = confidence;
						}

						evidence.push({
							file: match.file,
							line: match.line,
							reason: `Found keywords in code: ${match.snippet.trim()}`,
						});
					}
				}
			}
		}

		// Determine status based on confidence
		let status: RequirementMatch["status"] = "missing";
		if (bestConfidence > 0.7) status = "implemented";
		else if (bestConfidence > 0.3) status = "partial";

		return {
			requirement: req,
			status,
			confidence: bestConfidence,
			evidence: evidence.slice(0, 5), // Limit evidence
		};
	}

	/**
	 * Match using LLM
	 * (Placeholder for now, implementing simple keyword match is safer for first pass)
	 */
	private async matchWithLLM(
		req: Requirement,
		features: DiscoveredFeature[],
	): Promise<RequirementMatch> {
		// TODO: Implement actual LLM matching
		// For now, fall back to keyword matching to ensure functionality
		return this.matchWithKeywords(req, features);
	}
}
