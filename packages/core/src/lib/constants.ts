/**
 * Centralized constants for the taskflow system
 * This file contains all hardcoded values used throughout the codebase
 */

// ============================================================================
// Directory Names
// ============================================================================

export const DIR_NAMES = {
	TASKS: "tasks",
	PRDS: "prds",
	TASKFLOW: ".taskflow",
	REF: "ref",
	LOGS: "logs",
	BACKUPS: "backups",
	SKILLS: "skills",
} as const;

// ============================================================================
// File Names
// ============================================================================

export const FILE_NAMES = {
	VERSION: ".version",
	CONFIG: "taskflow.config.json",
	PROJECT_INDEX: "project-index.json",
	TASKS_PROGRESS: "tasks-progress.json",
} as const;

export const REF_FILES = {
	RETROSPECTIVE: "retrospective.md",
	CODING_STANDARDS: "coding-standards.md",
	ARCHITECTURE_RULES: "architecture-rules.md",
} as const;

// ============================================================================
// File Extensions
// ============================================================================

export const FILE_EXTENSIONS = {
	MARKDOWN: ".md",
	JSON: ".json",
	LOG: ".log",
} as const;

// ============================================================================
// Version Constants
// ============================================================================

export const VERSIONS = {
	TEMPLATE: "0.1.0",
} as const;

// ============================================================================
// Validation Limits
// ============================================================================

export const VALIDATION_LIMITS = {
	MAX_SUMMARY_LINES: 50,
	MAX_OUTPUT_BUFFER: 10 * 1024 * 1024, // 10MB
	MAX_RETRIES: 3,
	CACHE_TTL: 60000, // 1 minute
} as const;

// ============================================================================
// Message Constants
// ============================================================================

export const MESSAGES = {
	AUTO_STASH_MESSAGE: "Auto-stash by taskflow before branch switch",
	COMMIT_TEMP_FILE: "taskflow-commit-msg.txt",
	COMMIT_TEMP_DIR: "/tmp",
} as const;

// ============================================================================
// Path Template Functions
// ============================================================================

/**
 * Slugify text for use in file paths
 */
export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}

/**
 * Generate story directory name
 */
export function getStoryDirName(storyId: string, title: string): string {
	return `S${storyId}-${slugify(title)}`;
}

/**
 * Generate feature directory name
 */
export function getFeatureDirName(featureId: string, title: string): string {
	return `F${featureId}-${slugify(title)}`;
}

/**
 * Generate task file name
 */
export function getTaskFileName(taskId: string, title: string): string {
	return `T${taskId}-${slugify(title)}.json`;
}

// ============================================================================
// Git Branch Patterns
// ============================================================================

export const BRANCH_PATTERNS = {
	STORY_PREFIX: "story/S",
	INTERMITTENT_PREFIX: "intermittent/S",
} as const;
