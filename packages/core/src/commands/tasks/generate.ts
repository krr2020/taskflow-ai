/**
 * Tasks Generate command - Generate task breakdown from PRD
 */

import fs from "node:fs";
import path from "node:path";
import pc from "picocolors";
import { ConfigLoader } from "../../lib/config-loader.js";
import {
	getRefFilePath,
	getSkillFilePath,
	REF_FILES,
	SKILL_FILES,
} from "../../lib/config-paths.js";
import { saveFeature, saveProjectIndex } from "../../lib/data-access.js";
import { LLMRequiredError } from "../../lib/errors.js";
import { StreamDisplay } from "../../lib/stream-display.js";
import { TerminalFormatter } from "../../lib/terminal-formatter.js";
import type {
	Feature,
	TaskflowConfig,
	TaskRef,
	TasksProgress,
} from "../../lib/types.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class TasksGenerateCommand extends BaseCommand {
	protected override requiresLLM = true;

	async execute(prdFile?: string): Promise<CommandResult> {
		// Validate LLM availability if not in MCP mode
		this.validateLLM("tasks:generate");

		const configLoader = new ConfigLoader(this.context.projectRoot);
		const config = configLoader.load();
		const paths = configLoader.getPaths();

		// Resolve PRD file path
		const prdsDir = path.join(paths.tasksDir, "prds");
		const prdFilePath = prdFile ? path.join(prdsDir, prdFile) : null;

		// Scan for all PRDs if no file specified
		let availablePrds: string[] = [];
		if (fs.existsSync(prdsDir)) {
			availablePrds = fs.readdirSync(prdsDir).filter((f) => f.endsWith(".md"));
		}

		// Validate PRD file parameter
		if (
			prdFile &&
			availablePrds.length > 0 &&
			!availablePrds.includes(prdFile)
		) {
			return this.failure(
				"PRD file not found",
				[`PRD file does not exist: ${prdFilePath}`],
				[
					"Available PRDs:",
					...availablePrds.map((p) => `  - ${p}`),
					"",
					"Options:",
					"1. Check the filename and try again",
					"2. Run without arguments to see all PRDs",
					"3. Create a new PRD: taskflow prd create <feature-name>",
				].join("\n"),
			);
		}

		if (availablePrds.length === 0) {
			return this.failure(
				"No PRDs found",
				["No PRD files found in tasks/prds/"],
				[
					"Create a PRD first:",
					"  taskflow prd create <feature-name>",
					"",
					"Then generate tasks from it.",
				].join("\n"),
			);
		}

		// Check if tasks already exist (don't block, just inform AI)
		const progressFilePath = path.join(paths.tasksDir, "tasks-progress.json");

		// Check if architecture files exist
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

		// Build output messages
		const outputParts: string[] = [];

		if (availablePrds.length > 1 && !prdFile) {
			outputParts.push(TerminalFormatter.header("AVAILABLE PRDs"));

			availablePrds.forEach((p, i) => {
				const isGenerated = fs.existsSync(progressFilePath);
				const status = isGenerated ? pc.green("(tasks generated ✓)") : "";
				outputParts.push(TerminalFormatter.question(i + 1, `${p} ${status}`));
			});

			outputParts.push("");
			outputParts.push(TerminalFormatter.section("DECISION NEEDED"));
			outputParts.push(pc.dim("AI Agent should:"));
			outputParts.push(pc.dim("  1. Analyze project context"));
			outputParts.push(
				pc.dim("  2. Determine which PRD(s) to generate tasks for"),
			);
			outputParts.push(
				pc.dim("  3. Consider: Is this adding features to existing project?"),
			);
			outputParts.push(
				pc.dim("  4. Select appropriate PRD or combine multiple PRDs"),
			);

			outputParts.push("");
			outputParts.push(TerminalFormatter.section("OPTIONS"));
			outputParts.push(pc.white("  • Generate tasks for specific PRD:"));
			outputParts.push(pc.cyan("    taskflow tasks generate <filename>"));
			outputParts.push(
				pc.white("  • Generate for all ready PRDs (if appropriate)"),
			);
			outputParts.push(
				pc.white("  • Combine related PRDs into one feature set"),
			);
		} else if (prdFile) {
			outputParts.push(TerminalFormatter.header(`PRD LOADED: ${prdFile}`));

			if (!codingStandardsExist || !architectureRulesExist) {
				outputParts.push(
					TerminalFormatter.warning(
						"Architecture files missing - Run: taskflow prd generate-arch",
					),
				);
			}

			outputParts.push(
				codingStandardsExist
					? TerminalFormatter.success("coding-standards.md found")
					: TerminalFormatter.warning("coding-standards.md missing"),
			);
			outputParts.push(
				architectureRulesExist
					? TerminalFormatter.success("architecture-rules.md found")
					: TerminalFormatter.warning("architecture-rules.md missing"),
			);

			outputParts.push("");
			outputParts.push(TerminalFormatter.section("TASK"));
			outputParts.push(
				pc.white("Generate a complete task breakdown from PRD."),
			);
			outputParts.push(
				pc.dim("Create features, stories, and tasks with proper dependencies."),
			);
		}

		// Add existing tasks warning if applicable
		const existingTasks = fs.existsSync(progressFilePath);
		if (existingTasks) {
			outputParts.push("");
			outputParts.push(TerminalFormatter.header("EXISTING TASKS DETECTED"));
			outputParts.push(pc.yellow(`File: ${progressFilePath} exists`));
			outputParts.push("");

			outputParts.push(TerminalFormatter.section("OPTIONS"));
			outputParts.push(
				pc.white("1. APPEND: Add new PRDs to existing structure"),
			);
			outputParts.push(
				pc.white("2. MERGE: Combine new PRDs with existing tasks"),
			);
			outputParts.push(
				pc.white(
					"3. RESET: Delete existing and regenerate (CAUTION: loses progress)",
				),
			);
			outputParts.push(pc.white("4. SELECTIVE: Generate only specific PRDs"));
			outputParts.push("");
			outputParts.push(
				pc.dim(
					"AI Agent should decide based on project state and user intent.",
				),
			);
		}

		// Try to generate with LLM if available and PRD file is specified
		if (this.isLLMAvailable() && prdFile && prdFilePath) {
			return await this.executeWithFallback(
				async () => {
					// Read PRD content
					const prdContent = fs.readFileSync(prdFilePath, "utf-8");

					return await this.generateTasksWithLLM(
						prdContent,
						prdFile,
						paths.tasksDir,
						paths.refDir,
						config.project?.name || "project",
					);
				},
				() => {
					// Fallback to manual guidance
					console.error("LLM generation failed, falling back to guidance.");
					return this.getGuidanceResult(
						outputParts,
						progressFilePath,
						paths,
						config,
						prdFilePath,
						codingStandardsPath,
						architectureRulesPath,
					);
				},
				"Task Generation",
			);
		}

		return this.getGuidanceResult(
			outputParts,
			progressFilePath,
			paths,
			config,
			prdFilePath,
			codingStandardsPath,
			architectureRulesPath,
		);
	}

	private getGuidanceResult(
		outputParts: string[],
		progressFilePath: string,
		paths: ReturnType<ConfigLoader["getPaths"]>,
		config: TaskflowConfig,
		prdFilePath: string | null,
		codingStandardsPath: string,
		architectureRulesPath: string,
	): CommandResult {
		// Get all available skill files
		const availableSkills = Object.values(SKILL_FILES)
			.map((skillFile) => {
				const skillPath = getSkillFilePath(
					paths.refDir,
					skillFile.replace("skills/", "").replace(".md", ""),
				);
				return fs.existsSync(skillPath)
					? skillFile.replace("skills/", "").replace(".md", "")
					: null;
			})
			.filter(Boolean);

		return this.success(
			outputParts.join("\n"),
			[
				"This is an AI-assisted task. The breakdown will be created as:",
				`  ${progressFilePath}`,
				"",
				"The AI will:",
				"1. Analyze the PRD and architecture files",
				"2. Break down features into stories",
				"3. Break down stories into atomic tasks",
				"4. Assign skill types to tasks",
				"5. Define task dependencies",
				"6. Create detailed task files",
				"",
				"After generation:",
				"  taskflow status    (view the breakdown)",
				"  taskflow next      (find first task)",
				"  taskflow start <id> (start working)",
			].join("\n"),
			{
				aiGuidance: [
					"Generate Task Breakdown from PRD",
					"",
					"YOUR MISSION:",
					"──────────────",
					"Transform the PRD into a structured, executable task breakdown.",
					"Each task must be atomic, testable, and clearly scoped.",
					"",
					"CRITICAL FILES TO READ:",
					"────────────────────────",
					`1. ${prdFilePath} - Feature requirements`,
					`2. ${codingStandardsPath} - Coding standards`,
					`3. ${architectureRulesPath} - Architecture rules`,
					`4. ${getRefFilePath(paths.refDir, REF_FILES.taskGenerator)} - Task generation guidelines`,
					`5. ${getRefFilePath(paths.refDir, REF_FILES.aiProtocol)} - AI operating discipline`,
					"",
					"UNDERSTANDING THE HIERARCHY:",
					"─────────────────────────────",
					"Project",
					"└── Features (major functional areas)",
					"    └── Stories (user-facing scenarios)",
					"        └── Tasks (atomic implementation units)",
					"",
					"FEATURE (N):",
					"- Represents a major functional area",
					"- Examples: Authentication, Payment Processing, Dashboard",
					"- Has multiple stories",
					"- ID format: 1, 2, 3...",
					"",
					"STORY (N.M):",
					"- Represents a user-facing scenario or flow",
					"- Examples: User Login, Password Reset, Profile Update",
					"- Has multiple tasks",
					"- Each story gets its own git branch",
					"- ID format: 1.1, 1.2, 2.1...",
					"",
					"TASK (N.M.K):",
					"- Atomic unit of work (1-4 hours)",
					"- Must be independently testable",
					"- Has clear acceptance criteria",
					"- Assigned a skill type",
					"- May have dependencies on other tasks",
					"- ID format: 1.1.0, 1.1.1, 1.2.0...",
					"",
					"TASK DECOMPOSITION RULES:",
					"───────────────────────────",
					"1. ATOMIC: Each task is a single, focused change",
					"2. TESTABLE: Clear acceptance criteria",
					"3. INDEPENDENT: Minimal dependencies (use dependencies field when needed)",
					"4. SCOPED: 1-4 hours of work",
					"5. SKILL-SPECIFIC: Assigned to one skill domain",
					"",
					"BAD Task: 'Implement user authentication'",
					"GOOD Tasks:",
					"  - 1.1.0: Create User model and migration (backend)",
					"  - 1.1.1: Implement password hashing utility (backend)",
					"  - 1.1.2: Create login API endpoint (backend)",
					"  - 1.1.3: Add JWT token generation (backend)",
					"  - 1.2.0: Create login form component (frontend)",
					"  - 1.2.1: Implement form validation (frontend)",
					"  - 1.2.2: Integrate login API call (frontend)",
					"",
					"SKILL TYPES:",
					"─────────────",
					`Available: ${availableSkills.join(", ")}`,
					"",
					"Assign based on primary work:",
					"- backend: API, database, business logic",
					"- frontend: UI components, state, routing",
					"- fullstack: Both frontend and backend changes",
					"- devops: Infrastructure, CI/CD, deployment",
					"- docs: Documentation, README, guides",
					"- mobile: Mobile-specific implementation",
					"",
					"DEPENDENCY MANAGEMENT:",
					"───────────────────────",
					"Use dependencies array to specify order:",
					"",
					"Example:",
					'Task 1.1.2 "Create login endpoint" depends on 1.1.0 "Create User model"',
					"dependencies: ['1.1.0']",
					"",
					"Rules:",
					"- Tasks can only depend on tasks in same or earlier stories",
					"- Minimize dependencies (prefer independent tasks)",
					"- Be explicit about technical dependencies",
					"",
					"OUTPUT FORMAT:",
					"───────────────",
					`Create: ${progressFilePath}`,
					"",
					"Structure:",
					"```json",
					"{",
					`  "project": "${config.project}",`,
					'  "features": [',
					"    {",
					'      "id": "1",',
					'      "title": "Feature name",',
					'      "description": "Feature description",',
					'      "status": "not-started",',
					'      "stories": [',
					"        {",
					'          "id": "1.1",',
					'          "title": "Story name",',
					'          "description": "Story description",',
					'          "status": "not-started",',
					'          "tasks": [',
					"            {",
					'              "id": "1.1.0",',
					'              "title": "Task name",',
					'              "status": "not-started",',
					'              "dependencies": []',
					"            }",
					"          ]",
					"        }",
					"      ]",
					"    }",
					"  ]",
					"}",
					"```",
					"",
					"TASK FILES:",
					"────────────",
					"For each task, create a detailed file:",
					`Location: ${paths.tasksDir}/F<feature>/S<story>/T<task>.json`,
					"",
					"Example: tasks/F1/S1.1/T1.1.0.json",
					"",
					"Task file structure:",
					"```json",
					"{",
					'  "id": "1.1.0",',
					'  "title": "Task title",',
					'  "description": "Detailed description of what needs to be done",',
					'  "skill": "backend",',
					'  "status": "not-started",',
					'  "estimatedHours": 2,',
					'  "context": [',
					'    "path/to/relevant/file.ts - Existing pattern to follow",',
					'    "path/to/another/file.ts - Integration point"',
					"  ],",
					'  "subtasks": [',
					"    {",
					'      "id": "1",',
					'      "description": "Create database migration",',
					'      "status": "not-started"',
					"    },",
					"    {",
					'      "id": "2",',
					'      "description": "Implement model with validation",',
					'      "status": "not-started"',
					"    },",
					"    {",
					'      "id": "3",',
					'      "description": "Add unit tests",',
					'      "status": "not-started"',
					"    }",
					"  ],",
					'  "acceptanceCriteria": [',
					'    "User table exists with required fields",',
					'    "Migration runs without errors",',
					'    "All tests pass"',
					"  ]",
					"}",
					"```",
					"",
					"PROCESS:",
					"─────────",
					"1. READ all context files listed above",
					"",
					"2. ANALYZE the PRD:",
					"   - What are the major features?",
					"   - What are the user stories?",
					"   - What are the technical requirements?",
					"",
					"3. ANALYZE the codebase:",
					"   - What is the current structure?",
					"   - What patterns should tasks follow?",
					"   - What files will tasks modify?",
					"",
					"4. CREATE the breakdown:",
					"   - Define features (high-level areas)",
					"   - Define stories (user-facing flows)",
					"   - Define tasks (atomic implementation units)",
					"",
					"5. CREATE task files:",
					"   - One file per task",
					"   - Include context files",
					"   - Define clear subtasks",
					"   - Set acceptance criteria",
					"",
					"6. WRITE tasks-progress.json:",
					"   - Complete hierarchy",
					"   - All IDs correct",
					"   - Dependencies properly set",
					"",
					"VALIDATION:",
					"────────────",
					"Before finalizing, verify:",
					"□ Each task is atomic (can't be split further)",
					"□ Each task has clear acceptance criteria",
					"□ Dependencies are minimal and correct",
					"□ Task IDs follow N.M.K format",
					"□ Skills are assigned appropriately",
					"□ Context files are relevant",
					"□ Subtasks are specific and actionable",
					"□ All tasks together implement the complete PRD",
					"",
					"EXAMPLES OF GOOD BREAKDOWN:",
					"─────────────────────────────",
					"Feature 1: User Authentication",
					"  Story 1.1: User Login",
					"    Task 1.1.0: Create User model (backend)",
					"    Task 1.1.1: Implement password hashing (backend)",
					"    Task 1.1.2: Create login endpoint (backend, deps: 1.1.0, 1.1.1)",
					"    Task 1.1.3: Add JWT generation (backend)",
					"  Story 1.2: Login UI",
					"    Task 1.2.0: Create login form component (frontend)",
					"    Task 1.2.1: Add form validation (frontend)",
					"    Task 1.2.2: Integrate login API (frontend, deps: 1.1.2)",
					"  Story 1.3: Password Reset",
					"    Task 1.3.0: Create reset token model (backend)",
					"    Task 1.3.1: Create password reset endpoint (backend, deps: 1.3.0)",
					"    Task 1.3.2: Create reset form UI (frontend)",
					"",
					"CRITICAL RULES:",
					"────────────────",
					"1. DO read task-generator.md completely",
					"2. DO analyze the codebase before generating tasks",
					"3. DO make tasks atomic and independently testable",
					"4. DO assign realistic skill types",
					"5. DO include context files that exist in the codebase",
					"6. DO NOT create vague or overly broad tasks",
					"7. DO NOT skip creating task files",
					"8. DO NOT ignore the architecture rules",
					"",
					"WHEN COMPLETE:",
					"───────────────",
					"Files created:",
					`✓ ${progressFilePath}`,
					"✓ tasks/F<N>/S<N.M>/T<N.M.K>.json (for each task)",
					"",
					"User can then:",
					"1. Run: taskflow status (see the breakdown)",
					"2. Run: taskflow next (find first available task)",
					"3. Run: taskflow start <task-id> (start working)",
				].join("\n"),
				contextFiles: [
					...(prdFilePath ? [`${prdFilePath} - PRD with requirements`] : []),
					`${codingStandardsPath} - Project coding standards`,
					`${architectureRulesPath} - Project architecture rules`,
					`${getRefFilePath(paths.refDir, REF_FILES.taskGenerator)} - Task generation guidelines`,
					`${getRefFilePath(paths.refDir, REF_FILES.aiProtocol)} - AI operating discipline`,
					"All skill files in .taskflow/ref/skills/",
				],
				warnings: [
					"DO NOT create overly broad tasks - break them down",
					"DO NOT skip reading task-generator.md",
					"DO NOT invent context files - reference actual codebase files",
					"DO ensure every task has clear acceptance criteria",
					"DO make sure task IDs follow the N.M.K format exactly",
				],
			},
		);
	}

	/**
	 * Generate tasks using LLM
	 */
	private async generateTasksWithLLM(
		prdContent: string,
		prdFile: string,
		tasksDir: string,
		refDir: string,
		projectName: string,
	): Promise<CommandResult> {
		if (!this.llmProvider) {
			throw new LLMRequiredError("LLM provider not available");
		}

		// Load context files
		const contextFiles: { name: string; content: string }[] = [];

		// Load task-generator.md
		const taskGeneratorPath = getRefFilePath(refDir, REF_FILES.taskGenerator);
		if (fs.existsSync(taskGeneratorPath)) {
			contextFiles.push({
				name: REF_FILES.taskGenerator,
				content: fs.readFileSync(taskGeneratorPath, "utf-8"),
			});
		}

		// Load coding-standards.md
		const codingStandardsPath = getRefFilePath(
			refDir,
			REF_FILES.codingStandards,
		);
		if (fs.existsSync(codingStandardsPath)) {
			contextFiles.push({
				name: REF_FILES.codingStandards,
				content: fs.readFileSync(codingStandardsPath, "utf-8"),
			});
		}

		// Load architecture-rules.md
		const architectureRulesPath = getRefFilePath(
			refDir,
			REF_FILES.architectureRules,
		);
		if (fs.existsSync(architectureRulesPath)) {
			contextFiles.push({
				name: REF_FILES.architectureRules,
				content: fs.readFileSync(architectureRulesPath, "utf-8"),
			});
		}

		// Load ai-protocol.md
		const aiProtocolPath = getRefFilePath(refDir, REF_FILES.aiProtocol);
		if (fs.existsSync(aiProtocolPath)) {
			contextFiles.push({
				name: REF_FILES.aiProtocol,
				content: fs.readFileSync(aiProtocolPath, "utf-8"),
			});
		}

		// Generate tasks JSON
		const tasksData = await this.generateTasksJSON(
			prdContent,
			contextFiles,
			projectName,
		);

		// Create task structure
		await this.createTaskStructure(tasksDir, tasksData);

		// Convert to TasksProgress for saving
		const tasksProgress: TasksProgress = {
			project: tasksData.project,
			features: tasksData.features.map((f) => ({
				...f,
				status: f.status as
					| "not-started"
					| "in-progress"
					| "completed"
					| "blocked"
					| "on-hold",
				stories: f.stories.map((s) => ({
					...s,
					status: s.status as
						| "not-started"
						| "in-progress"
						| "completed"
						| "blocked"
						| "on-hold",
					tasks: s.tasks.map((t) => {
						const {
							description: _desc,
							skill: _skill,
							estimatedHours: _est,
							context: _ctx,
							subtasks: _sub,
							acceptanceCriteria: _acc,
							...taskRef
						} = t;
						return taskRef as TaskRef;
					}),
				})),
			})),
		};

		// Write tasks progress
		await this.writeTasksProgress(tasksDir, tasksData);

		// Save project index (required for loading progress)
		saveProjectIndex(tasksDir, tasksProgress);

		return this.success(
			[
				TerminalFormatter.success(`Generated task breakdown from ${prdFile}`),
				"",
				TerminalFormatter.section("TASK HIERARCHY"),
				pc.white(`  Features: ${tasksData.features.length}`),
				pc.white(
					`  Stories: ${tasksData.features.reduce((sum, f) => sum + f.stories.length, 0)}`,
				),
				pc.white(
					`  Tasks: ${tasksData.features.reduce((sum, f) => sum + f.stories.reduce((s, st) => s + st.tasks.length, 0), 0)}`,
				),
				"",
				TerminalFormatter.section("FILES CREATED"),
				pc.cyan(`  - ${path.join(tasksDir, "tasks-progress.json")}`),
				pc.cyan(`  - Task files in ${tasksDir}/F*/S*/`),
			].join("\n"),
			[
				"Next steps:",
				"",
				"1. Review the generated task breakdown:",
				"   taskflow status",
				"",
				"2. Find the first task to work on:",
				"   taskflow next",
				"",
				"3. Start working on a task:",
				"   taskflow start <task-id>",
			].join("\n"),
		);
	}

	/**
	 * Generate tasks JSON using LLM
	 */
	private async generateTasksJSON(
		prdContent: string,
		contextFiles: Array<{ name: string; content: string }>,
		projectName: string,
	): Promise<TasksProgressWithDetails> {
		const llmProvider = this.llmProvider;
		if (!llmProvider) {
			throw new LLMRequiredError("LLM provider not available");
		}

		const systemPrompt = `You are an expert software architect and project planner.

Your mission is to analyze a PRD and break it down into a structured, executable task hierarchy.

CRITICAL RULES FOR TASK GRANULARITY:
1. CREATE FEWER, LARGER TASKS (not many small ones)
2. Each task should be a MEANINGFUL UNIT (30-90 minutes of work)
3. Tasks should touch MULTIPLE files and implement a complete sub-feature
4. AVOID creating separate tasks for simple steps like "create file", "add validation"
5. COMBINE related steps into single tasks (e.g., "Implement user persistence" includes migration + model + repository + service)

BAD (too granular):
  - Task 1.1.0: Create migration file
  - Task 1.1.1: Create User model
  - Task 1.1.2: Add validation to User model
  - Task 1.1.3: Create repository
  - Task 1.1.4: Add tests

GOOD (proper granularity):
  - Task 1.1.0: Implement user persistence layer (includes migration, model, validation, repository, tests)

TARGET:
- Simple features: 2-4 tasks total
- Medium features: 5-8 tasks total
- Complex features: 10-15 tasks total

For a "Simple Sudoku Website" you should create approximately:
- 1-2 features (e.g., "Game UI", "Game Logic")
- 2-3 stories per feature (e.g., "Initial board display", "User input", "Solution validation")
- 1-3 tasks per story
- TOTAL: ~6-10 tasks maximum

Task Hierarchy:
- Features: Major functional areas (ID: 1, 2, 3...)
- Stories: User-facing scenarios (ID: 1.1, 1.2, 2.1...)
- Tasks: Atomic implementation units (ID: 1.1.0, 1.1.1, 1.2.0...)

Each task must:
- Be independently testable
- Implement a complete sub-feature
- Have clear acceptance criteria
- Include multiple related files/changes

Available skills: backend, frontend, fullstack, devops, docs, mobile

Output ONLY valid JSON in this exact structure:
{
  "project": "project-name",
  "features": [
    {
      "id": "1",
      "title": "Feature name",
      "description": "Feature description",
      "status": "not-started",
      "stories": [
        {
          "id": "1.1",
          "title": "Story name",
          "description": "Story description",
          "status": "not-started",
          "tasks": [
            {
              "id": "1.1.0",
              "title": "Task title",
              "description": "Detailed task description",
              "skill": "backend",
              "status": "not-started",
              "estimatedHours": 2,
              "dependencies": [],
              "context": ["path/to/file.ts - Description"],
              "subtasks": [
                {
                  "id": "1",
                  "description": "Subtask description",
                  "status": "not-started"
                }
              ],
              "acceptanceCriteria": ["Criterion 1", "Criterion 2"]
            }
          ]
        }
      ]
    }
  ]
}`;

		const contextSection = contextFiles
			.map(
				(file) => `
=== ${file.name} ===
${file.content}
`,
			)
			.join("\n");

		// Compact PRD if needed (it's the largest component)
		const compactedPrd = await this.compactContextWithAI(
			prdContent,
			"PRD Content",
		);

		const userPrompt = `Generate a complete task breakdown for this PRD:

=== PRD ===
${compactedPrd}

${contextSection}

IMPORTANT:
- Output ONLY the JSON structure, no markdown code blocks or additional text
- Ensure all IDs follow the correct format (N, N.M, N.M.K)
- Keep tasks MEANINGFUL (30-90 minutes each)
- AVOID micro-tasks (combine related steps)
- Include clear acceptance criteria for each task
- Set appropriate dependencies between tasks`;

		const messages = [
			{ role: "system" as const, content: systemPrompt },
			{ role: "user" as const, content: userPrompt },
		];

		const options = {
			maxTokens: 8000,
			temperature: 0.2,
		};

		const stream = this.generateStream(messages, options);
		const display = new StreamDisplay("Generating Task Breakdown");
		let content = "";
		for await (const chunk of stream) {
			display.handleChunk(chunk);
			content += chunk;
		}
		display.finish();

		// Parse JSON response
		let tasksData: TasksProgressWithDetails;
		try {
			// Clean up response (remove markdown code blocks if present)
			let jsonContent = content.trim();
			if (jsonContent.startsWith("```")) {
				jsonContent = jsonContent
					.replace(/```json\n?/g, "")
					.replace(/```\n?/g, "");
			}

			tasksData = JSON.parse(jsonContent);
			tasksData.project = projectName; // Override with actual project name
		} catch (error) {
			throw new Error(
				`Failed to parse LLM response as JSON: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		return tasksData;
	}

	/**
	 * Create task file structure
	 */
	private async createTaskStructure(
		tasksDir: string,
		tasksData: TasksProgressWithDetails,
	): Promise<void> {
		for (const feature of tasksData.features) {
			// Set path and save feature
			feature.path = `F${feature.id}-${feature.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`;
			const featureDir = path.join(tasksDir, feature.path);
			fs.mkdirSync(featureDir, { recursive: true });

			// Save feature file (cast status to FeatureStatus)
			saveFeature(tasksDir, feature as Feature);

			for (const story of feature.stories) {
				const storyDir = path.join(
					featureDir,
					`S${story.id}-${story.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
				);
				fs.mkdirSync(storyDir, { recursive: true });

				for (const task of story.tasks) {
					const taskFilePath = path.join(
						storyDir,
						`T${task.id}-${task.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}.json`,
					);
					fs.writeFileSync(
						taskFilePath,
						JSON.stringify(task, null, 2),
						"utf-8",
					);
				}
			}
		}
	}

	/**
	 * Write tasks progress file
	 */
	private async writeTasksProgress(
		tasksDir: string,
		tasksData: TasksProgressWithDetails,
	): Promise<void> {
		// Convert to TasksProgress by removing extra fields
		const tasksProgress: TasksProgress = {
			project: tasksData.project,
			features: tasksData.features.map((f) => ({
				...f,
				status: f.status as
					| "not-started"
					| "in-progress"
					| "completed"
					| "blocked"
					| "on-hold",
				stories: f.stories.map((s) => ({
					...s,
					status: s.status as
						| "not-started"
						| "in-progress"
						| "completed"
						| "blocked"
						| "on-hold",
					tasks: s.tasks.map((t) => {
						const {
							description: _desc,
							skill: _skill,
							estimatedHours: _est,
							context: _ctx,
							subtasks: _sub,
							acceptanceCriteria: _acc,
							...taskRef
						} = t;
						return taskRef as TaskRef;
					}),
				})),
			})),
		};

		const progressFilePath = path.join(tasksDir, "tasks-progress.json");
		fs.writeFileSync(
			progressFilePath,
			JSON.stringify(tasksProgress, null, 2),
			"utf-8",
		);
	}
}

// Type for full task data from LLM (includes extra fields for task files)
interface TaskWithDetails extends TaskRef {
	description: string;
	skill: string;
	estimatedHours: number;
	context: string[];
	subtasks: Array<{ id: string; description: string; status: string }>;
	acceptanceCriteria: string[];
}

// Type for story with detailed tasks (status is string for flexibility with JSON parsing)
interface StoryWithDetails {
	id: string;
	title: string;
	status: string; // Will be validated/cast later
	tasks: TaskWithDetails[];
}

// Type for feature with detailed stories (status is string for flexibility with JSON parsing)
interface FeatureWithDetails {
	id: string;
	title: string;
	status: string; // Will be validated/cast later
	path?: string;
	stories: StoryWithDetails[];
}

// Type for tasks progress with detailed tasks (from LLM)
interface TasksProgressWithDetails {
	project: string;
	features: FeatureWithDetails[];
}
