/**
 * Unit tests for ConfigLoader (src/config.ts)
 */

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { ConfigLoader } from "../../src/config.js";
import { createTestDir } from "../setup.js";

describe("ConfigLoader (src/config.ts)", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = createTestDir();
	});

	describe("constructor", () => {
		it("should initialize with default cwd", () => {
			const loader = new ConfigLoader();
			expect(loader).toBeDefined();
		});

		it("should initialize with custom cwd", () => {
			const loader = new ConfigLoader(testDir);
			expect(loader).toBeDefined();
		});
	});

	describe("load", () => {
		it("should load valid config from taskflow.config.json", () => {
			const configData = {
				version: "2.0",
				projectType: "custom",
				branching: {
					strategy: "per-story",
					base: "main",
					storyPattern: "story/S{id}-{slug}",
				},
				contextRules: [],
				gates: {
					requirePlanApproval: true,
					requireTestPass: true,
				},
			};

			fs.writeFileSync(
				path.join(testDir, "taskflow.config.json"),
				JSON.stringify(configData, null, 2),
			);

			const loader = new ConfigLoader(testDir);
			const config = loader.load();

			expect(config.version).toBe("2.0");
			expect(config.projectType).toBe("custom");
			expect(config.branching.strategy).toBe("per-story");
		});

		it("should throw error if config file does not exist", () => {
			const loader = new ConfigLoader(testDir);

			expect(() => loader.load()).toThrow("Configuration file not found at:");
		});

		it("should throw error for invalid JSON", () => {
			fs.writeFileSync(
				path.join(testDir, "taskflow.config.json"),
				"invalid json content",
			);

			const loader = new ConfigLoader(testDir);

			expect(() => loader.load()).toThrow("Failed to load config");
		});

		it("should throw error with message for parsing errors", () => {
			fs.writeFileSync(
				path.join(testDir, "taskflow.config.json"),
				"{ invalid: json }",
			);

			const loader = new ConfigLoader(testDir);

			expect(() => loader.load()).toThrow("Failed to load config");
		});
	});

	describe("findConfigRoot", () => {
		it("should find config root in current directory", () => {
			fs.writeFileSync(
				path.join(testDir, "taskflow.config.json"),
				JSON.stringify({ version: "2.0", projectType: "custom" }),
			);

			const loader = new ConfigLoader(testDir);
			const root = loader.findConfigRoot(testDir);

			expect(root).toBe(testDir);
		});

		it("should find config root in parent directory", () => {
			// Create config in parent
			fs.writeFileSync(
				path.join(testDir, "taskflow.config.json"),
				JSON.stringify({ version: "2.0", projectType: "custom" }),
			);

			// Create subdirectory
			const subDir = path.join(testDir, "subdir");
			fs.mkdirSync(subDir, { recursive: true });

			const loader = new ConfigLoader(testDir);
			const root = loader.findConfigRoot(subDir);

			expect(root).toBe(testDir);
		});

		it("should return null if config not found", () => {
			const loader = new ConfigLoader(testDir);
			const root = loader.findConfigRoot(testDir);

			expect(root).toBeNull();
		});

		it("should stop at filesystem root", () => {
			const loader = new ConfigLoader(testDir);
			// This should not throw even if we search from root
			const root = loader.findConfigRoot("/");
			expect(root).toBeNull();
		});
	});
});
