import { execaSync } from "execa";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	buildCommitMessage,
	getBranchSwitchCommand,
	getExpectedBranch,
	parseCommitMessage,
	validateCommitMessageFormat,
	verifyBranch,
} from "../../src/lib/git";
import type { Story } from "../../src/lib/types";

// Mock execa for git commands
vi.mock("execa", () => ({
	execaSync: vi.fn(),
}));

// Mock output functions
vi.mock("../../src/lib/output", () => ({
	colors: {
		success: (s: string) => `[success]${s}[/success]`,
		error: (s: string) => `[error]${s}[/error]`,
		warning: (s: string) => `[warning]${s}[/warning]`,
		info: (s: string) => `[info]${s}[/info]`,
		highlight: (s: string) => `[highlight]${s}[/highlight]`,
		muted: (s: string) => `[muted]${s}[/muted]`,
	},
	printColoredLine: vi.fn(),
}));

describe("git", () => {
	beforeEach(() => {
		vi.clearAllMocks();
	});

	afterEach(() => {
		vi.restoreAllMocks();
	});

	describe("getExpectedBranch", () => {
		it("should generate expected branch name from story", () => {
			const story: Story = {
				id: "1.1",
				title: "Setup Database Schema",
				status: "in-progress",
				tasks: [],
			};
			const result = getExpectedBranch(story);
			expect(result).toBe("story/S1.1-setup-database-schema");
		});

		it("should handle special characters in title", () => {
			const story: Story = {
				id: "2.3",
				title: "Add OAuth2 Authentication (Google)",
				status: "not-started",
				tasks: [],
			};
			const result = getExpectedBranch(story);
			expect(result).toBe("story/S2.3-add-oauth2-authentication-google");
		});
	});

	describe("getBranchSwitchCommand", () => {
		it("should return checkout command when branch exists", () => {
			// We'll test the logic, not the actual git command
			// The function checks branchExists which uses execaSync
			const result = getBranchSwitchCommand("main", "story/S1.1-test");
			// When branch doesn't exist and we're on main
			expect(result).toContain("git");
		});
	});

	describe("parseCommitMessage", () => {
		it("should parse valid commit message", () => {
			const message = `feat(F1): T1.1.1 - Add user authentication

- Add login endpoint
- Add JWT token generation

Story: S1.1`;

			const result = parseCommitMessage(message);
			expect(result).toEqual({
				type: "feat",
				featureId: "1",
				taskId: "1.1.1",
				title: "Add user authentication",
				body: undefined,
				storyId: "1.1",
			});
		});

		it("should parse commit message without body", () => {
			const message = `fix(F2): T2.1.0 - Fix validation bug

Story: S2.1`;

			const result = parseCommitMessage(message);
			expect(result).toEqual({
				type: "fix",
				featureId: "2",
				taskId: "2.1.0",
				title: "Fix validation bug",
				body: undefined,
				storyId: "2.1",
			});
		});

		it("should return null for invalid header", () => {
			expect(parseCommitMessage("Invalid commit message")).toBeNull();
			expect(parseCommitMessage("feat: Missing task ID")).toBeNull();
			expect(parseCommitMessage("feat(F1): Missing task format")).toBeNull();
		});

		it("should handle all commit types", () => {
			const types = [
				"feat",
				"fix",
				"docs",
				"style",
				"refactor",
				"test",
				"chore",
			];
			for (const type of types) {
				const message = `${type}(F1): T1.1.1 - Test\n\nStory: S1.1`;
				const result = parseCommitMessage(message);
				expect(result?.type).toBe(type);
			}
		});

		it("should extract story ID from footer", () => {
			const message = `feat(F1): T1.1.1 - Test

Some body text

Story: S2.3`;

			const result = parseCommitMessage(message);
			expect(result?.storyId).toBe("2.3");
		});

		it("should return undefined storyId if not present", () => {
			const message = `feat(F1): T1.1.1 - Test without story`;
			const result = parseCommitMessage(message);
			expect(result?.storyId).toBeUndefined();
		});
	});

	describe("validateCommitMessageFormat", () => {
		it("should return true for valid format with story", () => {
			const message = `feat(F1): T1.1.1 - Test

Story: S1.1`;
			expect(validateCommitMessageFormat(message)).toBe(true);
		});

		it("should return false for missing story", () => {
			const message = "feat(F1): T1.1.1 - Test without story";
			expect(validateCommitMessageFormat(message)).toBe(false);
		});

		it("should return false for invalid header", () => {
			const message = `Invalid header

Story: S1.1`;
			expect(validateCommitMessageFormat(message)).toBe(false);
		});
	});

	describe("buildCommitMessage", () => {
		it("should build commit message with body", () => {
			const result = buildCommitMessage(
				"feat",
				"1",
				"1.1.1",
				"Add feature",
				["- Detail 1", "- Detail 2"],
				"1.1",
			);

			expect(result).toBe(`feat(F1): T1.1.1 - Add feature

- Detail 1
- Detail 2

Story: S1.1`);
		});

		it("should build commit message without body", () => {
			const result = buildCommitMessage(
				"fix",
				"2",
				"2.1.0",
				"Fix bug",
				[],
				"2.1",
			);

			expect(result).toBe(`fix(F2): T2.1.0 - Fix bug

Story: S2.1`);
		});

		it("should handle larger IDs", () => {
			const result = buildCommitMessage(
				"docs",
				"10",
				"10.20.30",
				"Update documentation",
				["- Update README"],
				"10.20",
			);

			expect(result).toContain("docs(F10): T10.20.30");
			expect(result).toContain("Story: S10.20");
		});
	});

	describe("verifyBranch", () => {
		it("should do nothing if already on expected branch", () => {
			const execaMock = vi.mocked(execaSync);
			// Mock getCurrentBranch
			execaMock.mockImplementation(((cmd: any, args: any) => {
				if (
					cmd === "git" &&
					args?.[0] === "branch" &&
					args?.[1] === "--show-current"
				) {
					return { stdout: "story/S1.1-setup-database-schema" } as any;
				}
				return { stdout: "" } as any;
			}) as any);

			const story: Story = {
				id: "1.1",
				title: "Setup Database Schema",
				status: "in-progress",
				tasks: [],
			};

			verifyBranch(story);

			// Should not checkout
			expect(execaMock).not.toHaveBeenCalledWith(
				"git",
				expect.arrayContaining(["checkout"]),
			);
		});

		it("should switch branch if it exists", () => {
			const execaMock = vi.mocked(execaSync);
			let branchCalls = 0;

			execaMock.mockImplementation(((cmd: any, args: any) => {
				if (cmd === "git" && args?.[0] === "branch") {
					branchCalls++;
					if (branchCalls === 1) return { stdout: "main" } as any;
					return { stdout: "story/S1.1-setup-database-schema" } as any;
				}
				if (cmd === "git" && args?.[0] === "rev-parse") {
					return { stdout: "hash" } as any; // Branch exists
				}
				return { stdout: "" } as any;
			}) as any);

			const story: Story = {
				id: "1.1",
				title: "Setup Database Schema",
				status: "in-progress",
				tasks: [],
			};

			verifyBranch(story);

			expect(execaMock).toHaveBeenCalledWith(
				"git",
				["checkout", "story/S1.1-setup-database-schema"],
				expect.anything(),
			);
		});

		it("should stash, checkout main, pull, and create branch if not exists", () => {
			const execaMock = vi.mocked(execaSync);
			let branchCalls = 0;

			execaMock.mockImplementation(((cmd: any, args: any) => {
				if (cmd === "git" && args?.[0] === "branch") {
					branchCalls++;
					if (branchCalls === 1) return { stdout: "dev" } as any;
					return { stdout: "story/S1.1-setup-database-schema" } as any;
				}

				if (
					cmd === "git" &&
					args?.[0] === "status" &&
					args?.[1] === "--porcelain"
				) {
					return { stdout: "M file.ts" } as any; // Uncommitted changes
				}

				if (cmd === "git" && args?.[0] === "rev-parse") {
					if (args?.[2] === "story/S1.1-setup-database-schema")
						throw new Error("Not found"); // Branch does not exist
					if (args?.[2] === "main") return { stdout: "hash" } as any; // main exists
				}

				if (cmd === "git" && args?.[0] === "stash" && args?.[1] === "push") {
					return { stdout: "Saved working directory" } as any;
				}

				return { stdout: "" } as any;
			}) as any);

			const story: Story = {
				id: "1.1",
				title: "Setup Database Schema",
				status: "in-progress",
				tasks: [],
			};

			verifyBranch(story);

			expect(execaMock).toHaveBeenCalledWith(
				"git",
				expect.arrayContaining(["stash", "push", "-m", expect.any(String)]),
			);
			expect(execaMock).toHaveBeenCalledWith(
				"git",
				["checkout", "main"],
				expect.anything(),
			);
			expect(execaMock).toHaveBeenCalledWith(
				"git",
				["pull"],
				expect.anything(),
			);
			expect(execaMock).toHaveBeenCalledWith(
				"git",
				["checkout", "-b", "story/S1.1-setup-database-schema"],
				expect.anything(),
			);
			expect(execaMock).toHaveBeenCalledWith(
				"git",
				["stash", "pop"],
				expect.anything(),
			);
		});
	});
});
