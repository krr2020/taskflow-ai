/**
 * Interactive Selection with Arrow Keys
 *
 * Provides arrow key navigation for selections using @inquirer/prompts.
 */

import * as fs from "node:fs";
import * as path from "node:path";
import { checkbox, Separator, select } from "@inquirer/prompts";

export interface SelectOption<T = string> {
	name: string;
	value: T;
	description?: string;
	disabled?: boolean | string;
}

export interface SelectConfig<T = string> {
	message: string;
	choices: SelectOption<T>[];
	defaultValue?: T;
	pageSize?: number;
}

export interface MultiSelectConfig<T = string> {
	message: string;
	choices: SelectOption<T>[];
	defaultValues?: T[];
	pageSize?: number;
	required?: boolean;
}

export const InteractiveSelect = {
	/**
	 * Single selection with arrow keys
	 *
	 * @example
	 * const choice = await InteractiveSelect.single('Select an option:', [
	 *   { name: 'Option 1', value: 'opt1', description: 'First option' },
	 *   { name: 'Option 2', value: 'opt2', description: 'Second option' }
	 * ]);
	 */
	async single<T = string>(
		message: string,
		choices: SelectOption<T>[],
		options?: {
			defaultValue?: T;
			pageSize?: number;
		},
	): Promise<T> {
		return await select({
			message,
			choices: choices.map((c) => {
				const choice: {
					name: string;
					value: T;
					description?: string;
					disabled?: boolean | string;
				} = {
					name: c.name,
					value: c.value,
				};
				if (c.description !== undefined) {
					choice.description = c.description;
				}
				if (c.disabled !== undefined) {
					choice.disabled = c.disabled;
				}
				return choice;
			}),
			default: options?.defaultValue,
			pageSize: options?.pageSize || 10,
		});
	},

	/**
	 * Multi-selection with arrow keys + space
	 *
	 * @example
	 * const selected = await InteractiveSelect.multiple(
	 *   'Select features to enable:',
	 *   [
	 *     { name: 'Feature A', value: 'a' },
	 *     { name: 'Feature B', value: 'b' },
	 *     { name: 'Feature C', value: 'c' }
	 *   ],
	 *   { required: true }
	 * );
	 */
	async multiple<T = string>(
		message: string,
		choices: SelectOption<T>[],
		options?: {
			defaultValues?: T[];
			pageSize?: number;
			required?: boolean;
		},
	): Promise<T[]> {
		const selected = await checkbox({
			message,
			choices: choices.map((c) => {
				const choice: {
					name: string;
					value: T;
					description?: string;
					disabled?: boolean | string;
					checked?: boolean;
				} = {
					name: c.name,
					value: c.value,
				};
				if (c.description !== undefined) {
					choice.description = c.description;
				}
				if (c.disabled !== undefined) {
					choice.disabled = c.disabled;
				}
				if (options?.defaultValues?.includes(c.value)) {
					choice.checked = true;
				}
				return choice;
			}),
			pageSize: options?.pageSize || 10,
			required: options?.required || false,
		});

		return selected as T[];
	},

	/**
	 * File selection from directory
	 *
	 * @example
	 * const file = await InteractiveSelect.file(
	 *   'Select a PRD file:',
	 *   '*.md',
	 *   '/path/to/prds'
	 * );
	 */
	async file(
		message: string,
		pattern: string,
		directory: string,
	): Promise<string> {
		// Convert glob pattern to regex (simple implementation)
		const regexPattern = pattern
			.replace(/\./g, "\\.")
			.replace(/\*/g, ".*")
			.replace(/\?/g, ".");

		const regex = new RegExp(`^${regexPattern}$`);

		// Find matching files
		const files = fs
			.readdirSync(directory)
			.filter((f) => regex.test(f))
			.map((f) => {
				const fullPath = path.join(directory, f);
				const stats = fs.statSync(fullPath);
				return {
					name: f,
					value: f,
					description: `Modified: ${stats.mtime.toLocaleDateString()}`,
				};
			});

		if (files.length === 0) {
			throw new Error(`No files found matching: ${pattern} in ${directory}`);
		}

		// Sort by modification time (newest first)
		files.sort((a, b) => {
			const aPath = path.join(directory, a.value);
			const bPath = path.join(directory, b.value);
			const aStat = fs.statSync(aPath);
			const bStat = fs.statSync(bPath);
			return bStat.mtime.getTime() - aStat.mtime.getTime();
		});

		return await InteractiveSelect.single(message, files);
	},

	/**
	 * Multi-file selection from directory
	 *
	 * @example
	 * const files = await InteractiveSelect.files(
	 *   'Select files to reference:',
	 *   '*.ts',
	 *   '/path/to/source'
	 * );
	 */
	async files(
		message: string,
		pattern: string,
		directory: string,
		options?: { pageSize?: number; required?: boolean },
	): Promise<string[]> {
		// Convert glob pattern to regex
		const regexPattern = pattern
			.replace(/\./g, "\\.")
			.replace(/\*/g, ".*")
			.replace(/\?/g, ".");

		const regex = new RegExp(`^${regexPattern}$`);

		const files = findFilesRecursively(directory, regex);

		if (files.length === 0) {
			throw new Error(`No files found matching: ${pattern} in ${directory}`);
		}

		return await InteractiveSelect.multiple(message, files, options);
	},

	/**
	 * Yes/No confirmation
	 *
	 * @example
	 * const confirmed = await InteractiveSelect.confirm('Are you sure?');
	 */
	async confirm(message: string, defaultValue = false): Promise<boolean> {
		const result = await InteractiveSelect.single<boolean>(
			message,
			[
				{ name: "Yes", value: true },
				{ name: "No", value: false },
			],
			{ defaultValue },
		);

		return result;
	},

	/**
	 * Create a separator for visual grouping
	 *
	 * @example
	 * const choices = [
	 *   { name: 'Group 1 Item', value: 'g1' },
	 *   InteractiveSelect.separator(),
	 *   { name: 'Group 2 Item', value: 'g2' }
	 * ];
	 */
	separator(text?: string): Separator {
		return new Separator(text);
	},
};

/**
 * Find matching files recursively
 */
function findFilesRecursively(
	dir: string,
	regex: RegExp,
	base = "",
): SelectOption<string>[] {
	const results: SelectOption<string>[] = [];

	const entries = fs.readdirSync(dir, { withFileTypes: true });

	for (const entry of entries) {
		const fullPath = path.join(dir, entry.name);
		const relativePath = path.join(base, entry.name);

		if (entry.isDirectory()) {
			// Skip common ignore directories
			if (
				["node_modules", ".git", "dist", "build", ".taskflow"].includes(
					entry.name,
				)
			) {
				continue;
			}

			// Recurse into subdirectory
			results.push(...findFilesRecursively(fullPath, regex, relativePath));
		} else if (entry.isFile() && regex.test(entry.name)) {
			const stats = fs.statSync(fullPath);
			results.push({
				name: relativePath,
				value: relativePath,
				description: `Modified: ${stats.mtime.toLocaleDateString()}`,
			});
		}
	}

	return results;
}
