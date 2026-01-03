/**
 * Task Create command - Create a new task for a feature or as intermittent
 */

import fs from "node:fs";
import path from "node:path";
import { BaseCommand, type CommandResult } from "@/commands/base";
import { ConfigLoader } from "@/lib/config/config-loader";
import { type ProjectPaths, slugify } from "@/lib/config/config-paths";
import {
	type Feature,
	loadTasksProgress,
	type Story,
	saveFeature,
	saveProjectIndex,
	type TaskRef,
	type TaskStatus,
	type TasksProgress,
} from "../../lib/core/data-access.js";

export class TaskCreateCommand extends BaseCommand {
	async execute(
		title: string,
		description?: string,
		options?: {
			intermitent?: boolean;
			feature?: string;
			story?: string;
		},
	): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();

		// Validate title
		if (!title || title.trim().length === 0) {
			return this.failure(
				"Task title is required",
				["You must provide a title for the task"],
				[
					"Create a task with a title:",
					"  taskflow task create 'Fix build error'",
					"  taskflow task create 'Add unit test' --intermittent",
					"  taskflow task create 'Implement API' --feature 1 --story 1.1",
				].join("\n"),
			);
		}

		// Determine if intermittent task
		const isIntermittent = options?.intermitent === true;
		const targetFeatureId = options?.feature;
		const targetStoryId = options?.story;

		// Load tasks progress
		let tasksProgress: TasksProgress;
		try {
			tasksProgress = loadTasksProgress(paths.tasksDir);
		} catch (_error) {
			return this.failure(
				"No tasks found",
				["tasks/tasks-progress.json does not exist"],
				["Generate tasks first:", "  taskflow tasks generate <prd-file>"].join(
					"\n",
				),
			);
		}

		let feature: Feature | null;
		let story: Story | null;

		if (isIntermittent) {
			// For intermittent tasks, always use F0
			feature = this.getOrCreateFeature0(tasksProgress, paths);
			story = this.getOrCreateStory01(feature);
		} else if (targetFeatureId && targetStoryId) {
			// For regular tasks, find the specified feature and story
			feature = this.findFeature(tasksProgress, targetFeatureId);
			if (!feature) {
				return this.failure(
					`Feature ${targetFeatureId} not found`,
					[`Feature ${targetFeatureId} does not exist`],
					[
						"Available features:",
						...tasksProgress.features.map(
							(f: Feature) => `  - ${f.id}: ${f.title}`,
						),
					].join("\n"),
				);
			}

			story =
				feature?.stories?.find((s: Story) => s.id === targetStoryId) || null;
			if (!story) {
				return this.failure(
					`Story ${targetStoryId} not found`,
					[
						`Story ${targetStoryId} does not exist in feature ${targetFeatureId}`,
					],
					[
						"Available stories:",
						...feature.stories.map((s: Story) => `  - ${s.id}: ${s.title}`),
					].join("\n"),
				);
			}
		} else {
			return this.failure(
				"Feature and story are required for non-intermittent tasks",
				["Use --feature and --story to specify where to create the task"],
				[
					"Options:",
					"1. Create intermittent task: taskflow task create 'Title' --intermittent",
					"2. Create regular task: taskflow task create 'Title' --feature <id> --story <id>",
				].join("\n"),
			);
		}

		// Generate task ID
		const taskId = this.generateTaskId(story.tasks);
		const taskRef: TaskRef = {
			id: taskId,
			title,
			status: "not-started",
			dependencies: [],
			isIntermittent,
		};

		// Add task to story
		story.tasks.push(taskRef);

		// Save feature file
		saveFeature(paths.tasksDir, feature);

		// Recalculate story status
		if (story.tasks.some((t: TaskRef) => t.status === "completed")) {
			story.status = "completed";
		} else if (story.tasks.some((t: TaskRef) => t.status !== "not-started")) {
			story.status = "in-progress";
		} else {
			story.status = "not-started";
		}

		// Recalculate feature status
		if (feature.stories.every((s: Story) => s.status === "completed")) {
			feature.status = "completed";
		} else if (feature.stories.some((s: Story) => s.status === "in-progress")) {
			feature.status = "in-progress";
		} else {
			feature.status = "not-started";
		}

		// Save updated progress
		saveProjectIndex(paths.tasksDir, tasksProgress);

		// Create task file
		const taskFilePath = this.createTaskFile(
			paths,
			feature,
			story,
			taskId,
			title,
			isIntermittent,
			description,
		);

		// Update project index
		tasksProgress = loadTasksProgress(paths.tasksDir);
		saveProjectIndex(paths.tasksDir, tasksProgress);

		const taskType = isIntermittent ? "Intermittent" : "Regular";
		const taskLocation = isIntermittent
			? `F0 (Infrastructure & Quick Fixes)`
			: `F${feature.id} (Feature ${feature.id})`;

		return this.success(
			[
				`✓ ${taskType} task created: ${taskId}`,
				`✓ Title: ${title}`,
				`✓ Location: ${taskLocation}`,
				`✓ Task file: ${taskFilePath}`,
			].join("\n"),
			[
				"NEXT:",
				"─".repeat(60),
				"1. Start working on the task:",
				`   taskflow start ${taskId}`,
				"2. Read task instructions:",
				`   taskflow do`,
				"3. Implement the feature",
				"4. Complete and commit:",
				`   taskflow commit "- Changes summary"`,
			].join("\n"),
			{
				contextFiles: [taskFilePath],
				warnings: isIntermittent
					? [
							"This is an intermittent task.",
							"It can be worked on independently of other features.",
							"No blocking dependencies will be enforced.",
						]
					: [],
			},
		);
	}

	/**
	 * Get or create Feature 0 for intermittent tasks
	 */
	private getOrCreateFeature0(
		tasksProgress: TasksProgress,
		paths: ProjectPaths,
	): Feature {
		let feature0 = tasksProgress.features.find((f: Feature) => f.id === "0");

		if (!feature0) {
			feature0 = {
				id: "0",
				title: "Infrastructure & Quick Fixes",
				status: "not-started",
				path: "F0-infrastructure",
				stories: [],
			};
			tasksProgress.features.push(feature0);

			// Create feature directory
			const featureDir = path.join(paths.tasksDir, "F0-infrastructure");
			if (!fs.existsSync(featureDir)) {
				fs.mkdirSync(featureDir, { recursive: true });
			}

			// Save feature file
			const featureFilePath = path.join(featureDir, "F0.json");
			fs.writeFileSync(
				featureFilePath,
				JSON.stringify(feature0, null, 2),
				"utf-8",
			);

			// Update project index
			saveProjectIndex(paths.tasksDir, tasksProgress);
		}

		return feature0;
	}

	/**
	 * Get or create Story 0.1 for intermittent tasks
	 */
	private getOrCreateStory01(feature: Feature): Story {
		let story01 = feature.stories.find((s: Story) => s.id === "0.1");

		if (!story01) {
			story01 = {
				id: "0.1",
				title: "Intermittent Tasks",
				status: "not-started",
				tasks: [],
			};
			feature.stories.push(story01);

			// Create story directory
			const featureDir = path.join(
				this.context.projectRoot,
				"tasks",
				feature.path || `F${feature.id}`,
			);
			const storyDir = path.join(featureDir, "S0.1-intermittent-tasks");
			if (!fs.existsSync(storyDir)) {
				fs.mkdirSync(storyDir, { recursive: true });
			}
		}

		return story01;
	}

	/**
	 * Find feature by ID
	 */
	private findFeature(
		tasksProgress: TasksProgress,
		featureId: string,
	): Feature | null {
		return (
			tasksProgress.features.find((f: Feature) => f.id === featureId) || null
		);
	}

	/**
	 * Generate task ID based on existing tasks in story
	 */
	private generateTaskId(existingTasks: TaskRef[]): string {
		if (existingTasks.length === 0) {
			return "0.1.0";
		}

		// Find the highest task number
		const maxTaskNum = Math.max(
			...existingTasks.map((t) => {
				const match = t.id.match(/^[\d.]+\.(\d+)$/);
				return match ? parseInt(match[1] as string, 10) : 0;
			}),
		);

		// Generate next task ID
		const nextTaskNum = maxTaskNum + 1;
		return `0.1.${nextTaskNum}`;
	}

	/**
	 * Create task file with content
	 */
	private createTaskFile(
		paths: ProjectPaths,
		feature: Feature,
		story: Story,
		taskId: string,
		title: string,
		isIntermittent: boolean,
		description?: string,
	): string {
		const featureDir = path.join(
			paths.tasksDir,
			feature.path || `F${feature.id}`,
		);
		const storyDir = path.join(
			featureDir,
			`S${story.id}-${slugify(story.title)}`,
		);

		// Ensure story directory exists
		if (!fs.existsSync(storyDir)) {
			fs.mkdirSync(storyDir, { recursive: true });
		}

		// Create task file
		const taskFileName = `T${taskId}.json`;
		const taskFilePath = path.join(storyDir, taskFileName);

		const taskContent = {
			id: taskId,
			title,
			description: description || "",
			status: "not-started" as TaskStatus,
			skill: "development",
			subtasks: [],
			context: [],
			isIntermittent,
		};

		fs.writeFileSync(
			taskFilePath,
			JSON.stringify(taskContent, null, 2),
			"utf-8",
		);

		return taskFilePath;
	}
}
