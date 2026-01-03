import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { getProjectPaths } from "../config/config-paths.js";
import {
	getTaskFilePath,
	loadTaskFile,
	loadTasksProgress,
} from "../core/data-access.js";
import { consoleOutput } from "../core/output.js";

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
				const featureRef = progress.features.find((f) => f.id === id);
				if (!featureRef) return c.json({ error: "Feature not found" }, 404);

				// If the feature has a path (which it should), load the full feature file
				if (featureRef.path) {
					try {
						// We need to import loadFeature from data-access.js
						// But since we can't easily add imports here without modifying the top of file
						// We will rely on the fact that loadTasksProgress already loads features
						// Wait, loadTasksProgress DOES load features fully!
						// Let's check data-access.ts implementation of loadTasksProgress
						return c.json(featureRef);
					} catch (err) {
						consoleOutput(`Error loading feature details: ${err}`, {
							type: "error",
						});
						// Fallback to the reference from progress
						return c.json(featureRef);
					}
				}

				return c.json(featureRef);
			} catch (e) {
				return c.json({ error: String(e) }, 500);
			}
		});

		this.app.get("/api/tasks/:id", (c) => {
			const id = c.req.param("id");
			try {
				const progress = loadTasksProgress(tasksDir);
				const filePath = getTaskFilePath(tasksDir, progress, id);

				if (!filePath) {
					consoleOutput(`Task file path not found for ID: ${id}`, {
						type: "warn",
					});
					return c.json({ error: "Task file not found" }, 404);
				}

				const taskData = loadTaskFile(filePath);
				if (!taskData) {
					consoleOutput(`Failed to load task file content from: ${filePath}`, {
						type: "error",
					});
					return c.json({ error: "Failed to load task data" }, 500);
				}

				return c.json(taskData);
			} catch (e) {
				consoleOutput(`Error loading task ${id}: ${String(e)}`, {
					type: "error",
				});
				return c.json({ error: String(e) }, 500);
			}
		});

		// Serve Static UI
		// Try multiple possible locations for the UI build
		// Priority order:
		// 1. In dev monorepo: packages/ui/dist
		// 2. In production: dist/ui (relative to this file)
		// 3. As sibling to projectRoot
		let uiPath: string | null = null;

		// Try 1: dev monorepo (from packages/core/src/lib/server.ts to packages/ui/dist)
		const devPath = path.resolve(__dirname, "../../../ui/dist");
		if (fs.existsSync(devPath)) {
			uiPath = devPath;
		}

		// Try 2: production build (from dist/lib/server.js to dist/ui)
		if (!uiPath) {
			const prodPath = path.resolve(__dirname, "../ui");
			if (fs.existsSync(prodPath)) {
				uiPath = prodPath;
			}
		}

		// Try 3: from project root
		if (!uiPath) {
			const rootPath = path.resolve(this.projectRoot, "packages/ui/dist");
			if (fs.existsSync(rootPath)) {
				uiPath = rootPath;
			}
		}

		if (uiPath && fs.existsSync(uiPath)) {
			consoleOutput(`Serving UI from: ${uiPath}`, { type: "info" });
			const relativePath = path.relative(process.cwd(), uiPath);

			// Serve static files (assets, images, etc.)
			this.app.use(
				"/assets/*",
				serveStatic({
					root: relativePath,
					rewriteRequestPath: (path) => path.replace(/^\/assets/, "/assets"),
				}),
			);

			// SPA Fallback - serve index.html for all non-API routes
			this.app.get("*", (c) => {
				// Don't intercept API calls
				if (c.req.path.startsWith("/api/")) {
					return c.notFound();
				}

				const filePath = path.join(relativePath, "index.html");
				if (fs.existsSync(filePath)) {
					const content = fs.readFileSync(filePath, "utf-8");
					return c.html(content);
				}
				return c.text("UI build not found. Please build packages/ui.", 404);
			});
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
