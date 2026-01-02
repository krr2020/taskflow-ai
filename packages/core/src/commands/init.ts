/**
 * Init command - Initialize taskflow in a project
 */

import path from "node:path";
import { ConfigLoader } from "../lib/config-loader.js";
import { getProjectPaths, TEMPLATE_FILES } from "../lib/config-paths.js";
import { VERSIONS } from "../lib/constants.js";
import {
	copyFile,
	ensureDir,
	exists,
	readJson,
	writeJson,
} from "../lib/file-utils.js";
import { ensureAllDirs } from "../lib/path-utils.js";
import { getTemplateDir } from "../lib/template-utils.js";
import { BaseCommand, type CommandResult } from "./base.js";

interface VersionInfo {
	templateVersion: string;
	installedAt: string;
	customized: string[];
}

interface PackageJson {
	name?: string;
	scripts?: Record<string, string>;
}

export class InitCommand extends BaseCommand {
	async execute(projectName?: string): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);

		// Check if already initialized
		if (configLoader.exists()) {
			return this.failure(
				"Taskflow is already initialized in this project.",
				[
					"Configuration file already exists at: " +
						configLoader.getConfigPath(),
				],
				"Run 'taskflow status' to view your project state.",
			);
		}

		// Try to get project name from package.json, then use provided name, then fallback to directory name
		let detectedProjectName: string | undefined;

		const packageJsonPath = path.join(this.context.projectRoot, "package.json");
		if (exists(packageJsonPath)) {
			try {
				const packageJson = readJson(packageJsonPath) as PackageJson;
				detectedProjectName = packageJson?.name;
			} catch (_error) {
				// If package.json is invalid, continue to fallback
			}
		}

		const finalProjectName =
			projectName ||
			detectedProjectName ||
			path.basename(this.context.projectRoot);

		// Add task script to package.json if it exists
		if (exists(packageJsonPath)) {
			try {
				const packageJson = readJson(packageJsonPath) as PackageJson;
				if (packageJson) {
					if (!packageJson.scripts) {
						packageJson.scripts = {};
					}
					if (!packageJson.scripts.task) {
						packageJson.scripts.task = "taskflow";
						writeJson(packageJsonPath, packageJson);
					}
				}
			} catch (_error) {
				// If package.json is invalid or cannot be updated, continue
			}
		}

		// Create default configuration
		const config = ConfigLoader.createDefaultConfig(finalProjectName);
		configLoader.save(config);

		// Create directory structure
		const paths = getProjectPaths(this.context.projectRoot);

		// Create all directories
		ensureAllDirs(this.context.projectRoot);

		// Copy template files to .taskflow/ref/
		const templatesDir = getTemplateDir();

		let copiedFiles = 0;

		// Copy protocol files
		for (const [_key, sourcePath] of Object.entries(TEMPLATE_FILES.protocols)) {
			const fullSourcePath = path.join(templatesDir, sourcePath);
			const destPath = path.join(paths.refDir, path.basename(sourcePath));

			if (exists(fullSourcePath)) {
				copyFile(fullSourcePath, destPath);
				copiedFiles++;
			}
		}

		// Copy PRD files
		for (const [_key, sourcePath] of Object.entries(TEMPLATE_FILES.prd)) {
			const fullSourcePath = path.join(templatesDir, sourcePath);
			const destPath = path.join(paths.refDir, path.basename(sourcePath));

			if (exists(fullSourcePath)) {
				copyFile(fullSourcePath, destPath);
				copiedFiles++;
			}
		}

		// Note: coding-standards.md and architecture-rules.md are NOT copied during init
		// These should be generated via: taskflow prd generate-arch <prd-file>
		// Skipping project template files to allow generate-arch command to work correctly

		// Copy retrospective file
		for (const [_key, sourcePath] of Object.entries(
			TEMPLATE_FILES.retrospective,
		)) {
			const fullSourcePath = path.join(templatesDir, sourcePath);
			const destPath = path.join(paths.refDir, path.basename(sourcePath));

			if (exists(fullSourcePath)) {
				copyFile(fullSourcePath, destPath);
				copiedFiles++;
			}
		}

		// Copy skill files
		const skillsDestDir = path.join(paths.refDir, "skills");
		ensureDir(skillsDestDir);

		for (const [_key, sourcePath] of Object.entries(TEMPLATE_FILES.skills)) {
			const fullSourcePath = path.join(templatesDir, sourcePath);
			const destPath = path.join(paths.refDir, sourcePath);

			if (exists(fullSourcePath)) {
				copyFile(fullSourcePath, destPath);
				copiedFiles++;
			}
		}

		// Create version file
		const versionFile = path.join(paths.taskflowDir, ".version");
		const versionInfo: VersionInfo = {
			templateVersion: VERSIONS.TEMPLATE,
			installedAt: new Date().toISOString(),
			customized: [],
		};
		writeJson(versionFile, versionInfo);

		return this.success(
			[
				"✓ Created taskflow.config.json",
				"✓ Created tasks/ directory",
				"✓ Created .taskflow/ref/ directory",
				"✓ Created .taskflow/logs/ directory",
				exists(packageJsonPath) ? "✓ Added 'task' script to package.json" : "",
				`✓ Copied ${copiedFiles} template files`,
			]
				.filter(Boolean)
				.join("\n"),
			[
				"1. Create a PRD (Product Requirements Document):",
				"   Run: taskflow prd create <feature-name>",
				"   or:  pnpm task prd create <feature-name>",
				"",
				"2. Generate tasks from PRD:",
				"   Run: taskflow tasks generate <prd-file>",
				"   or:  pnpm task tasks generate <prd-file>",
				"",
				"3. Start working on tasks:",
				"   Run: taskflow next  (to find the next task)",
				"   Run: taskflow start <task-id>",
				"   or:  pnpm task next",
				"   or:  pnpm task start <task-id>",
			].join("\n"),
			{
				aiGuidance: [
					"You have initialized TaskFlow in this project.",
					"",
					"COMMAND USAGE:",
					"──────────────",
					"You can run taskflow commands in two ways:",
					"",
					"1. Direct command:",
					"   taskflow <command> <args>",
					"",
					"2. Via npm script (if package.json has 'task' script):",
					"   pnpm task <command> <args>",
					"   npm run task -- <command> <args>",
					"",
					"AI CONFIGURATION:",
					"─────────────────",
					"Some commands require AI for content generation:",
					"  - taskflow prd generate-arch: Generates coding-standards.md and architecture-rules.md",
					"  - taskflow tasks generate: Generates task breakdown from PRD",
					"",
					"If running via MCP/Factory AI:",
					"  → AI agent will automatically handle generation",
					"",
					"If running manually (CLI):",
					"  → You MUST configure an AI provider first:",
					"    taskflow configure ai --provider <provider> --apiKey <key> --model <model>",
					"",
					"NEXT: Create a PRD",
					"────────────────────",
					"A PRD (Product Requirements Document) defines what you're building.",
					"The AI will help you create it by:",
					"1. Reading .taskflow/ref/prd-generator.md for guidelines",
					"2. Gathering requirements through conversation",
					"3. Creating a structured PRD document",
					"",
					"Once the PRD is ready, TaskFlow will generate a task breakdown",
					"that you can execute step-by-step.",
				].join("\n"),
				contextFiles: [
					".taskflow/ref/ai-protocol.md - Core AI operating discipline",
					".taskflow/ref/prd-generator.md - PRD creation guidelines",
					".taskflow/ref/task-generator.md - Task breakdown guidelines",
					".taskflow/ref/retrospective.md - Known error patterns",
				],
				warnings: [
					"NEVER edit files in .taskflow/ or tasks/ directories directly",
					"ALWAYS use taskflow commands for task management",
					"Read ai-protocol.md before starting any task",
					"If running CLI manually, configure AI before using generate commands",
				],
			},
		);
	}
}
