/**
 * Interactive PRD Creation Session
 *
 * Creates a conversational interface for gathering PRD information.
 */

import type { BaseCommand } from "../commands/base.js";
import {
	InteractiveSession,
	type SessionConfig,
} from "./interactive-session.js";

export interface PRDSessionData {
	featureName: string;
	title: string;
	summary: string;
}

export class PRDInteractiveSession extends InteractiveSession<PRDSessionData> {
	constructor(command: BaseCommand) {
		const config: SessionConfig = {
			title: "PRD Creation - Interactive Session",
			description:
				"I'll help you create a comprehensive PRD. First, tell me what you want to build.",
			showSteps: true,
			allowQuit: true,
		};
		super(command, config);
	}

	/**
	 * Override start method to handle pre-provided feature name
	 */
	override async start(
		initialDataOrName?: Partial<PRDSessionData> | string,
	): Promise<PRDSessionData> {
		// Handle string argument (feature name)
		if (typeof initialDataOrName === "string") {
			this.data.featureName = initialDataOrName;
			return super.start();
		}

		// Handle object argument or undefined
		return super.start(initialDataOrName);
	}

	/**
	 * Implement abstract runSteps method
	 */
	protected async runSteps(): Promise<void> {
		await this.askTitle();
		await this.askSummary();
	}

	/**
	 * Implement abstract showSummary method
	 */
	protected showSummary(): void {
		console.log("\nHere's what I've gathered:\n");
		console.log(`Title: ${this.data.title}`);
		console.log(`\nSummary:`);
		console.log(this.data.summary);
	}

	/**
	 * Ask for title/feature name
	 */
	private async askTitle(): Promise<void> {
		// Feature name (already set if provided)
		if (this.data.featureName) {
			this.data.title = this.data.featureName;
			return;
		}

		this.showStep("FEATURE TITLE");

		const result = await this.prompt("What is the title of the feature?");

		// Check if user wants to quit
		if (result.quit) {
			this.quit();
		}

		const title = result.value;

		// Validate required field
		if (!title || title.trim().length === 0) {
			console.log("Title is required.");
			return this.askTitle();
		}

		this.data.featureName = title;
		this.data.title = title;
	}

	/**
	 * Ask for summary
	 */
	private async askSummary(): Promise<void> {
		this.showStep("FEATURE SUMMARY");

		const result = await this.promptMultiline(
			"Please provide a detailed summary of the feature.",
			"Enter your summary (press Enter twice to finish)",
			1,
		);

		if (result.quit) {
			this.quit();
		}

		this.data.summary = result.value;
	}
}
