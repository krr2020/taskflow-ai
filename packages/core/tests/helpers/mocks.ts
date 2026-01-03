/**
 * Shared test mocks and utilities
 */

import type { TaskflowConfig } from "@/lib/core/types";

/**
 * Create a mock ConfigLoader instance
 */
export function createMockConfigLoader(config?: Partial<TaskflowConfig>) {
	const defaultConfig: TaskflowConfig = {
		project: {
			name: "test-project",
			root: ".",
		},
		branching: {
			strategy: "per-task",
			base: "main",
			prefix: "task",
		},
		ai: {
			enabled: true,
			autoContinueTask: false,
			clearContextOnComplete: false,
			models: {
				"claude-opus-4": {
					provider: "anthropic",
					model: "claude-opus-4",
					apiKey: "test-key",
				},
			},
			usage: {
				default: "claude-opus-4",
			},
		},
		...config,
	};

	return {
		exists: () => true,
		load: () => defaultConfig,
		save: () => {},
		getPaths: () => ({
			configFile: "/test/root/.taskflow/config.json",
			tasksDir: "/test/root/.taskflow/tasks",
			prdsDir: "/test/root/.taskflow/prds",
			refDir: "/test/root/.taskflow/ref",
		}),
	};
}

/**
 * Create a mock MCP context
 */
export function createMockMCPContext(isMCP = false) {
	return {
		isMCP,
		detectionMethod: isMCP ? "env" : "none",
	} as const;
}

/**
 * Create a mock command context
 */
export function createMockCommandContext(
	projectRoot = "/test/root",
	isMCP = false,
) {
	return {
		projectRoot,
		mcpContext: createMockMCPContext(isMCP),
	};
}
