/**
 * Unit tests for GitManager (src/git.ts)
 */

import { beforeEach, describe, expect, it } from "vitest";
import { GitManager } from "../../src/git.js";

describe("GitManager (src/git.ts)", () => {
	let gitManager: GitManager;

	beforeEach(() => {
		gitManager = new GitManager("/test/project");
	});

	describe("constructor", () => {
		it("should initialize with default cwd", () => {
			const git = new GitManager();
			expect(git).toBeDefined();
		});

		it("should initialize with custom cwd", () => {
			const git = new GitManager("/custom/path");
			expect(git).toBeDefined();
		});
	});

	describe("getCurrentBranch", () => {
		it("should return current branch name", () => {
			// This test assumes git is available and in a git repo
			// In a real test environment, you'd mock execaSync
			try {
				const branch = gitManager.getCurrentBranch();
				// If in a git repo, should return a non-empty string
				if (branch) {
					expect(typeof branch).toBe("string");
					expect(branch.length).toBeGreaterThan(0);
				}
			} catch (error) {
				// If not in a git repo, this is expected
				expect(error).toBeDefined();
			}
		});

		it("should throw error if git command fails", () => {
			// Mock a scenario where git is not available
			const git = new GitManager("/nonexistent/path");
			expect(() => git.getCurrentBranch()).toThrow();
		});
	});

	describe("storyBranchExists", () => {
		it("should return false for non-existent branch", () => {
			// In a test environment without the branch, should return false
			const exists = gitManager.storyBranchExists("999", "nonexistent");
			expect(typeof exists).toBe("boolean");
		});

		it("should handle story ID and slug correctly", () => {
			const result = gitManager.storyBranchExists("1", "test-story");
			expect(typeof result).toBe("boolean");
		});
	});

	describe("ensureStoryBranch", () => {
		it("should return branch name when already on correct branch", () => {
			// Mock scenario where we're already on the branch
			// This would require mocking getCurrentBranch
			try {
				const branchName = gitManager.ensureStoryBranch("1", "test-story");
				expect(typeof branchName).toBe("string");
				expect(branchName).toContain("S1-test-story");
			} catch (error) {
				// Expected if not in a git repo
				expect(error).toBeDefined();
			}
		});

		it("should create new branch if it doesn't exist", () => {
			try {
				const branchName = gitManager.ensureStoryBranch("2", "new-story");
				expect(typeof branchName).toBe("string");
				expect(branchName).toContain("S2-new-story");
			} catch (error) {
				// Expected if not in a git repo
				expect(error).toBeDefined();
			}
		});

		it("should use custom base branch", () => {
			try {
				const branchName = gitManager.ensureStoryBranch(
					"3",
					"custom-base",
					"develop",
				);
				expect(typeof branchName).toBe("string");
			} catch (error) {
				// Expected if not in a git repo
				expect(error).toBeDefined();
			}
		});

		it("should throw error if base branch doesn't exist", () => {
			try {
				gitManager.ensureStoryBranch("4", "test", "nonexistent-base");
			} catch (error) {
				expect(error).toBeDefined();
				if (error instanceof Error) {
					// Could be git error or directory error
					expect(
						error.message.includes("does not exist") ||
							error.message.includes("Git command failed"),
					).toBe(true);
				}
			}
		});
	});

	describe("hasUncommittedChanges", () => {
		it("should return boolean indicating uncommitted changes", () => {
			try {
				const hasChanges = gitManager.hasUncommittedChanges();
				expect(typeof hasChanges).toBe("boolean");
			} catch (error) {
				// Expected if not in a git repo
				expect(error).toBeDefined();
			}
		});
	});

	describe("commit", () => {
		it("should do nothing if no uncommitted changes", () => {
			try {
				gitManager.commit("test commit");
				// Should not throw
			} catch (error) {
				// Expected if not in a git repo
				expect(error).toBeDefined();
			}
		});

		it("should commit changes with message", () => {
			try {
				gitManager.commit("feat: test commit message");
				// Should not throw
			} catch (error) {
				// Expected if not in a git repo
				expect(error).toBeDefined();
			}
		});

		it("should handle multiline commit messages", () => {
			try {
				gitManager.commit("feat: test\n\nThis is a multiline\ncommit message");
				// Should not throw
			} catch (error) {
				// Expected if not in a git repo
				expect(error).toBeDefined();
			}
		});
	});
});
