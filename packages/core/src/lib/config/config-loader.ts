/**
 * Configuration loader for taskflow
 */

import fs from "node:fs";
import path from "node:path";
import { TaskflowError } from "../core/errors.js";
import type { TaskflowConfig } from "../core/types.js";
import { validateTaskflowConfig } from "../core/types.js";
import { CONFIG_FILE, getProjectPaths } from "./config-paths.js";

export class ConfigLoader {
	private configPath: string;
	private projectRoot: string;

	constructor(cwd: string = process.cwd()) {
		this.projectRoot = this.findProjectRoot(cwd) || cwd;
		this.configPath = path.join(this.projectRoot, CONFIG_FILE);
	}

	public load(): TaskflowConfig {
		if (!fs.existsSync(this.configPath)) {
			throw new TaskflowError(
				`Configuration file not found at: ${this.configPath}\n` +
					`Run 'taskflow init' to create a configuration file.`,
				"CONFIG_NOT_FOUND",
			);
		}

		try {
			const raw = fs.readFileSync(this.configPath, "utf-8");
			const json = JSON.parse(raw);
			return validateTaskflowConfig(json);
		} catch (error) {
			if (error instanceof Error) {
				throw new TaskflowError(
					`Failed to load config: ${error.message}`,
					"CONFIG_LOAD_ERROR",
				);
			}
			throw error;
		}
	}

	public save(config: TaskflowConfig): void {
		fs.writeFileSync(this.configPath, `${JSON.stringify(config, null, 2)}\n`);
	}

	public exists(): boolean {
		return fs.existsSync(this.configPath);
	}

	public getProjectRoot(): string {
		return this.projectRoot;
	}

	public getConfigPath(): string {
		return this.configPath;
	}

	public getPaths() {
		return getProjectPaths(this.projectRoot);
	}

	/**
	 * Find the project root by looking for taskflow.config.json
	 * Walks up the directory tree from startDir
	 */
	private findProjectRoot(startDir: string): string | null {
		let current = startDir;
		while (current !== path.parse(current).root) {
			if (fs.existsSync(path.join(current, CONFIG_FILE))) {
				return current;
			}
			current = path.dirname(current);
		}
		return null;
	}

	/**
	 * Create default configuration
	 */
	public static createDefaultConfig(projectName: string): TaskflowConfig {
		return {
			project: {
				name: projectName,
				root: ".",
			},
			branching: {
				strategy: "per-story",
				base: "main",
				prefix: "story/",
			},
			validation: {
				commands: {
					// Users should configure these based on their tech stack
					// Examples:
					// format: "npm run format",
					// test: "pytest",
					// lint: "cargo clippy"
				},
			},
		};
	}
}
