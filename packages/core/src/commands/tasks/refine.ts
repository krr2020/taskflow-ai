/**
 * Tasks Refine command - Refine task breakdown with instructions
 */

import fs from "node:fs";
import path from "node:path";
import { ConfigLoader } from "../../lib/config-loader.js";
import type { TasksProgress } from "../../lib/types.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class TasksRefineCommand extends BaseCommand {
	async execute(instructions: string): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();

		// Validate parameters
		if (!instructions || instructions.trim().length === 0) {
			return this.failure(
				"Instructions are required",
				["You must provide refinement instructions"],
				[
					"Refine task breakdown with instructions:",
					"  taskflow tasks refine <instructions>",
					"",
					"Examples:",
					'  taskflow tasks refine "Split large tasks into smaller ones"',
					'  taskflow tasks refine "Add more backend tasks for API development"',
					'  taskflow tasks refine "Break down feature 1 into more granular tasks"',
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

		const progressData = JSON.parse(fs.readFileSync(progressFilePath, "utf-8"));

		// Try to refine with LLM if available
		if (this.isLLMAvailable()) {
			return this.executeWithFallback(
				() =>
					this.refineWithLLM(
						instructions,
						progressData,
						progressFilePath,
						paths.tasksDir,
					),
				() =>
					this.manualRefinement(instructions, progressFilePath, paths.tasksDir),
				"Refine Tasks",
			);
		}

		// Fallback to manual refinement guidance
		return this.manualRefinement(
			instructions,
			progressFilePath,
			paths.tasksDir,
		);
	}

	/**
	 * Refine task breakdown with LLM
	 */
	private async refineWithLLM(
		instructions: string,
		progressData: TasksProgress,
		progressFilePath: string,
		tasksDir: string,
	): Promise<CommandResult> {
		if (!this.llmProvider) {
			throw new Error("LLM provider not available");
		}

		const systemPrompt = `You are an expert software architect helping to refine an existing task breakdown.

Your mission is to analyze the current breakdown and apply the refinement instructions while maintaining consistency.

CRITICAL RULES:
1. Maintain existing task IDs unless creating new tasks
2. Keep all existing tasks unless explicitly instructed to remove
3. When splitting tasks, create new task IDs (e.g., if splitting 1.1.2, create 1.1.3, 1.1.4, etc.)
4. When adding tasks, assign appropriate new IDs
5. Maintain the hierarchy (Features → Stories → Tasks)
6. Ensure tasks remain atomic (1-4 hours)

Output ONLY valid JSON in the same structure as the input, with refinements applied.`;

		const userPrompt = `Refine this task breakdown according to these instructions:

INSTRUCTIONS: ${instructions}

CURRENT BREAKDOWN:
${JSON.stringify(progressData, null, 2)}

Apply the refinement instructions and output the complete updated breakdown. Remember:
- Maintain existing structure and IDs where appropriate
- Add new tasks with proper IDs
- Keep tasks atomic and testable
- Update dependencies if needed`;

		const messages = [
			{ role: "system" as const, content: systemPrompt },
			{ role: "user" as const, content: userPrompt },
		];

		const options = {
			maxTokens: 8000,
			temperature: 0.2,
		};

		const response = await this.llmProvider.generate(messages, options);

		// Track cost
		this.costTracker.trackUsage(response);

		// Parse JSON response
		let refinedData: TasksProgress;
		try {
			let jsonContent = response.content.trim();
			if (jsonContent.startsWith("```")) {
				jsonContent = jsonContent
					.replace(/```json\n?/g, "")
					.replace(/```\n?/g, "");
			}
			refinedData = JSON.parse(jsonContent);
		} catch (error) {
			throw new Error(
				`Failed to parse LLM response: ${error instanceof Error ? error.message : String(error)}`,
			);
		}

		// Backup original
		const backupPath = `${progressFilePath}.backup`;
		fs.copyFileSync(progressFilePath, backupPath);

		// Write refined progress file
		fs.writeFileSync(
			progressFilePath,
			JSON.stringify(refinedData, null, 2),
			"utf-8",
		);

		// Update task files
		await this.updateTaskFiles(tasksDir, refinedData);

		// Calculate differences
		const originalTasks = this.countTasks(progressData);
		const refinedTasks = this.countTasks(refinedData);

		return this.success(
			[
				`✓ Refined task breakdown`,
				"",
				"Changes:",
				`  Features: ${progressData.features.length} → ${refinedData.features.length}`,
				`  Stories: ${originalTasks.stories} → ${refinedTasks.stories}`,
				`  Tasks: ${originalTasks.tasks} → ${refinedTasks.tasks}`,
				"",
				`Updated: ${progressFilePath}`,
				`Backup: ${backupPath}`,
			].join("\n"),
			[
				"Next steps:",
				"",
				"1. Review the refined breakdown:",
				"   taskflow status",
				"",
				"2. Compare with backup if needed:",
				`   diff ${backupPath} ${progressFilePath}`,
				"",
				"3. If satisfied, delete backup:",
				`   rm ${backupPath}`,
			].join("\n"),
		);
	}

	/**
	 * Update task files based on refined data
	 */
	private async updateTaskFiles(
		tasksDir: string,
		tasksData: TasksProgress,
	): Promise<void> {
		// Clean existing task files
		if (fs.existsSync(tasksDir)) {
			const entries = fs.readdirSync(tasksDir);
			for (const entry of entries) {
				if (entry.startsWith("F") && !entry.endsWith(".json")) {
					const featureDir = path.join(tasksDir, entry);
					if (fs.statSync(featureDir).isDirectory()) {
						fs.rmSync(featureDir, { recursive: true, force: true });
					}
				}
			}
		}

		// Create new task files
		for (const feature of tasksData.features) {
			const featureDir = path.join(tasksDir, `F${feature.id}`);
			fs.mkdirSync(featureDir, { recursive: true });

			for (const story of feature.stories) {
				const storyDir = path.join(featureDir, `S${story.id}`);
				fs.mkdirSync(storyDir, { recursive: true });

				for (const task of story.tasks) {
					const taskFilePath = path.join(storyDir, `T${task.id}.json`);
					fs.writeFileSync(
						taskFilePath,
						JSON.stringify(task, null, 2),
						"utf-8",
					);
				}
			}
		}
	}

	/**
	 * Count stories and tasks in breakdown
	 */
	private countTasks(data: TasksProgress): { stories: number; tasks: number } {
		let stories = 0;
		let tasks = 0;

		for (const feature of data.features) {
			stories += feature.stories.length;
			for (const story of feature.stories) {
				tasks += story.tasks.length;
			}
		}

		return { stories, tasks };
	}

	/**
	 * Manual refinement guidance (fallback)
	 */
	private manualRefinement(
		instructions: string,
		progressFilePath: string,
		tasksDir: string,
	): Promise<CommandResult> {
		return Promise.resolve(
			this.success(
				[
					"Refinement instructions:",
					"─".repeat(60),
					instructions,
					"",
					"Files to modify:",
					`  - ${progressFilePath}`,
					`  - Task files in ${tasksDir}/F*/S*/`,
				].join("\n"),
				[
					"Manual steps:",
					"",
					`1. Backup current progress:`,
					`   cp ${progressFilePath} ${progressFilePath}.backup`,
					"",
					"2. Apply refinements:",
					"   - Edit tasks-progress.json",
					"   - Update/add/remove task files as needed",
					"   - Ensure IDs remain consistent",
					"",
					"3. Verify changes:",
					"   taskflow status",
					"",
					"4. If issues occur, restore backup:",
					`   cp ${progressFilePath}.backup ${progressFilePath}`,
				].join("\n"),
			),
		);
	}
}
