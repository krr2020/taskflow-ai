/**
 * Interactive Session Base Class
 *
 * Provides a reusable conversational interface for gathering information
 * through a series of questions. Can be extended for any command
 * that needs interactive user input.
 */

import readline from "node:readline";
import type { BaseCommand } from "@/commands/base";
import { SessionManager } from "@/lib/session/session-manager";
import { Colors, Text } from "@/lib/ui/components";
import {
	createMenuResult,
	type MenuResult,
	NavigationManager,
} from "./navigation.js";

/**
 * Result of a prompt
 */
export interface PromptResult {
	quit: boolean;
	skipped: boolean;
	back: boolean;
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

	/**
	 * Whether to allow back navigation
	 */
	allowBack?: boolean;

	/**
	 * Session ID for persistence (optional)
	 */
	sessionId?: string;
}

/**
 * Base class for interactive sessions
 */
export abstract class InteractiveSession<T = unknown> {
	protected command: BaseCommand;
	protected config: SessionConfig;
	protected data: Partial<T> = {};
	protected step = 0;
	protected sessionManager: SessionManager;
	protected sessionId: string;
	protected navigationManager: NavigationManager<Partial<T>>;

	constructor(command: BaseCommand, config: SessionConfig) {
		this.command = command;
		this.config = {
			showSteps: true,
			allowQuit: true,
			allowBack: true,
			...config,
		};
		this.sessionManager = new SessionManager(command.getProjectRoot());
		this.sessionId = config.sessionId || `session-${Date.now()}`;
		this.navigationManager = new NavigationManager<Partial<T>>();
	}

	/**
	 * Start the interactive session
	 */
	async start(initialData?: Partial<T>): Promise<T> {
		// Check for existing session
		if (this.config.sessionId) {
			const savedSession = this.sessionManager.loadSession<T>(this.sessionId);
			if (savedSession && !savedSession.completed) {
				console.log(
					Text.info(
						`Found existing session from ${new Date(savedSession.timestamp).toLocaleString()}`,
					),
				);
				const resume = await this.confirm("Resume this session?", "yes");
				if (resume) {
					this.data = { ...this.data, ...savedSession.data };
					this.step = savedSession.step;
					console.log(Text.success("Session resumed."));
				}
			}
		}

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

		// Mark session as complete
		if (this.config.sessionId) {
			this.sessionManager.completeSession(this.sessionId);
		}

		return this.data as T;
	}

	/**
	 * Save current session state
	 */
	protected saveState(): void {
		if (this.config.sessionId) {
			this.sessionManager.saveSession(
				this.sessionId,
				this.constructor.name,
				this.step,
				this.data,
			);
		}
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
		console.log(Text.heading(this.config.title));

		if (this.config.description) {
			console.log(`${this.config.description}\n`);
		}

		console.log(Text.subsection("Instructions:"));
		console.log(Text.bullet("Answer each question"));
		console.log(Text.bullet("Press Enter to skip (where applicable)"));
		if (this.config.allowBack) {
			console.log(Text.bullet("Type 'back' to return to the previous step"));
		}
		if (this.config.allowQuit) {
			console.log(Text.bullet("Type 'quit' or 'exit' to cancel"));
		}
		console.log("");
	}

	/**
	 * Show step header
	 */
	protected showStep(title: string): void {
		if (this.config.showSteps) {
			this.step++;
			console.log(Text.section(`Step ${this.step}: ${title.toUpperCase()}`));
		} else {
			console.log(Text.section(title.toUpperCase()));
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
			? `${Colors.bold(question)} ${Colors.muted(`[${defaultVal}]`)}: `
			: `${Colors.bold(question)}\n${Colors.success("> ")}`;

		const answer = await new Promise<string>((resolve) => {
			rl.question(promptText, (input) => {
				rl.close();
				resolve(input.trim());
			});
		});

		// Check for back
		if (this.isBack(answer)) {
			return this.backResult();
		}

		// Check for quit
		if (this.isQuit(answer)) {
			return this.quitResult();
		}

		// Check if skipped
		const skipped = answer === "";
		const value = answer || defaultVal || "";

		// Validate required
		if (required && !value) {
			console.log(Text.warning("This field is required. Please try again."));
			return this.prompt(question, defaultVal, required);
		}

		return {
			quit: false,
			back: false,
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

		console.log(Text.subsection(question));
		if (hint) {
			console.log(Text.muted(`(${hint})`));
		}

		const askForLine = async (): Promise<void> => {
			const answer = await new Promise<string>((resolve) => {
				rl.question(Colors.success("> "), (input) => {
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
			back: false,
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
	 * Check if answer is back command
	 */
	protected isBack(answer: string): boolean {
		return !!this.config.allowBack && answer.toLowerCase() === "back";
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
			back: false,
			skipped: false,
			value: "",
		};
	}

	/**
	 * Create back result
	 */
	protected backResult(): PromptResult {
		return {
			quit: false,
			back: true,
			skipped: false,
			value: "",
		};
	}

	/**
	 * Menu selection with back navigation support
	 */
	protected async selectOption(
		title: string,
		options: Array<{ value: string; label: string; description?: string }>,
		allowBack: boolean = true,
	): Promise<MenuResult> {
		const rl = this.createReadline();

		console.log(Text.section(title));

		// Display options
		for (let i = 0; i < options.length; i++) {
			const opt = options[i];
			if (!opt) continue;
			console.log(`  ${i + 1}  │  ${opt.label}`);
			if (opt.description) {
				console.log(`       ${Colors.muted(opt.description)}`);
			}
		}

		// Add back option if allowed
		if (
			allowBack &&
			this.config.allowBack &&
			this.navigationManager.canGoBack()
		) {
			console.log();
			console.log(
				`  ${Colors.bold("←")}  │  ${Colors.primary("Back to previous step")}`,
			);
		}

		console.log();

		const answer = await new Promise<string>((resolve) => {
			rl.question(
				`${Colors.bold("Select an option")} (1-${options.length}${allowBack && this.navigationManager.canGoBack() ? " or 'back'" : ""}): `,
				(input) => {
					rl.close();
					resolve(input.trim());
				},
			);
		});

		// Check for quit
		if (this.isQuit(answer)) {
			return createMenuResult("", false, true);
		}

		// Check for back
		if (allowBack && this.isBack(answer)) {
			return createMenuResult("", true, false);
		}

		// Parse selection
		const selection = Number.parseInt(answer, 10);
		if (
			Number.isNaN(selection) ||
			selection < 1 ||
			selection > options.length
		) {
			console.log(Text.warning("Invalid selection. Try again."));
			return this.selectOption(title, options, allowBack);
		}

		const selected = options[selection - 1];
		if (!selected) {
			console.log(Text.warning("Invalid selection. Try again."));
			return this.selectOption(title, options, allowBack);
		}

		return createMenuResult(selected.value, false, false);
	}
}
