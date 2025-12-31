#!/usr/bin/env node
import { Server } from "@modelcontextprotocol/sdk/server/index.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import {
    CallToolRequestSchema,
    ListToolsRequestSchema,
    ErrorCode,
    McpError,
} from "@modelcontextprotocol/sdk/types.js";
import { z } from "zod";
import { StateMachine, ConfigLoader, GitManager } from "@krr2020/taskflow-core";
import fs from "node:fs";
import path from "node:path";

// Initialize Core Components
const configLoader = new ConfigLoader();
const gitManager = new GitManager();
const stateMachine = new StateMachine(configLoader, gitManager);

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
    }
);

// Tool Definitions
server.setRequestHandler(ListToolsRequestSchema, async () => {
    return {
        tools: [
            {
                name: "init",
                description: "Initialize Taskflow in the current project by creating a taskflow.config.json file.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "start_task",
                description: "Start a new task, checking out the correct story branch and entering PLANNING mode.",
                inputSchema: {
                    type: "object",
                    properties: {
                        taskId: {
                            type: "string",
                            description: "The ID of the task to start (e.g., '1.2.3')",
                        },
                        storyId: {
                            type: "string",
                            description: "The Story ID this task belongs to (e.g., '15')",
                        },
                        slug: {
                            type: "string",
                            description: "Short slug for the story (e.g., 'user-auth')",
                        },
                    },
                    required: ["taskId", "storyId", "slug"],
                },
            },
            {
                name: "approve_plan",
                description: "Approve the implementation plan and switch to EXECUTION mode.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "get_status",
                description: "Get the current state machine status and active task.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "generate_prd",
                description: "Generate a PRD template based on project context.",
                inputSchema: {
                    type: "object",
                    properties: {
                        requirements: { type: "string" }
                    },
                },
            },
            {
                name: "generate_tasks",
                description: "Generate tasks from a PRD.",
                inputSchema: {
                    type: "object",
                    properties: {
                        prdContent: { type: "string" }
                    },
                },
            },
            {
                name: "run_checks",
                description: "Run project validations and enter VERIFICATION state.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
            {
                name: "submit_task",
                description: "Submit the current task and complete the workflow.",
                inputSchema: {
                    type: "object",
                    properties: {},
                },
            },
        ],
    };
});

// Tool Execution
server.setRequestHandler(CallToolRequestSchema, async (request) => {
    const { name, arguments: args } = request.params;

    try {
        switch (name) {
            case "init": {
                const configPath = path.join(process.cwd(), "taskflow.config.json");
                if (fs.existsSync(configPath)) {
                    return {
                        content: [{ type: "text", text: "Taskflow is already initialized." }],
                    };
                }

                const defaultConfig = {
                    project: {
                        name: "my-project",
                        root: ".",
                    },
                    branching: {
                        strategy: "per-story",
                        base: "main",
                        prefix: "story/",
                    },
                };

                fs.writeFileSync(configPath, JSON.stringify(defaultConfig, null, 2));
                return {
                    content: [
                        {
                            type: "text",
                            text: "Initialized Taskflow! Created taskflow.config.json.",
                        },
                    ],
                };
            }

            case "start_task": {
                const schema = z.object({
                    taskId: z.string(),
                    storyId: z.string(),
                    slug: z.string(),
                });
                const { taskId, storyId, slug } = schema.parse(args);

                await stateMachine.startTask(taskId, storyId, slug);

                return {
                    content: [
                        {
                            type: "text",
                            text: `Task ${taskId} started on branch story/S${storyId}-${slug}. State is now PLANNING.`,
                        },
                    ],
                };
            }

            case "approve_plan": {
                stateMachine.approvePlan();
                return {
                    content: [
                        {
                            type: "text",
                            text: "Plan approved. State is now EXECUTION. You may now write code.",
                        },
                    ],
                };
            }

            case "get_status": {
                return {
                    content: [
                        {
                            type: "text",
                            text: JSON.stringify({
                                state: stateMachine.getState(),
                                activeTask: stateMachine.getActiveTask(),
                            }, null, 2),
                        },
                    ],
                };
            }

            case "generate_prd": {
                const schema = z.object({
                    requirements: z.string().optional(),
                    content: z.string().optional(),
                });
                const { requirements, content } = schema.parse(args);

                const finalContent = content || `# Project Requirements Document
## 1. Objective
${requirements || "[Describe the goal]"}

## 2. Scope
- [ ] In Scope
- [ ] Out of Scope

## 3. Technical Requirements
- Language: [e.g., TypeScript]
- Framework: [e.g., React]

## 4. User Stories
- Story 1: [Description]
`;
                const tasksDir = path.join(process.cwd(), "tasks");
                if (!fs.existsSync(tasksDir)) {
                    fs.mkdirSync(tasksDir, { recursive: true });
                }

                const prdPath = path.join(tasksDir, "PRD.md");
                fs.writeFileSync(prdPath, finalContent);

                return {
                    content: [
                        {
                            type: "text",
                            text: `PRD generated and saved to ${prdPath}\n\n${finalContent}`,
                        },
                    ],
                };
            }

            case "generate_tasks": {
                const schema = z.object({
                    prdContent: z.string().optional(),
                    tasks: z.array(z.any()).optional(), // Allow passing generated tasks directly
                });
                const { prdContent, tasks } = schema.parse(args);

                if (tasks) {
                    const tasksDir = path.join(process.cwd(), "tasks");
                    if (!fs.existsSync(tasksDir)) {
                        fs.mkdirSync(tasksDir, { recursive: true });
                    }

                    // Save all tasks to a single JSON file for reference
                    const tasksJsonPath = path.join(tasksDir, "tasks.json");
                    fs.writeFileSync(tasksJsonPath, JSON.stringify(tasks, null, 2));

                    // Save individual task files
                    const createdFiles: string[] = [];
                    for (const task of tasks) {
                         // Simple sanitization for filename
                        const safeTitle = (task.title || "task").toLowerCase().replace(/[^a-z0-9]+/g, "-");
                        const filename = `${task.id}-${safeTitle}.md`;
                        const taskPath = path.join(tasksDir, filename);
                        
                        const taskContent = `# Task ${task.id}: ${task.title}
Status: ${task.status || "todo"}

## Description
${task.description || "No description provided."}

## Subtasks
${(task.subtasks || []).map((st: any) => `- [ ] ${st.title}`).join("\n")}
`;
                        fs.writeFileSync(taskPath, taskContent);
                        createdFiles.push(filename);
                    }

                    return {
                        content: [
                            {
                                type: "text",
                                text: `Saved ${tasks.length} tasks to ${tasksDir}:\n- ${createdFiles.join("\n- ")}`,
                            },
                        ],
                    };
                }

                // Fallback: Prompt for tasks if not provided
                return {
                    content: [
                        {
                            type: "text",
                            text: "Please provide the tasks in the 'tasks' argument to save them. Format matches TaskSchema.",
                        },
                    ],
                };
            }

            case "run_checks": {
                stateMachine.startVerification();
                // TODO: Actually run the validation commands from config
                return {
                    content: [{ type: "text", text: "Verification phase started. Running checks... [MOCK PASSED]" }],
                };
            }

            case "submit_task": {
                stateMachine.completeTask();
                return {
                    content: [{ type: "text", text: "Task submitted and completed. State is now IDLE." }],
                };
            }

            default:
                throw new McpError(
                    ErrorCode.MethodNotFound,
                    `Unknown tool: ${name}`
                );
        }
    } catch (error) {
        if (error instanceof z.ZodError) {
            throw new McpError(
                ErrorCode.InvalidParams,
                `Invalid arguments: ${error.message}`
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
