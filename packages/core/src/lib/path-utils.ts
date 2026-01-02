/**
 * Path construction utilities for taskflow
 * Centralizes all path building logic
 */

import fs from "node:fs";
import path from "node:path";
import {
	DIR_NAMES,
	FILE_NAMES,
	getFeatureDirName,
	getStoryDirName,
	getTaskFileName,
} from "./constants.js";

// ============================================================================
// Project Directory Paths
// ============================================================================

/**
 * Build tasks directory path
 */
export function getTasksDir(root: string): string {
	return path.join(root, DIR_NAMES.TASKS);
}

/**
 * Build taskflow directory path
 */
export function getTaskflowDir(root: string): string {
	return path.join(root, DIR_NAMES.TASKFLOW);
}

/**
 * Build ref directory path (.taskflow/ref)
 */
export function getRefDir(root: string): string {
	return path.join(root, DIR_NAMES.TASKFLOW, DIR_NAMES.REF);
}

/**
 * Build logs directory path (.taskflow/logs)
 */
export function getLogsDir(root: string): string {
	return path.join(root, DIR_NAMES.TASKFLOW, DIR_NAMES.LOGS);
}

/**
 * Build backups directory path (.taskflow/backups)
 */
export function getBackupsDir(root: string): string {
	return path.join(root, DIR_NAMES.TASKFLOW, DIR_NAMES.BACKUPS);
}

/**
 * Build backup directory path for specific version
 */
export function getBackupDir(root: string, version: string): string {
	return path.join(getBackupsDir(root), `v${version}`);
}

// ============================================================================
// PRD Paths
// ============================================================================

/**
 * Build prds directory path (tasks/prds)
 */
export function getPrdsDir(root: string): string {
	return path.join(root, DIR_NAMES.TASKS, DIR_NAMES.PRDS);
}

/**
 * Build PRD file path
 */
export function getPrdFilePath(prdsDir: string, filename: string): string {
	return path.join(prdsDir, filename);
}

// ============================================================================
// Configuration Paths
// ============================================================================

/**
 * Build config file path
 */
export function getConfigPath(root: string): string {
	return path.join(root, FILE_NAMES.CONFIG);
}

/**
 * Build version file path (.taskflow/.version)
 */
export function getVersionPath(root: string): string {
	return path.join(root, DIR_NAMES.TASKFLOW, FILE_NAMES.VERSION);
}

/**
 * Build project index file path
 */
export function getProjectIndexPath(root: string): string {
	return path.join(root, DIR_NAMES.TASKS, FILE_NAMES.PROJECT_INDEX);
}

/**
 * Build tasks progress file path
 */
export function getTasksProgressPath(root: string): string {
	return path.join(root, DIR_NAMES.TASKS, FILE_NAMES.TASKS_PROGRESS);
}

// ============================================================================
// Feature & Story Paths
// ============================================================================

/**
 * Build feature directory path
 */
export function getFeatureDir(
	tasksDir: string,
	featureId: string,
	featureTitle: string,
): string {
	return path.join(tasksDir, getFeatureDirName(featureId, featureTitle));
}

/**
 * Build story directory path
 */
export function getStoryDir(
	tasksDir: string,
	featureId: string,
	featureTitle: string,
	storyId: string,
	storyTitle: string,
): string {
	return path.join(
		getFeatureDir(tasksDir, featureId, featureTitle),
		getStoryDirName(storyId, storyTitle),
	);
}

// ============================================================================
// Task File Paths
// ============================================================================

/**
 * Build task file path
 */
export function getTaskFilePath(
	tasksDir: string,
	featureId: string,
	featureTitle: string,
	storyId: string,
	storyTitle: string,
	taskId: string,
	taskTitle: string,
): string {
	return path.join(
		getStoryDir(tasksDir, featureId, featureTitle, storyId, storyTitle),
		getTaskFileName(taskId, taskTitle),
	);
}

/**
 * Build task file path using story directory
 */
export function getTaskFilePathInDir(
	storyDir: string,
	taskId: string,
	taskTitle: string,
): string {
	return path.join(storyDir, getTaskFileName(taskId, taskTitle));
}

// ============================================================================
// Reference File Paths
// ============================================================================

/**
 * Build reference file path (.taskflow/ref/filename)
 */
export function getRefFilePath(refDir: string, filename: string): string {
	return path.join(refDir, filename);
}

/**
 * Build skill file path (.taskflow/ref/skills/filename)
 */
export function getSkillFilePath(refDir: string, skill: string): string {
	return path.join(refDir, DIR_NAMES.SKILLS, `${skill}.md`);
}

// ============================================================================
// Log File Paths
// ============================================================================

/**
 * Build log file path with timestamp
 */
export function getLogFilePath(
	logsDir: string,
	taskId: string,
	label: string,
): string {
	const sanitizedTaskId = taskId.replace(/\./g, "-");
	const sanitizedLabel = label.replace(/\s+/g, "-");
	const timestamp = new Date()
		.toISOString()
		.replace(/[:.]/g, "-")
		.split("T")[0];
	return path.join(
		logsDir,
		`T${sanitizedTaskId}-${sanitizedLabel}-${timestamp}.log`,
	);
}

// ============================================================================
// Directory Management Utilities
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
 * Ensure all standard taskflow directories exist
 */
export function ensureAllDirs(root: string): void {
	ensureDir(getTasksDir(root));
	ensureDir(getTaskflowDir(root));
	ensureDir(getRefDir(root));
	ensureDir(getLogsDir(root));
	ensureDir(getBackupsDir(root));
}

/**
 * Ensure skills directory exists
 */
export function ensureSkillsDir(refDir: string): void {
	const skillsPath = path.join(refDir, DIR_NAMES.SKILLS);
	ensureDir(skillsPath);
}

// ============================================================================
// Path Resolution Utilities
// ============================================================================

/**
 * Resolve absolute path from relative path
 */
export function resolvePath(root: string, relativePath: string): string {
	return path.resolve(root, relativePath);
}

/**
 * Check if path exists
 */
export function pathExists(filePath: string): boolean {
	return fs.existsSync(filePath);
}
