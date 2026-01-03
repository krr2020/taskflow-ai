import { TaskflowServer } from "../lib/utils/server.js";
import { UiManager } from "../lib/utils/ui-manager.js";
import { BaseCommand, type CommandResult } from "./base.js";

export class UiCommand extends BaseCommand {
	async execute(options: {
		stop?: boolean;
		port?: string;
		status?: boolean;
	}): Promise<CommandResult> {
		const manager = new UiManager(this.context.projectRoot);

		if (options.stop) {
			manager.stop();
			return {
				success: true,
				output: "UI Server stopped.",
				nextSteps: "Run 'taskflow ui' to start it again.",
			};
		}

		if (options.status) {
			const status = manager.getStatus();
			if (status.running) {
				return {
					success: true,
					output: `UI Server is running on port ${status.port} (PID: ${status.pid})`,
					nextSteps: `Open http://localhost:${status.port} in your browser.`,
				};
			}
			return {
				success: true,
				output: "UI Server is not running.",
				nextSteps: "Run 'taskflow ui' to start the server.",
			};
		}

		// Start server
		try {
			const port = await manager.start(
				options.port ? Number.parseInt(options.port, 10) : 4500,
			);
			const server = new TaskflowServer(this.context.projectRoot);

			// Handle graceful shutdown
			process.on("SIGINT", () => {
				manager.stop();
				process.exit(0);
			});
			process.on("SIGTERM", () => {
				manager.stop();
				process.exit(0);
			});

			server.start(port);

			// Keep process alive (return a promise that never resolves, or just let the server run)
			return new Promise(() => {
				// Never resolve, just wait for signals
			});
		} catch (error) {
			return {
				success: false,
				output: String(error),
				errors: [String(error)],
				nextSteps: "Check logs for details.",
			};
		}
	}
}
