/**
 * Conversational Input System
 *
 * Enables back-and-forth conversation with LLM for gathering requirements,
 * exploring options, and refining ideas.
 */

import { MarkdownDisplay } from "@/lib/display/markdown";
import { MultilineInput } from "@/lib/input/multiline";
import { Separator, Text } from "@/lib/ui/components";
import type { LLMMessage, LLMProvider } from "@/llm/base";

export interface ConversationMessage {
	role: "user" | "assistant";
	content: string;
	timestamp: Date;
}

export interface ConversationContext {
	topic: string;
	history: ConversationMessage[];
	systemPrompt?: string;
	allowCommands: boolean;
}

export interface ConversationOptions {
	topic: string;
	systemPrompt?: string;
	initialContext?: string;
	exitCommands?: string[];
}

export class ConversationSession {
	private context: ConversationContext;
	private llmProvider: LLMProvider;
	private exitCommands: string[];

	constructor(llmProvider: LLMProvider, options: ConversationOptions) {
		this.llmProvider = llmProvider;
		this.exitCommands = options.exitCommands || [
			"done",
			"exit",
			"quit",
			"finish",
			"end",
		];

		this.context = {
			topic: options.topic,
			history: [],
			allowCommands: true,
		};

		if (options.systemPrompt) {
			(this.context as ConversationContext).systemPrompt = options.systemPrompt;
		}

		// Add initial context if provided
		if (options.initialContext) {
			this.context.history.push({
				role: "assistant",
				content: options.initialContext,
				timestamp: new Date(),
			});
		}
	}

	/**
	 * Start the conversation session
	 *
	 * @example
	 * const session = new ConversationSession(llmProvider, {
	 *   topic: 'PRD Planning',
	 *   systemPrompt: 'You are helping create a PRD...'
	 * });
	 *
	 * await session.start();
	 * const history = session.getHistory();
	 */
	async start(): Promise<void> {
		console.log(Separator.heavy(70));
		console.log(Text.heading(`💬 Conversational Mode: ${this.context.topic}`));
		console.log(Separator.heavy(70));
		console.log(Text.muted('  Type your questions or "done" to finish'));
		console.log();

		// Show initial context if any
		if (this.context.history.length > 0) {
			const firstMessage = this.context.history[0];
			if (firstMessage && firstMessage.role === "assistant") {
				this.displayMessage("assistant", firstMessage.content);
			}
		}

		while (true) {
			// Get user input
			const input = await this.getUserInput();

			// Check for exit command
			if (this.isExitCommand(input)) {
				console.log();
				console.log(Separator.light(70));
				console.log(Text.success("✓ Conversation ended"));
				console.log();
				break;
			}

			// Add user message to history
			this.context.history.push({
				role: "user",
				content: input,
				timestamp: new Date(),
			});

			// Show thinking indicator
			console.log();
			console.log(Text.muted("  Assistant is thinking..."));
			console.log();

			// Get AI response
			const response = await this.getAIResponse();

			// Add assistant message to history
			this.context.history.push({
				role: "assistant",
				content: response,
				timestamp: new Date(),
			});

			// Display response
			this.displayMessage("assistant", response);
		}
	}

	/**
	 * Display a message with proper formatting
	 */
	private displayMessage(role: "user" | "assistant", content: string): void {
		console.log(Separator.light(70));
		if (role === "user") {
			console.log(Text.info("You:"));
		} else {
			console.log(Text.success("Assistant:"));
		}
		console.log();

		// Render markdown for assistant, plain text for user
		if (role === "assistant") {
			console.log(MarkdownDisplay.render(content));
		} else {
			// Indent user messages slightly
			const lines = content.split("\n");
			for (const line of lines) {
				console.log(`  ${line}`);
			}
		}
		console.log();
	}

	/**
	 * Get user input (can be multi-line)
	 */
	private async getUserInput(): Promise<string> {
		console.log(Separator.light(70));
		console.log(Text.info("You:"));
		console.log(Text.muted("  (Type your message and press Enter)"));
		console.log();

		try {
			const input = await MultilineInput.promptSimple("  ");

			// Echo the user's input
			if (input.trim()) {
				console.log();
			}

			return input;
		} catch (_error) {
			// Fallback to simple input
			return await MultilineInput.promptSimple("  ");
		}
	}

	/**
	 * Get AI response based on conversation history
	 */
	private async getAIResponse(): Promise<string> {
		const messages = this.buildMessages();

		try {
			const result = await this.llmProvider.generate(messages, {
				temperature: 0.7,
				maxTokens: 1500,
			});

			return result.content;
		} catch (error) {
			const errorMessage =
				error instanceof Error ? error.message : String(error);
			console.error(Text.error(`Error getting AI response: ${errorMessage}`));
			return "I apologize, but I encountered an error. Please try rephrasing your question.";
		}
	}

	/**
	 * Build LLM messages from conversation history
	 */
	private buildMessages(): LLMMessage[] {
		const messages: LLMMessage[] = [];

		// Add system prompt if provided
		if (this.context.systemPrompt) {
			messages.push({
				role: "system",
				content: this.context.systemPrompt,
			});
		} else {
			// Default system prompt
			messages.push({
				role: "system",
				content: `You are helping with: ${this.context.topic}

Provide helpful, concise answers to user questions.
If the user asks about edge cases, pros/cons, or alternatives, provide detailed analysis.
Keep responses practical and actionable.
Use markdown formatting for better readability.`,
			});
		}

		// Add conversation history
		for (const msg of this.context.history) {
			messages.push({
				role: msg.role,
				content: msg.content,
			});
		}

		return messages;
	}

	/**
	 * Check if input is an exit command
	 */
	private isExitCommand(input: string): boolean {
		const trimmed = input.trim().toLowerCase();
		return this.exitCommands.includes(trimmed);
	}

	/**
	 * Get conversation history
	 */
	getHistory(): ConversationMessage[] {
		return this.context.history;
	}

	/**
	 * Get conversation summary (last N messages)
	 */
	getSummary(messageCount: number = 5): ConversationMessage[] {
		return this.context.history.slice(-messageCount);
	}

	/**
	 * Export conversation as markdown
	 */
	exportAsMarkdown(): string {
		const lines: string[] = [];

		lines.push(`# Conversation: ${this.context.topic}\n`);
		lines.push(`Date: ${new Date().toLocaleDateString()}\n`);
		lines.push("---\n");

		for (const msg of this.context.history) {
			const role = msg.role === "user" ? "You" : "Assistant";
			const timestamp = msg.timestamp.toLocaleTimeString();

			lines.push(`## ${role} (${timestamp})\n`);
			lines.push(msg.content);
			lines.push("\n---\n");
		}

		return lines.join("\n");
	}

	/**
	 * Clear conversation history
	 */
	clear(): void {
		this.context.history = [];
	}

	/**
	 * Add a message programmatically (useful for seeding context)
	 */
	addMessage(role: "user" | "assistant", content: string): void {
		this.context.history.push({
			role,
			content,
			timestamp: new Date(),
		});
	}
}
