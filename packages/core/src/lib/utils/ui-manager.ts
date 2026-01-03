import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { getProjectPaths } from "@/lib/config/config-paths";
import { consoleOutput } from "@/lib/core/output";

interface UiLock {
	pid: number;
	port: number;
	startTime: number;
	projectName: string;
}

interface RegistryEntry {
	path: string;
	name: string;
	port: number;
	pid: number;
	lastSeen: number;
}

export class UiManager {
	private projectRoot: string;
	private taskflowDir: string;
	private lockFile: string;
	private registryFile: string;

	constructor(projectRoot: string) {
		this.projectRoot = projectRoot;
		const paths = getProjectPaths(projectRoot);
		this.taskflowDir = paths.taskflowDir;
		this.lockFile = path.join(this.taskflowDir, "ui.json");
		this.registryFile = path.join(os.homedir(), ".taskflow", "registry.json");
	}

	async start(port: number = 4500): Promise<number> {
		// Ensure taskflow dir exists
		if (!fs.existsSync(this.taskflowDir)) {
			fs.mkdirSync(this.taskflowDir, { recursive: true });
		}

		// 1. Check existing lock
		if (fs.existsSync(this.lockFile)) {
			try {
				const lock = JSON.parse(
					fs.readFileSync(this.lockFile, "utf-8"),
				) as UiLock;
				if (this.isProcessRunning(lock.pid)) {
					throw new Error(
						`Server already running at http://localhost:${lock.port} (PID: ${lock.pid})`,
					);
				} else {
					// Stale lock
					consoleOutput("Cleaning up stale UI lock file...", { type: "warn" });
					fs.unlinkSync(this.lockFile);
				}
			} catch (e) {
				// Invalid json or other error, cleanup
				if (
					e instanceof Error &&
					e.message.includes("Server already running")
				) {
					throw e;
				}
				if (fs.existsSync(this.lockFile)) {
					fs.unlinkSync(this.lockFile);
				}
			}
		}

		// 2. Find available port
		const finalPort = await this.findAvailablePort(port);

		// 3. Write lock
		const lock: UiLock = {
			pid: process.pid,
			port: finalPort,
			startTime: Date.now(),
			projectName: path.basename(this.projectRoot),
		};
		fs.writeFileSync(this.lockFile, JSON.stringify(lock, null, 2));

		// 4. Update Registry
		this.updateRegistry(lock);

		return finalPort;
	}

	stop(): void {
		if (fs.existsSync(this.lockFile)) {
			try {
				const lock = JSON.parse(
					fs.readFileSync(this.lockFile, "utf-8"),
				) as UiLock;
				if (lock.pid === process.pid) {
					// Stopping self
					fs.unlinkSync(this.lockFile);
					this.removeFromRegistry(this.projectRoot);
				} else {
					// Trying to stop another process?
					// If called from CLI 'stop' command, we kill the PID.
					if (this.isProcessRunning(lock.pid)) {
						try {
							process.kill(lock.pid);
							consoleOutput(`Stopped server at PID ${lock.pid}`, {
								type: "info",
							});
						} catch (e) {
							consoleOutput(`Failed to stop process ${lock.pid}: ${e}`, {
								type: "error",
							});
						}
					} else {
						consoleOutput("Cleaned up stale lock file.", { type: "info" });
					}
					fs.unlinkSync(this.lockFile);
					this.removeFromRegistry(this.projectRoot);
				}
			} catch (_e) {
				// ignore
			}
		} else {
			consoleOutput("No server running for this project.", { type: "info" });
		}
	}

	getStatus(): { running: boolean; port?: number; pid?: number } {
		if (fs.existsSync(this.lockFile)) {
			try {
				const lock = JSON.parse(
					fs.readFileSync(this.lockFile, "utf-8"),
				) as UiLock;
				if (this.isProcessRunning(lock.pid)) {
					return { running: true, port: lock.port, pid: lock.pid };
				}
			} catch {}
		}
		return { running: false };
	}

	private isProcessRunning(pid: number): boolean {
		try {
			process.kill(pid, 0);
			return true;
		} catch (_e) {
			return false;
		}
	}

	private async findAvailablePort(startPort: number): Promise<number> {
		let port = startPort;
		while (true) {
			if (await this.isPortAvailable(port)) {
				return port;
			}
			port++;
			if (port > 65535) {
				throw new Error("No available ports found");
			}
		}
	}

	private isPortAvailable(port: number): Promise<boolean> {
		return new Promise((resolve) => {
			const server = net.createServer();
			server.once("error", () => resolve(false));
			server.once("listening", () => {
				server.close();
				resolve(true);
			});
			server.listen(port);
		});
	}

	private updateRegistry(lock: UiLock): void {
		try {
			const dir = path.dirname(this.registryFile);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}

			let registry: RegistryEntry[] = [];
			if (fs.existsSync(this.registryFile)) {
				try {
					registry = JSON.parse(fs.readFileSync(this.registryFile, "utf-8"));
				} catch {}
			}

			// Filter out this project and stale entries
			registry = registry.filter(
				(e) => e.path !== this.projectRoot && this.isProcessRunning(e.pid),
			);

			registry.push({
				path: this.projectRoot,
				name: lock.projectName,
				port: lock.port,
				pid: lock.pid,
				lastSeen: Date.now(),
			});

			fs.writeFileSync(this.registryFile, JSON.stringify(registry, null, 2));
		} catch (_e) {
			// Ignore registry errors (non-critical)
		}
	}

	private removeFromRegistry(projectPath: string): void {
		try {
			if (!fs.existsSync(this.registryFile)) return;
			let registry: RegistryEntry[] = JSON.parse(
				fs.readFileSync(this.registryFile, "utf-8"),
			);
			registry = registry.filter((e) => e.path !== projectPath);
			fs.writeFileSync(this.registryFile, JSON.stringify(registry, null, 2));
		} catch {}
	}
}
