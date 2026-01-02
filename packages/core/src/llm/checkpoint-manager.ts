/**
 * Checkpoint Manager for LLM Operations
 * Saves partial results during long operations and supports resume on failure
 */

import {
	existsSync,
	mkdirSync,
	readdirSync,
	readFileSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";

/**
 * Checkpoint data
 */
export interface Checkpoint<T = unknown> {
	id: string;
	operation: string;
	phase: string;
	data: T;
	createdAt: Date;
	metadata?: Record<string, unknown>;
}

/**
 * Checkpoint Manager configuration
 */
export interface CheckpointConfig {
	checkpointDir?: string; // Directory to store checkpoints (default: .taskflow/checkpoints)
	enabled?: boolean; // Enable/disable checkpointing (default: true)
	maxCheckpoints?: number; // Max checkpoints to keep per operation (default: 10)
}

/**
 * Checkpoint Manager
 * Manages checkpoints for long-running LLM operations
 */
export class CheckpointManager {
	private config: Required<CheckpointConfig>;

	constructor(config?: CheckpointConfig) {
		this.config = {
			checkpointDir: config?.checkpointDir ?? ".taskflow/checkpoints",
			enabled: config?.enabled ?? true,
			maxCheckpoints: config?.maxCheckpoints ?? 10,
		};

		// Don't create directory in constructor - create it lazily when needed
	}

	/**
	 * Ensure checkpoint directory exists
	 */
	private ensureCheckpointDir(): void {
		if (this.config.enabled && !existsSync(this.config.checkpointDir)) {
			mkdirSync(this.config.checkpointDir, { recursive: true });
		}
	}

	/**
	 * Generate checkpoint ID
	 */
	private generateCheckpointId(operation: string, phase: string): string {
		const timestamp = Date.now();
		const random = Math.random().toString(36).substring(2, 8);
		return `${operation}-${phase}-${timestamp}-${random}`;
	}

	/**
	 * Get checkpoint file path
	 */
	private getCheckpointPath(checkpointId: string): string {
		return join(this.config.checkpointDir, `${checkpointId}.json`);
	}

	/**
	 * Save checkpoint
	 */
	save<T>(
		operation: string,
		phase: string,
		data: T,
		metadata?: Record<string, unknown>,
	): string | null {
		if (!this.config.enabled) {
			return null;
		}

		// Ensure checkpoint directory exists before saving
		this.ensureCheckpointDir();

		const checkpointId = this.generateCheckpointId(operation, phase);

		const checkpoint: Checkpoint<T> = {
			id: checkpointId,
			operation,
			phase,
			data,
			createdAt: new Date(),
		};

		if (metadata !== undefined) {
			checkpoint.metadata = metadata;
		}

		try {
			const filePath = this.getCheckpointPath(checkpointId);
			writeFileSync(filePath, JSON.stringify(checkpoint, null, 2), "utf-8");

			// Clean up old checkpoints for this operation
			this.cleanupOldCheckpoints(operation);

			return checkpointId;
		} catch (error) {
			console.error("Failed to save checkpoint:", error);
			return null;
		}
	}

	/**
	 * Load checkpoint
	 */
	load<T = unknown>(checkpointId: string): Checkpoint<T> | null {
		if (!this.config.enabled) {
			return null;
		}

		try {
			const filePath = this.getCheckpointPath(checkpointId);

			if (!existsSync(filePath)) {
				return null;
			}

			const content = readFileSync(filePath, "utf-8");
			const checkpoint = JSON.parse(content) as Checkpoint<T>;

			// Convert date strings back to Date objects
			checkpoint.createdAt = new Date(checkpoint.createdAt);

			return checkpoint;
		} catch (error) {
			console.error("Failed to load checkpoint:", error);
			return null;
		}
	}

	/**
	 * List checkpoints for an operation
	 */
	list(operation: string): Checkpoint[] {
		if (!this.config.enabled) {
			return [];
		}

		// Return empty array if directory doesn't exist
		if (!existsSync(this.config.checkpointDir)) {
			return [];
		}

		try {
			const files = readdirSync(this.config.checkpointDir);

			const checkpoints: Checkpoint[] = [];

			for (const file of files) {
				if (file.startsWith(`${operation}-`) && file.endsWith(".json")) {
					const filePath = join(this.config.checkpointDir, file);
					const content = readFileSync(filePath, "utf-8");
					const checkpoint = JSON.parse(content) as Checkpoint;
					checkpoint.createdAt = new Date(checkpoint.createdAt);
					checkpoints.push(checkpoint);
				}
			}

			// Sort by creation time (most recent first)
			checkpoints.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

			return checkpoints;
		} catch (error) {
			console.error("Failed to list checkpoints:", error);
			return [];
		}
	}

	/**
	 * Get latest checkpoint for an operation
	 */
	getLatest<T = unknown>(
		operation: string,
		phase?: string,
	): Checkpoint<T> | null {
		const checkpoints = this.list(operation);

		if (checkpoints.length === 0) {
			return null;
		}

		// Filter by phase if specified
		if (phase) {
			const filtered = checkpoints.filter((cp) => cp.phase === phase);
			return (filtered[0] as Checkpoint<T>) ?? null;
		}

		return checkpoints[0] as Checkpoint<T>;
	}

	/**
	 * Delete checkpoint
	 */
	delete(checkpointId: string): boolean {
		if (!this.config.enabled) {
			return false;
		}

		try {
			const filePath = this.getCheckpointPath(checkpointId);

			if (existsSync(filePath)) {
				unlinkSync(filePath);
				return true;
			}

			return false;
		} catch (error) {
			console.error("Failed to delete checkpoint:", error);
			return false;
		}
	}

	/**
	 * Clear all checkpoints for an operation
	 */
	clear(operation: string): number {
		if (!this.config.enabled) {
			return 0;
		}

		const checkpoints = this.list(operation);
		let deleted = 0;

		for (const checkpoint of checkpoints) {
			if (this.delete(checkpoint.id)) {
				deleted++;
			}
		}

		return deleted;
	}

	/**
	 * Clear all checkpoints
	 */
	clearAll(): number {
		if (!this.config.enabled) {
			return 0;
		}

		// Return 0 if directory doesn't exist
		if (!existsSync(this.config.checkpointDir)) {
			return 0;
		}

		try {
			const files = readdirSync(this.config.checkpointDir);
			let deleted = 0;

			for (const file of files) {
				if (file.endsWith(".json")) {
					const filePath = join(this.config.checkpointDir, file);
					unlinkSync(filePath);
					deleted++;
				}
			}

			return deleted;
		} catch (error) {
			console.error("Failed to clear all checkpoints:", error);
			return 0;
		}
	}

	/**
	 * Clean up old checkpoints for an operation (keep only maxCheckpoints)
	 */
	private cleanupOldCheckpoints(operation: string): void {
		const checkpoints = this.list(operation);

		if (checkpoints.length > this.config.maxCheckpoints) {
			// Delete oldest checkpoints
			const toDelete = checkpoints.slice(this.config.maxCheckpoints);

			for (const checkpoint of toDelete) {
				this.delete(checkpoint.id);
			}
		}
	}

	/**
	 * Check if checkpoint exists
	 */
	exists(checkpointId: string): boolean {
		if (!this.config.enabled) {
			return false;
		}

		const filePath = this.getCheckpointPath(checkpointId);
		return existsSync(filePath);
	}

	/**
	 * Resume from checkpoint with continuation function
	 */
	async resume<T, R>(
		checkpointId: string,
		continueFn: (checkpoint: Checkpoint<T>) => Promise<R>,
	): Promise<R | null> {
		const checkpoint = this.load<T>(checkpointId);

		if (!checkpoint) {
			return null;
		}

		try {
			const result = await continueFn(checkpoint);

			// Delete checkpoint on success
			this.delete(checkpointId);

			return result;
		} catch (error) {
			// Keep checkpoint on failure
			console.error("Failed to resume from checkpoint:", error);
			throw error;
		}
	}

	/**
	 * Execute operation with checkpointing
	 */
	async execute<T>(
		operation: string,
		phases: Array<{
			name: string;
			fn: (previousData?: T) => Promise<T>;
		}>,
	): Promise<T> {
		let result: T | undefined;

		for (const [index, phase] of phases.entries()) {
			// Check for existing checkpoint
			const existingCheckpoint = this.getLatest<T>(operation, phase.name);

			if (existingCheckpoint) {
				console.log(`Resuming from checkpoint: ${operation} - ${phase.name}`);
				result = existingCheckpoint.data;
				continue;
			}

			try {
				// Execute phase
				result = await phase.fn(result);

				// Save checkpoint after each phase
				const checkpointId = this.save(operation, phase.name, result, {
					phaseIndex: index,
					totalPhases: phases.length,
				});

				if (checkpointId) {
					console.log(`Checkpoint saved: ${checkpointId}`);
				}
			} catch (error) {
				console.error(`Phase ${phase.name} failed:`, error);
				throw error;
			}
		}

		// Clear all checkpoints on successful completion
		this.clear(operation);

		// Type assertion is safe because we know result is defined after all phases
		return result as T;
	}

	/**
	 * Get checkpoint statistics
	 */
	getStats(): {
		totalCheckpoints: number;
		operations: Map<string, number>;
		oldestCheckpoint?: Date;
		newestCheckpoint?: Date;
	} {
		if (!this.config.enabled) {
			return {
				totalCheckpoints: 0,
				operations: new Map(),
			};
		}

		// Return empty stats if directory doesn't exist
		if (!existsSync(this.config.checkpointDir)) {
			return {
				totalCheckpoints: 0,
				operations: new Map(),
			};
		}

		try {
			const files = readdirSync(this.config.checkpointDir);

			const operations = new Map<string, number>();
			let oldestDate: Date | undefined;
			let newestDate: Date | undefined;

			for (const file of files) {
				if (file.endsWith(".json")) {
					const filePath = join(this.config.checkpointDir, file);
					const content = readFileSync(filePath, "utf-8");
					const checkpoint = JSON.parse(content) as Checkpoint;

					const count = operations.get(checkpoint.operation) ?? 0;
					operations.set(checkpoint.operation, count + 1);

					const checkpointDate = new Date(checkpoint.createdAt);

					if (!oldestDate || checkpointDate < oldestDate) {
						oldestDate = checkpointDate;
					}

					if (!newestDate || checkpointDate > newestDate) {
						newestDate = checkpointDate;
					}
				}
			}

			const result: {
				totalCheckpoints: number;
				operations: Map<string, number>;
				oldestCheckpoint?: Date;
				newestCheckpoint?: Date;
			} = {
				totalCheckpoints: files.filter((f: string) => f.endsWith(".json"))
					.length,
				operations,
			};

			if (oldestDate !== undefined) {
				result.oldestCheckpoint = oldestDate;
			}

			if (newestDate !== undefined) {
				result.newestCheckpoint = newestDate;
			}

			return result;
		} catch (error) {
			console.error("Failed to get checkpoint stats:", error);
			return {
				totalCheckpoints: 0,
				operations: new Map(),
			};
		}
	}

	/**
	 * Enable checkpointing
	 */
	enable(): void {
		this.config.enabled = true;
		// Ensure checkpoint directory exists when enabling
		this.ensureCheckpointDir();
	}

	/**
	 * Disable checkpointing
	 */
	disable(): void {
		this.config.enabled = false;
	}

	/**
	 * Check if checkpointing is enabled
	 */
	isEnabled(): boolean {
		return this.config.enabled;
	}

	/**
	 * Get configuration
	 */
	getConfig(): Readonly<Required<CheckpointConfig>> {
		return { ...this.config };
	}
}
