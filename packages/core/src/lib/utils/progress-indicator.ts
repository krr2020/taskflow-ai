import ora, { type Ora } from "ora";

export interface ProgressOptions {
	showETA?: boolean;
	total?: number;
}

/**
 * Progress indicator wrapper for CLI spinners
 * Enhanced with ETA calculation and progress tracking
 */
export class ProgressIndicator {
	private spinner: Ora | null = null;
	private startTime: number = 0;
	private current: number = 0;
	private total: number = 0;
	private showETA: boolean = false;

	/**
	 * Start the spinner with a message
	 */
	start(message: string, options?: ProgressOptions): void {
		this.startTime = Date.now();
		this.current = 0;
		this.total = options?.total || 0;
		this.showETA = options?.showETA || false;

		if (this.spinner) {
			this.spinner.text = this.formatMessage(message);
		} else {
			this.spinner = ora(this.formatMessage(message)).start();
		}
	}

	/**
	 * Update the spinner text
	 */
	update(message: string): void {
		if (this.spinner) {
			this.spinner.text = this.formatMessage(message);
		}
	}

	/**
	 * Update progress (for operations with known total)
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
				formatted = `${formatted} (ETA: ${eta})`;
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

		return this.formatDuration(remaining);
	}

	/**
	 * Format duration in human-readable format
	 */
	private formatDuration(ms: number): string {
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
	 * Stop the spinner with a success message
	 */
	succeed(message: string): void {
		if (this.spinner) {
			this.spinner.succeed(message);
			this.spinner = null;
		}
	}

	/**
	 * Stop the spinner with a failure message
	 */
	fail(message: string): void {
		if (this.spinner) {
			this.spinner.fail(message);
			this.spinner = null;
		}
	}

	/**
	 * Stop the spinner with a warning message
	 */
	warn(message: string): void {
		if (this.spinner) {
			this.spinner.warn(message);
			this.spinner = null;
		}
	}

	/**
	 * Stop the spinner with info message
	 */
	info(message: string): void {
		if (this.spinner) {
			this.spinner.info(message);
			this.spinner = null;
		}
	}

	/**
	 * Stop the spinner without status
	 */
	stop(): void {
		if (this.spinner) {
			this.spinner.stop();
			this.spinner = null;
		}
	}
}
