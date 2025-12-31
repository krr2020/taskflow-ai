import path from "node:path";
import fs from "node:fs";
import { GitManager } from "./git.js";
import { ConfigLoader } from "./config.js";
import { Task, TaskSchema } from "./schemas/task.js";
import { TaskflowConfig } from "./schemas/config.js";

export type MachineState = "IDLE" | "PLANNING" | "EXECUTION" | "VERIFICATION" | "COMPLETED";

export class StateMachine {
    private currentState: MachineState = "IDLE";
    private activeTaskId: string | null = null;
    private config: TaskflowConfig | null = null;

    constructor(
        private configLoader: ConfigLoader,
        private gitManager: GitManager,
        private projectRoot: string = process.cwd()
    ) {
        try {
            this.config = this.configLoader.load();
        } catch (error) {
            // Allow initialization without config
            // Config will be required for specific operations
            this.config = null;
        }
    }

    private getConfig(): TaskflowConfig {
        if (!this.config) {
            try {
                this.config = this.configLoader.load();
            } catch (error) {
                throw new Error("Taskflow config not found. Please run 'init' to create a configuration file.");
            }
        }
        return this.config!;
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
    public async startTask(taskId: string, storyId: string, slug: string): Promise<void> {
        const config = this.getConfig();

        if (this.currentState !== "IDLE") {
            throw new Error(`Cannot start task from state ${this.currentState}. Finish current task first.`);
        }

        // 1. Enforce Branching
        if (config.branching.strategy === "per-story") {
            this.gitManager.ensureStoryBranch(storyId, slug, config.branching.base);
        }

        // 2. Load Task Data (Mocked here, normally reads from tasks.json or filesystem)
        // In a real impl, we would find the task file. 
        this.activeTaskId = taskId;
        this.currentState = "PLANNING";

        // TODO: Return initial context (Rules, Retro)
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
        // TODO: Verify checks passed? (Or rely on caller to ensure this)
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
