import ora, { type Ora } from "ora";

/**
 * Progress indicator wrapper for CLI spinners
 */
export class ProgressIndicator {
	private spinner: Ora | null = null;

	/**
	 * Start the spinner with a message
	 */
	start(message: string): void {
		if (this.spinner) {
			this.spinner.text = message;
		} else {
			this.spinner = ora(message).start();
		}
	}

	/**
	 * Update the spinner text
	 */
	update(message: string): void {
		if (this.spinner) {
			this.spinner.text = message;
		}
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
	 * Stop the spinner without status
	 */
	stop(): void {
		if (this.spinner) {
			this.spinner.stop();
			this.spinner = null;
		}
	}
}
