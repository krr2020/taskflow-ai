import fs from "node:fs";
import path from "node:path";
import type {
	CodePattern,
	DiscoveredFeature,
	ScanConfig,
} from "../core/types.js";

/**
 * Scans a codebase to detect features and patterns
 */
export class CodebaseScanner {
	private config: ScanConfig;

	constructor(config: ScanConfig) {
		this.config = config;
	}

	/**
	 * Scan the codebase for features
	 */
	async scan(): Promise<DiscoveredFeature[]> {
		const files = await this.getAllFiles(this.config.rootDir);
		const features: DiscoveredFeature[] = [];

		// Define patterns to search for
		const patterns = {
			auth: [
				"passport",
				"jwt",
				"auth",
				"login",
				"session",
				"authenticate",
				"authorize",
			],
			payment: ["stripe", "payment", "checkout", "subscription", "paypal"],
			api: ["express", "fastify", "@nestjs", "routes", "controller", "api"],
			ui: ["react", "vue", "angular", "component", "style", "css", "html"],
		};

		// Scan for each feature type
		for (const [type, keywords] of Object.entries(patterns)) {
			const featurePatterns: CodePattern[] = [];
			const relevantFiles = new Set<string>();

			for (const keyword of keywords) {
				const matches = await this.searchInFiles(files, keyword);
				if (matches.length > 0) {
					featurePatterns.push({
						pattern: keyword,
						matches,
					});
					for (const match of matches) {
						relevantFiles.add(match.file);
					}
				}
			}

			if (featurePatterns.length > 0) {
				features.push({
					name: `${type.charAt(0).toUpperCase() + type.slice(1)} Feature`,
					type: type as DiscoveredFeature["type"],
					files: Array.from(relevantFiles),
					confidence: this.calculateConfidence(featurePatterns),
					patterns: featurePatterns,
				});
			}
		}

		return features;
	}

	/**
	 * Get all files recursively
	 */
	private async getAllFiles(dir: string): Promise<string[]> {
		const files: string[] = [];
		const entries = await fs.promises.readdir(dir, { withFileTypes: true });

		for (const entry of entries) {
			const fullPath = path.join(dir, entry.name);

			// Check ignores
			if (this.shouldIgnore(fullPath)) {
				continue;
			}

			if (entry.isDirectory()) {
				files.push(...(await this.getAllFiles(fullPath)));
			} else if (entry.isFile()) {
				// Check file types
				if (this.matchesFileType(entry.name)) {
					files.push(fullPath);
				}
			}
		}

		return files;
	}

	/**
	 * Check if path should be ignored
	 */
	private shouldIgnore(filePath: string): boolean {
		const ignorePatterns = this.config.ignore || [
			"node_modules",
			"dist",
			".git",
			"coverage",
		];
		const relativePath = path.relative(this.config.rootDir, filePath);

		return ignorePatterns.some(
			(pattern) =>
				relativePath.includes(pattern) || filePath.includes(path.sep + pattern),
		);
	}

	/**
	 * Check if file matches allowed types
	 */
	private matchesFileType(filename: string): boolean {
		const fileTypes = this.config.fileTypes || [
			".ts",
			".js",
			".tsx",
			".jsx",
			".json",
		];
		return fileTypes.some((type) => filename.endsWith(type));
	}

	/**
	 * Search for keyword in files
	 */
	private async searchInFiles(
		files: string[],
		keyword: string,
	): Promise<CodePattern["matches"]> {
		const matches: CodePattern["matches"] = [];

		for (const file of files) {
			try {
				const content = await fs.promises.readFile(file, "utf-8");
				const lines = content.split("\n");

				for (let i = 0; i < lines.length; i++) {
					const line = lines[i];
					// Simple case-insensitive search
					if (line?.toLowerCase().includes(keyword.toLowerCase())) {
						matches.push({
							file,
							line: i + 1,
							snippet: line.trim().substring(0, 100), // Limit snippet length
						});

						// Limit matches per file to avoid noise
						if (matches.filter((m) => m.file === file).length >= 5) {
							break;
						}
					}
				}
			} catch {
				// Ignore read errors
			}
		}

		return matches;
	}

	/**
	 * Calculate confidence based on pattern matches
	 */
	private calculateConfidence(
		patterns: CodePattern[],
	): DiscoveredFeature["confidence"] {
		const totalMatches = patterns.reduce((sum, p) => sum + p.matches.length, 0);

		if (totalMatches > 10) return "high";
		if (totalMatches > 3) return "medium";
		return "low";
	}
}
