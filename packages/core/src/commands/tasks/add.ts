/**
 * Tasks Add command - Add a new task to existing breakdown
 */

import fs from "node:fs";
import path from "node:path";
import { ConfigLoader } from "../../lib/config-loader.js";
import { LLMRequiredError } from "../../lib/errors.js";
import { BaseCommand, type CommandResult } from "../base.js";

interface ProgressTask {
	id: string;
	title: string;
	description: string;
	skill: string;
	status: string;
	estimatedHours: number;
	dependencies: string[];
	context: string[];
	subtasks: Array<{
		id: string;
		description: string;
		status: string;
	}>;
	acceptanceCriteria: string[];
}

interface ProgressStory {
	id: string;
	title: string;
	tasks: ProgressTask[];
}

interface ProgressFeature {
	id: string;
	title: string;
	stories: ProgressStory[];
}

interface ProgressData {
	features: ProgressFeature[];
}

export class TasksAddCommand extends BaseCommand {
	async execute(
		featureId: string,
		storyId: string,
		taskTitle: string,
		options: {
			description?: string;
			skill?: string;
			dependencies?: string;
		},
	): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();

		// Validate parameters
		if (!featureId || !storyId || !taskTitle) {
			return this.failure(
				"Missing required parameters",
				["Feature ID, Story ID, and Task Title are required"],
				[
					"Add a task to existing breakdown:",
					"  taskflow tasks add <feature-id> <story-id> <task-title> [options]",
					"",
					"Example:",
					'  taskflow tasks add 1 1.1 "Add validation to login form" --skill frontend --description "Validate email and password fields"',
					"",
					"Options:",
					"  --description  Task description",
					"  --skill        Task skill (backend, frontend, fullstack, devops, docs, mobile)",
					"  --dependencies Comma-separated list of dependency task IDs",
				].join("\n"),
			);
		}

		// Load tasks progress
		const progressFilePath = path.join(paths.tasksDir, "tasks-progress.json");
		if (!fs.existsSync(progressFilePath)) {
			return this.failure(
				"Tasks not generated yet",
				[`File does not exist: ${progressFilePath}`],
				["Generate tasks first:", "  taskflow tasks generate <prd-file>"].join(
					"\n",
				),
			);
		}

		const progressData = JSON.parse(
			fs.readFileSync(progressFilePath, "utf-8"),
		) as ProgressData;

		// Find the feature and story
		const feature = progressData.features.find((f) => f.id === featureId);
		if (!feature) {
			return this.failure(
				"Feature not found",
				[`Feature ${featureId} does not exist`],
				[
					"Available features:",
					...progressData.features.map((f) => `  - ${f.id}: ${f.title}`),
				].join("\n"),
			);
		}

		const story = feature.stories.find((s) => s.id === storyId);
		if (!story) {
			return this.failure(
				"Story not found",
				[`Story ${storyId} does not exist in feature ${featureId}`],
				[
					`Available stories in feature ${featureId}:`,
					...feature.stories.map((s) => `  - ${s.id}: ${s.title}`),
				].join("\n"),
			);
		}

		// Generate new task ID
		const existingTaskNumbers = story.tasks
			.map((t) => {
				const parts = t.id.split(".");
				return Number.parseInt(parts[2] ?? "0", 10);
			})
			.filter((n) => !Number.isNaN(n));

		const nextTaskNumber =
			existingTaskNumbers.length > 0 ? Math.max(...existingTaskNumbers) + 1 : 0;
		const newTaskId = `${storyId}.${nextTaskNumber}`;

		// Try to generate task details with LLM if available
		if (this.isLLMAvailable()) {
			try {
				return await this.addTaskWithLLM(
					newTaskId,
					taskTitle,
					options,
					progressFilePath,
					progressData,
					paths.tasksDir,
					feature,
					story,
				);
			} catch (error) {
				console.error("LLM generation failed, falling back to manual:", error);
			}
		}

		// Fallback to manual task creation
		return this.manualTaskAdd(
			newTaskId,
			taskTitle,
			options,
			progressFilePath,
			paths.tasksDir,
			featureId,
			storyId,
		);
	}

	/**
	 * Add task with LLM assistance
	 */
	private async addTaskWithLLM(
		taskId: string,
		taskTitle: string,
		options: {
			description?: string;
			skill?: string;
			dependencies?: string;
		},
		progressFilePath: string,
		progressData: ProgressData,
		tasksDir: string,
		feature: ProgressFeature,
		story: ProgressStory,
	): Promise<CommandResult> {
		if (!this.llmProvider) {
			throw new LLMRequiredError("LLM provider not available");
		}

		const systemPrompt = `You are an expert software architect helping to add a new task to an existing task breakdown.

Generate a complete task definition that fits with the existing breakdown.

Output ONLY valid JSON in this exact structure (no markdown, no additional text):
{
  "id": "${taskId}",
  "title": "${taskTitle}",
  "description": "Detailed task description",
  "skill": "backend",
  "status": "not-started",
  "estimatedHours": 2,
  "dependencies": [],
  "context": ["path/to/file.ts - Description"],
  "subtasks": [
    {
      "id": "1",
      "description": "Subtask description",
      "status": "not-started"
    }
  ],
  "acceptanceCriteria": ["Criterion 1", "Criterion 2"]
}`;

		const userPrompt = `Add a new task to this breakdown:

FEATURE: ${feature.title}
STORY: ${story.title}

NEW TASK:
Title: ${taskTitle}
${options.description ? `Description: ${options.description}` : ""}
${options.skill ? `Skill: ${options.skill}` : ""}
${options.dependencies ? `Dependencies: ${options.dependencies}` : ""}

EXISTING TASKS IN STORY:
${story.tasks.map((t: ProgressTask) => `- ${t.id}: ${t.title}`).join("\n")}

Generate a complete task definition that:
1. Fits with the existing tasks
2. Has clear, atomic scope (1-4 hours)
3. Includes appropriate subtasks
4. Has testable acceptance criteria
5. References relevant codebase files in context`;

		const messages = [
			{ role: "system" as const, content: systemPrompt },
			{ role: "user" as const, content: userPrompt },
		];

		const options2 = {
			maxTokens: 2000,
			temperature: 0.3,
		};

		const response = await this.llmProvider.generate(messages, options2);

		// Track cost
		this.costTracker.trackUsage(response);

		// Parse JSON response
		let taskData: ProgressTask;
		try {
			let jsonContent = response.content.trim();
			if (jsonContent.startsWith("```")) {
				jsonContent = jsonContent
					.replace(/```json\n?/g, "")
					.replace(/```\n?/g, "");
			}
			taskData = JSON.parse(jsonContent) as ProgressTask;
		} catch (error) {
			throw new Error(
				`Failed to parse LLM response: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		// Add task to progress data
		story.tasks.push(taskData);

		// Write updated progress file
		fs.writeFileSync(
			progressFilePath,
			JSON.stringify(progressData, null, 2),
			"utf-8",
		);

		// Write task file
		const featureDir = path.join(tasksDir, `F${feature.id}`);
		const storyDir = path.join(featureDir, `S${story.id}`);
		fs.mkdirSync(storyDir, { recursive: true });

		const taskFilePath = path.join(storyDir, `T${taskId}.json`);
		fs.writeFileSync(taskFilePath, JSON.stringify(taskData, null, 2), "utf-8");

		return this.success(
			[
				`✓ Added task ${taskId}: ${taskTitle}`,
				"",
				`File created: ${taskFilePath}`,
				"",
				`Skill: ${taskData.skill}`,
				`Estimated hours: ${taskData.estimatedHours}`,
				`Subtasks: ${taskData.subtasks.length}`,
			].join("\n"),
			[
				"Next steps:",
				"",
				"1. Review the task file:",
				`   cat ${taskFilePath}`,
				"",
				"2. View updated breakdown:",
				"   taskflow status",
				"",
				"3. Start the task when ready:",
				`   taskflow start ${taskId}`,
			].join("\n"),
		);
	}

	/**
	 * Manual task addition (fallback)
	 */
	private manualTaskAdd(
		taskId: string,
		taskTitle: string,
		options: {
			description?: string;
			skill?: string;
			dependencies?: string;
		},
		progressFilePath: string,
		tasksDir: string,
		featureId: string,
		storyId: string,
	): Promise<CommandResult> {
		return Promise.resolve(
			this.success(
				[
					"Task details:",
					"─".repeat(60),
					`ID: ${taskId}`,
					`Title: ${taskTitle}`,
					options.description ? `Description: ${options.description}` : "",
					options.skill
						? `Skill: ${options.skill}`
						: "Skill: (to be determined)",
					options.dependencies
						? `Dependencies: ${options.dependencies}`
						: "Dependencies: none",
				]
					.filter((s) => s.length > 0)
					.join("\n"),
				[
					"Manual steps:",
					"",
					"1. Create task file:",
					`   mkdir -p ${path.join(tasksDir, `F${featureId}`, `S${storyId}`)}`,
					`   touch ${path.join(tasksDir, `F${featureId}`, `S${storyId}`, `T${taskId}.json`)}`,
					"",
					"2. Add task structure to file (see task-generator.md for format)",
					"",
					`3. Update ${progressFilePath}`,
					"   - Add task to the appropriate story's tasks array",
					"",
					"4. Verify with:",
					"   taskflow status",
				].join("\n"),
			),
		);
	}
}
