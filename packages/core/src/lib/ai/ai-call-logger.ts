import fs from "node:fs";
import path from "node:path";

export interface AICallLog {
	timestamp: string;
	command: string;
	provider: string;
	model: string;
	prompt: {
		system: string;
		user: string;
	};
	response: {
		content: string;
		usage?: {
			promptTokens: number;
			completionTokens: number;
			totalTokens: number;
		};
	};
	duration: number; // milliseconds
	error?: string;
}

export class AICallLogger {
	private logDir: string;
	private isEnabled: boolean;

	constructor(projectRoot: string, enabled = false) {
		this.logDir = path.join(projectRoot, ".taskflow", "logs", "ai-calls");
		this.isEnabled = enabled;

		if (this.isEnabled) {
			this.ensureLogDir();
		}
	}

	private ensureLogDir(): void {
		if (!fs.existsSync(this.logDir)) {
			fs.mkdirSync(this.logDir, { recursive: true });
		}
	}

	async logCall(log: AICallLog): Promise<void> {
		if (!this.isEnabled) return;

		const date = new Date().toISOString().split("T")[0];
		const logFile = path.join(this.logDir, `${date}.jsonl`);

		const logLine = `${JSON.stringify(log)}\n`;

		fs.appendFileSync(logFile, logLine, "utf-8");
	}

	async logError(command: string, error: Error): Promise<void> {
		if (!this.isEnabled) return;

		const log: AICallLog = {
			timestamp: new Date().toISOString(),
			command,
			provider: "unknown",
			model: "unknown",
			prompt: { system: "", user: "" },
			response: { content: "" },
			duration: 0,
			error: error.message,
		};

		await this.logCall(log);
	}

	enable(): void {
		this.isEnabled = true;
		this.ensureLogDir();
	}

	disable(): void {
		this.isEnabled = false;
	}
}
