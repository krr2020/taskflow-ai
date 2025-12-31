/**
 * PRD Generate Architecture command - Generate coding-standards.md and architecture-rules.md
 */

import fs from "node:fs";
import path from "node:path";
import { ConfigLoader } from "../../lib/config-loader.js";
import { getRefFilePath, REF_FILES } from "../../lib/config-paths.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class PrdGenerateArchCommand extends BaseCommand {
	async execute(prdFile: string): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();

		// Validate PRD file parameter
		if (!prdFile || prdFile.trim().length === 0) {
			return this.failure(
				"PRD file is required",
				["You must specify the PRD file to use"],
				[
					"Generate architecture from a PRD:",
					"  taskflow prd generate-arch <prd-filename>",
					"",
					"Example:",
					"  taskflow prd generate-arch 2024-01-15-user-auth.md",
				].join("\n"),
			);
		}

		// Resolve PRD file path
		const prdsDir = path.join(paths.tasksDir, "prds");
		const prdFilePath = path.join(prdsDir, prdFile);

		// Check if PRD file exists
		if (!fs.existsSync(prdFilePath)) {
			return this.failure(
				"PRD file not found",
				[`PRD file does not exist: ${prdFilePath}`],
				[
					"Available options:",
					"1. Check the filename and try again",
					"2. List PRD files in tasks/prds/",
					"3. Create a new PRD: taskflow prd create <feature-name>",
				].join("\n"),
			);
		}

		// Check if standards already exist
		const codingStandardsPath = getRefFilePath(
			paths.refDir,
			REF_FILES.codingStandards,
		);
		const architectureRulesPath = getRefFilePath(
			paths.refDir,
			REF_FILES.architectureRules,
		);

		const codingStandardsExist = fs.existsSync(codingStandardsPath);
		const architectureRulesExist = fs.existsSync(architectureRulesPath);

		if (codingStandardsExist || architectureRulesExist) {
			return this.failure(
				"Architecture files already exist",
				[
					codingStandardsExist
						? `coding-standards.md exists at: ${codingStandardsPath}`
						: "",
					architectureRulesExist
						? `architecture-rules.md exists at: ${architectureRulesPath}`
						: "",
				].filter((s) => s.length > 0),
				[
					"Options:",
					"1. Review and update the existing files manually",
					"2. Delete the existing files if you want to regenerate",
					"3. Use a different approach to extend the standards",
				].join("\n"),
			);
		}

		// Read PRD content
		const _prdContent = fs.readFileSync(prdFilePath, "utf-8");
		void _prdContent; // Intentionally unused - PRD content is loaded for reference

		return this.success(
			[
				`PRD loaded: ${prdFile}`,
				"",
				"TASK:",
				"─".repeat(60),
				"Generate project-specific coding standards and architecture rules",
				"based on the PRD and existing codebase patterns.",
			].join("\n"),
			[
				"This is an AI-assisted task. Follow these steps:",
				"",
				"1. The AI will analyze:",
				"   - The PRD requirements and technical considerations",
				"   - Existing codebase patterns and conventions",
				"   - Project structure and architecture",
				"",
				"2. The AI will create two files:",
				`   - ${codingStandardsPath}`,
				`   - ${architectureRulesPath}`,
				"",
				"3. Review the generated files and make adjustments if needed",
				"",
				"4. Once standards are in place, generate tasks:",
				`   taskflow tasks generate ${prdFile}`,
			].join("\n"),
			{
				aiGuidance: [
					"Generate Coding Standards and Architecture Rules",
					"",
					"YOUR MISSION:",
					"──────────────",
					"Create project-specific standards that will guide all future development.",
					"These files are CRITICAL - they ensure consistency and quality.",
					"",
					"STEP 1: READ THE PRD",
					"─────────────────────",
					`File: ${prdFilePath}`,
					"",
					"Extract from PRD:",
					"- Technical requirements",
					"- Architecture considerations",
					"- Technology stack",
					"- Performance requirements",
					"- Security requirements",
					"",
					"STEP 2: ANALYZE CODEBASE",
					"─────────────────────────",
					"Search and discover existing patterns:",
					"",
					"For Coding Standards:",
					"- File naming conventions (component files, test files, etc.)",
					"- Import organization (how imports are ordered)",
					"- Code formatting (use Prettier/Biome config if exists)",
					"- Error handling patterns (try-catch, error boundaries, etc.)",
					"- Logging patterns (console, logger, structured logs)",
					"- Comment style (JSDoc, inline comments)",
					"- Type definitions (TypeScript usage, any vs unknown, etc.)",
					"- Testing patterns (unit, integration, E2E)",
					"",
					"For Architecture Rules:",
					"- Project structure (directories, module organization)",
					"- Dependency flow (which layers can import which)",
					"- State management (Redux, Context, Zustand, etc.)",
					"- API patterns (REST, GraphQL, tRPC)",
					"- Database patterns (ORM, query builders, raw SQL)",
					"- Authentication/Authorization approach",
					"- Component patterns (HOCs, hooks, render props)",
					"- Build and bundling setup",
					"",
					"STEP 3: CREATE coding-standards.md",
					"────────────────────────────────────",
					`File to create: ${codingStandardsPath}`,
					"",
					"Include sections:",
					"1. File Organization",
					"   - Naming conventions",
					"   - Directory structure",
					"   - Import ordering",
					"",
					"2. Code Style",
					"   - Formatting rules",
					"   - Naming conventions (variables, functions, classes)",
					"   - Comment guidelines",
					"",
					"3. TypeScript Usage",
					"   - When to use types vs interfaces",
					"   - Avoid 'any' except when...",
					"   - Generic usage patterns",
					"",
					"4. Error Handling",
					"   - How to handle errors",
					"   - When to throw vs return errors",
					"   - Error logging patterns",
					"",
					"5. Testing",
					"   - What to test",
					"   - Testing patterns",
					"   - Mock/stub guidelines",
					"",
					"6. Documentation",
					"   - When to add comments",
					"   - JSDoc requirements",
					"   - README standards",
					"",
					"STEP 4: CREATE architecture-rules.md",
					"──────────────────────────────────────",
					`File to create: ${architectureRulesPath}`,
					"",
					"Include sections:",
					"1. Project Structure",
					"   - Top-level directories and their purpose",
					"   - Module organization",
					"   - File placement rules",
					"",
					"2. Dependency Rules",
					"   - What can import what",
					"   - Circular dependency prevention",
					"   - External dependency guidelines",
					"",
					"3. Data Flow",
					"   - State management approach",
					"   - Data fetching patterns",
					"   - Cache strategy",
					"",
					"4. API Design",
					"   - REST/GraphQL/tRPC patterns",
					"   - Request/response formats",
					"   - Error handling",
					"",
					"5. Security",
					"   - Authentication approach",
					"   - Authorization patterns",
					"   - Data validation",
					"   - Secrets management",
					"",
					"6. Performance",
					"   - Code splitting strategy",
					"   - Lazy loading rules",
					"   - Optimization guidelines",
					"",
					"7. Feature-Specific Rules (from PRD)",
					"   - Architecture patterns for this specific feature",
					"   - Integration points",
					"   - Constraints and considerations",
					"",
					"EXAMPLES TO SEARCH FOR:",
					"────────────────────────",
					"Run these searches to discover patterns:",
					"",
					"File patterns:",
					"  - Find all test files",
					"  - Find all component files",
					"  - Find all API route files",
					"",
					"Code patterns:",
					"  - Search for 'export class'",
					"  - Search for 'export function'",
					"  - Search for 'export const'",
					"  - Search for error handling (try/catch, .catch)",
					"  - Search for logging (console.log, logger)",
					"  - Search for imports to see organization",
					"",
					"Architecture patterns:",
					"  - Find state management usage",
					"  - Find API client usage",
					"  - Find database query patterns",
					"  - Find authentication checks",
					"",
					"CRITICAL RULES:",
					"────────────────",
					"1. DO NOT invent patterns - discover existing ones",
					"2. DO NOT write generic standards - be project-specific",
					"3. DO include examples from the actual codebase",
					"4. DO reference actual file paths as examples",
					"5. DO align with PRD requirements",
					"6. DO make rules enforceable (not vague suggestions)",
					"",
					"FORMAT:",
					"────────",
					"Both files should be in Markdown format with:",
					"- Clear section headers",
					"- Numbered or bulleted lists",
					"- Code examples where helpful",
					"- File path references",
					"- DO/DON'T examples",
					"",
					"WHEN COMPLETE:",
					"───────────────",
					"You should have created:",
					`✓ ${codingStandardsPath}`,
					`✓ ${architectureRulesPath}`,
					"",
					"These will be used by:",
					"- Task generation (to create well-scoped tasks)",
					"- Task execution (to guide implementation)",
					"- Code review (to verify compliance)",
					"",
					"Next step:",
					`Run: taskflow tasks generate ${prdFile}`,
				].join("\n"),
				contextFiles: [
					`${prdFilePath} - PRD with requirements`,
					`${getRefFilePath(paths.refDir, REF_FILES.prdGenerator)} - PRD guidelines`,
					`${getRefFilePath(paths.refDir, REF_FILES.aiProtocol)} - AI operating discipline`,
				],
				warnings: [
					"DO NOT create generic standards - be project-specific",
					"DO NOT skip codebase analysis - discover actual patterns",
					"DO NOT invent architecture - document what exists + PRD requirements",
					"DO make standards specific and enforceable",
				],
			},
		);
	}
}
