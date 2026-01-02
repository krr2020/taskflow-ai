import fs from "node:fs";
import path from "node:path";

export interface SessionState<T = unknown> {
	id: string;
	command: string;
	timestamp: string;
	step: number;
	data: T;
	completed: boolean;
}

export class SessionManager {
	private sessionsDir: string;

	constructor(projectRoot: string) {
		this.sessionsDir = path.join(projectRoot, ".taskflow", "sessions");
		if (!fs.existsSync(this.sessionsDir)) {
			fs.mkdirSync(this.sessionsDir, { recursive: true });
		}
	}

	/**
	 * Save session state
	 */
	saveSession<T>(id: string, command: string, step: number, data: T): void {
		const state: SessionState<T> = {
			id,
			command,
			timestamp: new Date().toISOString(),
			step,
			data,
			completed: false,
		};
		fs.writeFileSync(
			path.join(this.sessionsDir, `${id}.json`),
			JSON.stringify(state, null, 2),
		);
	}

	/**
	 * Load session state
	 */
	loadSession<T>(id: string): SessionState<T> | null {
		const filePath = path.join(this.sessionsDir, `${id}.json`);
		if (!fs.existsSync(filePath)) {
			return null;
		}
		try {
			return JSON.parse(fs.readFileSync(filePath, "utf-8"));
		} catch {
			return null;
		}
	}

	/**
	 * List active sessions
	 */
	listSessions(command?: string): SessionState[] {
		if (!fs.existsSync(this.sessionsDir)) {
			return [];
		}

		return fs
			.readdirSync(this.sessionsDir)
			.filter((f) => f.endsWith(".json"))
			.map((f) => {
				try {
					return JSON.parse(
						fs.readFileSync(path.join(this.sessionsDir, f), "utf-8"),
					);
				} catch {
					return null;
				}
			})
			.filter((s): s is SessionState => s !== null && !s.completed)
			.filter((s) => !command || s.command === command)
			.sort(
				(a, b) =>
					new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
			);
	}

	/**
	 * Mark session as complete (delete file)
	 */
	completeSession(id: string): void {
		const filePath = path.join(this.sessionsDir, `${id}.json`);
		if (fs.existsSync(filePath)) {
			fs.unlinkSync(filePath);
		}
	}

	/**
	 * Clear all sessions
	 */
	clearAllSessions(): void {
		if (fs.existsSync(this.sessionsDir)) {
			fs.rmSync(this.sessionsDir, { recursive: true, force: true });
			fs.mkdirSync(this.sessionsDir, { recursive: true });
		}
	}
}
