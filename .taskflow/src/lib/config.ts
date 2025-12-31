/**
 * Configuration constants and paths for the taskflow system
 */

import path from "node:path";
import { fileURLToPath } from "node:url";

// ============================================================================
// Path Resolution
// ============================================================================

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Navigate from src/lib to .taskflow root
export const TASKFLOW_ROOT = path.resolve(__dirname, "../..");
export const PROJECT_ROOT = path.resolve(TASKFLOW_ROOT, "..");
export const TASKS_DIR = path.join(PROJECT_ROOT, "tasks");
export const REF_DIR = path.join(TASKFLOW_ROOT, "ref");
export const LOGS_DIR = path.join(TASKFLOW_ROOT, "logs");

// ============================================================================
// File Names
// ============================================================================

export const PROJECT_INDEX_FILE = "project-index.json";
export const RETROSPECTIVE_FILE = "RETROSPECTIVE.md";

// ============================================================================
// Reference Files
// ============================================================================

export const REF_FILES = {
	aiProtocol: "AI-PROTOCOL.md",
	codingStandards: "CODING-STANDARDS.md",
	architectureRules: "ARCHITECTURE-RULES.md",
	retrospective: RETROSPECTIVE_FILE,
} as const;

export const SKILL_FILES = {
	backend: "skills/backend.md",
	frontend: "skills/frontend.md",
	fullstack: "skills/fullstack.md",
	devops: "skills/devops.md",
	docs: "skills/docs.md",
	development: "skills/backend.md", // fallback to backend for development
} as const;

// ============================================================================
// Validation Commands
// ============================================================================

export const VALIDATION_COMMANDS = [
	{ cmd: "pnpm type-check", label: "type-check" },
	{ cmd: "pnpm biome:check", label: "biome-check" },
	{ cmd: "pnpm arch:validate", label: "arch-validate" },
	{ cmd: "pnpm test", label: "test" },
] as const;

export const FIX_COMMAND = { cmd: "pnpm biome:fix", label: "biome:fix" };

// ============================================================================
// Output Limits
// ============================================================================

export const MAX_SUMMARY_LINES = 50;
export const MAX_OUTPUT_BUFFER = 10 * 1024 * 1024; // 10MB
export const CACHE_TTL = 60000; // 1 minute

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
// Status Transitions (re-exported from types for convenience)
// ============================================================================

// Status transitions are defined in types.ts as STATUS_TRANSITIONS
// Import from there: import { STATUS_TRANSITIONS } from './types.js';

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

export function getProjectIndexPath(): string {
	return path.join(TASKS_DIR, PROJECT_INDEX_FILE);
}

export function getFeatureFilePath(featurePath: string): string {
	return path.join(TASKS_DIR, featurePath, `${featurePath}.json`);
}

export function getRefFilePath(filename: string): string {
	return path.join(REF_DIR, filename);
}

export function getSkillFilePath(skill: string): string {
	const skillFile =
		SKILL_FILES[skill as keyof typeof SKILL_FILES] || SKILL_FILES.backend;
	return path.join(REF_DIR, skillFile);
}

export function getLogFilePath(taskId: string, label: string): string {
	const sanitizedTaskId = taskId.replace(/\./g, "-");
	const sanitizedLabel = label.replace(/\s+/g, "-");
	return path.join(LOGS_DIR, `${sanitizedTaskId}_${sanitizedLabel}.log`);
}

export function getExpectedBranchName(
	storyId: string,
	storyTitle: string,
): string {
	const slug = storyTitle
		.toLowerCase()
		.replace(/[^a-z0-9]+/g, "-")
		.replace(/^-|-$/g, "");
	return `story/S${storyId}-${slug}`;
}
