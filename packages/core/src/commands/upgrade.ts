/**
 * Upgrade command - Updates .taskflow reference files to latest version
 */

import fs from "node:fs";
import path from "node:path";
import { TEMPLATE_FILES } from "../lib/config-paths.js";
import { VERSIONS } from "../lib/constants.js";
import {
	copyDir,
	ensureDir as ensureFileDir,
	exists,
	readJson,
	readText,
	writeJson,
} from "../lib/file-utils.js";
import { colors, consoleOutput, icons } from "../lib/output.js";
import {
	ensureDir as ensurePathDir,
	getBackupDir,
	getRefDir,
	getTaskflowDir,
} from "../lib/path-utils.js";
import { getTemplateDir } from "../lib/template-utils.js";
import type { CommandResult } from "./base.js";
import { BaseCommand } from "./base.js";

interface VersionInfo {
	templateVersion: string;
	installedAt: string;
	customized: string[];
}

interface FileUpdate {
	name: string;
	strategy: "NEVER" | "PROMPT" | "SUGGEST" | "AUTO";
	currentPath: string;
	templatePath: string;
	exists: boolean;
	isCustomized?: boolean;
	skipped?: boolean;
}

interface UpdatePlan {
	files: FileUpdate[];
	currentVersion: string | null;
	latestVersion: string;
}

const CURRENT_TEMPLATE_VERSION = VERSIONS.TEMPLATE;

const UPDATE_STRATEGIES = {
	NEVER: ["retrospective.md"],
	PROMPT: ["coding-standards.md", "architecture-rules.md"],
	SUGGEST: [
		"ai-protocol.md",
		"task-generator.md",
		"task-executor.md",
		"prd-generator.md",
	],
	AUTO: [".version"],
};

export class UpgradeCommand extends BaseCommand {
	async execute(options?: {
		force?: boolean;
		auto?: boolean;
		diff?: boolean;
	}): Promise<CommandResult> {
		const taskflowDir = getTaskflowDir(this.context.projectRoot);
		const refDir = getRefDir(this.context.projectRoot);
		const versionFile = path.join(taskflowDir, ".version");

		// Check if .taskflow exists
		if (!exists(taskflowDir)) {
			return {
				success: false,
				output: `${colors.error(`${icons.error} No .taskflow directory found`)}\n\nRun ${colors.command("taskflow init")} first.`,
				nextSteps: "Run 'taskflow init' to initialize the project first.",
			};
		}

		// Load current version
		const currentVersion = this.loadVersion(versionFile);
		const latestVersion = CURRENT_TEMPLATE_VERSION;

		// Check if already up to date
		if (currentVersion === latestVersion && !options?.force) {
			return {
				success: true,
				output: `${colors.success(`${icons.success} Already on latest version`)} (v${latestVersion})`,
				nextSteps: "No action needed. You're already on the latest version.",
			};
		}

		// Plan update
		const updatePlan = this.planUpdate(refDir, currentVersion, latestVersion);

		// Show what will be updated
		let output = "";
		output += `${colors.highlight("📦 TaskFlow Template Upgrade")}\n\n`;
		output += `Current version: ${currentVersion || "unknown"}\n`;
		output += `Latest version: ${latestVersion}\n\n`;

		if (options?.diff) {
			output += this.formatDiffSummary(updatePlan);
			return {
				success: true,
				output,
				nextSteps:
					"Run without --diff flag to perform the update, or use --auto to skip prompts.",
			};
		}

		// Check for customized files that will be overwritten
		const customizedFiles = updatePlan.files.filter(
			(f) => f.isCustomized && f.strategy !== "NEVER",
		);

		if (customizedFiles.length > 0 && !options?.force) {
			output += `${colors.errorBold("⚠️  WARNING: Customized files detected!")}\n\n`;
			output += `The following files have been modified and will be overwritten:\n`;
			for (const file of customizedFiles) {
				output += `  ${colors.error(`- ${file.name}`)}\n`;
			}
			output += `\n${colors.warning("Your customizations will be LOST!")}\n\n`;
			output += `${colors.highlight("To proceed anyway, use:")}\n`;
			output += `  ${colors.command("taskflow upgrade --force")}\n\n`;
			return {
				success: false,
				output,
				nextSteps:
					"Review your customizations, then run with --force if you want to proceed",
			};
		}

		// Show files to update
		output += `${colors.highlight("Files to update:")}\n`;
		for (const file of updatePlan.files) {
			if (file.strategy === "NEVER") {
				output += `  ${colors.muted(`${icons.success} ${file.name} (never touched)`)}\n`;
			} else if (file.strategy === "PROMPT") {
				output += `  ${colors.warning(`⚠️  ${file.name} (user-generated, will skip)`)}\n`;
			} else if (file.strategy === "SUGGEST") {
				if (file.isCustomized) {
					output += `  ${colors.warning(`⚠️  ${file.name} (customized, will be overwritten)`)}\n`;
				} else {
					output += `  ${colors.info(`📝 ${file.name} (will update)`)}\n`;
				}
			}
		}

		// Create backup
		output += `\n${colors.highlight("Creating backup...")}\n`;
		const backupDir = this.createBackup(refDir, currentVersion || "unknown");
		output += `${colors.success(`${icons.success} Backup created:`)} ${backupDir}\n\n`;
		output += `${colors.warning("⚠️  IMPORTANT: Backup location saved above")}\n`;
		output += `You can restore your files if needed:\n`;
		output += `  ${colors.command(`cp ${backupDir}/* ${refDir}/`)}\n\n`;

		// Update files
		let updatedCount = 0;
		let skippedCount = 0;

		for (const file of updatePlan.files) {
			if (file.strategy === "NEVER") continue;

			if (file.strategy === "PROMPT" && !options?.auto) {
				// For now, skip prompting - just preserve user files
				output += `${colors.muted(`  Skipped ${file.name} (user-generated)`)}\n`;
				skippedCount++;
				continue;
			}

			if (file.strategy === "SUGGEST") {
				this.updateFile(file);
				output += `${colors.success(`  ${icons.success} Updated ${file.name}`)}\n`;
				updatedCount++;
			}
		}

		// Update version file
		this.saveVersion(versionFile, latestVersion);

		output += `\n${colors.successBold(`${icons.success} Upgrade complete!`)}\n`;
		output += `  Updated: ${updatedCount} files\n`;
		output += `  Skipped: ${skippedCount} files\n`;
		output += `  Preserved: retrospective.md, logs\n`;

		return {
			success: true,
			output,
			nextSteps: `To restore old files:\n  cp ${backupDir}/* ${refDir}/`,
			aiGuidance:
				"Review updated files to understand new features and best practices.",
		};
	}

	private loadVersion(versionFile: string): string | null {
		const versionInfo = readJson<VersionInfo>(versionFile);
		return versionInfo?.templateVersion ?? null;
	}

	private saveVersion(versionFile: string, version: string): void {
		const versionInfo: VersionInfo = {
			templateVersion: version,
			installedAt: new Date().toISOString(),
			customized: [],
		};

		writeJson(versionFile, versionInfo);
	}

	private planUpdate(
		refDir: string,
		currentVersion: string | null,
		latestVersion: string,
	): UpdatePlan {
		const templateDir = getTemplateDir();
		const files: FileUpdate[] = [];

		// Map file names to their template paths using the new structure
		const fileToTemplatePath: Record<string, string> = {
			"ai-protocol.md": TEMPLATE_FILES.protocols.aiProtocol,
			"task-generator.md": TEMPLATE_FILES.protocols.taskGenerator,
			"task-executor.md": TEMPLATE_FILES.protocols.taskExecutor,
			"prd-generator.md": TEMPLATE_FILES.prd.prdGenerator,
			"coding-standards.md": TEMPLATE_FILES.project.codingStandards,
			"architecture-rules.md": TEMPLATE_FILES.project.architectureRules,
			"retrospective.md": TEMPLATE_FILES.retrospective.retrospective,
		};

		// Get all template files
		const allFiles = [
			...UPDATE_STRATEGIES.NEVER,
			...UPDATE_STRATEGIES.PROMPT,
			...UPDATE_STRATEGIES.SUGGEST,
		];

		for (const fileName of allFiles) {
			let strategy: FileUpdate["strategy"];
			if (UPDATE_STRATEGIES.NEVER.includes(fileName)) {
				strategy = "NEVER";
			} else if (UPDATE_STRATEGIES.PROMPT.includes(fileName)) {
				strategy = "PROMPT";
			} else {
				strategy = "SUGGEST";
			}

			const currentPath = path.join(refDir, fileName);
			const templateRelativePath = fileToTemplatePath[fileName];
			const templatePath = templateRelativePath
				? path.join(templateDir, templateRelativePath)
				: path.join(templateDir, fileName);

			// Check if file is customized (exists and differs from template)
			let isCustomized = false;
			if (exists(currentPath) && exists(templatePath)) {
				const currentContent = readText(currentPath);
				const templateContent = readText(templatePath);
				isCustomized = currentContent !== templateContent;
			}

			files.push({
				name: fileName,
				strategy,
				currentPath,
				templatePath,
				exists: exists(currentPath),
				isCustomized,
			});
		}

		return {
			files,
			currentVersion,
			latestVersion,
		};
	}

	private formatDiffSummary(plan: UpdatePlan): string {
		let output = `${colors.highlight("Diff Summary:")}\n\n`;

		for (const file of plan.files) {
			if (file.strategy === "NEVER") continue;

			if (exists(file.currentPath) && exists(file.templatePath)) {
				const current = readText(file.currentPath);
				const template = readText(file.templatePath);

				if (current === template) {
					output += `  ${colors.muted(`${file.name}: No changes`)}\n`;
				} else {
					const currentLines = current?.split("\n").length ?? 0;
					const templateLines = template?.split("\n").length ?? 0;
					const diff = templateLines - currentLines;
					const sign = diff > 0 ? "+" : "";
					output += `  ${colors.info(`${file.name}: ${sign}${diff} lines`)}\n`;
				}
			} else if (!exists(file.currentPath)) {
				output += `  ${colors.success(`${file.name}: New file`)}\n`;
			}
		}

		return output;
	}

	private createBackup(refDir: string, version: string): string {
		const timestamp = new Date().toISOString().slice(0, 10);
		let backupDir = getBackupDir(this.context.projectRoot, version);
		backupDir = path.join(backupDir, timestamp);

		// Create backup directory
		ensurePathDir(backupDir);

		// Copy all ref files to backup
		if (exists(refDir)) {
			copyDir(refDir, backupDir);
		}

		return backupDir;
	}

	private updateFile(file: FileUpdate): void {
		if (!exists(file.templatePath)) {
			consoleOutput(`Template file not found: ${file.templatePath}`, {
				type: "warn",
			});
			return;
		}

		// Ensure directory exists before writing
		const targetDir = path.dirname(file.currentPath);
		ensureFileDir(targetDir);

		const content = readText(file.templatePath);
		if (content) {
			fs.writeFileSync(file.currentPath, content, "utf-8");
		}
	}
}
