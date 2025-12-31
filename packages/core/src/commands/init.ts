/**
 * Init command - Initialize taskflow in a project
 */

import fs from "node:fs";
import path from "node:path";
import { ConfigLoader } from "../lib/config-loader.js";
import { getProjectPaths, TEMPLATE_FILES } from "../lib/config-paths.js";
import { BaseCommand, type CommandResult } from "./base.js";

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

		const finalProjectName =
			projectName || path.basename(this.context.projectRoot);

		// Create default configuration
		const config = ConfigLoader.createDefaultConfig(finalProjectName);
		configLoader.save(config);

		// Create directory structure
		const paths = getProjectPaths(this.context.projectRoot);

		// Create tasks directory
		if (!fs.existsSync(paths.tasksDir)) {
			fs.mkdirSync(paths.tasksDir, { recursive: true });
		}

		// Create .taskflow directory structure
		if (!fs.existsSync(paths.taskflowDir)) {
			fs.mkdirSync(paths.taskflowDir, { recursive: true });
		}
		if (!fs.existsSync(paths.refDir)) {
			fs.mkdirSync(paths.refDir, { recursive: true });
		}
		if (!fs.existsSync(paths.logsDir)) {
			fs.mkdirSync(paths.logsDir, { recursive: true });
		}

		// Copy template files to .taskflow/ref/
		const templatesDir = path.join(
			path.dirname(new URL(import.meta.url).pathname),
			"../../templates",
		);

		let copiedFiles = 0;

		// Copy protocol files
		for (const [_key, sourcePath] of Object.entries(TEMPLATE_FILES.protocols)) {
			const fullSourcePath = path.join(templatesDir, sourcePath);
			const destPath = path.join(paths.refDir, path.basename(sourcePath));

			if (fs.existsSync(fullSourcePath)) {
				fs.copyFileSync(fullSourcePath, destPath);
				copiedFiles++;
			}
		}

		// Copy PRD files
		for (const [_key, sourcePath] of Object.entries(TEMPLATE_FILES.prd)) {
			const fullSourcePath = path.join(templatesDir, sourcePath);
			const destPath = path.join(paths.refDir, path.basename(sourcePath));

			if (fs.existsSync(fullSourcePath)) {
				fs.copyFileSync(fullSourcePath, destPath);
				copiedFiles++;
			}
		}

		// Copy project files
		for (const [_key, sourcePath] of Object.entries(TEMPLATE_FILES.project)) {
			const fullSourcePath = path.join(templatesDir, sourcePath);
			const destPath = path.join(paths.refDir, path.basename(sourcePath));

			if (fs.existsSync(fullSourcePath)) {
				fs.copyFileSync(fullSourcePath, destPath);
				copiedFiles++;
			}
		}

		// Copy retrospective file
		for (const [_key, sourcePath] of Object.entries(
			TEMPLATE_FILES.retrospective,
		)) {
			const fullSourcePath = path.join(templatesDir, sourcePath);
			const destPath = path.join(paths.refDir, path.basename(sourcePath));

			if (fs.existsSync(fullSourcePath)) {
				fs.copyFileSync(fullSourcePath, destPath);
				copiedFiles++;
			}
		}

		// Copy skill files
		const skillsDestDir = path.join(paths.refDir, "skills");
		if (!fs.existsSync(skillsDestDir)) {
			fs.mkdirSync(skillsDestDir, { recursive: true });
		}

		for (const [_key, sourcePath] of Object.entries(TEMPLATE_FILES.skills)) {
			const fullSourcePath = path.join(templatesDir, sourcePath);
			const destPath = path.join(paths.refDir, sourcePath);

			if (fs.existsSync(fullSourcePath)) {
				fs.copyFileSync(fullSourcePath, destPath);
				copiedFiles++;
			}
		}

		// Create version file
		const versionFile = path.join(paths.taskflowDir, ".version");
		const versionInfo = {
			templateVersion: "0.1.0",
			installedAt: new Date().toISOString(),
			customized: [],
		};
		fs.writeFileSync(versionFile, JSON.stringify(versionInfo, null, 2));

		return this.success(
			[
				"✓ Created taskflow.config.json",
				"✓ Created tasks/ directory",
				"✓ Created .taskflow/ref/ directory",
				"✓ Created .taskflow/logs/ directory",
				`✓ Copied ${copiedFiles} template files`,
			].join("\n"),
			[
				"1. Create a PRD (Product Requirements Document):",
				"   Run: taskflow prd create <feature-name>",
				"",
				"2. Generate tasks from PRD:",
				"   Run: taskflow tasks generate <prd-file>",
				"",
				"3. Start working on tasks:",
				"   Run: taskflow next  (to find the next task)",
				"   Run: taskflow start <task-id>",
			].join("\n"),
			{
				aiGuidance: [
					"You have initialized TaskFlow in this project.",
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
				],
			},
		);
	}
}
