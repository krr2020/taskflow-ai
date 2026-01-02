/**
 * Template directory resolution utilities
 * Finds the correct template directory in different environments
 */

import fs from "node:fs";
import path from "node:path";
import { consoleOutput } from "./output.js";

// ============================================================================
// Template Directory Resolution
// ============================================================================

/**
 * Find the template directory
 * Priority order:
 * 1. Development: ../../templates (relative to package)
 * 2. Dist: ../templates
 * 3. Fallback: ./templates in cwd
 */
export function getTemplateDir(): string {
	const possiblePaths = [
		// Development: ../../templates relative to this file
		path.join(__dirname, "..", "..", "templates"),
		// Dist: ../templates
		path.join(__dirname, "..", "templates"),
		// Fallback: ./templates in current working directory
		path.join(process.cwd(), "templates"),
	];

	for (const templatePath of possiblePaths) {
		if (fs.existsSync(templatePath)) {
			return templatePath;
		}
	}

	// If we get here, no template directory was found
	const error =
		"Template directory not found. Checked locations:\n" +
		possiblePaths.map((p) => `  - ${p}`).join("\n");
	consoleOutput(error, { type: "error" });
	throw new Error("Template directory not found");
}

/**
 * Get path to a specific template file
 */
export function getTemplatePath(templateName: string): string {
	const templateDir = getTemplateDir();
	return path.join(templateDir, templateName);
}

/**
 * Check if a template file exists
 */
export function templateExists(templateName: string): boolean {
	const templatePath = getTemplatePath(templateName);
	return fs.existsSync(templatePath);
}

/**
 * Read a template file
 */
export function readTemplate(templateName: string): string | null {
	const templatePath = getTemplatePath(templateName);

	if (!fs.existsSync(templatePath)) {
		return null;
	}

	try {
		return fs.readFileSync(templatePath, "utf-8");
	} catch {
		return null;
	}
}

/**
 * Copy a template file to destination
 */
export function copyTemplate(templateName: string, destPath: string): void {
	const templatePath = getTemplatePath(templateName);

	if (!fs.existsSync(templatePath)) {
		consoleOutput(`Template file not found: ${templateName}`, {
			type: "warn",
		});
		return;
	}

	const destDir = path.dirname(destPath);
	if (!fs.existsSync(destDir)) {
		fs.mkdirSync(destDir, { recursive: true });
	}

	fs.copyFileSync(templatePath, destPath);
}

/**
 * List all available template files in a category
 */
export function listTemplates(category: string): string[] {
	const templateDir = getTemplateDir();
	const categoryPath = path.join(templateDir, category);

	if (!fs.existsSync(categoryPath)) {
		return [];
	}

	return fs.readdirSync(categoryPath);
}
