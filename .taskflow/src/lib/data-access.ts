/**
 * Data access layer for loading and saving JSON files
 */

import fs from "node:fs";
import path from "node:path";
import { getFeatureFilePath, getProjectIndexPath, TASKS_DIR } from "./config";
import { FileNotFoundError, InvalidFileFormatError } from "./errors";
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
} from "./types";
import {
	isActiveStatus,
	validateFeature,
	validateProjectIndex,
	validateTaskFileContent,
} from "./types";

// ============================================================================
// Project Index Operations
// ============================================================================

export function loadProjectIndex(): ProjectIndex {
	const indexPath = getProjectIndexPath();
	if (!fs.existsSync(indexPath)) {
		throw new FileNotFoundError(indexPath);
	}

	try {
		const content = fs.readFileSync(indexPath, "utf-8");
		const data = JSON.parse(content);
		return validateProjectIndex(data);
	} catch (error) {
		if (error instanceof FileNotFoundError) throw error;
		throw new InvalidFileFormatError(
			indexPath,
			error instanceof Error ? error.message : String(error),
		);
	}
}

export function saveProjectIndex(tasksProgress: TasksProgress): void {
	const indexPath = getProjectIndexPath();
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
	fs.writeFileSync(indexPath, `${JSON.stringify(index, null, 2)}\n`);
}

// ============================================================================
// Feature File Operations
// ============================================================================

export function loadFeature(featurePath: string): Feature {
	const filePath = getFeatureFilePath(featurePath);
	if (!fs.existsSync(filePath)) {
		throw new FileNotFoundError(filePath);
	}

	try {
		const content = fs.readFileSync(filePath, "utf-8");
		const data = JSON.parse(content);
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

export function saveFeature(feature: Feature): void {
	if (!feature.path) {
		throw new Error("Feature path is required for saving");
	}
	const filePath = getFeatureFilePath(feature.path);

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
	tasksProgress: TasksProgress,
	taskId: string,
): string | null {
	const location = findTaskLocation(tasksProgress, taskId);
	if (!location) return null;

	const { feature, story, task } = location;
	const featureDir = path.join(TASKS_DIR, feature.path || "");

	if (!fs.existsSync(featureDir)) return null;

	// Find story directory by ID prefix (handles variable naming)
	const dirs = fs
		.readdirSync(featureDir)
		.filter((d) => d.startsWith(`S${story.id}-`));
	if (dirs.length === 0) return null;

	const storyDir = path.join(featureDir, dirs[0] as string);

	// Find task file by ID prefix
	const files = fs
		.readdirSync(storyDir)
		.filter((f) => f.startsWith(`T${task.id}`));
	return files.length > 0 ? path.join(storyDir, files[0] as string) : null;
}

export function loadTaskFile(filePath: string): TaskFileContent | null {
	if (!fs.existsSync(filePath)) return null;

	try {
		const content = fs.readFileSync(filePath, "utf-8");
		const data = JSON.parse(content);
		return validateTaskFileContent(data);
	} catch {
		return null;
	}
}

export function saveTaskFile(filePath: string, content: TaskFileContent): void {
	fs.writeFileSync(filePath, `${JSON.stringify(content, null, 2)}\n`);
}

// ============================================================================
// Aggregate Operations
// ============================================================================

export function loadTasksProgress(): TasksProgress {
	const projectIndex = loadProjectIndex();
	const features: Feature[] = [];

	for (const featureRef of projectIndex.features) {
		try {
			const feature = loadFeature(featureRef.path);
			features.push(feature);
		} catch (error) {
			// Create placeholder for missing features
			console.warn(
				`Warning: Could not load feature ${featureRef.title}: ${error}`,
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
	tasksProgress: TasksProgress,
): ActiveTask | null {
	for (const feature of tasksProgress.features) {
		for (const story of feature.stories) {
			for (const task of story.tasks) {
				// A task is active if its status is one of the active statuses
				if (isActiveStatus(task.status)) {
					const filePath = getTaskFilePath(tasksProgress, task.id);
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
	const filePath = getTaskFilePath(tasksProgress, taskId);
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
	saveFeature(feature);
	saveProjectIndex(tasksProgress);

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
	tasksProgress: TasksProgress,
	taskId: string,
	reason: string,
): TaskLocation | null {
	const location = findTaskLocation(tasksProgress, taskId);
	if (!location) return null;

	const filePath = getTaskFilePath(tasksProgress, taskId);
	if (filePath) {
		const content = loadTaskFile(filePath);
		if (content) {
			content.blockedReason = reason;
			saveTaskFile(filePath, content);
		}
	}

	return updateTaskStatus(tasksProgress, taskId, "blocked");
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

export function findNextAvailableTask(
	tasksProgress: TasksProgress,
	excludeTaskId?: string,
): { task: TaskRef; story: Story; feature: Feature } | null {
	// Priority 1: Active tasks in active stories
	for (const feature of tasksProgress.features) {
		if (feature.status === "completed") continue;
		for (const story of feature.stories) {
			if (story.status !== "in-progress") continue;
			for (const task of story.tasks) {
				if (isActiveStatus(task.status) && task.id !== excludeTaskId) {
					return { task, story, feature };
				}
			}
		}
	}

	// Priority 2: Not-started tasks in active stories
	for (const feature of tasksProgress.features) {
		if (feature.status === "completed") continue;
		for (const story of feature.stories) {
			if (story.status !== "in-progress") continue;
			for (const task of story.tasks) {
				if (task.status === "not-started" && task.id !== excludeTaskId) {
					const depsMet = checkDependenciesMet(tasksProgress, task);
					if (depsMet) {
						return { task, story, feature };
					}
				}
			}
		}
	}

	// Priority 3: Not-started tasks in not-started stories
	for (const feature of tasksProgress.features) {
		if (feature.status === "completed") continue;
		for (const story of feature.stories) {
			if (story.status !== "not-started") continue;
			for (const task of story.tasks) {
				if (task.status === "not-started" && task.id !== excludeTaskId) {
					const depsMet = checkDependenciesMet(tasksProgress, task);
					if (depsMet) {
						return { task, story, feature };
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
	if (!fs.existsSync(filePath)) return "";
	try {
		return fs.readFileSync(filePath, "utf-8");
	} catch {
		return "";
	}
}

// ============================================================================
// Logs Management
// ============================================================================

export function ensureLogsDir(logsDir: string): void {
	if (!fs.existsSync(logsDir)) {
		fs.mkdirSync(logsDir, { recursive: true });
	}
}

export function cleanupTaskLogs(logsDir: string, taskId: string): number {
	if (!fs.existsSync(logsDir)) return 0;

	const prefix = taskId.replace(/\./g, "-");
	const files = fs.readdirSync(logsDir).filter((f) => f.startsWith(prefix));

	for (const file of files) {
		fs.unlinkSync(path.join(logsDir, file));
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
