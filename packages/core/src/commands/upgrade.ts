/**
 * Upgrade command - Updates .taskflow reference files to latest version
 */

import fs from "node:fs";
import path from "node:path";
import { TEMPLATE_FILES } from "../lib/config-paths.js";
import { colors, icons } from "../lib/output.js";
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

const CURRENT_TEMPLATE_VERSION = "0.1.0";

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
		const refDir = path.join(this.context.projectRoot, ".taskflow", "ref");
		const taskflowDir = path.join(this.context.projectRoot, ".taskflow");
		const versionFile = path.join(taskflowDir, ".version");

		// Check if .taskflow exists
		if (!fs.existsSync(taskflowDir)) {
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
		if (!fs.existsSync(versionFile)) return null;

		try {
			const content = fs.readFileSync(versionFile, "utf-8");
			const version: VersionInfo = JSON.parse(content);
			return version.templateVersion;
		} catch {
			return null;
		}
	}

	private saveVersion(versionFile: string, version: string): void {
		const versionInfo: VersionInfo = {
			templateVersion: version,
			installedAt: new Date().toISOString(),
			customized: [],
		};

		fs.writeFileSync(versionFile, JSON.stringify(versionInfo, null, 2));
	}

	private planUpdate(
		refDir: string,
		currentVersion: string | null,
		latestVersion: string,
	): UpdatePlan {
		const templateDir = this.getTemplateDir();
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
			if (fs.existsSync(currentPath) && fs.existsSync(templatePath)) {
				const currentContent = fs.readFileSync(currentPath, "utf-8");
				const templateContent = fs.readFileSync(templatePath, "utf-8");
				isCustomized = currentContent !== templateContent;
			}

			files.push({
				name: fileName,
				strategy,
				currentPath,
				templatePath,
				exists: fs.existsSync(currentPath),
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

			if (fs.existsSync(file.currentPath) && fs.existsSync(file.templatePath)) {
				const current = fs.readFileSync(file.currentPath, "utf-8");
				const template = fs.readFileSync(file.templatePath, "utf-8");

				if (current === template) {
					output += `  ${colors.muted(`${file.name}: No changes`)}\n`;
				} else {
					const currentLines = current.split("\n").length;
					const templateLines = template.split("\n").length;
					const diff = templateLines - currentLines;
					const sign = diff > 0 ? "+" : "";
					output += `  ${colors.info(`${file.name}: ${sign}${diff} lines`)}\n`;
				}
			} else if (!fs.existsSync(file.currentPath)) {
				output += `  ${colors.success(`${file.name}: New file`)}\n`;
			}
		}

		return output;
	}

	private createBackup(refDir: string, version: string): string {
		const timestamp = new Date().toISOString().split("T")[0];
		const backupDir = path.join(
			this.context.projectRoot,
			".taskflow",
			"backups",
			`v${version}-${timestamp}`,
		);

		// Create backup directory
		fs.mkdirSync(backupDir, { recursive: true });

		// Copy all ref files to backup
		if (fs.existsSync(refDir)) {
			this.copyDirectory(refDir, backupDir);
		}

		return backupDir;
	}

	private copyDirectory(src: string, dest: string): void {
		fs.mkdirSync(dest, { recursive: true });

		const entries = fs.readdirSync(src, { withFileTypes: true });

		for (const entry of entries) {
			const srcPath = path.join(src, entry.name);
			const destPath = path.join(dest, entry.name);

			if (entry.isDirectory()) {
				this.copyDirectory(srcPath, destPath);
			} else {
				fs.copyFileSync(srcPath, destPath);
			}
		}
	}

	private updateFile(file: FileUpdate): void {
		if (!fs.existsSync(file.templatePath)) {
			console.warn(`Template file not found: ${file.templatePath}`);
			return;
		}

		const content = fs.readFileSync(file.templatePath, "utf-8");
		fs.writeFileSync(file.currentPath, content);
	}

	private getTemplateDir(): string {
		// In development, templates are in the source tree
		// In production, they're in the dist folder
		const possiblePaths = [
			path.join(__dirname, "..", "..", "templates"),
			path.join(__dirname, "..", "templates"),
			path.join(process.cwd(), "templates"),
		];

		for (const templatePath of possiblePaths) {
			if (fs.existsSync(templatePath)) {
				return templatePath;
			}
		}

		throw new Error("Template directory not found");
	}
}
