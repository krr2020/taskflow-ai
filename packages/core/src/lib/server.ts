import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { getProjectPaths } from "./config-paths.js";
import { loadTasksProgress } from "./data-access.js";
import { consoleOutput } from "./output.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

export class TaskflowServer {
	private app: Hono;
	private projectRoot: string;

	constructor(projectRoot: string) {
		this.projectRoot = projectRoot;
		this.app = new Hono();

		this.setupMiddleware();
		this.setupRoutes();
	}

	private setupMiddleware() {
		this.app.use("/*", cors());
	}

	private setupRoutes() {
		const { tasksDir } = getProjectPaths(this.projectRoot);

		// API Routes
		this.app.get("/api/project", (c) => {
			try {
				const progress = loadTasksProgress(tasksDir);
				return c.json(progress);
			} catch (e) {
				return c.json({ error: String(e) }, 500);
			}
		});

		this.app.get("/api/features/:id", (c) => {
			const id = c.req.param("id");
			try {
				const progress = loadTasksProgress(tasksDir);
				const feature = progress.features.find((f) => f.id === id);
				if (!feature) return c.json({ error: "Feature not found" }, 404);
				return c.json(feature);
			} catch (e) {
				return c.json({ error: String(e) }, 500);
			}
		});

		// Serve Static UI
		// In dev (monorepo): packages/ui/dist (relative to packages/core/src/lib)
		// We need to go up: src/lib -> src -> core -> packages -> taskflow -> packages -> ui -> dist
		// Actually: packages/core/src/lib/server.ts
		// Root is packages/core
		// UI is packages/ui
		// ../../../ui/dist
		let uiPath = path.resolve(__dirname, "../../../../ui/dist");

		// In production (dist/lib/server.js):
		// dist/lib -> dist -> core -> ...
		// Usually we copy ui to dist/ui
		if (!fs.existsSync(uiPath)) {
			uiPath = path.resolve(__dirname, "../ui");
		}

		if (fs.existsSync(uiPath)) {
			consoleOutput(`Serving UI from: ${uiPath}`, { type: "info" });
			const relativePath = path.relative(process.cwd(), uiPath);

			// Serve static files
			this.app.use("/*", serveStatic({ root: relativePath }));

			// SPA Fallback
			this.app.get(
				"*",
				serveStatic({ path: path.join(relativePath, "index.html") }),
			);
		} else {
			this.app.get("/", (c) =>
				c.text("UI build not found. Please build packages/ui."),
			);
		}
	}

	start(port: number) {
		consoleOutput(`Starting Taskflow UI on http://localhost:${port}`, {
			type: "info",
		});
		serve({
			fetch: this.app.fetch,
			port,
		});
	}
}
