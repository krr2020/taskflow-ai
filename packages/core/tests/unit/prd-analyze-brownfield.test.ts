import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { PrdAnalyzeBrownfieldCommand } from "../../src/commands/prd/analyze-brownfield.js";
import { ConfigLoader } from "../../src/lib/config-loader.js";

vi.mock("node:fs");
vi.mock("node:path");
vi.mock("../../src/lib/config-loader.js");

// Mock dependencies
vi.mock("../../src/lib/codebase-scanner.js", () => ({
	CodebaseScanner: class {
		scan() {
			return Promise.resolve([
				{ name: "Auth", type: "auth", files: ["auth.ts"], confidence: "high" },
			]);
		}
	},
}));

vi.mock("../../src/lib/prd-matcher.js", () => ({
	PRDMatcher: class {
		matchRequirements() {
			return Promise.resolve([
				{
					requirement: { text: "Login", type: "functional" },
					status: "implemented",
					confidence: 0.9,
				},
			]);
		}
	},
}));

vi.mock("../../src/lib/gap-analyzer.js", () => ({
	GapAnalyzer: class {
		analyzeGaps() {
			return {
				summary: { total: 1, implemented: 1, percentComplete: 100 },
				gaps: [],
			};
		}
		generateMigrationPlan() {
			return {
				from: "a",
				to: "b",
				steps: [{ type: "install", description: "install b" }],
				risks: [],
			};
		}
	},
}));

describe("PrdAnalyzeBrownfieldCommand", () => {
	let command: PrdAnalyzeBrownfieldCommand;
	const mockContext = {
		projectRoot: "/test/root",
		config: { project: { name: "test" } },
		mcpContext: { isMCP: true },
	};

	beforeEach(() => {
		vi.resetAllMocks();

		// Mock ConfigLoader
		vi.mocked(ConfigLoader).mockImplementation(function (this: any) {
			return {
				getPaths: () => ({
					tasksDir: "/test/root/.taskflow",
					prdsDir: "/test/root/.taskflow/prds",
				}),
				load: () => ({ project: { name: "test" } }),
			} as any;
		});

		command = new PrdAnalyzeBrownfieldCommand(mockContext as any);

		// Mock path methods
		vi.mocked(path.resolve).mockImplementation((...args) => args.join("/"));
		vi.mocked(path.join).mockImplementation((...args) => args.join("/"));
		vi.mocked(path.dirname).mockImplementation(
			(p) => p.split("/").slice(0, -1).join("/") || "/",
		);
		(path as any).sep = "/";

		// Mock fs methods
		vi.mocked(fs.existsSync).mockReturnValue(true);
		vi.mocked(fs.readFileSync).mockReturnValue(
			"# PRD\n## Functional Requirements\n1. Login",
		);

		// Spy on console.log
		console.log = vi.fn();
	});

	it("should run detection", async () => {
		const result = await command.execute("detect");
		expect(result.success).toBe(true);
		expect(result.output).toContain("Discovered 1 features");
	});

	it("should run analysis", async () => {
		const result = await command.execute("analyze", "prd.md");
		expect(result.success).toBe(true);
		expect(result.output).toContain("Analysis complete");
	});

	it("should run migration", async () => {
		const result = await command.execute("migrate", undefined, "pkgA", "pkgB");
		expect(result.success).toBe(true);
		expect(result.output).toContain("Migration plan generated");
	});

	it("should fail if PRD file missing for analysis", async () => {
		vi.mocked(fs.existsSync).mockReturnValue(false);
		const result = await command.execute("analyze", "missing.md");
		expect(result.success).toBe(false);
		expect(result.output).toContain("PRD file not found");
	});

	it("should fail if migration args missing", async () => {
		const result = await command.execute("migrate");
		expect(result.success).toBe(false);
		expect(result.output).toContain(
			"Both --from and --to arguments are required for migration.",
		);
	});
});
