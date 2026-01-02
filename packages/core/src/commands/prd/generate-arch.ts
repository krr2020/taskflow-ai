/**
 * PRD Generate Architecture command - Generate coding-standards.md and architecture-rules.md
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import pc from "picocolors";
import { ConfigLoader } from "../../lib/config-loader.js";
import { getRefFilePath, REF_FILES } from "../../lib/config-paths.js";
import { LLMRequiredError } from "../../lib/errors.js";
import { ProgressIndicator } from "../../lib/progress-indicator.js";
import { StreamDisplay } from "../../lib/stream-display.js";
import {
	type TechStack,
	TechStackDetector,
} from "../../lib/tech-stack-detector.js";
import { TechStackGenerator } from "../../lib/tech-stack-generator.js";
import {
	type TechStackOption,
	TechStackSuggester,
} from "../../lib/tech-stack-suggester.js";
import { TerminalFormatter } from "../../lib/terminal-formatter.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class PrdGenerateArchCommand extends BaseCommand {
	protected override requiresLLM = true;

	async execute(
		prdFile: string,
		instructions?: string,
	): Promise<CommandResult> {
		// Validate LLM availability if not in MCP mode
		this.validateLLM("prd:generate-arch");

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
		const prdContent = fs.readFileSync(prdFilePath, "utf-8");

		// If LLM is not available, fallback to guidance
		if (!this.isLLMAvailable()) {
			return this.getGuidanceResult(
				prdFile,
				prdFilePath,
				getRefFilePath(paths.refDir, REF_FILES.codingStandards),
				getRefFilePath(paths.refDir, REF_FILES.architectureRules),
				paths,
			);
		}

		// STEP 1: Detect existing tech stack
		console.log(TerminalFormatter.header("TECH STACK DETECTION"));
		const progress = new ProgressIndicator();
		progress.start("Scanning codebase for existing technologies...");

		const detector = new TechStackDetector(this.context.projectRoot);
		const detectedStack = await detector.detect();
		const isGreenfield = detector.isGreenfield();

		progress.stop();

		if (
			!isGreenfield &&
			Object.keys(detectedStack).some((k) => {
				const key = k as keyof TechStack;
				const items = detectedStack[key];
				return items && items.length > 0;
			})
		) {
			// Brownfield: Show detected stack
			console.log(TerminalFormatter.success("Detected existing tech stack:"));
			const formatted = detector.formatStack(detectedStack);
			formatted.forEach((line) => {
				console.log(pc.cyan(line));
			});

			// Ask for confirmation
			const useDetected = await this.confirm(
				"\nUse detected stack for architecture generation?",
				"yes",
			);

			if (useDetected) {
				// Use detected stack
				// Create a synthetic option from detected stack
				const syntheticOption: TechStackOption = {
					id: "detected",
					name: "Detected Stack",
					description: "Stack detected from existing codebase",
					technologies: {
						frontend:
							detectedStack.frontend?.map((t) => ({
								name: `${t.name} ${t.version || ""}`.trim(),
							})) || [],
						backend:
							detectedStack.backend?.map((t) => ({
								name: `${t.name} ${t.version || ""}`.trim(),
							})) || [],
						database:
							detectedStack.database?.map((t) => ({
								name: `${t.name} ${t.version || ""}`.trim(),
							})) || [],
						devops:
							detectedStack.devops?.map((t) => ({
								name: `${t.name} ${t.version || ""}`.trim(),
							})) || [],
					},
					pros: ["Matches existing codebase"],
					cons: [],
					bestFor: ["Consistency"],
					recommended: true,
				};

				return this.generateArchitectureFiles(
					prdContent,
					syntheticOption,
					prdFile,
					paths,
					instructions,
				);
			}
		}

		// STEP 2: Suggest tech stack options (greenfield or user rejected detected)
		console.log("");
		console.log(TerminalFormatter.header("TECH STACK SELECTION"));
		progress.start("Analyzing PRD to suggest appropriate tech stacks...");

		if (!this.llmProvider) {
			throw new LLMRequiredError("LLM provider not available");
		}
		const suggester = new TechStackSuggester(
			this.llmProvider,
			undefined,
			undefined,
			true,
			this.aiLogger,
		);
		const options = await suggester.suggest(prdContent);
		progress.stop();

		// Display options
		console.log(TerminalFormatter.section("RECOMMENDED STACKS"));
		options.forEach((option, i) => {
			const marker = option.recommended ? pc.green("✓ RECOMMENDED") : "";
			console.log(pc.bold(`[${i + 1}] ${option.name} ${marker}`));
			console.log(pc.dim(`    ${option.description}\n`));

			console.log("    Technologies:");
			if (
				option.technologies.frontend &&
				option.technologies.frontend.length > 0
			) {
				console.log(
					pc.cyan(
						`      Frontend: ${option.technologies.frontend
							.map((t) => t.name)
							.join(", ")}`,
					),
				);
			}
			if (
				option.technologies.backend &&
				option.technologies.backend.length > 0
			) {
				console.log(
					pc.cyan(
						`      Backend: ${option.technologies.backend
							.map((t) => t.name)
							.join(", ")}`,
					),
				);
			}
			if (
				option.technologies.database &&
				option.technologies.database.length > 0
			) {
				console.log(
					pc.cyan(
						`      Database: ${option.technologies.database
							.map((t) => t.name)
							.join(", ")}`,
					),
				);
			}

			console.log("\n    Pros:");
			option.pros.forEach((pro) => {
				console.log(pc.green(`      ✓ ${pro}`));
			});

			console.log("\n    Cons:");
			option.cons.forEach((con) => {
				console.log(pc.yellow(`      ⚠ ${con}`));
			});

			console.log("\n    Best for:");
			option.bestFor.forEach((use) => {
				console.log(pc.dim(`      • ${use}`));
			});

			console.log(`\n${"─".repeat(60)}\n`);
		});

		// Get user choice
		const selected = await this.promptChoice(
			`Select tech stack [1-${options.length}]:`,
			options.length,
		);

		const selectedOption = options[selected - 1];

		if (!selectedOption) {
			return this.failure(
				"Invalid selection",
				["Selected option not found"],
				"Run the command again and select a valid option",
			);
		}

		// STEP 3: Generate architecture files
		return this.generateArchitectureFiles(
			prdContent,
			selectedOption,
			prdFile,
			paths,
			instructions,
		);
	}

	private async promptChoice(
		question: string,
		maxChoice: number,
	): Promise<number> {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		const answer = await new Promise<string>((resolve) => {
			rl.question(`${pc.cyan(question)} `, (ans) => {
				rl.close();
				resolve(ans.trim());
			});
		});

		const choice = parseInt(answer, 10);
		if (Number.isNaN(choice) || choice < 1 || choice > maxChoice) {
			console.log(
				TerminalFormatter.error(`Invalid choice. Please select 1-${maxChoice}`),
			);
			return this.promptChoice(question, maxChoice);
		}

		return choice;
	}

	private async generateArchitectureFiles(
		prdContent: string,
		selectedOption: TechStackOption,
		prdFile: string,
		paths: ReturnType<ConfigLoader["getPaths"]>,
		instructions?: string,
	): Promise<CommandResult> {
		if (!this.llmProvider) {
			throw new LLMRequiredError("LLM provider not available");
		}

		// Generate tech-stack.md
		console.log(
			`\n${TerminalFormatter.section("GENERATING TECH STACK DOCUMENTATION")}`,
		);

		const techStackGenerator = new TechStackGenerator(
			this.llmProvider,
			this.aiLogger,
		);

		const progress = new ProgressIndicator();
		progress.start("Generating tech stack documentation...");

		const techStackContent = await techStackGenerator.generate(
			selectedOption,
			prdContent,
		);
		progress.stop();

		const techStackPath = path.join(paths.refDir, "tech-stack.md");
		fs.writeFileSync(techStackPath, techStackContent, "utf-8");

		console.log(
			TerminalFormatter.success(
				`Generated tech-stack.md (${techStackContent.split("\n").length} lines)`,
			),
		);

		// Now generate the other files with tech stack context
		return await this.executeWithFallback(
			() =>
				this.generateStandardsWithLLM(
					prdContent,
					prdFile,
					paths.refDir,
					techStackContent,
					instructions,
				),
			() => {
				console.error(
					TerminalFormatter.error(
						"LLM generation failed, falling back to guidance.",
					),
				);
				return this.getGuidanceResult(
					prdFile,
					path.join(paths.tasksDir, "prds", prdFile),
					getRefFilePath(paths.refDir, REF_FILES.codingStandards),
					getRefFilePath(paths.refDir, REF_FILES.architectureRules),
					paths,
				);
			},
			"Architecture Generation",
		);
	}

	private async confirm(
		question: string,
		defaultAnswer: "yes" | "no" = "yes",
	): Promise<boolean> {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		const suffix = defaultAnswer === "yes" ? "[Y/n]" : "[y/N]";

		const answer = await new Promise<string>((resolve) => {
			rl.question(`${pc.cyan(question)} ${pc.dim(suffix)} `, (ans) => {
				rl.close();
				resolve(ans.trim().toLowerCase());
			});
		});

		if (answer === "") {
			return defaultAnswer === "yes";
		}

		return answer === "y" || answer === "yes";
	}

	private getGuidanceResult(
		prdFile: string,
		prdFilePath: string,
		codingStandardsPath: string,
		architectureRulesPath: string,
		paths: ReturnType<ConfigLoader["getPaths"]>,
	): CommandResult {
		return this.success(
			[
				TerminalFormatter.header(`PRD LOADED: ${prdFile}`),
				"",
				TerminalFormatter.section("TASK"),
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

	/**
	 * Generate coding standards and architecture rules using LLM
	 */
	private async generateStandardsWithLLM(
		prdContent: string,
		prdFile: string,
		refDir: string,
		techStackContent: string,
		instructions?: string,
	): Promise<CommandResult> {
		if (!this.llmProvider) {
			throw new LLMRequiredError("LLM provider not available");
		}

		// Load context files
		const contextFiles: { name: string; content: string }[] = [];

		// Load prd-generator.md if it exists
		const prdGeneratorPath = getRefFilePath(refDir, REF_FILES.prdGenerator);
		if (fs.existsSync(prdGeneratorPath)) {
			contextFiles.push({
				name: REF_FILES.prdGenerator,
				content: fs.readFileSync(prdGeneratorPath, "utf-8"),
			});
		}

		// Load ai-protocol.md if it exists
		const aiProtocolPath = getRefFilePath(refDir, REF_FILES.aiProtocol);
		if (fs.existsSync(aiProtocolPath)) {
			contextFiles.push({
				name: REF_FILES.aiProtocol,
				content: fs.readFileSync(aiProtocolPath, "utf-8"),
			});
		}

		// Generate coding-standards.md
		const codingStandardsPath = getRefFilePath(
			refDir,
			REF_FILES.codingStandards,
		);
		const codingStandardsContent = await this.generateCodingStandards(
			prdContent,
			contextFiles,
			techStackContent,
			instructions,
		);

		// Generate architecture-rules.md
		const architectureRulesPath = getRefFilePath(
			refDir,
			REF_FILES.architectureRules,
		);
		const architectureRulesContent = await this.generateArchitectureRules(
			prdContent,
			contextFiles,
			techStackContent,
			instructions,
		);

		// Write files
		fs.writeFileSync(codingStandardsPath, codingStandardsContent, "utf-8");
		fs.writeFileSync(architectureRulesPath, architectureRulesContent, "utf-8");

		return this.success(
			[
				TerminalFormatter.success(`Generated coding-standards.md`),
				TerminalFormatter.success(`Generated architecture-rules.md`),
				"",
				TerminalFormatter.section("FILES CREATED"),
				TerminalFormatter.listItem(codingStandardsPath),
				TerminalFormatter.listItem(architectureRulesPath),
			].join("\n"),
			[
				"Next steps:",
				"",
				"1. Review the generated files and make adjustments if needed",
				"",
				"2. Generate tasks from PRD:",
				`   taskflow tasks generate ${prdFile}`,
			].join("\n"),
		);
	}

	/**
	 * Generate coding standards using LLM
	 */
	private async generateCodingStandards(
		prdContent: string,
		contextFiles: Array<{ name: string; content: string }>,
		techStackContent: string,
		instructions?: string,
	): Promise<string> {
		if (!this.llmProvider) {
			throw new LLMRequiredError("LLM provider not available");
		}

		console.log("");
		const progress = new ProgressIndicator();
		progress.start("Generating coding-standards.md...");

		const systemPrompt = `You are an expert software architect tasked with creating project-specific coding standards.

Your mission is to analyze the PRD and create a comprehensive coding-standards.md file that will guide all development work.

CRITICAL CONSTRAINTS:
1. MAX 125 LINES TOTAL - Be extremely concise.
2. Use bullet points for rules.
3. No long prose or introductions.
4. Focus ONLY on high-level standards.

CRITICAL RULES:
1. DO NOT invent patterns - base standards on real-world best practices
2. DO NOT write generic standards - be specific to the project's needs
3. DO include concrete examples and DO/DON'T scenarios
4. DO make rules enforceable and measurable
5. DO align with the PRD requirements and technology stack

TECH STACK CONTEXT:
${techStackContent}

Generate rules SPECIFIC to this stack (not generic).

Required sections:
1. File Organization
2. Code Style
3. TypeScript Usage
4. Error Handling
5. Testing
6. Documentation

For each section, provide:
- Clear, specific rules
- Examples demonstrating the rule
- Rationale for why the rule exists
- How to verify compliance

${instructions ? `\nAdditional instructions: ${instructions}` : ""}`;

		const contextSection = contextFiles
			.map(
				(file) => `
=== ${file.name} ===
${file.content}
`,
			)
			.join("\n");

		const userPrompt = `Generate a CONCISE coding-standards.md file (max 125 lines) based on the following PRD:

=== PRD ===
${prdContent}

${contextSection}

Create a detailed but CONCISE coding-standards.md file with all required sections. Output ONLY the markdown content, no additional commentary.`;

		const messages = [
			{ role: "system" as const, content: systemPrompt },
			{ role: "user" as const, content: userPrompt },
		];

		const options = {
			maxTokens: 2000,
			temperature: 0.3,
		};

		const stream = this.generateStream(messages, options);
		const display = new StreamDisplay("Generating Coding Standards");
		let content = "";
		let isFirstChunk = true;

		for await (const chunk of stream) {
			if (isFirstChunk) {
				progress.stop();
				isFirstChunk = false;
			}
			display.handleChunk(chunk);
			content += chunk;
		}
		display.finish();

		if (!content) {
			throw new Error("Failed to generate coding standards");
		}

		// Check length warning
		const lineCount = content.split("\n").length;
		if (lineCount > 125) {
			console.warn(
				TerminalFormatter.warning(
					`coding-standards.md is ${lineCount} lines (limit: 125). Consider simplifying.`,
				),
			);
		}

		return content;
	}

	/**
	 * Generate architecture rules using LLM
	 */
	private async generateArchitectureRules(
		prdContent: string,
		contextFiles: Array<{ name: string; content: string }>,
		techStackContent: string,
		instructions?: string,
	): Promise<string> {
		if (!this.llmProvider) {
			throw new LLMRequiredError("LLM provider not available");
		}

		console.log("");
		const progress = new ProgressIndicator();
		progress.start("Generating architecture-rules.md...");

		const systemPrompt = `You are an expert software architect tasked with creating project-specific architecture rules.

Your mission is to analyze the PRD and create a concise, enforceable architecture-rules.md file.

CRITICAL CONSTRAINTS:
1. MAX 125 LINES TOTAL - Be extremely concise.
2. Use bullet points for rules.
3. No long prose or introductions.
4. Focus ONLY on high-level architectural constraints.

TECH STACK CONTEXT:
${techStackContent}

Required sections:
1. System Boundaries (What is internal vs external)
2. Data Flow & State Management (Single source of truth)
3. Component/Module Responsibilities (Strict separation of concerns)
4. Critical Paths (Auth, Payment, etc.)
5. Security Constraints

For each section:
- Provide clear architectural constraints
- Explicit forbidden patterns

${instructions ? `\nAdditional instructions: ${instructions}` : ""}`;

		const contextSection = contextFiles
			.map(
				(file) => `
=== ${file.name} ===
${file.content}
`,
			)
			.join("\n");

		const userPrompt = `Generate a CONCISE architecture-rules.md (max 125 lines) based on:

=== PRD ===
${prdContent}

${contextSection}

The architecture MUST be compatible with the tech stack defined in tech-stack.md.
Output ONLY markdown content.`;

		const messages = [
			{ role: "system" as const, content: systemPrompt },
			{ role: "user" as const, content: userPrompt },
		];

		const options = {
			maxTokens: 2000,
			temperature: 0.3,
		};

		const stream = this.generateStream(messages, options);
		const display = new StreamDisplay("Generating Architecture Rules");
		let content = "";
		let isFirstChunk = true;

		for await (const chunk of stream) {
			if (isFirstChunk) {
				progress.stop();
				isFirstChunk = false;
			}
			display.handleChunk(chunk);
			content += chunk;
		}
		display.finish();

		if (!content) {
			throw new Error("Failed to generate architecture rules");
		}

		// Check length warning
		const lineCount = content.split("\n").length;
		if (lineCount > 125) {
			console.warn(
				TerminalFormatter.warning(
					`architecture-rules.md is ${lineCount} lines (limit: 125). Consider simplifying.`,
				),
			);
		}

		return content;
	}
}
