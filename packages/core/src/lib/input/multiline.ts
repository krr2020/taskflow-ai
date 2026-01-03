/**
 * Multi-line Input Support
 *
 * Provides proper multi-line text input for CLI using editor integration.
 */

import * as readline from "node:readline";
import { Colors, Separator, Text } from "@/lib/ui/components";

export interface MultilineInputOptions {
	message: string;
	defaultValue?: string;
	validate?: (value: string) => boolean | string;
}

export const MultilineInput = {
	/**
	 * Prompt for multi-line input using system editor
	 *
	 * Opens the user's default editor for comfortable multi-line editing.
	 * Best for longer text like feature summaries, refinement instructions, etc.
	 *
	 * @example
	 * const summary = await MultilineInput.prompt({
	 *   message: 'Provide a detailed feature summary:',
	 *   defaultValue: 'Initial text...'
	 * });
	 */
	async prompt(options: MultilineInputOptions): Promise<string> {
		// Always use terminal input instead of editor to avoid vim issues
		// This provides a more consistent and user-friendly experience
		return await MultilineInput.promptInTerminal(options);
	},

	/**
	 * Prompt for multi-line input directly in terminal
	 *
	 * Fallback option when editor is not available.
	 * User types multiple lines and presses Enter twice on empty lines to finish.
	 *
	 * Enhanced with:
	 * - Line counter
	 * - Clear instructions
	 * - Visual feedback
	 *
	 * @example
	 * const text = await MultilineInput.promptInTerminal({
	 *   message: 'Enter your text (press Enter twice when done):'
	 * });
	 */
	async promptInTerminal(options: MultilineInputOptions): Promise<string> {
		console.log();
		console.log(Text.subsection(options.message));
		console.log(Separator.light(70));
		console.log(Text.muted("  Instructions:"));
		console.log(Text.bullet("Type your text (multiple lines supported)"));
		console.log(Text.bullet("Press Enter twice on empty lines to finish"));
		console.log(Text.bullet("Type 'EOF' on a line by itself to finish"));

		if (options.defaultValue) {
			console.log();
			console.log(Text.warning("  Default value:"));
			const defaultLines = options.defaultValue.split("\n");
			for (const line of defaultLines) {
				console.log(Text.muted(`    ${line}`));
			}
		}
		console.log(Separator.light(70));
		console.log();

		return new Promise((resolve, reject) => {
			const lines: string[] = [];
			let emptyLineCount = 0;
			let lineNumber = 1;

			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
				terminal: true,
			});

			// Show initial prompt with line number
			process.stdout.write(
				Colors.muted(`${lineNumber.toString().padStart(3, " ")} │ `),
			);

			rl.on("line", (line) => {
				// Track consecutive empty lines
				if (line.trim() === "") {
					emptyLineCount++;
					// Two consecutive empty lines means done
					if (emptyLineCount >= 2) {
						console.log(Text.success("\n✓ Input complete"));
						rl.close();
						return;
					}
				} else {
					emptyLineCount = 0;
				}

				// Check for EOF marker (legacy support)
				if (line.trim() === "EOF") {
					console.log(Text.success("✓ Input complete"));
					rl.close();
					return;
				}

				lines.push(line);
				lineNumber++;

				// Show next line prompt
				if (emptyLineCount < 2) {
					process.stdout.write(
						Colors.dim(`${lineNumber.toString().padStart(3, " ")} │ `),
					);
				}
			});

			rl.on("close", () => {
				// Remove trailing empty lines
				while (lines.length > 0 && lines[lines.length - 1]?.trim() === "") {
					lines.pop();
				}

				const text = lines.join("\n");

				// Validate if validator provided
				if (options.validate) {
					const validation = options.validate(text);
					if (validation !== true) {
						reject(
							new Error(
								typeof validation === "string"
									? validation
									: "Validation failed",
							),
						);
						return;
					}
				}

				// Show summary
				if (lines.length > 0) {
					console.log();
					console.log(
						Colors.dim(
							`  ${lines.length} line${lines.length !== 1 ? "s" : ""} entered`,
						),
					);
				}

				resolve(text);
			});

			rl.on("error", (error) => {
				reject(error);
			});
		});
	},

	/**
	 * Prompt for simple text input (single or multi-line)
	 *
	 * Simpler alternative that doesn't open an editor.
	 * Good for shorter inputs where editor would be overkill.
	 *
	 * @example
	 * const answer = await MultilineInput.promptSimple('Enter your name:');
	 */
	async promptSimple(message: string): Promise<string> {
		return new Promise((resolve) => {
			const rl = readline.createInterface({
				input: process.stdin,
				output: process.stdout,
			});

			rl.question(`${message} `, (answer) => {
				rl.close();
				resolve(answer);
			});
		});
	},
};
