import fs from "node:fs";
import path from "node:path";
import { createInterface } from "node:readline";
import { execa } from "execa";
import { ToolParser } from "@/agent/parser";
import { BackupManager, Sandbox } from "@/agent/safety";
import { DefaultToolRegistry, FileSystemTools } from "@/agent/tools";
import type { ConfigLoader } from "@/lib/config/config-loader";
import { colors, consoleOutput, icons } from "@/lib/core/output";
import { SessionManager } from "@/lib/session/session-manager";
import type { LLMMessage, LLMProvider, LLMProviderType } from "@/llm/base";
import { ProviderFactory } from "@/llm/factory";

export interface AgentContext {
	taskId: string;
	status: string;
	projectRoot: string;
	files: string[];
	errors?: string[];
}

export class AgentRunner {
	private sessionManager: SessionManager;
	private llmProvider: LLMProvider;
	private registry: DefaultToolRegistry;
	private interactive = true;
	private autoApprove = false;

	constructor(
		private context: AgentContext,
		private configLoader: ConfigLoader,
	) {
		this.sessionManager = new SessionManager(context.projectRoot);
		this.registry = new DefaultToolRegistry();

		// Initialize LLM
		const config = this.configLoader.load();
		if (
			!config.ai?.enabled ||
			!config.ai.agentMode?.enabled ||
			!config.ai.models
		) {
			throw new Error("Agent mode is not enabled in configuration");
		}

		// Configure interactive mode
		const agentConfig = config.ai.agentMode;
		this.interactive = agentConfig.interactive ?? true;

		// Initialize tools
		const sandbox = new Sandbox(context.projectRoot);
		const backupManager = new BackupManager(context.projectRoot);
		// Pass backup config to tools
		const enableBackup = agentConfig.backup ?? true;
		const fsTools = new FileSystemTools(sandbox, backupManager, enableBackup);
		for (const t of fsTools.getTools()) {
			this.registry.register(t);
		}

		// Use configured agent model or default execution model
		const modelName = agentConfig.model || config.ai.usage?.execution;
		const providerName = agentConfig.provider || config.ai.provider;

		if (!modelName || !providerName) {
			throw new Error(
				"Agent model/provider not configured. Check taskflow.config.json",
			);
		}

		// Find the model definition
		// const modelDef = config.ai.models[modelName]; // Logic simplified for brevity, in real app needs robust lookup
		// Re-use factory logic or create provider directly.
		// For now, assuming factory handles it via config object if we pass it, but factory expects AIConfig.
		// Let's create provider directly to save time, using the factory helper.
		// We need to map string provider name to enum.
		// Simplified:
		this.llmProvider = ProviderFactory.createProvider(
			providerName as LLMProviderType,
			modelName,
			config.ai.apiKey, // Global key or provider specific
		);
	}

	async run(): Promise<void> {
		const sessionId = `agent-${this.context.taskId}`;
		const savedSession =
			this.sessionManager.loadSession<LLMMessage[]>(sessionId);

		const messages: LLMMessage[] = savedSession?.data || [];

		if (messages.length === 0) {
			// Start new session
			messages.push({
				role: "system",
				content: this.createSystemPrompt(),
			});
			messages.push({
				role: "user",
				content: this.createInitialUserPrompt(),
			});
		} else {
			consoleOutput(
				`Resuming agent session for task ${this.context.taskId}...`,
				{ icon: icons.info },
			);
		}

		consoleOutput("\n🤖 AGENT MODE ACTIVE", { color: colors.highlight });
		consoleOutput("──────────────────────────────────────────────────", {
			color: colors.muted,
		});
		consoleOutput("Type 'stop' to exit and save state.\n");

		let stepCount = 0;
		const maxSteps = 20; // Default limit

		while (stepCount < maxSteps) {
			stepCount++;
			process.stdout.write(colors.muted(`\n[Step ${stepCount}] Thinking... `));

			try {
				const response = await this.llmProvider.generate(messages);
				const responseText = response.content;
				process.stdout.write("\n");

				consoleOutput(colors.info("Agent: ") + responseText);
				messages.push({ role: "assistant", content: responseText });

				// Parse tools
				const tools = ToolParser.parse(responseText);

				if (tools.length === 0) {
					// No tools called, maybe asking for input or done?
					// For now, we treat no tools as "waiting for user" or "done"
					// But this is an autonomous loop. We can break if it says "DONE".
					if (responseText.includes("DONE")) {
						consoleOutput("Agent completed task.", { icon: icons.success });
						break;
					}
					// If no tools and no DONE, we might be stuck.
					// Let's prompt user? Or just break.
					// For "Autonomous" mode, we expect it to do work.
					break;
				}

				// Execute tools
				for (const toolCall of tools) {
					consoleOutput(`\nRunning tool: ${colors.command(toolCall.tool)}`);
					const tool = this.registry.get(toolCall.tool);
					if (!tool) {
						const errorMsg = `Tool '${toolCall.tool}' not found.`;
						consoleOutput(errorMsg, { type: "error" });
						messages.push({
							role: "user",
							content: `System Error: ${errorMsg}`,
						});
						continue;
					}

					// Interactive Review for file modifications
					if (
						this.interactive &&
						!this.autoApprove &&
						(toolCall.tool === "write_file" ||
							toolCall.tool === "replace_string")
					) {
						const shouldProceed = await this.reviewChange(toolCall);
						if (!shouldProceed) {
							consoleOutput("Tool execution skipped by user.", {
								icon: icons.info,
							});
							messages.push({
								role: "user",
								content: "User skipped this tool execution.",
							});
							continue;
						}
					}

					const result = await tool.execute(toolCall.args);
					const outputMsg = result.success
						? `Tool Output:\n${result.output}`
						: `Tool Error:\n${result.output}`;

					consoleOutput(
						result.success
							? colors.success("✓ Success")
							: colors.error("✗ Failed"),
					);

					messages.push({
						role: "user",
						content: outputMsg,
					});
				}

				// Save session after every step
				this.sessionManager.saveSession(
					sessionId,
					"do --agent",
					stepCount,
					messages,
				);
			} catch (error) {
				consoleOutput(`Agent Error: ${error}`, { type: "error" });
				break;
			}
		}
	}

	private async reviewChange(toolCall: {
		tool: string;
		args: Record<string, string>;
	}): Promise<boolean> {
		const filePath = toolCall.args.path;
		const content = toolCall.args.content;

		if (!filePath || !content) return true; // Can't review if missing args

		const fullPath = path.resolve(this.context.projectRoot, filePath);

		consoleOutput(`\nProposed changes for: ${colors.highlight(filePath)}`);
		consoleOutput("──────────────────────────────────────────────────", {
			color: colors.muted,
		});

		// Generate Diff
		try {
			if (fs.existsSync(fullPath)) {
				const tempFile = `${fullPath}.temp.new`;
				fs.writeFileSync(tempFile, content);

				try {
					// Use git diff if available for color output
					await execa(
						"git",
						["diff", "--no-index", "--color", fullPath, tempFile],
						{
							stdio: "inherit",
						},
					);
				} catch {
					// git diff returns exit code 1 if files differ, which throws error in execa
					// We ignore this as we expect diffs
				} finally {
					if (fs.existsSync(tempFile)) fs.unlinkSync(tempFile);
				}
			} else {
				consoleOutput(colors.success(`[NEW FILE] ${filePath}`));
				consoleOutput(content);
			}
		} catch (_error) {
			consoleOutput("Could not generate diff preview.", { type: "error" });
		}

		consoleOutput("──────────────────────────────────────────────────", {
			color: colors.muted,
		});

		while (true) {
			const answer = await this.askUser(
				"Apply this change? [y]es, [n]o, [a]ll, [s]top: ",
			);
			const choice = answer.trim().toLowerCase();

			if (choice === "y" || choice === "yes") {
				return true;
			}
			if (choice === "n" || choice === "no") {
				return false;
			}
			if (choice === "a" || choice === "all") {
				this.autoApprove = true;
				return true;
			}
			if (choice === "s" || choice === "stop") {
				throw new Error("User stopped the session.");
			}
			// If invalid input, loop again
		}
	}

	private askUser(question: string): Promise<string> {
		const rl = createInterface({
			input: process.stdin,
			output: process.stdout,
		});

		return new Promise((resolve) => {
			rl.question(colors.info(question), (answer) => {
				rl.close();
				resolve(answer);
			});
		});
	}

	private createSystemPrompt(): string {
		const toolsList = this.registry
			.list()
			.map((t) => `- ${t.name}: ${t.description}`)
			.join("\n");

		return `You are an autonomous AI developer agent.
Your goal is to complete the current task by modifying files.

AVAILABLE TOOLS:
${toolsList}

TOOL USAGE FORMAT:
To use a tool, output an XML block like this:
<tool_name arg1="value1">
content (if applicable)
</tool_name>

Example:
<write_file path="src/hello.ts">
console.log("Hello");
</write_file>

RULES:
1. Only modify files relevant to the task.
2. If you encounter errors, read the file, fix it, and try again.
3. When finished, output "DONE".
4. Do not ask for user input. You are autonomous.
`;
	}

	private createInitialUserPrompt(): string {
		let prompt = `Current Task: ${this.context.taskId}
Status: ${this.context.status}
Goal: ${this.context.status === "implementing" ? "Implement the features described in the task." : "Fix the validation errors."}

Context Files:
${this.context.files.join("\n")}
`;

		if (this.context.errors && this.context.errors.length > 0) {
			prompt += `\nERRORS TO FIX:\n${this.context.errors.join("\n")}`;
		}

		return prompt;
	}
}
