/**
 * Configuration constants and path helpers for the taskflow system
 * This module handles paths for user projects (not the package itself)
 */

import path from "node:path";
import {
	DIR_NAMES,
	FILE_NAMES,
	VALIDATION_LIMITS,
} from "@/lib/config/constants";

// ============================================================================
// Path Helpers (relative to user's project root)
// ============================================================================

export interface ProjectPaths {
	projectRoot: string;
	tasksDir: string;
	taskflowDir: string;
	refDir: string;
	logsDir: string;
	configPath: string;
}

export function getProjectPaths(projectRoot: string): ProjectPaths {
	const tasksDir = path.join(projectRoot, DIR_NAMES.TASKS);
	const taskflowDir = path.join(projectRoot, DIR_NAMES.TASKFLOW);
	const refDir = path.join(taskflowDir, DIR_NAMES.REF);
	const logsDir = path.join(taskflowDir, DIR_NAMES.LOGS);
	const configPath = path.join(projectRoot, FILE_NAMES.CONFIG);

	return {
		projectRoot,
		tasksDir,
		taskflowDir,
		refDir,
		logsDir,
		configPath,
	};
}

// ============================================================================
// File Names
// ============================================================================

export const PROJECT_INDEX_FILE = FILE_NAMES.PROJECT_INDEX;
export const RETROSPECTIVE_FILE = "retrospective.md";
export const CONFIG_FILE = FILE_NAMES.CONFIG;

// ============================================================================
// Template Structure (source paths in package)
// ============================================================================

export const TEMPLATE_FILES = {
	protocols: {
		aiProtocol: "protocols/ai-protocol.md",
		taskGenerator: "protocols/task-generator.md",
		taskExecutor: "protocols/task-executor.md",
	},
	prd: {
		prdGenerator: "prd/prd-generator.md",
	},
	project: {
		codingStandards: "project/coding-standards.md",
		architectureRules: "project/architecture-rules.md",
	},
	retrospective: {
		retrospective: "retrospective/retrospective.md",
	},
	skills: {
		backend: "skills/backend.md",
		frontend: "skills/frontend.md",
		fullstack: "skills/fullstack.md",
		devops: "skills/devops.md",
		docs: "skills/docs.md",
		mobile: "skills/mobile-app.md",
	},
} as const;

// ============================================================================
// Reference Files (destination paths in user's .taskflow/ref directory)
// ============================================================================

export const REF_FILES = {
	aiProtocol: "ai-protocol.md",
	taskGenerator: "task-generator.md",
	taskExecutor: "task-executor.md",
	prdGenerator: "prd-generator.md",
	codingStandards: "coding-standards.md",
	architectureRules: "architecture-rules.md",
	retrospective: RETROSPECTIVE_FILE,
} as const;

export const SKILL_FILES = {
	backend: "skills/backend.md",
	frontend: "skills/frontend.md",
	fullstack: "skills/fullstack.md",
	devops: "skills/devops.md",
	docs: "skills/docs.md",
	mobile: "skills/mobile-app.md",
	development: "skills/backend.md", // fallback to backend for development
} as const;

// ============================================================================
// Output Limits
// ============================================================================

export const MAX_SUMMARY_LINES = VALIDATION_LIMITS.MAX_SUMMARY_LINES;
export const MAX_OUTPUT_BUFFER = VALIDATION_LIMITS.MAX_OUTPUT_BUFFER;
export const CACHE_TTL = VALIDATION_LIMITS.CACHE_TTL;

// ============================================================================
// Commit Message Format
// ============================================================================

export const COMMIT_TYPES = [
	"feat",
	"fix",
	"docs",
	"style",
	"refactor",
	"test",
	"chore",
] as const;
export type CommitType = (typeof COMMIT_TYPES)[number];

export const COMMIT_HEADER_REGEX =
	/^(feat|fix|docs|style|refactor|test|chore)\(F\d+\): T\d+\.\d+\.\d+ - .+$/;

// ============================================================================
// Error Patterns for Validation Output
// ============================================================================

export const ERROR_PATTERNS = [
	/error/i,
	/fail/i,
	/\u2717|\u2716|\xd7/, // ✗ ✖ ×
	/Error:/,
	/TypeError:/,
	/SyntaxError:/,
	/Cannot find/,
	/not found/i,
	/FAIL/,
	/ERR!/,
	/warning:/i,
] as const;

// ============================================================================
// Helper Functions
// ============================================================================

export function getProjectIndexPath(tasksDir: string): string {
	return path.join(tasksDir, PROJECT_INDEX_FILE);
}

export function getFeatureFilePath(
	tasksDir: string,
	featurePath: string,
): string {
	// If the path ends in .json, return it as is (relative to tasksDir)
	if (featurePath.endsWith(".json")) {
		return path.join(tasksDir, featurePath);
	}
	// Otherwise assume it's a directory and look for a json file with the same name as the directory
	return path.join(tasksDir, featurePath, `${path.basename(featurePath)}.json`);
}

export function getRefFilePath(refDir: string, filename: string): string {
	return path.join(refDir, filename);
}

export function getSkillFilePath(refDir: string, skill: string): string {
	const skillFile =
		SKILL_FILES[skill as keyof typeof SKILL_FILES] || SKILL_FILES.backend;
	return path.join(refDir, skillFile);
}

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

export function getExpectedBranchName(
	storyId: string,
	storyTitle: string,
	isIntermittent: boolean = false,
): string {
	const slug = storyTitle
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");

	// Intermittent tasks use different branch prefix
	if (isIntermittent || storyId.startsWith("0.")) {
		return `intermittent/S${storyId}-${slug}`;
	}

	return `story/S${storyId}-${slug}`;
}

export function slugify(text: string): string {
	return text
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
}
