/**
 * PRD Generate Architecture command - Generate coding-standards.md and architecture-rules.md
 */

import fs from "node:fs";
import path from "node:path";
import readline from "node:readline";
import {
	type TechStack,
	TechStackDetector,
} from "../../lib/analysis/tech-stack-detector.js";
import {
	type TechStackOption,
	TechStackSuggester,
} from "../../lib/analysis/tech-stack-suggester.js";
import { ConfigLoader } from "../../lib/config/config-loader.js";
import { getRefFilePath, REF_FILES } from "../../lib/config/config-paths.js";
import { LLMRequiredError } from "../../lib/core/errors.js";
import { InteractiveSelect } from "../../lib/input/index.js";
import { Colors, Separator, Text } from "../../lib/ui/components.js";
import { LoadingSpinner } from "../../lib/ui/spinner.js";
import { StreamDisplay } from "../../lib/utils/stream-display.js";
import { BaseCommand, type CommandResult } from "../base.js";

interface TechStackChoice {
	name: string;
	value: number | string;
	description: string;
}

export class PrdGenerateArchCommand extends BaseCommand {
	protected override requiresLLM = true;

	async execute(
		prdFile?: string,
		instructions?: string,
	): Promise<CommandResult> {
		// Validate LLM availability if not in MCP mode
		this.validateLLM("prd:generate-arch");

		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();
		const prdsDir = path.join(paths.tasksDir, "prds");

		// Check if PRDs directory exists
		if (!fs.existsSync(prdsDir)) {
			return this.failure(
				"No PRDs found",
				["PRDs directory does not exist"],
				"Create a PRD first using: taskflow prd create",
			);
		}

		// Get list of PRD files
		const prdFiles = fs
			.readdirSync(prdsDir)
			.filter((file) => file.endsWith(".md"))
			.sort()
			.reverse(); // Most recent first

		if (prdFiles.length === 0) {
			return this.failure(
				"No PRDs found",
				["No PRD files found in the prds directory"],
				"Create a PRD first using: taskflow prd create",
			);
		}

		// Interactive file selection if not provided
		let selectedFile: string;
		if (prdFile) {
			// Validate provided file
			const fullPath = prdFile.endsWith(".md")
				? path.join(prdsDir, prdFile)
				: path.join(prdsDir, `${prdFile}.md`);

			if (!fs.existsSync(fullPath)) {
				return this.failure(
					"PRD file not found",
					[`File not found: ${prdFile}`],
					`Available files:\n${prdFiles.map((f) => `  • ${f}`).join("\n")}`,
				);
			}

			selectedFile = fullPath;
		} else {
			// Interactive selection
			console.log(Text.heading("📄 Select PRD for Architecture Generation"));
			console.log(Separator.light(70));

			const choices = prdFiles.map((file) => {
				const stats = fs.statSync(path.join(prdsDir, file));
				return {
					name: file,
					value: file,
					description: `Modified: ${stats.mtime.toLocaleDateString()}`,
				};
			});

			const selected = await InteractiveSelect.single(
				"Select PRD file to use:",
				choices,
			);

			selectedFile = path.join(prdsDir, selected);
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
		const prdContent = fs.readFileSync(selectedFile, "utf-8");

		// If LLM is not available, fallback to guidance
		if (!this.isLLMAvailable()) {
			return this.getGuidanceResult(
				path.basename(selectedFile),
				selectedFile,
				getRefFilePath(paths.refDir, REF_FILES.codingStandards),
				getRefFilePath(paths.refDir, REF_FILES.architectureRules),
				paths,
			);
		}

		// STEP 1: Detect existing tech stack
		console.log(Text.heading("EXISTING TECH STACK"));
		const spinner = new LoadingSpinner();
		spinner.start({ text: "Scanning codebase for existing technologies..." });

		const detector = new TechStackDetector(this.context.projectRoot);
		const detectedStack = await detector.detect();
		const isGreenfield = detector.isGreenfield();

		spinner.stop();

		if (
			!isGreenfield &&
			Object.keys(detectedStack).some((k) => {
				const key = k as keyof TechStack;
				const items = detectedStack[key];
				return items && items.length > 0;
			})
		) {
			// Brownfield: Show detected stack
			console.log(Text.success("Detected existing tech stack:"));
			const formatted = detector.formatStack(detectedStack);
			formatted.forEach((line) => {
				console.log(Text.info(line));
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
					path.basename(selectedFile),
					paths,
					instructions,
				);
			}
		} else {
			console.log(
				Text.info("No existing tech stack detected (Greenfield project)."),
			);
		}

		// STEP 2: Suggest tech stack options (greenfield or user rejected detected)
		console.log("");
		console.log(Text.heading("SUGGESTED TECH STACK"));
		const suggestionSpinner = new LoadingSpinner();
		suggestionSpinner.start({
			text: "Analyzing PRD to suggest appropriate tech stacks...",
		});

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
		suggestionSpinner.stop();

		// Display options
		console.log(Text.section("RECOMMENDED STACKS"));
		options.forEach((option, i) => {
			const marker = option.recommended ? Text.success("✓ RECOMMENDED") : "";
			console.log(Text.question(i + 1, `${option.name} ${marker}`));
			console.log(Text.muted(`    ${option.description}\n`));

			console.log("    Technologies:");
			if (
				option.technologies.frontend &&
				option.technologies.frontend.length > 0
			) {
				console.log(
					Colors.primary(
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
					Colors.primary(
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
					Colors.primary(
						`      Database: ${option.technologies.database
							.map((t) => t.name)
							.join(", ")}`,
					),
				);
			}

			console.log("\n    Pros:");
			option.pros.forEach((pro) => {
				console.log(Text.success(`      ${pro}`));
			});

			console.log("\n    Cons:");
			option.cons.forEach((con) => {
				console.log(Text.warning(`      ${con}`));
			});

			console.log("\n    Best for:");
			option.bestFor.forEach((use) => {
				console.log(Text.bullet(`      ${use}`));
			});

			console.log(`\n${"─".repeat(60)}\n`);
		});

		// Get user choice with interactive selection
		console.log(Text.heading("Select Tech Stack"));
		console.log(Separator.light(70));

		const techStackChoices: Array<TechStackChoice> = options.map(
			(option, i) => {
				const marker = option.recommended ? Text.success("✓ Recommended") : "";
				const techList = [
					option.technologies.frontend?.map((t) => t.name).join(", "),
					option.technologies.backend?.map((t) => t.name).join(", "),
					option.technologies.database?.map((t) => t.name).join(", "),
				]
					.filter(Boolean)
					.join("; ");

				return {
					name: `${option.name} ${marker}`,
					value: i,
					description: `${option.description} | ${techList}`,
				};
			},
		);

		// Add custom option
		const customChoice: TechStackChoice = {
			name: Colors.bold("Custom Stack"),
			value: "custom",
			description: "Define your own tech stack",
		};
		techStackChoices.push(customChoice);

		const selected = await InteractiveSelect.single<number | string>(
			"Select tech stack:",
			techStackChoices,
		);

		let selectedOption: TechStackOption | undefined;

		if (selected === "custom") {
			// Custom option - prompt and allow back navigation
			selectedOption = await this.promptCustomStackWithBack(options);
		} else {
			selectedOption = options[selected as number];
		}

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
			path.basename(selectedFile),
			paths,
			instructions,
		);
	}

	private async promptCustomStackWithBack(
		options: TechStackOption[],
	): Promise<TechStackOption> {
		const rl = readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		const ask = (q: string): Promise<string> => {
			return new Promise((resolve) => {
				rl.question(`${Colors.primary(q)} `, (ans) => {
					resolve(ans.trim());
				});
			});
		};

		console.log(Text.section("CUSTOM TECH STACK"));
		console.log(
			Text.info("Describe your desired tech stack in natural language."),
		);
		console.log(
			Text.muted(
				"Example: Vanilla HTML/CSS/JS with no build tools, or Python Flask + React",
			),
		);
		console.log(Text.muted("Type 'back' to return to the suggested stacks.\n"));

		const description = await ask("Enter your preferred stack (or 'back'):");

		// Check for back navigation
		if (
			description.toLowerCase() === "back" ||
			description.toLowerCase() === "b"
		) {
			rl.close();

			// Return to stack selection
			const techStackChoices: Array<TechStackChoice> = options.map(
				(option, i) => {
					const marker = option.recommended
						? Text.success("✓ Recommended")
						: "";
					const techList = [
						option.technologies.frontend?.map((t) => t.name).join(", "),
						option.technologies.backend?.map((t) => t.name).join(", "),
						option.technologies.database?.map((t) => t.name).join(", "),
					]
						.filter(Boolean)
						.join("; ");

					return {
						name: `${option.name} ${marker}`,
						value: i,
						description: `${option.description} | ${techList}`,
					};
				},
			);

			// Add custom option
			const customChoice: TechStackChoice = {
				name: Colors.bold("Custom Stack"),
				value: "custom",
				description: "Define your own tech stack",
			};
			techStackChoices.push(customChoice);

			const selected = await InteractiveSelect.single<number | string>(
				"Select tech stack:",
				techStackChoices,
			);

			if (selected === "custom") {
				// Recursive call for custom
				return this.promptCustomStackWithBack(options);
			}

			const idx = selected as number;
			if (idx >= 0 && idx < options.length) {
				const option = options[idx];
				if (!option) {
					throw new Error("Invalid selection index");
				}
				return option;
			}
			throw new Error("Invalid selection index");
		}

		rl.close();

		if (!description) {
			console.log(Text.warning("No description provided."));
			return this.promptCustomStackWithBack(options);
		}

		// Use LLM to structure the custom stack
		const spinner = new LoadingSpinner();
		spinner.start({ text: "Structuring custom tech stack..." });

		if (!this.llmProvider) {
			throw new LLMRequiredError("LLM provider not available");
		}

		const systemPrompt = `You are a technical architect. Convert the user's tech stack description into a structured JSON format.

Output ONLY valid JSON matching this interface:
interface TechStackOption {
	id: string; // "custom"
	name: string; // Short name e.g. "Vanilla JS"
	description: string;
	technologies: {
		frontend?: { name: string; package?: string; version?: string }[];
		backend?: { name: string; package?: string; version?: string }[];
		database?: { name: string; package?: string; version?: string }[];
		devops?: { name: string; package?: string; version?: string }[];
	};
	pros: string[];
	cons: string[];
	bestFor: string[];
	recommended: boolean; // always true for custom
}
`;

		const userPrompt = `Create a structured tech stack option for this description: "${description}"`;

		const response = await this.llmProvider.generate(
			[
				{ role: "system", content: systemPrompt },
				{ role: "user", content: userPrompt },
			],
			{
				temperature: 0.1,
			},
		);

		spinner.stop();

		try {
			let jsonContent = response.content.trim();
			if (jsonContent.startsWith("```")) {
				jsonContent = jsonContent
					.replace(/```json\n?/g, "")
					.replace(/```\n?/g, "");
			}
			const parsed = JSON.parse(jsonContent);
			parsed.id = "custom";
			parsed.recommended = true;
			return parsed as TechStackOption;
		} catch (error) {
			console.error("Failed to parse custom stack", error);
			// Fallback to simple object
			return {
				id: "custom",
				name: "Custom Stack",
				description: description,
				technologies: {
					frontend: [{ name: description }],
				},
				pros: ["User selected"],
				cons: [],
				bestFor: ["Custom requirements"],
				recommended: true,
			};
		}
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

		// Generate tech-stack.md using streaming capture
		console.log(`\n${Text.section("GENERATING TECH STACK DOCUMENTATION")}`);

		const techStackContent = await this.generateTechStackWithLLM(
			prdContent,
			selectedOption,
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
					Text.error("LLM generation failed, falling back to guidance."),
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

	/**
	 * Generate tech stack using LLM with streaming capture
	 */
	private async generateTechStackWithLLM(
		prdContent: string,
		selectedOption: TechStackOption,
	): Promise<string> {
		if (!this.llmProvider) {
			throw new LLMRequiredError("LLM provider not available");
		}

		const spinner = new LoadingSpinner();
		spinner.start({ text: "Generating tech-stack.md..." });

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

		const messages = [
			{ role: "system" as const, content: systemPrompt },
			{ role: "user" as const, content: userPrompt },
		];

		const options = {
			maxTokens: 8192,
			temperature: 0.3,
		};

		const stream = this.generateStream(messages, options);
		const display = new StreamDisplay("Generating Tech Stack");
		let content = "";
		let isFirstChunk = true;

		while (true) {
			const result = await stream.next();
			if (result.done) {
				// The return value is in result.value when done is true
				content = result.value || "";
				break;
			}
			const chunk = result.value;
			if (isFirstChunk) {
				spinner.stop();
				isFirstChunk = false;
			}
			display.handleChunk(chunk);
		}

		display.finish();

		if (!content) {
			throw new Error("Failed to generate tech stack");
		}

		// Strip markdown delimiters if present
		content = content.replace(/```markdown\n?/g, "").replace(/```\n?/g, "");

		// Check length warning
		const lineCount = content.split("\n").length;
		if (lineCount > 125) {
			console.warn(
				Text.warning(
					`tech-stack.md is ${lineCount} lines (limit: 125). Consider simplifying.`,
				),
			);
		}

		return content;
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
			rl.question(
				`${Colors.primary(question)} ${Colors.muted(suffix)} `,
				(ans) => {
					rl.close();
					resolve(ans.trim().toLowerCase());
				},
			);
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
				Text.heading(`PRD LOADED: ${prdFile}`),
				"",
				Text.section("TASK"),
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

		// Strip markdown delimiters from content
		const cleanTechStackContent = techStackContent
			.replace(/```markdown\n?/g, "")
			.replace(/```\n?/g, "");
		const cleanCodingStandardsContent = codingStandardsContent
			.replace(/```markdown\n?/g, "")
			.replace(/```\n?/g, "");
		const cleanArchitectureRulesContent = architectureRulesContent
			.replace(/```markdown\n?/g, "")
			.replace(/```\n?/g, "");

		// Write files
		const techStackPath = getRefFilePath(refDir, "tech-stack.md");
		fs.writeFileSync(techStackPath, cleanTechStackContent, "utf-8");
		fs.writeFileSync(codingStandardsPath, cleanCodingStandardsContent, "utf-8");
		fs.writeFileSync(
			architectureRulesPath,
			cleanArchitectureRulesContent,
			"utf-8",
		);

		return this.success(
			[
				Text.success(`Generated tech-stack.md`),
				Text.success(`Generated coding-standards.md`),
				Text.success(`Generated architecture-rules.md`),
				"",
				Text.section("FILES CREATED"),
				Text.bullet(techStackPath),
				Text.bullet(codingStandardsPath),
				Text.bullet(architectureRulesPath),
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
		const spinner = new LoadingSpinner();
		spinner.start({ text: "Generating coding-standards.md..." });

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
			maxTokens: 8192,
			temperature: 0.3,
		};

		const stream = this.generateStream(messages, options);
		const display = new StreamDisplay("Generating Coding Standards");
		let content = "";
		let isFirstChunk = true;

		while (true) {
			const result = await stream.next();
			if (result.done) {
				// The return value is in result.value when done is true
				content = result.value || "";
				break;
			}
			const chunk = result.value;
			if (isFirstChunk) {
				spinner.stop();
				isFirstChunk = false;
			}
			display.handleChunk(chunk);
		}

		display.finish();

		if (!content) {
			throw new Error("Failed to generate coding standards");
		}

		// Check length warning
		const lineCount = content.split("\n").length;
		if (lineCount > 125) {
			console.warn(
				Text.warning(
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
		const spinner = new LoadingSpinner();
		spinner.start({ text: "Generating architecture-rules.md..." });

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
			maxTokens: 8192,
			temperature: 0.3,
		};

		const stream = this.generateStream(messages, options);
		const display = new StreamDisplay("Generating Architecture Rules");
		let content = "";
		let isFirstChunk = true;

		while (true) {
			const result = await stream.next();
			if (result.done) {
				// The return value is in result.value when done is true
				content = result.value || "";
				break;
			}
			const chunk = result.value;
			if (isFirstChunk) {
				spinner.stop();
				isFirstChunk = false;
			}
			display.handleChunk(chunk);
		}

		display.finish();

		if (!content) {
			throw new Error("Failed to generate architecture rules");
		}

		// Check length warning
		const lineCount = content.split("\n").length;
		if (lineCount > 125) {
			console.warn(
				Text.warning(
					`architecture-rules.md is ${lineCount} lines (limit: 125). Consider simplifying.`,
				),
			);
		}

		return content;
	}
}
