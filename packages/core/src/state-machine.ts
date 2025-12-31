/**
 * Workflow State Machine
 *
 * This class provides an in-memory state machine for managing task workflow.
 * It operates at a higher level of abstraction than task files - it manages
 * the developer's session state rather than persistent task state.
 *
 * NOTE: This is currently NOT used by the CLI commands. CLI commands
 * (StartCommand, CheckCommand, etc.) use task files directly via the
 * data-access module. This class can be used as an alternative
 * programmatic API or for future session management features.
 */
import type { ConfigLoader } from "./config.js";
import type { GitManager } from "./git.js";
import type { TaskflowConfig } from "./schemas/config.js";

export type MachineState =
	| "IDLE"
	| "PLANNING"
	| "EXECUTION"
	| "VERIFICATION"
	| "COMPLETED";

export class StateMachine {
	private currentState: MachineState = "IDLE";
	private activeTaskId: string | null = null;
	private config: TaskflowConfig | null = null;

	constructor(
		private configLoader: ConfigLoader,
		private gitManager: GitManager,
		_projectRoot: string = process.cwd(),
	) {
		try {
			this.config = this.configLoader.load();
		} catch (_error) {
			// Allow initialization without config
			// Config will be required for specific operations
			this.config = null;
		}
	}

	private getConfig(): TaskflowConfig {
		if (this.config) {
			return this.config;
		}

		try {
			this.config = this.configLoader.load();
			return this.config;
		} catch (_error) {
			throw new Error(
				"Taskflow config not found. Please run 'init' to create a configuration file.",
			);
		}
	}

	public getState(): MachineState {
		return this.currentState;
	}

	public getActiveTask(): string | null {
		return this.activeTaskId;
	}

	/**
	 * Transition: IDLE -> PLANNING
	 * Must provide a valid task ID.
	 * Checks out the correct Story branch.
	 */
	public async startTask(
		taskId: string,
		storyId: string,
		slug: string,
	): Promise<void> {
		const config = this.getConfig();

		if (this.currentState !== "IDLE") {
			throw new Error(
				`Cannot start task from state ${this.currentState}. Finish current task first.`,
			);
		}

		// 1. Enforce Branching
		if (config.branching.strategy === "per-story") {
			this.gitManager.ensureStoryBranch(storyId, slug, config.branching.base);
		}

		// 2. Load Task Data (Mocked here, normally reads from tasks.json or filesystem)
		// In a real impl, we would find the task file.
		this.activeTaskId = taskId;
		this.currentState = "PLANNING";

		// FUTURE: Return initial context (Rules, Retro) when this is actively used
	}

	/**
	 * Transition: PLANNING -> EXECUTION
	 * Requires a Plan to be saved/approved.
	 */
	public approvePlan(): void {
		if (this.currentState !== "PLANNING") {
			throw new Error("Cannot approve plan: Not in PLANNING state.");
		}
		this.currentState = "EXECUTION";
	}

	/**
	 * Transition: EXECUTION -> VERIFICATION
	 * explicit signal that coding is done.
	 */
	public startVerification(): void {
		if (this.currentState !== "EXECUTION") {
			throw new Error("Cannot start verification: Not in EXECUTION state.");
		}
		this.currentState = "VERIFICATION";
	}

	/**
	 * Transition: VERIFICATION -> COMPLETED
	 * verified success.
	 */
	public completeTask(): void {
		if (this.currentState !== "VERIFICATION") {
			throw new Error("Cannot complete task: Not in VERIFICATION state.");
		}
		// FUTURE: Verify checks passed? For now, rely on caller to ensure this
		this.currentState = "COMPLETED";
		this.activeTaskId = null;

		// Auto-transition back to IDLE? Or stay in COMPLETED until explicit 'next'?
		this.currentState = "IDLE";
	}

	/**
	 * Emergency Abort
	 */
	public abort(): void {
		this.activeTaskId = null;
		this.currentState = "IDLE";
	}
}
