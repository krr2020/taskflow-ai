/**
 * Types and Zod schemas for the taskflow system
 */

import { z } from "zod";

// ============================================================================
// Status Types
// ============================================================================

/**
 * Task status values - unified status that includes workflow states
 * Active states: setup, implementing, verifying, validating, committing
 * Terminal states: not-started, completed, blocked, on-hold
 */
export const TaskStatusSchema = z.enum([
	"not-started",
	"setup",
	"implementing",
	"verifying",
	"validating",
	"committing",
	"completed",
	"blocked",
	"on-hold",
]);
export type TaskStatus = z.infer<typeof TaskStatusSchema>;

/** Status values that indicate a task is actively being worked on */
export const ACTIVE_STATUSES = [
	"setup",
	"implementing",
	"verifying",
	"validating",
	"committing",
] as const;
export type ActiveStatus = (typeof ACTIVE_STATUSES)[number];

/** Check if a status is an active (in-progress) status */
export function isActiveStatus(status: string): status is ActiveStatus {
	return ACTIVE_STATUSES.includes(status as ActiveStatus);
}

/** Status transitions for workflow progression */
export const STATUS_TRANSITIONS: Record<ActiveStatus, TaskStatus> = {
	setup: "implementing",
	implementing: "verifying",
	verifying: "validating",
	validating: "committing",
	committing: "completed",
} as const;

export const FeatureStatusSchema = z.enum([
	"not-started",
	"in-progress",
	"completed",
	"blocked",
	"on-hold",
]);
export type FeatureStatus = z.infer<typeof FeatureStatusSchema>;

export const TaskSkillSchema = z.enum([
	"backend",
	"frontend",
	"fullstack",
	"devops",
	"docs",
	"development",
]);
export type TaskSkill = z.infer<typeof TaskSkillSchema>;

export const SubtaskStatusSchema = z.enum(["pending", "completed"]);
export type SubtaskStatus = z.infer<typeof SubtaskStatusSchema>;

// ============================================================================
// Subtask Schema
// ============================================================================

export const SubtaskSchema = z.object({
	id: z.string().min(1),
	description: z.string().min(1),
	status: SubtaskStatusSchema,
});
export type Subtask = z.infer<typeof SubtaskSchema>;

// ============================================================================
// Task File Schema (T*.json)
// ============================================================================

export const TaskNoteSchema = z.object({
	timestamp: z.string(),
	type: z.enum(["note", "handoff", "blocker", "decision"]).optional(),
	from: z.string().optional(),
	to: z.string().optional(),
	content: z.string(),
});

export type TaskNote = z.infer<typeof TaskNoteSchema>;

export const TimeEntrySchema = z.object({
	start: z.string(),
	end: z.string().optional(),
	hours: z.number().optional(),
	note: z.string().optional(),
});
export type TimeEntry = z.infer<typeof TimeEntrySchema>;

export const TaskFileContentSchema = z.object({
	id: z.string().regex(/^\d+\.\d+\.\d+$/, "Task ID must be in format N.M.K"),
	title: z.string().min(1),
	description: z.string().min(1),
	status: TaskStatusSchema,
	skill: TaskSkillSchema.optional().default("backend"),
	subtasks: z.array(SubtaskSchema).optional().default([]),
	context: z.array(z.string()).optional().default([]),
	blockedReason: z.string().optional(),
	previousStatus: TaskStatusSchema.optional(),
	notes: z.array(TaskNoteSchema).optional(),
	estimatedHours: z.number().optional(),
	actualHours: z.number().optional(),
	timeEntries: z.array(TimeEntrySchema).optional(),
});
export type TaskFileContent = z.infer<typeof TaskFileContentSchema>;

// ============================================================================
// Feature File Schemas (F*.json)
// ============================================================================

export const TaskRefSchema = z.object({
	id: z.string().regex(/^\d+\.\d+\.\d+$/, "Task ID must be in format N.M.K"),
	title: z.string().min(1),
	status: TaskStatusSchema,
	dependencies: z.array(z.string()).default([]),
});
export type TaskRef = z.infer<typeof TaskRefSchema>;

export const StorySchema = z.object({
	id: z.string().regex(/^\d+\.\d+$/, "Story ID must be in format N.M"),
	title: z.string().min(1),
	status: FeatureStatusSchema,
	tasks: z.array(TaskRefSchema),
});
export type Story = z.infer<typeof StorySchema>;

export const FeatureSchema = z.object({
	id: z.string().regex(/^\d+$/, "Feature ID must be a number"),
	title: z.string().min(1),
	status: FeatureStatusSchema,
	path: z.string().optional(),
	stories: z.array(StorySchema),
});
export type Feature = z.infer<typeof FeatureSchema>;

// ============================================================================
// Project Index Schema (project-index.json)
// ============================================================================

export const FeatureRefSchema = z.object({
	id: z.string().regex(/^\d+$/, "Feature ID must be a number"),
	title: z.string().min(1),
	status: FeatureStatusSchema,
	path: z.string().min(1),
});
export type FeatureRef = z.infer<typeof FeatureRefSchema>;

export const ProjectIndexSchema = z.object({
	project: z.string().min(1),
	features: z.array(FeatureRefSchema),
});
export type ProjectIndex = z.infer<typeof ProjectIndexSchema>;

// ============================================================================
// Taskflow Config Schema
// ============================================================================

export const TaskflowConfigSchema = z.object({
	project: z.object({
		name: z.string().min(1),
		root: z.string().default("."),
	}),
	branching: z.object({
		strategy: z.enum(["per-story", "per-task", "none"]).default("per-story"),
		base: z.string().default("main"),
		prefix: z.string().default("story/"),
	}),
	validation: z
		.object({
			commands: z.record(z.string(), z.string()).optional(),
		})
		.optional(),
});
export type TaskflowConfig = z.infer<typeof TaskflowConfigSchema>;

// ============================================================================
// Runtime Types (not stored in files)
// ============================================================================

export interface TasksProgress {
	project: string;
	features: Feature[];
}

export interface ActiveTask {
	taskId: string;
	filePath: string;
	content: TaskFileContent;
}

export interface TaskLocation {
	feature: Feature;
	story: Story;
	task: TaskRef;
}

export interface StoryLocation {
	feature: Feature;
	story: Story;
}

// ============================================================================
// Retrospective Types
// ============================================================================

export const CriticalitySchema = z.enum(["Low", "Medium", "High", "Critical"]);
export type Criticality = z.infer<typeof CriticalitySchema>;

export const ErrorCategorySchema = z.enum([
	"Type Error",
	"Lint",
	"Architecture",
	"Runtime",
	"Build",
	"Test",
	"Formatting",
]);
export type ErrorCategory = z.infer<typeof ErrorCategorySchema>;

export interface RetrospectiveItem {
	id: string;
	category: string;
	pattern: string;
	solution: string;
	count: number;
	criticality: string;
}

export interface ValidationResult {
	command: string;
	label: string;
	success: boolean;
	summary: string;
	fullOutput: string;
	logFile?: string;
}

// ============================================================================
// Git Types
// ============================================================================

export interface BranchInfo {
	current: string;
	expected: string;
	isCorrect: boolean;
}

// ============================================================================
// Task Context (for caching)
// ============================================================================

export interface TaskContext {
	currentTask: {
		id: string;
		title: string;
		status: string;
		story: string;
	} | null;
	nextTask: {
		id: string;
		title: string;
		story: string;
	} | null;
	timestamp: number;
}

// ============================================================================
// Validation helpers
// ============================================================================

export function validateTaskFileContent(data: unknown): TaskFileContent {
	return TaskFileContentSchema.parse(data);
}

export function validateFeature(data: unknown): Feature {
	return FeatureSchema.parse(data);
}

export function validateProjectIndex(data: unknown): ProjectIndex {
	return ProjectIndexSchema.parse(data);
}

export function validateTaskflowConfig(data: unknown): TaskflowConfig {
	return TaskflowConfigSchema.parse(data);
}

export function isValidTaskId(id: string): boolean {
	return /^\d+\.\d+\.\d+$/.test(id);
}

export function isValidStoryId(id: string): boolean {
	return /^\d+\.\d+$/.test(id);
}

export function isValidFeatureId(id: string): boolean {
	return /^\d+$/.test(id);
}

export function parseTaskId(taskId: string): {
	featureId: string;
	storyId: string;
	taskNumber: string;
} | null {
	const match = taskId.match(/^(\d+)\.(\d+)\.(\d+)$/);
	if (!match) return null;
	return {
		featureId: match[1] as string,
		storyId: `${match[1]}.${match[2]}`,
		taskNumber: match[3] as string,
	};
}
