import fs from "node:fs";
import path from "node:path";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { CodebaseScanner } from "@/lib/analysis/codebase-scanner";

vi.mock("node:fs", () => ({
	default: {
		promises: {
			readdir: vi.fn(),
			readFile: vi.fn(),
		},
	},
	promises: {
		readdir: vi.fn(),
		readFile: vi.fn(),
	},
}));
vi.mock("node:path");

describe("CodebaseScanner", () => {
	const mockRoot = "/test/root";

	beforeEach(() => {
		vi.resetAllMocks();
		// Mock path.join
		vi.mocked(path.join).mockImplementation((...args) => args.join("/"));
		// Mock path.relative
		vi.mocked(path.relative).mockImplementation((from, to) => {
			return to.replace(from, "").replace(/^\//, "");
		});
		// Mock path.sep
		(path as any).sep = "/";
	});

	it("should scan files and detect features", async () => {
		// Mock file system
		const mockFiles = {
			"/test/root/src/auth.ts":
				"import passport from 'passport';\nconst jwt = 'secret';",
			"/test/root/src/api.ts":
				"import express from 'express';\napp.use(routes);",
			"/test/root/src/ui.tsx":
				"import React from 'react';\nconst Component = () => <div></div>;",
		};

		vi.mocked(fs.promises.readdir).mockResolvedValue([
			{ name: "src", isDirectory: () => true, isFile: () => false } as any,
		]);

		vi.mocked(fs.promises.readdir).mockImplementation(async (dir) => {
			if (dir === "/test/root") {
				return [
					{ name: "src", isDirectory: () => true, isFile: () => false } as any,
				];
			}
			if (dir === "/test/root/src") {
				return [
					{
						name: "auth.ts",
						isDirectory: () => false,
						isFile: () => true,
					} as any,
					{
						name: "api.ts",
						isDirectory: () => false,
						isFile: () => true,
					} as any,
					{
						name: "ui.tsx",
						isDirectory: () => false,
						isFile: () => true,
					} as any,
				];
			}
			return [];
		});

		vi.mocked(fs.promises.readFile).mockImplementation(async (file) => {
			return mockFiles[file as keyof typeof mockFiles] || "";
		});

		const scanner = new CodebaseScanner({ rootDir: mockRoot });
		const features = await scanner.scan();

		expect(features).toHaveLength(3);

		const authFeature = features.find((f) => f.type === "auth");
		expect(authFeature).toBeDefined();
		expect(authFeature?.files).toContain("/test/root/src/auth.ts");
		expect(
			authFeature?.patterns.some((p: any) => p.pattern === "passport"),
		).toBe(true);

		const apiFeature = features.find((f) => f.type === "api");
		expect(apiFeature).toBeDefined();
		expect(apiFeature?.files).toContain("/test/root/src/api.ts");

		const uiFeature = features.find((f) => f.type === "ui");
		expect(uiFeature).toBeDefined();
		expect(uiFeature?.files).toContain("/test/root/src/ui.tsx");
	});

	it("should respect ignore patterns", async () => {
		const mockFiles = {
			"/test/root/node_modules/lib.ts": "import passport from 'passport';",
			"/test/root/src/auth.ts": "import passport from 'passport';",
		};

		vi.mocked(fs.promises.readdir).mockImplementation(async (dir) => {
			if (dir === "/test/root") {
				return [
					{
						name: "node_modules",
						isDirectory: () => true,
						isFile: () => false,
					} as any,
					{ name: "src", isDirectory: () => true, isFile: () => false } as any,
				];
			}
			if (dir === "/test/root/src") {
				return [
					{
						name: "auth.ts",
						isDirectory: () => false,
						isFile: () => true,
					} as any,
				];
			}
			// Should not traverse node_modules
			return [];
		});

		vi.mocked(fs.promises.readFile).mockImplementation(async (file) => {
			return mockFiles[file as keyof typeof mockFiles] || "";
		});

		const scanner = new CodebaseScanner({ rootDir: mockRoot });
		const features = await scanner.scan();

		const authFeature = features.find((f) => f.type === "auth");
		expect(authFeature?.files).toContain("/test/root/src/auth.ts");
		expect(authFeature?.files).not.toContain("/test/root/node_modules/lib.ts");
	});
});
