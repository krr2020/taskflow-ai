import process from "node:process";
// Import all commands from core package
import {
	CheckCommand,
	type CommandContext,
	type CommandResult,
	CommitCommand,
	InitCommand,
	NextCommand,
	PrdCreateCommand,
	PrdGenerateArchCommand,
	ResumeCommand,
	RetroAddCommand,
	RetroListCommand,
	SkipCommand,
	StartCommand,
	StatusCommand,
	TasksGenerateCommand,
} from "@krr2020/taskflow";
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
	CallToolRequestSchema,
	type CallToolResult,
	ErrorCode,
	ListToolsRequestSchema,
	McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";

// Create command context
const context: CommandContext = {
	projectRoot: process.cwd(),
};

// Initialize MCP Server
const server = new Server(
	{
		name: "taskflow-mcp-server",
		version: "0.1.0",
	},
	{
		capabilities: {
			tools: {},
		},
	},
);

// Tool Definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
	return {
		tools: [
			// Initialization
			{
				name: "init",
				description:
					"Initialize Taskflow in the current project. Creates taskflow.config.json and .taskflow directory structure with template files.",
				inputSchema: {
					type: "object",
					properties: {
						projectName: {
							type: "string",
							description:
								"Project name (optional, defaults to directory name)",
						},
					},
				},
			},

			// Status & Navigation
			{
				name: "get_status",
				description:
					"Get project status, feature status, or story status. Shows progress, tasks, and active task information.",
				inputSchema: {
					type: "object",
					properties: {
						id: {
							type: "string",
							description:
								"Optional: Feature ID (N) or Story ID (N.M) to get specific status",
						},
					},
				},
			},
			{
				name: "find_next_task",
				description:
					"Find the next available task that can be worked on. Checks dependencies and returns task details.",
				inputSchema: {
					type: "object",
					properties: {},
				},
			},

			// PRD Generation
			{
				name: "prd_create",
				description:
					"Create a new PRD (Product Requirements Document) template. If description provided, AI will use it as starting point for requirement gathering.",
				inputSchema: {
					type: "object",
					properties: {
						featureName: {
							type: "string",
							description: "Name of the feature (e.g., 'user-authentication')",
						},
						description: {
							type: "string",
							description: "Feature description/requirements (optional)",
						},
					},
					required: ["featureName"],
				},
			},
			{
				name: "prd_generate_arch",
				description:
					"Generate coding-standards.md and ARCHITECTURE-RULES.md from a PRD. Analyzes codebase and PRD to create project-specific standards.",
				inputSchema: {
					type: "object",
					properties: {
						prdFile: {
							type: "string",
							description: "PRD filename (e.g., '2024-01-15-user-auth.md')",
						},
					},
					required: ["prdFile"],
				},
			},

			// Task Generation
			{
				name: "tasks_generate",
				description:
					"Generate complete task breakdown from a PRD. Creates features, stories, and tasks with dependencies. If no PRD specified, shows all available PRDs.",
				inputSchema: {
					type: "object",
					properties: {
						prdFile: {
							type: "string",
							description:
								"Optional PRD filename. If not provided, lists available PRDs and AI decides.",
						},
					},
				},
			},

			// Task Workflow
			{
				name: "start_task",
				description:
					"Start working on a task. Switches to story branch, loads requirements, sets status to SETUP. Provides comprehensive AI guidance.",
				inputSchema: {
					type: "object",
					properties: {
						taskId: {
							type: "string",
							description: "Task ID in format N.M.K (e.g., '1.1.0')",
						},
					},
					required: ["taskId"],
				},
			},
			{
				name: "check_task",
				description:
					"Validate current task and advance to next status. Behavior depends on current status (SETUP→PLANNING→IMPLEMENTING→VERIFYING→VALIDATING→COMMITTING).",
				inputSchema: {
					type: "object",
					properties: {},
				},
			},
			{
				name: "commit_task",
				description:
					"Commit changes and complete the task. Requires bullet points describing changes. Runs git add, commit, push and marks task as completed.",
				inputSchema: {
					type: "object",
					properties: {
						message: {
							type: "string",
							description:
								'Bullet points describing changes (e.g., "- Added feature X\\n- Fixed bug Y")',
						},
					},
					required: ["message"],
				},
			},
			{
				name: "resume_task",
				description:
					"Resume a blocked or on-hold task. Restores task to active status and provides guidance on continuing work.",
				inputSchema: {
					type: "object",
					properties: {
						status: {
							type: "string",
							description:
								"Status to resume to (setup, implementing, verifying, validating)",
							enum: ["setup", "implementing", "verifying", "validating"],
						},
					},
				},
			},
			{
				name: "block_task",
				description:
					"Mark current task as blocked with a reason. Saves current status and finds next available task.",
				inputSchema: {
					type: "object",
					properties: {
						reason: {
							type: "string",
							description: "Reason for blocking the task",
						},
					},
					required: ["reason"],
				},
			},

			// Retrospective
			{
				name: "add_retrospective",
				description:
					"Add a new error pattern to the retrospective. Helps prevent repeated mistakes by documenting solutions.",
				inputSchema: {
					type: "object",
					properties: {
						category: {
							type: "string",
							description:
								"Error category (type_error, lint, runtime, build, test, etc.)",
						},
						pattern: {
							type: "string",
							description: "Error pattern to match in validation output",
						},
						solution: {
							type: "string",
							description: "Solution to the error",
						},
						criticality: {
							type: "string",
							description: "Criticality level (low, medium, high)",
							enum: ["low", "medium", "high"],
						},
					},
					required: ["category", "pattern", "solution"],
				},
			},
			{
				name: "list_retrospectives",
				description:
					"List all retrospective entries. Can filter by category. Shows error patterns, solutions, and counts.",
				inputSchema: {
					type: "object",
					properties: {
						category: {
							type: "string",
							description: "Optional: Filter by category",
						},
					},
				},
			},
		],
	};
});

// Helper function to format command result for MCP
function formatCommandResult(result: CommandResult): CallToolResult {
	const parts: string[] = [];

	// Add output
	if (result.output) {
		parts.push(result.output);
	}

	// Add next steps
	if (result.nextSteps) {
		parts.push("\n\nNEXT STEPS:");
		parts.push("─".repeat(60));
		parts.push(result.nextSteps);
	}

	// Add AI guidance
	if (result.aiGuidance) {
		parts.push("\n\nAI GUIDANCE:");
		parts.push("─".repeat(60));
		parts.push(result.aiGuidance);
	}

	// Add context files
	if (result.contextFiles && result.contextFiles.length > 0) {
		parts.push("\n\nCONTEXT FILES:");
		parts.push("─".repeat(60));
		for (const file of result.contextFiles) {
			parts.push(`  ${file}`);
		}
	}

	// Add warnings
	if (result.warnings && result.warnings.length > 0) {
		parts.push("\n\n⚠️  WARNINGS:");
		parts.push("─".repeat(60));
		for (const warning of result.warnings) {
			parts.push(`  ${warning}`);
		}
	}

	// Add errors if failure
	if (result.errors && result.errors.length > 0) {
		parts.push("\n\n✗ ERRORS:");
		parts.push("─".repeat(60));
		for (const error of result.errors) {
			parts.push(`  ${error}`);
		}
	}

	return {
		content: [
			{
				type: "text",
				text: parts.join("\n"),
			},
		],
		isError: result.success === false,
	};
}

// Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
	const { name, arguments: args } = request.params;

	try {
		switch (name) {
			case "init": {
				const schema = z.object({
					projectName: z.string().optional(),
				});
				const { projectName } = schema.parse(args || {});

				const cmd = new InitCommand(context);
				const result = await cmd.execute(projectName);
				return formatCommandResult(result);
			}

			case "get_status": {
				const schema = z.object({
					id: z.string().optional(),
				});
				const { id } = schema.parse(args || {});

				const cmd = new StatusCommand(context);
				const result = await cmd.execute(id);
				return formatCommandResult(result);
			}

			case "find_next_task": {
				const cmd = new NextCommand(context);
				const result = await cmd.execute();
				return formatCommandResult(result);
			}

			case "prd_create": {
				const schema = z.object({
					featureName: z.string(),
					description: z.string().optional(),
				});
				const { featureName, description } = schema.parse(args);

				const cmd = new PrdCreateCommand(context);
				const result = await cmd.execute(featureName, description);
				return formatCommandResult(result);
			}

			case "prd_generate_arch": {
				const schema = z.object({
					prdFile: z.string(),
				});
				const { prdFile } = schema.parse(args);

				const cmd = new PrdGenerateArchCommand(context);
				const result = await cmd.execute(prdFile);
				return formatCommandResult(result);
			}

			case "tasks_generate": {
				const schema = z.object({
					prdFile: z.string().optional(),
				});
				const { prdFile } = schema.parse(args);

				const cmd = new TasksGenerateCommand(context);
				const result = await cmd.execute(prdFile);
				return formatCommandResult(result);
			}

			case "start_task": {
				const schema = z.object({
					taskId: z.string(),
				});
				const { taskId } = schema.parse(args);

				const cmd = new StartCommand(context);
				const result = await cmd.execute(taskId);
				return formatCommandResult(result);
			}

			case "check_task": {
				const cmd = new CheckCommand(context);
				const result = await cmd.execute();
				return formatCommandResult(result);
			}

			case "commit_task": {
				const schema = z.object({
					message: z.string(),
				});
				const { message } = schema.parse(args);

				const cmd = new CommitCommand(context);
				const result = await cmd.execute(message);
				return formatCommandResult(result);
			}

			case "resume_task": {
				const schema = z.object({
					status: z.string().optional(),
				});
				const { status } = schema.parse(args || {});

				const cmd = new ResumeCommand(context);
				const result = await cmd.execute(status);
				return formatCommandResult(result);
			}

			case "block_task": {
				const schema = z.object({
					reason: z.string(),
				});
				const { reason } = schema.parse(args);

				const cmd = new SkipCommand(context);
				const result = await cmd.execute(reason);
				return formatCommandResult(result);
			}

			case "add_retrospective": {
				const schema = z.object({
					category: z.string(),
					pattern: z.string(),
					solution: z.string(),
					criticality: z.string().optional().default("medium"),
				});
				const { category, pattern, solution, criticality } = schema.parse(args);

				const cmd = new RetroAddCommand(context);
				const result = await cmd.execute(
					category,
					pattern,
					solution,
					criticality,
				);
				return formatCommandResult(result);
			}

			case "list_retrospectives": {
				const schema = z.object({
					category: z.string().optional(),
				});
				const { category } = schema.parse(args || {});

				const cmd = new RetroListCommand(context);
				const result = await cmd.execute(category);
				return formatCommandResult(result);
			}

			default:
				throw new McpError(ErrorCode.MethodNotFound, `Unknown tool: ${name}`);
		}
	} catch (error) {
		if (error instanceof z.ZodError) {
			throw new McpError(
				ErrorCode.InvalidParams,
				`Invalid arguments: ${error.message}`,
			);
		}
		const errorMessage = error instanceof Error ? error.message : String(error);
		return {
			content: [
				{
					type: "text",
					text: `Error executing ${name}: ${errorMessage}`,
				},
			],
			isError: true,
		};
	}
});

// Start Server
async function main() {
	const transport = new StdioServerTransport();
	await server.connect(transport);
	console.error("Taskflow MCP Server running on stdio");
}

main().catch((error) => {
	console.error("Fatal error in main():", error);
	process.exit(1);
});
