/**
 * Context Priority Definitions
 * Defines priority levels for different types of content in various operations
 */

import {
	type ContextItem,
	ContextManager,
	ContextPriority,
} from "./context-manager.js";

/**
 * Priority definitions for PRD generation
 */
export function buildPRDContext(
	_manager: ContextManager,
	inputs: {
		userRequest: string;
		projectContext?: string;
		existingPRDs?: string[];
		codingStandards?: string;
		architectureRules?: string;
		retrospectives?: string;
	},
): ContextItem[] {
	const items: ContextItem[] = [];

	// Essential: User request (never truncate)
	items.push(
		ContextManager.createItem(
			"user-request",
			`User Request:\n${inputs.userRequest}`,
			ContextPriority.Essential,
		),
	);

	// High: Project context (current project state)
	if (inputs.projectContext) {
		items.push(
			ContextManager.createItem(
				"project-context",
				`Project Context:\n${inputs.projectContext}`,
				ContextPriority.High,
			),
		);
	}

	// Medium: Coding standards (can truncate if needed)
	if (inputs.codingStandards) {
		items.push(
			ContextManager.createItem(
				"coding-standards",
				`Coding Standards:\n${inputs.codingStandards}`,
				ContextPriority.Medium,
				{ summarizable: true },
			),
		);
	}

	// Medium: Architecture rules
	if (inputs.architectureRules) {
		items.push(
			ContextManager.createItem(
				"architecture-rules",
				`Architecture Rules:\n${inputs.architectureRules}`,
				ContextPriority.Medium,
				{ summarizable: true },
			),
		);
	}

	// Low: Existing PRDs (examples, can be heavily truncated)
	if (inputs.existingPRDs && inputs.existingPRDs.length > 0) {
		const prdExamples = inputs.existingPRDs.slice(0, 2).join("\n\n---\n\n");
		items.push(
			ContextManager.createItem(
				"existing-prds",
				`Example PRDs:\n${prdExamples}`,
				ContextPriority.Low,
				{ summarizable: true },
			),
		);
	}

	// Low: Retrospectives (lessons learned)
	if (inputs.retrospectives) {
		items.push(
			ContextManager.createItem(
				"retrospectives",
				`Retrospectives:\n${inputs.retrospectives}`,
				ContextPriority.Low,
				{ summarizable: true },
			),
		);
	}

	return items;
}

/**
 * Priority definitions for task breakdown generation
 */
export function buildTaskContext(
	_manager: ContextManager,
	inputs: {
		prdContent: string;
		codingStandards?: string;
		architectureRules?: string;
		existingTasks?: string;
		projectStructure?: string;
	},
): ContextItem[] {
	const items: ContextItem[] = [];

	// Essential: PRD content (never truncate)
	items.push(
		ContextManager.createItem(
			"prd-content",
			`PRD:\n${inputs.prdContent}`,
			ContextPriority.Essential,
		),
	);

	// High: Project structure (needed for file paths)
	if (inputs.projectStructure) {
		items.push(
			ContextManager.createItem(
				"project-structure",
				`Project Structure:\n${inputs.projectStructure}`,
				ContextPriority.High,
			),
		);
	}

	// Medium: Architecture rules (important for task breakdown)
	if (inputs.architectureRules) {
		items.push(
			ContextManager.createItem(
				"architecture-rules",
				`Architecture Rules:\n${inputs.architectureRules}`,
				ContextPriority.Medium,
				{ summarizable: true },
			),
		);
	}

	// Medium: Coding standards
	if (inputs.codingStandards) {
		items.push(
			ContextManager.createItem(
				"coding-standards",
				`Coding Standards:\n${inputs.codingStandards}`,
				ContextPriority.Medium,
				{ summarizable: true },
			),
		);
	}

	// Low: Existing tasks (examples)
	if (inputs.existingTasks) {
		items.push(
			ContextManager.createItem(
				"existing-tasks",
				`Example Tasks:\n${inputs.existingTasks}`,
				ContextPriority.Low,
				{ summarizable: true },
			),
		);
	}

	return items;
}

/**
 * Priority definitions for code error analysis
 */
export function buildErrorAnalysisContext(
	_manager: ContextManager,
	inputs: {
		errors: string;
		currentFile?: string;
		relatedFiles?: string[];
		recentChanges?: string;
	},
): ContextItem[] {
	const items: ContextItem[] = [];

	// Essential: Error messages (never truncate)
	items.push(
		ContextManager.createItem(
			"errors",
			`Errors:\n${inputs.errors}`,
			ContextPriority.Essential,
		),
	);

	// High: Current file content
	if (inputs.currentFile) {
		items.push(
			ContextManager.createItem(
				"current-file",
				`Current File:\n${inputs.currentFile}`,
				ContextPriority.High,
			),
		);
	}

	// Medium: Recent changes
	if (inputs.recentChanges) {
		items.push(
			ContextManager.createItem(
				"recent-changes",
				`Recent Changes:\n${inputs.recentChanges}`,
				ContextPriority.Medium,
			),
		);
	}

	// Medium: Related files (can truncate)
	if (inputs.relatedFiles && inputs.relatedFiles.length > 0) {
		const relatedContent = inputs.relatedFiles.slice(0, 3).join("\n\n---\n\n");
		items.push(
			ContextManager.createItem(
				"related-files",
				`Related Files:\n${relatedContent}`,
				ContextPriority.Medium,
				{ summarizable: true },
			),
		);
	}

	return items;
}

/**
 * Priority definitions for workflow guidance
 */
export function buildWorkflowContext(
	_manager: ContextManager,
	inputs: {
		currentTask: string;
		taskDescription?: string;
		relevantFiles?: string[];
		retrospectives?: string;
		skills?: string;
	},
): ContextItem[] {
	const items: ContextItem[] = [];

	// Essential: Current task
	items.push(
		ContextManager.createItem(
			"current-task",
			`Current Task:\n${inputs.currentTask}`,
			ContextPriority.Essential,
		),
	);

	// High: Task description
	if (inputs.taskDescription) {
		items.push(
			ContextManager.createItem(
				"task-description",
				`Task Description:\n${inputs.taskDescription}`,
				ContextPriority.High,
			),
		);
	}

	// Medium: Relevant files
	if (inputs.relevantFiles && inputs.relevantFiles.length > 0) {
		const filesContent = inputs.relevantFiles.slice(0, 5).join("\n\n---\n\n");
		items.push(
			ContextManager.createItem(
				"relevant-files",
				`Relevant Files:\n${filesContent}`,
				ContextPriority.Medium,
				{ summarizable: true },
			),
		);
	}

	// Low: Retrospectives (lessons learned)
	if (inputs.retrospectives) {
		items.push(
			ContextManager.createItem(
				"retrospectives",
				`Retrospectives:\n${inputs.retrospectives}`,
				ContextPriority.Low,
				{ summarizable: true },
			),
		);
	}

	// Low: Available skills
	if (inputs.skills) {
		items.push(
			ContextManager.createItem(
				"skills",
				`Available Skills:\n${inputs.skills}`,
				ContextPriority.Low,
				{ summarizable: true },
			),
		);
	}

	return items;
}

/**
 * Priority definitions for code review
 */
export function buildCodeReviewContext(
	_manager: ContextManager,
	inputs: {
		codeChanges: string;
		codingStandards?: string;
		architectureRules?: string;
		relatedTests?: string;
		prDescription?: string;
	},
): ContextItem[] {
	const items: ContextItem[] = [];

	// Essential: Code changes
	items.push(
		ContextManager.createItem(
			"code-changes",
			`Code Changes:\n${inputs.codeChanges}`,
			ContextPriority.Essential,
		),
	);

	// High: PR description
	if (inputs.prDescription) {
		items.push(
			ContextManager.createItem(
				"pr-description",
				`PR Description:\n${inputs.prDescription}`,
				ContextPriority.High,
			),
		);
	}

	// Medium: Coding standards
	if (inputs.codingStandards) {
		items.push(
			ContextManager.createItem(
				"coding-standards",
				`Coding Standards:\n${inputs.codingStandards}`,
				ContextPriority.Medium,
				{ summarizable: true },
			),
		);
	}

	// Medium: Architecture rules
	if (inputs.architectureRules) {
		items.push(
			ContextManager.createItem(
				"architecture-rules",
				`Architecture Rules:\n${inputs.architectureRules}`,
				ContextPriority.Medium,
				{ summarizable: true },
			),
		);
	}

	// Low: Related tests
	if (inputs.relatedTests) {
		items.push(
			ContextManager.createItem(
				"related-tests",
				`Related Tests:\n${inputs.relatedTests}`,
				ContextPriority.Low,
				{ summarizable: true },
			),
		);
	}

	return items;
}

/**
 * Helper to build context with automatic priority assignment
 */
export function createContextBuilder(): {
	addEssential: (id: string, content: string) => void;
	addHigh: (id: string, content: string, summarizable?: boolean) => void;
	addMedium: (id: string, content: string, summarizable?: boolean) => void;
	addLow: (id: string, content: string, summarizable?: boolean) => void;
	build: () => ContextItem[];
} {
	const items: ContextItem[] = [];

	return {
		/**
		 * Add essential content (never truncated)
		 */
		addEssential(id: string, content: string): void {
			items.push(
				ContextManager.createItem(id, content, ContextPriority.Essential),
			);
		},

		/**
		 * Add high priority content (truncate only if necessary)
		 */
		addHigh(id: string, content: string, summarizable = false): void {
			items.push(
				ContextManager.createItem(id, content, ContextPriority.High, {
					summarizable,
				}),
			);
		},

		/**
		 * Add medium priority content (can truncate)
		 */
		addMedium(id: string, content: string, summarizable = true): void {
			items.push(
				ContextManager.createItem(id, content, ContextPriority.Medium, {
					summarizable,
				}),
			);
		},

		/**
		 * Add low priority content (first to truncate)
		 */
		addLow(id: string, content: string, summarizable = true): void {
			items.push(
				ContextManager.createItem(id, content, ContextPriority.Low, {
					summarizable,
				}),
			);
		},

		/**
		 * Build final context items array
		 */
		build(): ContextItem[] {
			return items;
		},
	};
}
