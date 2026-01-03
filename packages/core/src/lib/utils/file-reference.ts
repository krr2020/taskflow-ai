/**
 * File Reference System
 *
 * Allows users to reference existing files in brownfield projects.
 * Supports @filepath syntax and interactive file selection.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { InteractiveSelect } from "@/lib/input/index";

export interface FileReference {
	path: string;
	content: string;
	language: string;
	tokens: number;
	size: number;
}

export const FileReferenceParser = {
	/**
	 * Parse @filepath references from text
	 *
	 * @example
	 * const text = "Extend auth in @src/auth/login.ts";
	 * const refs = FileReferenceParser.parse(text, '/project/root');
	 */
	parse(text: string, projectRoot: string): FileReference[] {
		// Match @filepath patterns (supports paths with slashes, dots, underscores, hyphens)
		const pattern = /@([a-zA-Z0-9_\-./]+)/g;
		const matches = text.matchAll(pattern);
		const references: FileReference[] = [];
		const seen = new Set<string>();

		for (const match of matches) {
			const relativePath = match[1];

			// Skip if no capture group
			if (!relativePath) continue;

			// Skip if already processed
			if (seen.has(relativePath)) continue;
			seen.add(relativePath);

			const absolutePath = path.join(projectRoot, relativePath);

			if (fs.existsSync(absolutePath) && fs.statSync(absolutePath).isFile()) {
				try {
					const content = fs.readFileSync(absolutePath, "utf-8");
					const stats = fs.statSync(absolutePath);

					const language = FileReferenceParser.detectLanguage(absolutePath);

					references.push({
						path: relativePath,
						content,
						language,
						tokens: FileReferenceParser.estimateTokens(content),
						size: stats.size,
					});
				} catch (_error) {
					// Skip files that can't be read
					console.warn(`Warning: Could not read file: ${relativePath}`);
				}
			}
		}

		return references;
	},

	/**
	 * Interactive file selection
	 *
	 * @example
	 * const files = await FileReferenceParser.selectFiles(
	 *   '/project/root',
	 *   'Select files to reference'
	 * );
	 */
	async selectFiles(
		projectRoot: string,
		message: string = "Select files to reference",
		options?: {
			pattern?: string;
			maxFiles?: number;
			excludeDirs?: string[];
		},
	): Promise<FileReference[]> {
		// Note: pattern option is available for future use with glob-based filtering
		const excludeDirs = options?.excludeDirs || [
			"node_modules",
			".git",
			"dist",
			"build",
			".taskflow",
			"coverage",
			".next",
			"out",
		];

		// Find all matching files
		let allFiles: string[];
		try {
			allFiles = findFiles(projectRoot, excludeDirs);
		} catch (error) {
			throw new Error(
				`Failed to scan project directory "${projectRoot}": ${(error as Error).message}`,
			);
		}

		if (allFiles.length === 0) {
			throw new Error(
				`No code files found in "${projectRoot}". Searched for files with extensions: .ts, .tsx, .js, .jsx, .py, .java, .go, .rs, .c, .cpp, .cs, .rb, .php, .swift, .kt, .scala, .md (excluding: ${excludeDirs.join(", ")})`,
			);
		}

		// Create choices with file info
		const choices = allFiles.map((filePath) => {
			const fullPath = path.join(projectRoot, filePath);
			const stats = fs.statSync(fullPath);
			const lang = FileReferenceParser.detectLanguage(fullPath);

			return {
				name: filePath,
				value: filePath,
				description: `${lang} • ${formatSize(stats.size)} • ${stats.mtime.toLocaleDateString()}`,
			};
		});

		// Sort by modification time (newest first)
		choices.sort((a, b) => {
			const aPath = path.join(projectRoot, a.value);
			const bPath = path.join(projectRoot, b.value);
			const aStat = fs.statSync(aPath);
			const bStat = fs.statSync(bPath);
			return bStat.mtime.getTime() - aStat.mtime.getTime();
		});

		// Limit choices if specified
		const limitedChoices = options?.maxFiles
			? choices.slice(0, options.maxFiles)
			: choices;

		// Let user select multiple files
		const selected = await InteractiveSelect.multiple(message, limitedChoices, {
			pageSize: 15,
		});

		// Load selected files
		return selected.map((filePath) => {
			const fullPath = path.join(projectRoot, filePath);
			const content = fs.readFileSync(fullPath, "utf-8");
			const stats = fs.statSync(fullPath);

			return {
				path: filePath,
				content,
				language: FileReferenceParser.detectLanguage(fullPath),
				tokens: FileReferenceParser.estimateTokens(content),
				size: stats.size,
			};
		});
	},

	/**
	 * Detect programming language from file extension
	 */
	detectLanguage(filepath: string): string {
		const ext = path.extname(filepath).toLowerCase();

		const languageMap: Record<string, string> = {
			".ts": "TypeScript",
			".tsx": "TypeScript React",
			".js": "JavaScript",
			".jsx": "JavaScript React",
			".py": "Python",
			".java": "Java",
			".go": "Go",
			".rs": "Rust",
			".c": "C",
			".cpp": "C++",
			".h": "C Header",
			".hpp": "C++ Header",
			".cs": "C#",
			".rb": "Ruby",
			".php": "PHP",
			".swift": "Swift",
			".kt": "Kotlin",
			".scala": "Scala",
			".md": "Markdown",
			".json": "JSON",
			".yaml": "YAML",
			".yml": "YAML",
			".toml": "TOML",
			".sql": "SQL",
			".sh": "Shell",
			".bash": "Bash",
		};

		return languageMap[ext] || "Unknown";
	},

	/**
	 * Estimate token count (rough approximation)
	 * ~4 characters per token for code
	 */
	estimateTokens(content: string): number {
		return Math.ceil(content.length / 4);
	},

	/**
	 * Format file references for LLM context
	 *
	 * @example
	 * const context = FileReferenceParser.formatForLLM(references);
	 */
	formatForLLM(references: FileReference[]): string {
		if (references.length === 0) return "";

		let formatted = "\n## Referenced Files\n\n";

		for (const ref of references) {
			formatted += `### ${ref.path}\n`;
			formatted += `Language: ${ref.language} | Size: ${formatSize(ref.size)} | Tokens: ~${ref.tokens}\n\n`;
			formatted += `\`\`\`${getCodeBlockLanguage(ref.language)}\n`;
			formatted += ref.content;
			formatted += "\n```\n\n";
		}

		return formatted;
	},

	/**
	 * Check if total token count is within limits
	 */
	checkTokenLimit(
		references: FileReference[],
		maxTokens: number = 10000,
	): { withinLimit: boolean; totalTokens: number; exceeded: number } {
		const totalTokens = references.reduce((sum, ref) => sum + ref.tokens, 0);

		return {
			withinLimit: totalTokens <= maxTokens,
			totalTokens,
			exceeded: Math.max(0, totalTokens - maxTokens),
		};
	},

	/**
	 * Suggest files to remove if over token limit
	 */
	suggestReduction(
		references: FileReference[],
		maxTokens: number = 10000,
	): {
		keep: FileReference[];
		remove: FileReference[];
	} {
		// Sort by tokens (smallest first) to keep the most informative files
		const sorted = [...references].sort((a, b) => b.tokens - a.tokens);

		const keep: FileReference[] = [];
		const remove: FileReference[] = [];
		let currentTokens = 0;

		for (const ref of sorted) {
			if (currentTokens + ref.tokens <= maxTokens) {
				keep.push(ref);
				currentTokens += ref.tokens;
			} else {
				remove.push(ref);
			}
		}

		return { keep, remove };
	},
};

/**
 * Find all code files in directory (recursive)
 */
function findFiles(
	dir: string,
	excludeDirs: string[],
	baseDir: string = dir,
	results: string[] = [],
): string[] {
	// Check if directory exists and is accessible
	if (!fs.existsSync(dir)) {
		throw new Error(`Directory does not exist: ${dir}`);
	}

	if (!fs.statSync(dir).isDirectory()) {
		throw new Error(`Path is not a directory: ${dir}`);
	}

	let entries: fs.Dirent[];
	try {
		entries = fs.readdirSync(dir, { withFileTypes: true });
	} catch (error) {
		throw new Error(
			`Failed to read directory ${dir}: ${(error as Error).message}`,
		);
	}

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		const relativePath = path.relative(baseDir, fullPath);

		if (entry.isDirectory()) {
			// Skip excluded directories
			if (excludeDirs.includes(entry.name)) continue;

			// Recurse into subdirectory
			try {
				findFiles(fullPath, excludeDirs, baseDir, results);
			} catch (error) {
				// Log but continue on subdirectory errors
				console.error(`Warning: Could not scan ${fullPath}: ${error}`);
			}
		} else if (entry.isFile()) {
			// Check if it's a code file
			const ext = path.extname(entry.name);
			const codeExtensions = [
				".ts",
				".tsx",
				".js",
				".jsx",
				".py",
				".java",
				".go",
				".rs",
				".c",
				".cpp",
				".h",
				".hpp",
				".cs",
				".rb",
				".php",
				".swift",
				".kt",
				".scala",
				".md",
			];

			if (codeExtensions.includes(ext)) {
				results.push(relativePath);
			}
		}
	}

	return results;
}

/**
 * Format file size for display
 */
function formatSize(bytes: number): string {
	if (bytes < 1024) return `${bytes}B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)}KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)}MB`;
}

/**
 * Get language identifier for code blocks
 */
function getCodeBlockLanguage(language: string): string {
	const map: Record<string, string> = {
		TypeScript: "typescript",
		"TypeScript React": "tsx",
		JavaScript: "javascript",
		"JavaScript React": "jsx",
		Python: "python",
		Java: "java",
		Go: "go",
		Rust: "rust",
		C: "c",
		"C++": "cpp",
		"C#": "csharp",
		Ruby: "ruby",
		PHP: "php",
		Swift: "swift",
		Kotlin: "kotlin",
		Scala: "scala",
		Markdown: "markdown",
		JSON: "json",
		YAML: "yaml",
		SQL: "sql",
		Shell: "bash",
	};

	return map[language] || "";
}
