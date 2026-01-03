/**
 * File operation utilities for taskflow
 * Centralizes all file I/O operations
 */

import fs from "node:fs";
import path from "node:path";
import { consoleOutput } from "@/lib/core/output";

// ============================================================================
// Read Operations
// ============================================================================

/**
 * Read JSON file, return null if file doesn't exist or is invalid
 */
export function readJson<T = unknown>(filePath: string): T | null {
	if (!fs.existsSync(filePath)) {
		return null;
	}
	try {
		const content = fs.readFileSync(filePath, "utf-8");
		return JSON.parse(content) as T;
	} catch {
		return null;
	}
}

/**
 * Read text file, return null if file doesn't exist
 */
export function readText(filePath: string): string | null {
	if (!fs.existsSync(filePath)) {
		return null;
	}
	try {
		return fs.readFileSync(filePath, "utf-8");
	} catch {
		return null;
	}
}

// ============================================================================
// Write Operations
// ============================================================================

/**
 * Write JSON file with proper formatting
 */
export function writeJson(filePath: string, data: unknown): void {
	const dirPath = path.dirname(filePath);
	ensureDir(dirPath);
	fs.writeFileSync(filePath, `${JSON.stringify(data, null, 2)}\n`, "utf-8");
}

/**
 * Write text file
 */
export function writeText(filePath: string, content: string): void {
	const dirPath = path.dirname(filePath);
	ensureDir(dirPath);
	fs.writeFileSync(filePath, content, "utf-8");
}

/**
 * Append text to file
 */
export function appendText(filePath: string, content: string): void {
	const dirPath = path.dirname(filePath);
	ensureDir(dirPath);
	fs.appendFileSync(filePath, content, "utf-8");
}

// ============================================================================
// Check Operations
// ============================================================================

/**
 * Check if file or directory exists
 */
export function exists(filePath: string): boolean {
	return fs.existsSync(filePath);
}

/**
 * Check if path is a directory
 */
export function isDirectory(filePath: string): boolean {
	try {
		return fs.statSync(filePath).isDirectory();
	} catch {
		return false;
	}
}

/**
 * Check if path is a file
 */
export function isFile(filePath: string): boolean {
	try {
		return fs.statSync(filePath).isFile();
	} catch {
		return false;
	}
}

// ============================================================================
// Delete Operations
// ============================================================================

/**
 * Delete file if exists
 */
export function deleteFile(filePath: string): void {
	if (fs.existsSync(filePath)) {
		fs.unlinkSync(filePath);
	}
}

/**
 * Delete directory recursively
 */
export function deleteDir(dirPath: string): void {
	if (!fs.existsSync(dirPath)) {
		return;
	}

	try {
		fs.rmSync(dirPath, { recursive: true, force: true });
	} catch {
		// Fallback for older Node versions
		try {
			const entries = fs.readdirSync(dirPath);
			for (const entry of entries) {
				const entryPath = path.join(dirPath, entry);
				if (fs.statSync(entryPath).isDirectory()) {
					deleteDir(entryPath);
				} else {
					deleteFile(entryPath);
				}
			}
			fs.rmdirSync(dirPath);
		} catch (error) {
			consoleOutput(`Failed to delete directory: ${dirPath}`, {
				type: "error",
			});
			throw error;
		}
	}
}

// ============================================================================
// Copy Operations
// ============================================================================

/**
 * Copy file if source exists
 */
export function copyFile(src: string, dest: string): void {
	if (!fs.existsSync(src)) {
		consoleOutput(`Source file not found: ${src}`, { type: "warn" });
		return;
	}

	const destDir = path.dirname(dest);
	ensureDir(destDir);
	fs.copyFileSync(src, dest);
}

/**
 * Copy directory recursively
 */
export function copyDir(src: string, dest: string): void {
	if (!fs.existsSync(src)) {
		consoleOutput(`Source directory not found: ${src}`, { type: "warn" });
		return;
	}

	ensureDir(dest);
	const entries = fs.readdirSync(src, { withFileTypes: true });

	for (const entry of entries) {
		const srcPath = path.join(src, entry.name);
		const destPath = path.join(dest, entry.name);

		if (entry.isDirectory()) {
			copyDir(srcPath, destPath);
		} else {
			copyFile(srcPath, destPath);
		}
	}
}

// ============================================================================
// Directory Operations
// ============================================================================

/**
 * Ensure directory exists, create if not
 */
export function ensureDir(dirPath: string): void {
	if (!fs.existsSync(dirPath)) {
		fs.mkdirSync(dirPath, { recursive: true });
	}
}

/**
 * List all files in directory with optional filter
 */
export function listFiles(
	dirPath: string,
	filter?: (fileName: string) => boolean,
): string[] {
	if (!fs.existsSync(dirPath)) {
		return [];
	}

	const entries = fs.readdirSync(dirPath);
	return filter ? entries.filter(filter) : entries;
}

/**
 * List all subdirectories
 */
export function listDirs(dirPath: string): string[] {
	if (!fs.existsSync(dirPath)) {
		return [];
	}

	const entries = fs.readdirSync(dirPath, { withFileTypes: true });
	return entries
		.filter((entry) => entry.isDirectory())
		.map((entry) => entry.name);
}

// ============================================================================
// File Metadata Operations
// ============================================================================

/**
 * Get file stats
 */
export function getStats(filePath: string): fs.Stats | null {
	if (!fs.existsSync(filePath)) {
		return null;
	}
	try {
		return fs.statSync(filePath);
	} catch {
		return null;
	}
}

/**
 * Get file size in bytes
 */
export function getFileSize(filePath: string): number {
	const stats = getStats(filePath);
	return stats ? stats.size : 0;
}

/**
 * Get file modification time
 */
export function getFileMtime(filePath: string): Date | null {
	const stats = getStats(filePath);
	return stats ? stats.mtime : null;
}

// ============================================================================
// Specialized Operations
// ============================================================================

/**
 * Safe JSON parse with error handling
 */
export function safeJsonParse<T = unknown>(
	content: string,
): { success: true; data: T } | { success: false; error: string } {
	try {
		return { success: true, data: JSON.parse(content) as T };
	} catch (error) {
		return {
			success: false,
			error: error instanceof Error ? error.message : String(error),
		};
	}
}

/**
 * Get all files matching pattern in directory
 */
export function globFiles(dirPath: string, pattern: string): string[] {
	if (!fs.existsSync(dirPath)) {
		return [];
	}

	const entries = fs.readdirSync(dirPath);
	const regex = new RegExp(pattern);
	return entries.filter((entry) => regex.test(entry));
}

// ============================================================================
// Batch Operations (Performance Optimized)
// ============================================================================

export interface BatchReadResult {
	path: string;
	content: string | null;
	error?: string;
}

/**
 * Read multiple files in parallel
 * More efficient than reading files sequentially
 *
 * @example
 * const results = await batchReadFiles([
 *   '/path/to/file1.txt',
 *   '/path/to/file2.txt'
 * ]);
 */
export async function batchReadFiles(
	filePaths: string[],
): Promise<BatchReadResult[]> {
	return Promise.all(
		filePaths.map(async (filePath) => {
			try {
				const content = await fs.promises.readFile(filePath, "utf-8");
				return { path: filePath, content };
			} catch (error) {
				return {
					path: filePath,
					content: null,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}),
	);
}

export interface BatchWriteOperation {
	path: string;
	content: string;
	mode?: "overwrite" | "append";
}

export interface BatchWriteResult {
	path: string;
	success: boolean;
	error?: string;
}

/**
 * Write multiple files in parallel
 * More efficient for bulk file operations
 *
 * @example
 * const results = await batchWriteFiles([
 *   { path: '/path/to/file1.txt', content: 'content1' },
 *   { path: '/path/to/file2.txt', content: 'content2' }
 * ]);
 */
export async function batchWriteFiles(
	operations: BatchWriteOperation[],
): Promise<BatchWriteResult[]> {
	return Promise.all(
		operations.map(async (op) => {
			try {
				const dirPath = path.dirname(op.path);
				await fs.promises.mkdir(dirPath, { recursive: true });

				if (op.mode === "append") {
					await fs.promises.appendFile(op.path, op.content, "utf-8");
				} else {
					await fs.promises.writeFile(op.path, op.content, "utf-8");
				}

				return { path: op.path, success: true };
			} catch (error) {
				return {
					path: op.path,
					success: false,
					error: error instanceof Error ? error.message : String(error),
				};
			}
		}),
	);
}

export interface BatchExistsResult {
	path: string;
	exists: boolean;
	isFile?: boolean;
	isDirectory?: boolean;
}

/**
 * Check existence of multiple files in parallel
 *
 * @example
 * const results = await batchCheckExists([
 *   '/path/to/file1.txt',
 *   '/path/to/file2.txt'
 * ]);
 */
export async function batchCheckExists(
	filePaths: string[],
): Promise<BatchExistsResult[]> {
	return Promise.all(
		filePaths.map(async (filePath) => {
			try {
				const stats = await fs.promises.stat(filePath);
				return {
					path: filePath,
					exists: true,
					isFile: stats.isFile(),
					isDirectory: stats.isDirectory(),
				};
			} catch {
				return {
					path: filePath,
					exists: false,
				};
			}
		}),
	);
}
