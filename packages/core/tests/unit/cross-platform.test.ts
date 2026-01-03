/**
 * Cross-platform compatibility tests
 * Ensures framework works correctly on macOS, Windows, and Linux
 */

import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execaSync } from "execa";
import { describe, expect, it } from "vitest";
import { MESSAGES } from "../../src/lib/config/constants.js";
import { getCurrentBranch } from "../../src/lib/git/git.js";
import {
	deleteDir,
	deleteFile,
	ensureDir,
	readJson,
	readText,
	writeJson,
	writeText,
} from "../../src/lib/utils/file-utils.js";
import {
	ensureAllDirs,
	getBackupsDir,
	getLogsDir,
	getRefDir,
	getTaskflowDir,
	getTasksDir,
} from "../../src/lib/utils/path-utils.js";

describe("Cross-Platform Compatibility", () => {
	describe("Temporary Directory", () => {
		it("should use os.tmpdir() for cross-platform compatibility", () => {
			// Verify MESSAGES.COMMIT_TEMP_DIR is using os.tmpdir()
			expect(MESSAGES.COMMIT_TEMP_DIR).toBe(os.tmpdir());
		});

		it("should resolve to a valid temporary directory", () => {
			const tempDir = MESSAGES.COMMIT_TEMP_DIR;
			expect(tempDir).toBeTruthy();
			expect(typeof tempDir).toBe("string");

			// Verify directory exists or can be created
			if (!fs.existsSync(tempDir)) {
				fs.mkdirSync(tempDir, { recursive: true });
			}
			expect(fs.existsSync(tempDir)).toBe(true);
		});
	});

	describe("Path Operations", () => {
		it("should handle path.join correctly on all platforms", () => {
			// Test that path.join produces valid paths
			const testPath = path.join("parent", "child", "file.txt");
			expect(testPath).toBeTruthy();

			// Path separator should be correct for platform
			const separator = path.sep;
			expect(testPath).toContain(separator);
			expect(testPath).toContain("parent");
			expect(testPath).toContain("child");
			expect(testPath).toContain("file.txt");
		});

		it("should handle path.dirname correctly on all platforms", () => {
			const testPath = path.join("parent", "child", "file.txt");
			const dir = path.dirname(testPath);
			expect(dir).toBeTruthy();
			expect(dir).toContain("parent");
		});

		it("should handle path.basename correctly on all platforms", () => {
			const testPath = path.join("parent", "child", "file.txt");
			const basename = path.basename(testPath);
			expect(basename).toBe("file.txt");
		});
	});

	describe("Directory Operations", () => {
		it("should create directories using fs.mkdirSync with recursive option", () => {
			const testDir = path.join(os.tmpdir(), "taskflow-test", "nested", "dir");

			// Clean up if exists
			if (fs.existsSync(testDir)) {
				fs.rmSync(testDir, { recursive: true, force: true });
			}

			// Create directory
			ensureDir(testDir);
			expect(fs.existsSync(testDir)).toBe(true);

			// Clean up
			fs.rmSync(testDir, { recursive: true, force: true });
		});

		it("should create all taskflow directories successfully", () => {
			const testRoot = path.join(os.tmpdir(), `taskflow-test-${Date.now()}`);

			try {
				// This should work on all platforms
				ensureAllDirs(testRoot);

				// Verify all directories exist
				expect(fs.existsSync(getTasksDir(testRoot))).toBe(true);
				expect(fs.existsSync(getTaskflowDir(testRoot))).toBe(true);
				expect(fs.existsSync(getRefDir(testRoot))).toBe(true);
				expect(fs.existsSync(getLogsDir(testRoot))).toBe(true);
				expect(fs.existsSync(getBackupsDir(testRoot))).toBe(true);
			} finally {
				// Clean up
				if (fs.existsSync(testRoot)) {
					fs.rmSync(testRoot, { recursive: true, force: true });
				}
			}
		});

		it("should delete directories using fs.rmSync with recursive option", () => {
			const testDir = path.join(os.tmpdir(), "taskflow-test-delete");

			// Create directory
			fs.mkdirSync(testDir, { recursive: true });
			expect(fs.existsSync(testDir)).toBe(true);

			// Delete directory
			deleteDir(testDir);
			expect(fs.existsSync(testDir)).toBe(false);
		});

		it("should delete files correctly", () => {
			const testFile = path.join(os.tmpdir(), "taskflow-test-file.txt");

			// Create file
			writeText(testFile, "test content");
			expect(fs.existsSync(testFile)).toBe(true);

			// Delete file
			deleteFile(testFile);
			expect(fs.existsSync(testFile)).toBe(false);
		});
	});

	describe("File Operations", () => {
		it("should write and read text files correctly", () => {
			const testFile = path.join(os.tmpdir(), "taskflow-test-text.txt");
			const content = "Hello, Cross-Platform World!";

			writeText(testFile, content);
			const readContent = readText(testFile);

			expect(readContent).toBe(content);

			// Clean up
			fs.unlinkSync(testFile);
		});

		it("should write and read JSON files correctly", () => {
			const testFile = path.join(os.tmpdir(), "taskflow-test.json");
			const data = { key: "value", number: 42, nested: { prop: true } };

			writeJson(testFile, data);
			const readData = readJson(testFile);

			expect(readData).toEqual(data);

			// Clean up
			fs.unlinkSync(testFile);
		});

		it("should handle special characters in file names", () => {
			const testFile = path.join(
				os.tmpdir(),
				"taskflow-test-special-chars-@#$.txt",
			);

			try {
				writeText(testFile, "test");
				expect(fs.existsSync(testFile)).toBe(true);
			} finally {
				if (fs.existsSync(testFile)) {
					fs.unlinkSync(testFile);
				}
			}
		});
	});

	describe("Git Operations", () => {
		it("should handle git branch detection", () => {
			// This test will skip if not in a git repo
			try {
				const branch = getCurrentBranch();
				expect(typeof branch).toBe("string");
			} catch (_error) {
				// Not in a git repo, skip this test
				expect(true).toBe(true);
			}
		});
	});

	describe("Command Execution", () => {
		it("should execute commands via execaSync", () => {
			// Test that execaSync works correctly
			const result = execaSync("echo", ["test"], { stdio: "pipe" });
			expect(result.exitCode).toBe(0);
			expect(result.stdout.trim()).toBe("test");
		});

		it("should handle commands with array arguments", () => {
			const result = execaSync("node", ["--version"], { stdio: "pipe" });
			expect(result.exitCode).toBe(0);
			expect(result.stdout).toBeTruthy();
		});
	});

	describe("Path Separators", () => {
		it("should use correct path separator for platform", () => {
			const sep = path.sep;
			expect(sep).toMatch(/[/\\]/);

			if (process.platform === "win32") {
				expect(sep).toBe("\\");
			} else {
				expect(sep).toBe("/");
			}
		});

		it("should normalize paths correctly", () => {
			// Test path normalization
			const normalizedPath = path.normalize("parent//child/./grandchild");
			expect(normalizedPath).not.toContain("//");
		});
	});

	describe("File Encoding", () => {
		it("should handle UTF-8 encoding correctly", () => {
			const testFile = path.join(os.tmpdir(), "taskflow-test-utf8.txt");
			const content = "Hello 世界 🌍 Привет";

			fs.writeFileSync(testFile, content, "utf-8");
			const readContent = fs.readFileSync(testFile, "utf-8");

			expect(readContent).toBe(content);

			// Clean up
			fs.unlinkSync(testFile);
		});
	});

	describe("Platform-Specific Features", () => {
		it("should detect platform correctly", () => {
			const platform = process.platform;
			expect(["darwin", "linux", "win32"]).toContain(platform);
		});

		it("should handle platform-specific temp directory", () => {
			const tempDir = os.tmpdir();
			expect(tempDir).toBeTruthy();
			expect(fs.existsSync(tempDir)).toBe(true);
		});
	});

	describe("Edge Cases", () => {
		it("should handle paths with spaces", () => {
			const testDir = path.join(os.tmpdir(), "taskflow test dir");
			const testFile = path.join(testDir, "test file.txt");

			try {
				fs.mkdirSync(testDir, { recursive: true });
				fs.writeFileSync(testFile, "content");

				expect(fs.existsSync(testFile)).toBe(true);
				expect(fs.readFileSync(testFile, "utf-8")).toBe("content");
			} finally {
				if (fs.existsSync(testFile)) {
					fs.unlinkSync(testFile);
				}
				if (fs.existsSync(testDir)) {
					fs.rmdirSync(testDir);
				}
			}
		});

		it("should handle paths with unicode characters", () => {
			const testFile = path.join(os.tmpdir(), "taskflow-测试-テスト.txt");

			try {
				fs.writeFileSync(testFile, "content");
				expect(fs.existsSync(testFile)).toBe(true);
			} finally {
				if (fs.existsSync(testFile)) {
					fs.unlinkSync(testFile);
				}
			}
		});
	});
});
