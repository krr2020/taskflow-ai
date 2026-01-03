/**
 * Navigation State Manager
 *
 * Provides a stack-based navigation system for interactive CLI sessions.
 * Allows users to go back to previous steps and maintain state.
 */

export interface NavigationStep<T = unknown> {
	/** Unique identifier for this step */
	id: string;
	/** Display name for this step */
	name: string;
	/** State data for this step */
	data: T;
	/** Timestamp when this step was entered */
	timestamp: number;
}

export class NavigationManager<T = unknown> {
	private stack: NavigationStep<T>[] = [];
	private currentStepId: string | null = null;

	/**
	 * Push a new step onto the navigation stack
	 */
	push(id: string, name: string, data: T): void {
		const step: NavigationStep<T> = {
			id,
			name,
			data,
			timestamp: Date.now(),
		};
		this.stack.push(step);
		this.currentStepId = id;
	}

	/**
	 * Go back to the previous step
	 * @returns The previous step, or null if at the beginning
	 */
	back(): NavigationStep<T> | null {
		if (this.stack.length <= 1) {
			return null; // Can't go back from first step
		}

		// Pop current step
		this.stack.pop();

		// Return new current step
		const current = this.stack[this.stack.length - 1];
		if (current) {
			this.currentStepId = current.id;
			return current;
		}

		return null;
	}

	/**
	 * Get the current step
	 */
	current(): NavigationStep<T> | null {
		if (this.stack.length === 0) {
			return null;
		}
		return this.stack[this.stack.length - 1] || null;
	}

	/**
	 * Get the previous step without popping
	 */
	previous(): NavigationStep<T> | null {
		if (this.stack.length < 2) {
			return null;
		}
		return this.stack[this.stack.length - 2] || null;
	}

	/**
	 * Check if we can go back
	 */
	canGoBack(): boolean {
		return this.stack.length > 1;
	}

	/**
	 * Clear the navigation stack
	 */
	clear(): void {
		this.stack = [];
		this.currentStepId = null;
	}

	/**
	 * Get the current step ID
	 */
	getCurrentStepId(): string | null {
		return this.currentStepId;
	}

	/**
	 * Get the full navigation path (for debugging)
	 */
	getPath(): string[] {
		return this.stack.map((step) => step.name);
	}

	/**
	 * Get the size of the navigation stack
	 */
	size(): number {
		return this.stack.length;
	}

	/**
	 * Update the data of the current step
	 */
	updateCurrent(data: Partial<T>): void {
		const current = this.current();
		if (current) {
			current.data =
				typeof current.data === "object" && current.data !== null
					? { ...current.data, ...data }
					: (data as T);
		}
	}
}

/**
 * Navigation options for menu selections
 */
export interface NavigationOption {
	/** Option key/value */
	value: string;
	/** Display label */
	label: string;
	/** Is this the back option? */
	isBack?: boolean;
	/** Is this a quit option? */
	isQuit?: boolean;
}

/**
 * Menu result with navigation support
 */
export interface MenuResult {
	/** Selected value */
	value: string;
	/** Whether user chose to go back */
	back: boolean;
	/** Whether user chose to quit */
	quit: boolean;
	/** Whether user chose to skip */
	skip: boolean;
}

/**
 * Helper to create a menu result
 */
export function createMenuResult(
	value: string,
	back = false,
	quit = false,
	skip = false,
): MenuResult {
	return { value, back, quit, skip };
}
