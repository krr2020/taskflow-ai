/**
 * Loading Spinner Component
 *
 * Provides consistent loading indicators across CLI
 */

import ora, { type Ora } from "ora";
import { Colors } from "./components.js";

export interface SpinnerOptions {
	/**
	 * Text to display next to spinner
	 */
	text: string;

	/**
	 * Spinner style
	 */
	spinner?: "dots" | "line" | "arrow" | "bouncingBar" | "bouncingBall";

	/**
	 * Color for the spinner
	 */
	color?: "cyan" | "green" | "yellow" | "red" | "blue" | "magenta";

	/**
	 * Prefix text (shown before spinner)
	 */
	prefixText?: string;
}

/**
 * Loading Spinner
 *
 * Wraps ora with consistent styling and behavior
 */
export class LoadingSpinner {
	private spinner: Ora | null = null;
	private startTime: number = 0;

	/**
	 * Start the spinner
	 */
	start(options: SpinnerOptions): void {
		this.startTime = Date.now();

		const oraOptions: Parameters<typeof ora>[0] = {
			text: options.text,
			spinner: options.spinner || "dots",
			color: options.color || "cyan",
			...(options.prefixText && { prefixText: options.prefixText }),
		};

		this.spinner = ora(oraOptions).start();
	}

	/**
	 * Update spinner text
	 */
	update(text: string): void {
		if (this.spinner) {
			this.spinner.text = text;
		}
	}

	/**
	 * Stop spinner with success
	 */
	succeed(text?: string): void {
		if (this.spinner) {
			const duration = this.formatDuration();
			this.spinner.succeed(
				text ? `${text} ${Colors.dim(`(${duration})`)}` : undefined,
			);
			this.spinner = null;
		}
	}

	/**
	 * Stop spinner with failure
	 */
	fail(text?: string): void {
		if (this.spinner) {
			this.spinner.fail(text);
			this.spinner = null;
		}
	}

	/**
	 * Stop spinner with warning
	 */
	warn(text?: string): void {
		if (this.spinner) {
			this.spinner.warn(text);
			this.spinner = null;
		}
	}

	/**
	 * Stop spinner with info
	 */
	info(text?: string): void {
		if (this.spinner) {
			this.spinner.info(text);
			this.spinner = null;
		}
	}

	/**
	 * Stop spinner without status
	 */
	stop(): void {
		if (this.spinner) {
			this.spinner.stop();
			this.spinner = null;
		}
	}

	/**
	 * Check if spinner is currently running
	 */
	isSpinning(): boolean {
		return this.spinner !== null;
	}

	/**
	 * Format duration since start
	 */
	private formatDuration(): string {
		const duration = Date.now() - this.startTime;
		if (duration < 1000) {
			return `${duration}ms`;
		}
		return `${(duration / 1000).toFixed(1)}s`;
	}
}

/**
 * Create a new loading spinner
 */
export function createSpinner(
	text: string,
	options?: Partial<SpinnerOptions>,
): LoadingSpinner {
	const spinner = new LoadingSpinner();
	spinner.start({
		text,
		...options,
	});
	return spinner;
}

/**
 * Quick helper for async operations with spinner
 */
export async function withSpinner<T>(
	text: string,
	operation: () => Promise<T>,
	options?: Partial<SpinnerOptions>,
): Promise<T> {
	const spinner = createSpinner(text, options);

	try {
		const result = await operation();
		spinner.succeed();
		return result;
	} catch (error) {
		spinner.fail();
		throw error;
	}
}
