/**
 * Interactive Session Base Class
 *
 * Provides a reusable conversational interface for gathering information
 * through a series of questions. Can be extended for any command
 * that needs interactive user input.
 */

import readline from "node:readline";
import type { BaseCommand } from "../commands/base.js";

/**
 * Result of a prompt
 */
export interface PromptResult {
	quit: boolean;
	skipped: boolean;
	value: string;
}

/**
 * Result of a list prompt
 */
export interface ListPromptResult {
	quit: boolean;
	items: string[];
}

/**
 * Configuration for interactive session
 */
export interface SessionConfig {
	/**
	 * Session title
	 */
	title: string;

	/**
	 * Session description
	 */
	description?: string;

	/**
	 * Whether to show step numbers
	 */
	showSteps?: boolean;

	/**
	 * Whether to allow quit at any time
	 */
	allowQuit?: boolean;
}

/**
 * Base class for interactive sessions
 */
export abstract class InteractiveSession<T = unknown> {
	protected command: BaseCommand;
	protected config: SessionConfig;
	protected data: Partial<T> = {};
	protected step = 0;

	constructor(command: BaseCommand, config: SessionConfig) {
		this.command = command;
		this.config = {
			showSteps: true,
			allowQuit: true,
			...config,
		};
	}

	/**
	 * Start the interactive session
	 */
	async start(initialData?: Partial<T>): Promise<T> {
		// Initialize data
		if (initialData) {
			this.data = { ...this.data, ...initialData };
		}

		// Show header
		this.showHeader();

		// Execute steps
		await this.runSteps();

		// Show summary and confirm
		const confirmed = await this.confirm();

		if (!confirmed) {
			console.log("\n❌ Session cancelled.");
			process.exit(0);
		}

		return this.data as T;
	}

	/**
	 * Execute all steps (to be implemented by subclasses)
	 */
	protected abstract runSteps(): Promise<void>;

	/**
	 * Show session summary (to be implemented by subclasses)
	 */
	protected abstract showSummary(): void;

	/**
	 * Show session header
	 */
	protected showHeader(): void {
		const width = 60;
		console.log(`\n${"═".repeat(width)}`);
		console.log(`  ${this.config.title}`);
		console.log("═".repeat(width));

		if (this.config.description) {
			console.log(`\n${this.config.description}\n`);
		}

		console.log("Instructions:");
		console.log("  • Answer each question");
		console.log("  • Press Enter to skip (where applicable)");
		if (this.config.allowQuit) {
			console.log("  • Type 'quit' or 'exit' to cancel");
		}
		console.log("");
	}

	/**
	 * Show step header
	 */
	protected showStep(title: string): void {
		if (this.config.showSteps) {
			this.step++;
			console.log(`\n[${this.step}] ${"─".repeat(40)}`);
			console.log(`  ${title.toUpperCase()}`);
			console.log("─".repeat(40));
		} else {
			console.log(`\n${"─".repeat(40)}`);
			console.log(`  ${title.toUpperCase()}`);
			console.log("─".repeat(40));
		}
	}

	/**
	 * Prompt user for single-line input
	 */
	protected async prompt(
		question: string,
		defaultVal?: string,
		required: boolean = false,
	): Promise<PromptResult> {
		const rl = this.createReadline();

		const promptText = defaultVal
			? `${question} [${defaultVal}]: `
			: `${question}\n> `;

		const answer = await new Promise<string>((resolve) => {
			rl.question(promptText, (input) => {
				rl.close();
				resolve(input.trim());
			});
		});

		// Check for quit
		if (this.isQuit(answer)) {
			return this.quitResult();
		}

		// Check if skipped
		const skipped = answer === "";
		const value = answer || defaultVal || "";

		// Validate required
		if (required && !value) {
			console.log("⚠ This field is required. Please try again.");
			return this.prompt(question, defaultVal, required);
		}

		return {
			quit: false,
			skipped,
			value,
		};
	}

	/**
	 * Prompt user for multi-line input
	 */
	protected async promptMultiline(
		question: string,
		hint: string = "Enter your summary (press Enter twice to finish)",
		minLines: number = 1,
	): Promise<PromptResult> {
		const rl = this.createReadline();
		const lines: string[] = [];
		let emptyLineCount = 0;

		console.log(question);
		if (hint) {
			console.log(`(${hint})`);
		}

		const askForLine = async (): Promise<void> => {
			const answer = await new Promise<string>((resolve) => {
				rl.question("> ", (input) => {
					resolve(input.trimEnd());
				});
			});

			// Check for quit
			if (this.isQuit(answer.trim())) {
				rl.close();
				this.quit();
			}

			if (answer.trim() === "") {
				emptyLineCount++;
			} else {
				emptyLineCount = 0;
			}

			// Two consecutive empty lines means done
			if (emptyLineCount >= 2) {
				rl.close();
				return;
			}

			lines.push(answer);
			await askForLine();
		};

		await askForLine();

		// Remove trailing empty lines
		while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") {
			lines.pop();
		}

		if (lines.length < minLines) {
			console.log(`⚠ Please provide at least ${minLines} line(s).`);
			return this.promptMultiline(question, hint, minLines);
		}

		const value = lines.join("\n");

		return {
			quit: false,
			skipped: value === "",
			value,
		};
	}

	/**
	 * Prompt user for multi-line input (list)
	 */
	protected async promptList(
		question: string,
		hint?: string,
		minItems: number = 0,
	): Promise<ListPromptResult> {
		const rl = this.createReadline();
		const items: string[] = [];

		console.log(question);
		if (hint) {
			console.log(`(${hint})`);
		}

		const askForItem = async (): Promise<void> => {
			const answer = await new Promise<string>((resolve) => {
				rl.question("> ", (input) => {
					resolve(input.trim());
				});
			});

			// Check for quit
			if (this.isQuit(answer)) {
				rl.close();
				this.quit();
			}

			// Empty line means done
			if (answer === "") {
				rl.close();

				// Validate minimum items
				if (items.length < minItems) {
					console.log(`⚠ Please provide at least ${minItems} item(s).`);
					items.length = 0; // Reset
					const result = await this.promptList(question, hint, minItems);
					items.push(...result.items);
					return;
				}

				return;
			}

			items.push(answer);
			return askForItem();
		};

		await askForItem();

		return {
			quit: false,
			items,
		};
	}

	/**
	 * Confirm with user
	 */
	protected async confirm(
		message: string = "Generate PRD with these details? (yes/no)",
		defaultVal: string = "yes",
	): Promise<boolean> {
		const result = await this.prompt(message, defaultVal);

		return (
			!result.quit &&
			(result.value.toLowerCase() === "y" ||
				result.value.toLowerCase() === "yes")
		);
	}

	/**
	 * Create readline interface
	 */
	protected createReadline(): readline.Interface {
		return readline.createInterface({
			input: process.stdin,
			output: process.stdout,
		});
	}

	/**
	 * Check if answer is quit command
	 */
	protected isQuit(answer: string): boolean {
		return (
			!!this.config.allowQuit &&
			(answer.toLowerCase() === "quit" || answer.toLowerCase() === "exit")
		);
	}

	/**
	 * Handle quit
	 */
	protected quit(): never {
		console.log("\n❌ Session cancelled.");
		process.exit(0);
	}

	/**
	 * Create quit result
	 */
	protected quitResult(): PromptResult {
		return {
			quit: true,
			skipped: false,
			value: "",
		};
	}
}
