/**
 * Base command infrastructure for AI-first command design
 * Every command returns structured guidance for AI agents
 */

export interface CommandContext {
	projectRoot: string;
}

export interface CommandResult {
	success: boolean;
	output: string;
	nextSteps: string;
	aiGuidance?: string;
	contextFiles?: string[];
	warnings?: string[];
	errors?: string[];
}

export abstract class BaseCommand {
	constructor(protected context: CommandContext) {}

	abstract execute(...args: unknown[]): Promise<CommandResult>;

	/**
	 * Format command result for terminal output
	 * Returns formatted string with sections: OUTPUT, CONTEXT FILES, NEXT STEPS, AI GUIDANCE, WARNINGS
	 */
	protected formatOutput(result: CommandResult): string {
		const sections: string[] = [];
		const separator = "─".repeat(60);

		// OUTPUT section
		sections.push("OUTPUT:");
		sections.push(separator);
		sections.push(result.output);
		sections.push("");

		// CONTEXT FILES section (if any)
		if (result.contextFiles && result.contextFiles.length > 0) {
			sections.push("CONTEXT FILES (Read these before proceeding):");
			sections.push(separator);
			for (const [index, file] of result.contextFiles.entries()) {
				sections.push(`${index + 1}. ${file}`);
			}
			sections.push("");
		}

		// NEXT STEPS section
		sections.push("NEXT STEPS:");
		sections.push(separator);
		sections.push(result.nextSteps);
		sections.push("");

		// AI GUIDANCE section (if any)
		if (result.aiGuidance) {
			sections.push("AI GUIDANCE:");
			sections.push(separator);
			sections.push(result.aiGuidance);
			sections.push("");
		}

		// WARNINGS section (if any)
		if (result.warnings && result.warnings.length > 0) {
			sections.push("WARNINGS:");
			sections.push(separator);
			for (const warning of result.warnings) {
				sections.push(`⚠ ${warning}`);
			}
			sections.push("");
		}

		// ERRORS section (if any)
		if (result.errors && result.errors.length > 0) {
			sections.push("ERRORS:");
			sections.push(separator);
			for (const error of result.errors) {
				sections.push(`✗ ${error}`);
			}
			sections.push("");
		}

		return sections.join("\n");
	}

	/**
	 * Create a successful command result
	 */
	protected success(
		output: string,
		nextSteps: string,
		options?: {
			aiGuidance?: string;
			contextFiles?: string[];
			warnings?: string[];
		},
	): CommandResult {
		return {
			success: true,
			output,
			nextSteps,
			...options,
		};
	}

	/**
	 * Create a failed command result
	 */
	protected failure(
		output: string,
		errors: string[],
		nextSteps: string,
		options?: {
			aiGuidance?: string;
			warnings?: string[];
		},
	): CommandResult {
		return {
			success: false,
			output,
			nextSteps,
			errors,
			...options,
		};
	}
}
