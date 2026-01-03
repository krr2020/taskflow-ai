/**
 * Progress Display
 *
 * Enhanced progress indicators with better UX.
 */

import ora, { type Ora } from "ora";
import pc from "picocolors";

export interface ProgressOptions {
	spinner?: "dots" | "line" | "arrow" | "bouncingBar" | "bouncingBall";
	color?: "cyan" | "green" | "yellow" | "red" | "blue" | "magenta";
	prefixText?: string;
	showETA?: boolean;
	total?: number;
}

export class ProgressDisplay {
	private spinner: Ora | null = null;
	private startTime: number = 0;
	private current: number = 0;
	private total: number = 0;
	private showETA: boolean = false;

	/**
	 * Start a progress indicator
	 *
	 * @example
	 * const progress = new ProgressDisplay();
	 * progress.start('Loading data...', { showETA: true, total: 100 });
	 */
	start(message: string, options?: ProgressOptions): void {
		this.startTime = Date.now();
		this.current = 0;
		this.total = options?.total || 0;
		this.showETA = options?.showETA || false;

		const oraOptions: {
			text: string;
			spinner?: "dots" | "line" | "arrow" | "bouncingBar" | "bouncingBall";
			color?: "cyan" | "green" | "yellow" | "red" | "blue" | "magenta";
			prefixText?: string;
		} = {
			text: this.formatMessage(message),
		};

		if (options?.spinner) {
			oraOptions.spinner = options.spinner;
		}
		if (options?.color) {
			oraOptions.color = options.color;
		}
		if (options?.prefixText) {
			oraOptions.prefixText = options.prefixText;
		}

		this.spinner = ora(oraOptions).start();
	}

	/**
	 * Update the progress message
	 *
	 * @example
	 * progress.update('Still working...');
	 */
	update(message: string): void {
		if (this.spinner) {
			this.spinner.text = this.formatMessage(message);
		}
	}

	/**
	 * Update progress count (for operations with known total)
	 */
	updateProgress(current: number, message?: string): void {
		this.current = current;

		if (this.spinner) {
			const text = message || this.spinner.text;
			this.spinner.text = this.formatMessage(text);
		}
	}

	/**
	 * Increment progress by one
	 */
	increment(message?: string): void {
		this.updateProgress(this.current + 1, message);
	}

	/**
	 * Format message with progress and ETA
	 */
	private formatMessage(message: string): string {
		let formatted = message;

		// Add progress indicator
		if (this.total > 0) {
			const percentage = Math.round((this.current / this.total) * 100);
			formatted = `[${this.current}/${this.total} - ${percentage}%] ${message}`;
		}

		// Add ETA
		if (this.showETA && this.total > 0 && this.current > 0) {
			const eta = this.calculateETA();
			if (eta) {
				formatted = `${formatted} ${pc.dim(`(ETA: ${eta})`)}`;
			}
		}

		return formatted;
	}

	/**
	 * Calculate estimated time to completion
	 */
	private calculateETA(): string | null {
		if (this.current === 0 || this.total === 0) {
			return null;
		}

		const elapsed = Date.now() - this.startTime;
		const rate = elapsed / this.current;
		const remaining = (this.total - this.current) * rate;

		return this.formatDurationShort(remaining);
	}

	/**
	 * Format duration in short format for ETA
	 */
	private formatDurationShort(ms: number): string {
		const seconds = Math.floor(ms / 1000);

		if (seconds < 60) {
			return `${seconds}s`;
		}

		const minutes = Math.floor(seconds / 60);
		const remainingSeconds = seconds % 60;

		if (minutes < 60) {
			return `${minutes}m ${remainingSeconds}s`;
		}

		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;

		return `${hours}h ${remainingMinutes}m`;
	}

	/**
	 * Mark as successful and stop
	 *
	 * @example
	 * progress.succeed('Data loaded successfully!');
	 */
	succeed(message?: string): void {
		if (this.spinner) {
			const duration = this.getDuration();
			const finalMessage = message
				? `${message} ${pc.dim(`(${duration})`)}`
				: `${this.spinner.text} ${pc.dim(`(${duration})`)}`;

			this.spinner.succeed(finalMessage);
			this.spinner = null;
		}
	}

	/**
	 * Mark as failed and stop
	 *
	 * @example
	 * progress.fail('Failed to load data');
	 */
	fail(message?: string): void {
		if (this.spinner) {
			const duration = this.getDuration();
			const finalMessage = message
				? `${message} ${pc.dim(`(${duration})`)}`
				: `${this.spinner.text} ${pc.dim(`(${duration})`)}`;

			this.spinner.fail(finalMessage);
			this.spinner = null;
		}
	}

	/**
	 * Show a warning and stop
	 *
	 * @example
	 * progress.warn('Something looks suspicious');
	 */
	warn(message?: string): void {
		if (this.spinner) {
			const duration = this.getDuration();
			const finalMessage = message
				? `${message} ${pc.dim(`(${duration})`)}`
				: `${this.spinner.text} ${pc.dim(`(${duration})`)}`;

			this.spinner.warn(finalMessage);
			this.spinner = null;
		}
	}

	/**
	 * Show info and stop
	 *
	 * @example
	 * progress.info('FYI: This might take a while');
	 */
	info(message?: string): void {
		if (this.spinner) {
			const duration = this.getDuration();
			const finalMessage = message
				? `${message} ${pc.dim(`(${duration})`)}`
				: `${this.spinner.text} ${pc.dim(`(${duration})`)}`;

			this.spinner.info(finalMessage);
			this.spinner = null;
		}
	}

	/**
	 * Stop the spinner without any symbol
	 *
	 * @example
	 * progress.stop();
	 */
	stop(): void {
		if (this.spinner) {
			this.spinner.stop();
			this.spinner = null;
		}
	}

	/**
	 * Check if progress is currently running
	 */
	isRunning(): boolean {
		return this.spinner?.isSpinning ?? false;
	}

	/**
	 * Get duration since start
	 */
	private getDuration(): string {
		if (!this.startTime) return "";

		const duration = Date.now() - this.startTime;

		if (duration < 1000) {
			return `${duration}ms`;
		} else if (duration < 60000) {
			return `${(duration / 1000).toFixed(1)}s`;
		} else {
			const minutes = Math.floor(duration / 60000);
			const seconds = Math.floor((duration % 60000) / 1000);
			return `${minutes}m ${seconds}s`;
		}
	}

	/**
	 * Static helper: Show a simple spinner for a promise
	 *
	 * @example
	 * const result = await ProgressDisplay.withSpinner(
	 *   'Loading...',
	 *   async () => await fetchData()
	 * );
	 */
	static async withSpinner<T>(
		message: string,
		task: () => Promise<T>,
		options?: ProgressOptions,
	): Promise<T> {
		const progress = new ProgressDisplay();
		progress.start(message, options);

		try {
			const result = await task();
			progress.succeed();
			return result;
		} catch (error) {
			progress.fail();
			throw error;
		}
	}

	/**
	 * Static helper: Show multiple progress steps
	 *
	 * @example
	 * await ProgressDisplay.steps([
	 *   { message: 'Step 1', task: async () => await doStep1() },
	 *   { message: 'Step 2', task: async () => await doStep2() }
	 * ]);
	 */
	static async steps(
		steps: Array<{ message: string; task: () => Promise<void> }>,
		options?: ProgressOptions,
	): Promise<void> {
		const progress = new ProgressDisplay();

		for (let i = 0; i < steps.length; i++) {
			const step = steps[i];
			if (!step) continue;

			const stepMessage = `[${i + 1}/${steps.length}] ${step.message}`;

			progress.start(stepMessage, options);

			try {
				await step.task();
				progress.succeed();
			} catch (error) {
				progress.fail();
				throw error;
			}
		}
	}
}
