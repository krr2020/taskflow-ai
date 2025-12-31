/**
 * Tasks Generate command - Generate task breakdown from PRD
 */

import fs from "node:fs";
import path from "node:path";
import { ConfigLoader } from "../../lib/config-loader.js";
import {
	getRefFilePath,
	getSkillFilePath,
	REF_FILES,
	SKILL_FILES,
} from "../../lib/config-paths.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class TasksGenerateCommand extends BaseCommand {
	async execute(prdFile: string): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const config = configLoader.load();
		const paths = configLoader.getPaths();

		// Validate PRD file parameter
		if (!prdFile || prdFile.trim().length === 0) {
			return this.failure(
				"PRD file is required",
				["You must specify the PRD file to generate tasks from"],
				[
					"Generate tasks from a PRD:",
					"  taskflow tasks generate <prd-filename>",
					"",
					"Example:",
					"  taskflow tasks generate 2024-01-15-user-auth.md",
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

		if (!codingStandardsExist || !architectureRulesExist) {
			return this.failure(
				"Architecture files missing",
				[
					!codingStandardsExist ? "CODING-STANDARDS.md not found" : "",
					!architectureRulesExist ? "ARCHITECTURE-RULES.md not found" : "",
					"",
					"These files must exist before generating tasks.",
				].filter((s) => s.length > 0),
				[
					"Generate architecture files first:",
					`  taskflow prd generate-arch ${prdFile}`,
					"",
					"This will create:",
					"  - CODING-STANDARDS.md",
					"  - ARCHITECTURE-RULES.md",
					"",
					"Then you can generate tasks.",
				].join("\n"),
			);
		}

		// Check if tasks already exist
		const progressFilePath = path.join(paths.tasksDir, "tasks-progress.json");
		if (fs.existsSync(progressFilePath)) {
			return this.failure(
				"Tasks already exist",
				[
					"Task breakdown already exists in this project",
					`File: ${progressFilePath}`,
				],
				[
					"Options:",
					"1. Review existing tasks: taskflow status",
					"2. Delete tasks-progress.json to regenerate (CAUTION: loses all progress)",
					"3. Manually add new features to the existing structure",
				].join("\n"),
			);
		}

		// Read PRD content
		const _prdContent = fs.readFileSync(prdFilePath, "utf-8");
		void _prdContent; // Intentionally unused - PRD content is loaded for reference

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
			[
				`PRD loaded: ${prdFile}`,
				"✓ CODING-STANDARDS.md found",
				"✓ ARCHITECTURE-RULES.md found",
				"",
				"TASK:",
				"─".repeat(60),
				"Generate a complete task breakdown from the PRD.",
				"Create features, stories, and tasks with proper dependencies.",
			].join("\n"),
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
					"1. DO read TASK-GENERATOR.md completely",
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
					`${prdFilePath} - PRD with requirements`,
					`${codingStandardsPath} - Project coding standards`,
					`${architectureRulesPath} - Project architecture rules`,
					`${getRefFilePath(paths.refDir, REF_FILES.taskGenerator)} - Task generation guidelines`,
					`${getRefFilePath(paths.refDir, REF_FILES.aiProtocol)} - AI operating discipline`,
					"All skill files in .taskflow/ref/skills/",
				],
				warnings: [
					"DO NOT create overly broad tasks - break them down",
					"DO NOT skip reading TASK-GENERATOR.md",
					"DO NOT invent context files - reference actual codebase files",
					"DO ensure every task has clear acceptance criteria",
					"DO make sure task IDs follow the N.M.K format exactly",
				],
			},
		);
	}
}
