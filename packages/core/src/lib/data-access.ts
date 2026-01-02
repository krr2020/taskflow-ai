/**
 * Data access layer for loading and saving JSON files
 */

import fs from "node:fs";
import path from "node:path";
import { getFeatureFilePath, getProjectIndexPath } from "./config-paths.js";
import {
	FileNotFoundError,
	InvalidFileFormatError,
	TaskflowError,
} from "./errors.js";
import {
	deleteFile,
	ensureDir,
	exists,
	listFiles,
	readJson,
	readText,
	writeJson,
} from "./file-utils.js";
import { consoleOutput } from "./output.js";
import type {
	ActiveTask,
	Feature,
	FeatureStatus,
	ProjectIndex,
	Story,
	StoryLocation,
	TaskFileContent,
	TaskLocation,
	TaskRef,
	TaskStatus,
	TasksProgress,
} from "./types.js";
import {
	isActiveStatus,
	validateFeature,
	validateProjectIndex,
	validateTaskFileContent,
} from "./types.js";

// ============================================================================
// Project Index Operations
// ============================================================================

export function loadProjectIndex(tasksDir: string): ProjectIndex {
	const indexPath = getProjectIndexPath(tasksDir);
	if (!exists(indexPath)) {
		throw new FileNotFoundError(indexPath);
	}

	try {
		const data = readJson(indexPath);
		if (!data)
			throw new TaskflowError("Invalid JSON in project index", "INVALID_JSON");
		return validateProjectIndex(data);
	} catch (error) {
		if (error instanceof FileNotFoundError) throw error;
		throw new InvalidFileFormatError(
			indexPath,
			error instanceof Error ? error.message : String(error),
		);
	}
}

export function saveProjectIndex(
	tasksDir: string,
	tasksProgress: TasksProgress,
): void {
	const indexPath = getProjectIndexPath(tasksDir);
	const index: ProjectIndex = {
		project: tasksProgress.project,
		features: tasksProgress.features.map((f) => ({
			id: f.id,
			title: f.title,
			status: f.status,
			path:
				f.path ||
				`F${f.id}-${f.title.toLowerCase().replace(/[^a-z0-9]+/g, "-")}`,
		})),
	};
	writeJson(indexPath, index);
}

// ============================================================================
// Feature File Operations
// ============================================================================

export function loadFeature(tasksDir: string, featurePath: string): Feature {
	const filePath = getFeatureFilePath(tasksDir, featurePath);
	if (!exists(filePath)) {
		throw new FileNotFoundError(filePath);
	}

	try {
		const data = readJson(filePath);
		if (!data) throw new TaskflowError("Invalid JSON in feature", "INVALID_JSON");
		const feature = validateFeature(data);
		feature.path = featurePath;
		return feature;
	} catch (error) {
		if (error instanceof FileNotFoundError) throw error;
		throw new InvalidFileFormatError(
			filePath,
			error instanceof Error ? error.message : String(error),
		);
	}
}

export function saveFeature(tasksDir: string, feature: Feature): void {
	if (!feature.path) {
		throw new TaskflowError(
			"Feature path is required for saving",
			"FEATURE_PATH_REQUIRED",
		);
	}
	const filePath = getFeatureFilePath(tasksDir, feature.path);

	// Custom stringify to keep short arrays (like dependencies) on one line
	let json = JSON.stringify(feature, null, 2);
	json = json.replace(
		/"dependencies":\s*\[\s*\n\s*("(?:[^"\\]|\\.)*"(?:\s*,\s*\n\s*"(?:[^"\\]|\\.)*")*)\s*\n\s*\]/g,
		(_match, deps) => {
			const cleanDeps = deps
				.replace(/\s*\n\s*/g, ", ")
				.replace(/\s+/g, " ")
				.replace(/,\s*,/g, ",");
			return `"dependencies": [${cleanDeps}]`;
		},
	);

	fs.writeFileSync(filePath, `${json}\n`);
}

// ============================================================================
// Task File Operations
// ============================================================================

export function getTaskFilePath(
	tasksDir: string,
	tasksProgress: TasksProgress,
	taskId: string,
): string | null {
	const location = findTaskLocation(tasksProgress, taskId);
	if (!location) {
		consoleOutput(`Debug: Task location not found for ${taskId}`);
		return null;
	}

	const { feature, story, task } = location;
	const featureDir = path.join(tasksDir, feature.path || "");

	if (!exists(featureDir)) {
		consoleOutput(`Debug: Feature dir not found: ${featureDir}`);
		return null;
	}

	// Find story directory by ID prefix (handles variable naming)
	const dirs = listFiles(featureDir).filter((d) =>
		d.startsWith(`S${story.id}-`),
	);
	if (dirs.length === 0) {
		consoleOutput(
			`Debug: Story dir not found in ${featureDir} starting with S${story.id}-`,
		);
		return null;
	}

	const storyDir = path.join(featureDir, dirs[0] as string);

	// Find task file by ID prefix
	const files = listFiles(storyDir).filter((f) => f.startsWith(`T${task.id}`));
	if (files.length === 0) {
		consoleOutput(
			`Debug: Task file not found in ${storyDir} starting with T${task.id}`,
		);
		return null;
	}

	return path.join(storyDir, files[0] as string);
}

export function loadTaskFile(filePath: string): TaskFileContent | null {
	if (!exists(filePath)) return null;

	try {
		const data = readJson(filePath);
		if (!data) return null;
		return validateTaskFileContent(data);
	} catch {
		return null;
	}
}

export function saveTaskFile(filePath: string, content: TaskFileContent): void {
	writeJson(filePath, content);
}

// ============================================================================
// Aggregate Operations
// ============================================================================

export function loadTasksProgress(tasksDir: string): TasksProgress {
	const projectIndex = loadProjectIndex(tasksDir);
	const features: Feature[] = [];

	for (const featureRef of projectIndex.features) {
		try {
			const feature = loadFeature(tasksDir, featureRef.path);
			features.push(feature);
		} catch (error) {
			// Create placeholder for missing features
			consoleOutput(
				`Warning: Could not load feature ${featureRef.title}: ${error}`,
				{ type: "warn" },
			);
			features.push({
				id: featureRef.id,
				title: featureRef.title,
				status: featureRef.status,
				path: featureRef.path,
				stories: [],
			});
		}
	}

	return {
		project: projectIndex.project,
		features: features.sort((a, b) =>
			a.id.localeCompare(b.id, undefined, { numeric: true }),
		),
	};
}

// ============================================================================
// Task/Story/Feature Lookup
// ============================================================================

export function findTaskLocation(
	tasksProgress: TasksProgress,
	taskId: string,
): TaskLocation | null {
	for (const feature of tasksProgress.features) {
		for (const story of feature.stories) {
			for (const task of story.tasks) {
				if (task.id === taskId) {
					return { feature, story, task };
				}
			}
		}
	}
	return null;
}

export function findStoryLocation(
	tasksProgress: TasksProgress,
	storyId: string,
): StoryLocation | null {
	for (const feature of tasksProgress.features) {
		for (const story of feature.stories) {
			if (story.id === storyId) {
				return { feature, story };
			}
		}
	}
	return null;
}

export function findFeature(
	tasksProgress: TasksProgress,
	featureId: string,
): Feature | null {
	return tasksProgress.features.find((f) => f.id === featureId) || null;
}

// ============================================================================
// Active Task Detection
// ============================================================================

export function findActiveTask(
	tasksDir: string,
	tasksProgress: TasksProgress,
): ActiveTask | null {
	for (const feature of tasksProgress.features) {
		for (const story of feature.stories) {
			for (const task of story.tasks) {
				// A task is active if its status is one of the active statuses
				if (isActiveStatus(task.status)) {
					const filePath = getTaskFilePath(tasksDir, tasksProgress, task.id);
					if (filePath) {
						const content = loadTaskFile(filePath);
						if (content && isActiveStatus(content.status)) {
							return { taskId: task.id, filePath, content };
						}
					}
				}
			}
		}
	}
	return null;
}

// ============================================================================
// Status Calculations
// ============================================================================

export function calculateStoryStatus(story: Story): FeatureStatus {
	const allTasks = story.tasks;
	if (allTasks.length === 0) return "not-started";

	const completedTasks = allTasks.filter((t) => t.status === "completed");
	const activeTasks = allTasks.filter((t) => isActiveStatus(t.status));
	const blockedTasks = allTasks.filter((t) => t.status === "blocked");

	if (completedTasks.length === allTasks.length) return "completed";
	if (blockedTasks.length === allTasks.length) return "blocked";
	// Story is "in-progress" if any task is active or some are completed
	if (activeTasks.length > 0 || completedTasks.length > 0) return "in-progress";
	return "not-started";
}

export function calculateFeatureStatus(feature: Feature): FeatureStatus {
	const allStories = feature.stories;
	if (allStories.length === 0) return "not-started";

	const completedStories = allStories.filter((s) => s.status === "completed");
	const activeStories = allStories.filter((s) => s.status === "in-progress");
	const blockedStories = allStories.filter((s) => s.status === "blocked");

	if (completedStories.length === allStories.length) return "completed";
	if (blockedStories.length === allStories.length) return "blocked";
	// Feature is "in-progress" if any story is active or some are completed
	if (activeStories.length > 0 || completedStories.length > 0)
		return "in-progress";
	return "not-started";
}

// ============================================================================
// State Updates
// ============================================================================

export function updateTaskStatus(
	tasksDir: string,
	tasksProgress: TasksProgress,
	taskId: string,
	status: TaskStatus,
): TaskLocation | null {
	const location = findTaskLocation(tasksProgress, taskId);
	if (!location) return null;

	const { feature, story, task } = location;

	// Update task status in feature file
	task.status = status;

	// Also update the task file if it exists
	const filePath = getTaskFilePath(tasksDir, tasksProgress, taskId);
	if (filePath) {
		const content = loadTaskFile(filePath);
		if (content) {
			content.status = status;
			saveTaskFile(filePath, content);
		}
	}

	// Recalculate parent statuses with correct FeatureStatus values
	story.status = calculateStoryStatus(story);
	feature.status = calculateFeatureStatus(feature);

	// Save changes
	saveFeature(tasksDir, feature);
	saveProjectIndex(tasksDir, tasksProgress);

	return location;
}

export function updateSubtaskStatus(
	filePath: string,
	subtaskId: string,
	status: "pending" | "completed",
): boolean {
	const content = loadTaskFile(filePath);
	if (!content || !content.subtasks) return false;

	const subtask = content.subtasks.find((s) => s.id === subtaskId);
	if (!subtask) return false;

	subtask.status = status;
	saveTaskFile(filePath, content);
	return true;
}

export function completeAllSubtasks(filePath: string): boolean {
	const content = loadTaskFile(filePath);
	if (!content || !content.subtasks) return false;

	let changed = false;
	for (const subtask of content.subtasks) {
		if (subtask.status !== "completed") {
			subtask.status = "completed";
			changed = true;
		}
	}

	if (changed) {
		saveTaskFile(filePath, content);
	}
	return true;
}

export function blockTask(
	tasksDir: string,
	tasksProgress: TasksProgress,
	taskId: string,
	reason: string,
): TaskLocation | null {
	const location = findTaskLocation(tasksProgress, taskId);
	if (!location) return null;

	const filePath = getTaskFilePath(tasksDir, tasksProgress, taskId);
	if (filePath) {
		const content = loadTaskFile(filePath);
		if (content) {
			content.blockedReason = reason;
			saveTaskFile(filePath, content);
		}
	}

	return updateTaskStatus(tasksDir, tasksProgress, taskId, "blocked");
}

// ============================================================================
// Progress Statistics
// ============================================================================

export interface ProgressStats {
	totalFeatures: number;
	completedFeatures: number;
	totalStories: number;
	completedStories: number;
	totalTasks: number;
	completedTasks: number;
}

export function calculateProgressStats(
	tasksProgress: TasksProgress,
): ProgressStats {
	const stats: ProgressStats = {
		totalFeatures: tasksProgress.features.length,
		completedFeatures: 0,
		totalStories: 0,
		completedStories: 0,
		totalTasks: 0,
		completedTasks: 0,
	};

	for (const feature of tasksProgress.features) {
		if (feature.status === "completed") stats.completedFeatures++;

		for (const story of feature.stories) {
			stats.totalStories++;
			if (story.status === "completed") stats.completedStories++;

			for (const task of story.tasks) {
				stats.totalTasks++;
				if (task.status === "completed") stats.completedTasks++;
			}
		}
	}

	return stats;
}

// ============================================================================
// Next Task Finding
// ============================================================================

export interface NextTaskResult {
	task: TaskRef;
	story: Story;
	feature: Feature;
	isIntermittent: boolean;
}

export function findNextAvailableTask(
	tasksProgress: TasksProgress,
	excludeTaskId?: string,
	includeIntermittent: boolean = false,
): NextTaskResult | null {
	// Priority 1: Active tasks in active stories (non-intermittent only)
	for (const feature of tasksProgress.features) {
		if (feature.status === "completed") continue;
		for (const story of feature.stories) {
			if (story.status !== "in-progress") continue;
			for (const task of story.tasks) {
				// Skip intermittent tasks in priority 1
				if (task.isIntermittent) continue;
				if (isActiveStatus(task.status) && task.id !== excludeTaskId) {
					return { task, story, feature, isIntermittent: false };
				}
			}
		}
	}

	// Priority 2: Not-started tasks in active stories (non-intermittent only)
	for (const feature of tasksProgress.features) {
		if (feature.status === "completed") continue;
		for (const story of feature.stories) {
			if (story.status !== "in-progress") continue;
			for (const task of story.tasks) {
				// Skip intermittent tasks in priority 2
				if (task.isIntermittent) continue;
				if (task.status === "not-started" && task.id !== excludeTaskId) {
					const depsMet = checkDependenciesMet(tasksProgress, task);
					if (depsMet) {
						return { task, story, feature, isIntermittent: false };
					}
				}
			}
		}
	}

	// Priority 3: Not-started tasks in not-started stories (non-intermittent only)
	for (const feature of tasksProgress.features) {
		if (feature.status === "completed") continue;
		for (const story of feature.stories) {
			if (story.status !== "not-started") continue;
			for (const task of story.tasks) {
				// Skip intermittent tasks in priority 3
				if (task.isIntermittent) continue;
				if (task.status === "not-started" && task.id !== excludeTaskId) {
					const depsMet = checkDependenciesMet(tasksProgress, task);
					if (depsMet) {
						return { task, story, feature, isIntermittent: false };
					}
				}
			}
		}
	}

	// Priority 4: Intermittent tasks (only if includeIntermittent is true)
	if (includeIntermittent) {
		for (const feature of tasksProgress.features) {
			if (feature.status === "completed") continue;
			// F0 is for intermittent tasks
			if (feature.id !== "0") continue;

			for (const story of feature.stories) {
				for (const task of story.tasks) {
					// Only look at intermittent tasks
					if (!task.isIntermittent) continue;

					// Return any non-completed intermittent task
					if (task.status !== "completed" && task.id !== excludeTaskId) {
						return { task, story, feature, isIntermittent: true };
					}
				}
			}
		}
	}

	return null;
}

export function checkDependenciesMet(
	tasksProgress: TasksProgress,
	task: TaskRef,
): boolean {
	if (!task.dependencies || task.dependencies.length === 0) return true;

	for (const depId of task.dependencies) {
		const depLocation = findTaskLocation(tasksProgress, depId);
		if (!depLocation || depLocation.task.status !== "completed") {
			return false;
		}
	}
	return true;
}

export function getUnmetDependencies(
	tasksProgress: TasksProgress,
	task: TaskRef,
): string[] {
	if (!task.dependencies || task.dependencies.length === 0) return [];

	return task.dependencies.filter((depId) => {
		const depLocation = findTaskLocation(tasksProgress, depId);
		return !depLocation || depLocation.task.status !== "completed";
	});
}

// ============================================================================
// Reference File Loading
// ============================================================================

export function loadReferenceFile(filePath: string): string {
	if (!exists(filePath)) return "";
	try {
		const content = readText(filePath);
		return content ?? "";
	} catch {
		return "";
	}
}

// ============================================================================
// Logs Management
// ============================================================================

export function ensureLogsDir(logsDir: string): void {
	if (!exists(logsDir)) {
		ensureDir(logsDir);
	}
}

export function cleanupTaskLogs(logsDir: string, taskId: string): number {
	if (!exists(logsDir)) return 0;

	const prefix = taskId.replace(/\./g, "-");
	const files = listFiles(logsDir).filter((f) => f.startsWith(prefix));

	for (const file of files) {
		deleteFile(path.join(logsDir, file));
	}

	return files.length;
}

export function saveLogFile(
	logPath: string,
	command: string,
	output: string,
): void {
	const dir = path.dirname(logPath);
	ensureLogsDir(dir);
	const content = `Command: ${command}\nTimestamp: ${new Date().toISOString()}\n\n${output}`;
	fs.writeFileSync(logPath, content);
}

// ============================================================================
// Re-exports for convenience
// ============================================================================

export { getProjectIndexPath, type ProjectPaths } from "./config-paths.js";
export type {
	Feature,
	FeatureStatus,
	Story,
	TaskFileContent,
	TaskRef,
	TaskStatus,
	TasksProgress,
} from "./types.js";
