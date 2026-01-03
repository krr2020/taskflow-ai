/**
 * Unit tests for ConfigLoader
 */

import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it } from "vitest";
import { ConfigLoader } from "../../src/lib/config/config-loader.js";
import { createMockProject, createTestDir } from "../setup.js";

describe("ConfigLoader", () => {
	let testDir: string;

	beforeEach(() => {
		testDir = createTestDir();
	});

	describe("load", () => {
		it("should load config from taskflow.config.json", () => {
			createMockProject(testDir);

			const loader = new ConfigLoader(testDir);
			const config = loader.load();

			expect(config.project.name).toBe("test-project");
			expect(config.project.root).toBe(".");
		});

		it("should throw error if config does not exist", () => {
			const loader = new ConfigLoader(testDir);

			expect(() => loader.load()).toThrow();
		});
	});

	describe("exists", () => {
		it("should return true if config exists", () => {
			createMockProject(testDir);

			const loader = new ConfigLoader(testDir);

			expect(loader.exists()).toBe(true);
		});

		it("should return false if config does not exist", () => {
			const loader = new ConfigLoader(testDir);

			expect(loader.exists()).toBe(false);
		});
	});

	describe("save", () => {
		it("should save config to taskflow.config.json", () => {
			const loader = new ConfigLoader(testDir);
			const config = ConfigLoader.createDefaultConfig("my-project");

			loader.save(config);

			const configPath = path.join(testDir, "taskflow.config.json");
			expect(fs.existsSync(configPath)).toBe(true);

			const loaded = JSON.parse(fs.readFileSync(configPath, "utf-8"));
			expect(loaded.project.name).toBe("my-project");
		});
	});

	describe("getPaths", () => {
		it("should return correct paths", () => {
			createMockProject(testDir);

			const loader = new ConfigLoader(testDir);
			const paths = loader.getPaths();

			expect(paths.projectRoot).toBe(testDir);
			expect(paths.tasksDir).toBe(path.join(testDir, "tasks"));
			expect(paths.taskflowDir).toBe(path.join(testDir, ".taskflow"));
			expect(paths.refDir).toBe(path.join(testDir, ".taskflow", "ref"));
			expect(paths.logsDir).toBe(path.join(testDir, ".taskflow", "logs"));
		});
	});

	describe("createDefaultConfig", () => {
		it("should create valid default config", () => {
			const config = ConfigLoader.createDefaultConfig("test-project");

			expect(config.project.name).toBe("test-project");
			expect(config.project.root).toBe(".");
			expect(config.branching).toBeDefined();
			expect(config.branching.strategy).toBe("per-story");
			expect(config.validation).toBeDefined();
			expect(config.validation?.commands).toBeDefined();
		});
	});
});
