import fs from "node:fs";
import path from "node:path";
import { afterEach, describe, expect, it, vi } from "vitest";
import { BackupManager, Sandbox } from "@/agent/safety";

describe("Sandbox", () => {
	const projectRoot = "/test/project";
	const sandbox = new Sandbox(projectRoot);

	it("should allow paths within project root", () => {
		const safePath = path.join(projectRoot, "src/index.ts");
		expect(sandbox.validatePath("src/index.ts")).toBe(safePath);
	});

	it("should reject paths outside project root", () => {
		expect(() => sandbox.validatePath("../outside.ts")).toThrow(
			"Access denied",
		);
	});

	it("should reject absolute paths outside project root", () => {
		expect(() => sandbox.validatePath("/etc/passwd")).toThrow("Access denied");
	});
});

describe("BackupManager", () => {
	const projectRoot = "/test/project";
	const backupManager = new BackupManager(projectRoot);

	// Mock fs at top level of describe context (or globally) is better,
	// but here we can mock methods directly if we use vi.mock outside.
	// However, since we are inside describe, let's use spyOn on the real fs
	// and ensure we restore.
	// But note: imports are immutable.
	// Let's rely on vi.mock("node:fs") being hoisted if we put it at top.
	// But we didn't put it at top.

	// Let's try simpler approach: just spyOn methods we need.
	// We don't need vi.mock("node:fs") if we spyOn everything we use.

	afterEach(() => {
		vi.restoreAllMocks();
	});

	it("should backup existing file", () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(true);
		const copySpy = vi.spyOn(fs, "copyFileSync").mockImplementation(() => {});
		vi.spyOn(fs, "mkdirSync").mockImplementation(() => undefined);

		const filePath = path.join(projectRoot, "src/config.ts");
		backupManager.backupFile(filePath);

		expect(copySpy).toHaveBeenCalled();
	});

	it("should skip backup if file does not exist", () => {
		vi.spyOn(fs, "existsSync").mockReturnValue(false);
		const copySpy = vi.spyOn(fs, "copyFileSync").mockImplementation(() => {});

		const filePath = path.join(projectRoot, "src/missing.ts");
		backupManager.backupFile(filePath);

		expect(copySpy).not.toHaveBeenCalled();
	});
});
