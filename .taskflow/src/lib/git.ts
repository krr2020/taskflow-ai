/**
 * Git operations for the taskflow system
 */

import fs from "node:fs";
import { execaSync } from "execa";
import { getExpectedBranchName } from "./config";
import { GitOperationError, WrongBranchError } from "./errors";
import { colors, printColoredLine } from "./output";
import type { Story } from "./types";

// ============================================================================
// Branch Operations
// ============================================================================

export function getCurrentBranch(): string {
	try {
		const result = execaSync("git", ["branch", "--show-current"]);
		return result.stdout.trim();
	} catch {
		return "";
	}
}

export function branchExists(branchName: string): boolean {
	try {
		execaSync("git", ["rev-parse", "--verify", branchName], { stdio: "pipe" });
		return true;
	} catch {
		return false;
	}
}

export function getExpectedBranch(story: Story): string {
	return getExpectedBranchName(story.id, story.title);
}

export function getBranchSwitchCommand(
	currentBranch: string,
	expectedBranch: string,
): string {
	if (branchExists(expectedBranch)) {
		return `git checkout ${expectedBranch}`;
	}

	if (currentBranch === "main") {
		return `git pull && git checkout -b ${expectedBranch}`;
	}

	return `git checkout main && git pull && git checkout -b ${expectedBranch}`;
}

export function verifyBranch(story: Story): void {
	const expected = getExpectedBranch(story);
	const current = getCurrentBranch();

	if (current === expected) {
		printColoredLine(
			`✓ Already on correct branch: ${expected}`,
			colors.success,
		);
		return;
	}

	// Check for uncommitted changes
	const needsStash = hasUncommittedChanges() || hasStagedChanges();
	let stashed = false;

	if (needsStash) {
		console.log();
		printColoredLine("⚠️  UNCOMMITTED CHANGES DETECTED", colors.warning);
		printColoredLine("─".repeat(50), colors.muted);

		const statusResult = execaSync("git", ["status", "--porcelain"]);
		const modifiedFiles = statusResult.stdout.split("\n").filter(Boolean);
		console.log(`${modifiedFiles.length} files modified:`);
		for (const file of modifiedFiles.slice(0, 10)) {
			const statusPrefix = file.substring(0, 2);
			const filePath = file.substring(3);
			console.log(`  ${statusPrefix} ${filePath}`);
		}
		if (modifiedFiles.length > 10) {
			console.log(`  ... and ${modifiedFiles.length - 10} more`);
		}
		console.log();

		printColoredLine("💾 STASHING CHANGES", colors.highlight);
		printColoredLine("─".repeat(50), colors.muted);
		console.log('Stash message: "Auto-stash by taskflow before branch switch"');

		stashed = gitStashPush("Auto-stash by taskflow before branch switch");
		if (stashed) {
			printColoredLine("✓ Changes stashed successfully", colors.success);
		}
	}

	try {
		console.log();
		printColoredLine("🔄 SWITCHING BRANCH", colors.highlight);
		printColoredLine("─".repeat(50), colors.muted);
		console.log(`Current: ${current}`);
		console.log(`Required: ${expected}`);
		console.log();

		if (branchExists(expected)) {
			console.log(`Switching to branch: ${expected}`);
			execaSync("git", ["checkout", expected], { stdio: "inherit" });
			printColoredLine("✓ Branch checked out", colors.success);
		} else {
			console.log(`Creating branch: ${expected}`);

			// If we're not on main/master, try to switch to it first
			if (current !== "main" && current !== "master") {
				if (branchExists("main")) {
					console.log("Switching to main first...");
					execaSync("git", ["checkout", "main"], { stdio: "inherit" });
				} else if (branchExists("master")) {
					console.log("Switching to master first...");
					execaSync("git", ["checkout", "master"], { stdio: "inherit" });
				}
			}

			// Pull latest
			try {
				console.log("Pulling latest changes...");
				execaSync("git", ["pull"], { stdio: "inherit" });
			} catch {
				// Ignore pull errors (e.g. no upstream)
			}

			execaSync("git", ["checkout", "-b", expected], { stdio: "inherit" });
			printColoredLine("✓ Branch created and checked out", colors.success);
		}

		const newCurrent = getCurrentBranch();
		if (newCurrent !== expected) {
			throw new Error(`Failed to switch to ${expected}`);
		}
	} catch (_error) {
		if (stashed) {
			console.log();
			printColoredLine(
				"⚠️  WARNING: Changes were stashed but branch switch failed",
				colors.warning,
			);
			printColoredLine(
				'Run "git stash pop" to restore your changes.',
				colors.muted,
			);
		}
		const switchCmd = getBranchSwitchCommand(current, expected);
		throw new WrongBranchError(current, expected, switchCmd);
	}

	// Restore stashed changes if any
	if (stashed) {
		console.log();
		printColoredLine("📦 RESTORING STASHED CHANGES", colors.highlight);
		printColoredLine("─".repeat(50), colors.muted);

		try {
			gitStashPop();
			const statusResult = execaSync("git", ["status", "--porcelain"]);
			const restoredFiles = statusResult.stdout.split("\n").filter(Boolean);
			printColoredLine(
				`✓ Changes restored (${restoredFiles.length} files modified)`,
				colors.success,
			);
			for (const file of restoredFiles.slice(0, 10)) {
				const statusPrefix = file.substring(0, 2);
				const filePath = file.substring(3);
				console.log(`  ${statusPrefix} ${filePath}`);
			}
			if (restoredFiles.length > 10) {
				console.log(`  ... and ${restoredFiles.length - 10} more`);
			}
		} catch (_error) {
			console.log();
			printColoredLine("⚠️  WARNING: Failed to pop stash", colors.warning);
			printColoredLine(
				'You may need to resolve conflicts manually. Run "git stash pop".',
				colors.muted,
			);
		}
	}

	console.log();
	printColoredLine("ℹ️  BRANCH STATUS", colors.info);
	printColoredLine("─".repeat(50), colors.muted);
	console.log("You are now on the correct branch for this task.");
	console.log(`Current branch: ${expected}`);
}

// ============================================================================
// Commit Operations
// ============================================================================

export function gitAdd(paths: string | string[] = "."): void {
	try {
		const pathArray = Array.isArray(paths) ? paths : [paths];
		execaSync("git", ["add", ...pathArray], { stdio: "inherit" });
	} catch (error) {
		throw new GitOperationError(
			"add",
			error instanceof Error ? error.message : String(error),
		);
	}
}

export function gitCommit(message: string): void {
	// Write message to temp file to handle multiline messages properly
	const commitFile = "/tmp/taskflow-commit-msg.txt";
	try {
		fs.writeFileSync(commitFile, message);
		execaSync("git", ["commit", "-F", commitFile], { stdio: "inherit" });
	} catch (error) {
		throw new GitOperationError(
			"commit",
			error instanceof Error ? error.message : String(error),
		);
	} finally {
		// Clean up temp file
		if (fs.existsSync(commitFile)) {
			fs.unlinkSync(commitFile);
		}
	}
}

export function gitPush(branch?: string): void {
	const targetBranch = branch || getCurrentBranch();
	try {
		execaSync("git", ["push", "origin", targetBranch], { stdio: "inherit" });
	} catch (error) {
		throw new GitOperationError(
			"push",
			error instanceof Error ? error.message : String(error),
		);
	}
}

export function gitStashPush(message?: string): boolean {
	try {
		const args = ["stash", "push"];
		if (message) {
			args.push("-m", message);
		}
		const result = execaSync("git", args);
		// git stash push returns "No local changes to save" if nothing to stash
		// but exit code is 0. We can check output.
		return !result.stdout.includes("No local changes to save");
	} catch (error) {
		throw new GitOperationError(
			"stash push",
			error instanceof Error ? error.message : String(error),
		);
	}
}

export function gitStashPop(): void {
	try {
		execaSync("git", ["stash", "pop"], { stdio: "inherit" });
	} catch (error) {
		throw new GitOperationError(
			"stash pop",
			error instanceof Error ? error.message : String(error),
		);
	}
}

// ============================================================================
// Status Checks
// ============================================================================

export function hasUncommittedChanges(): boolean {
	try {
		const result = execaSync("git", ["status", "--porcelain"]);
		return result.stdout.trim().length > 0;
	} catch {
		return false;
	}
}

export function hasStagedChanges(): boolean {
	try {
		const result = execaSync("git", ["diff", "--cached", "--name-only"]);
		return result.stdout.trim().length > 0;
	} catch {
		return false;
	}
}

export function getLastCommitMessage(): string {
	try {
		const result = execaSync("git", ["log", "-1", "--pretty=%B"]);
		return result.stdout.trim();
	} catch {
		return "";
	}
}

export function getLastCommitSubject(): string {
	try {
		const result = execaSync("git", ["log", "-1", "--pretty=%s"]);
		return result.stdout.trim();
	} catch {
		return "";
	}
}

export function commitReferencesTask(taskId: string): boolean {
	const lastCommit = getLastCommitMessage();
	return lastCommit.includes(`T${taskId}`);
}

// ============================================================================
// Branch Information
// ============================================================================

export function isOnMainBranch(): boolean {
	const current = getCurrentBranch();
	return current === "main" || current === "master";
}

export function isBranchAheadOfRemote(): boolean {
	try {
		const result = execaSync("git", ["status", "-sb"]);
		return result.stdout.includes("ahead");
	} catch {
		return false;
	}
}

export function isBranchBehindRemote(): boolean {
	try {
		const result = execaSync("git", ["status", "-sb"]);
		return result.stdout.includes("behind");
	} catch {
		return false;
	}
}

// ============================================================================
// Commit Message Validation
// ============================================================================

export interface CommitMessageParts {
	type: string;
	featureId: string;
	taskId: string;
	title: string;
	body?: string | undefined;
	storyId?: string | undefined;
}

export function parseCommitMessage(message: string): CommitMessageParts | null {
	const lines = message.trim().split("\n");
	if (lines.length === 0) return null;

	const header = lines[0];
	if (!header) return null;

	const headerMatch = header.match(
		/^(feat|fix|docs|style|refactor|test|chore)\(F(\d+)\): T(\d+\.\d+\.\d+) - (.+)$/,
	);

	if (!headerMatch) return null;

	const [, type, featureId, taskId, title] = headerMatch;

	// Find story ID in footer
	let storyId: string | undefined;
	for (const line of lines) {
		if (!line) continue;
		const storyMatch = line.match(/Story:\s*S(\d+\.\d+)/);
		if (storyMatch) {
			storyId = storyMatch[1];
			break;
		}
	}

	// Extract body (lines between header and footer)
	const bodyLines: string[] = [];
	let inBody = false;
	for (let i = 1; i < lines.length; i++) {
		const line = lines[i];
		if (!line) continue;
		if (line.trim() === "") {
			inBody = true;
			continue;
		}
		if (line.startsWith("Story:")) break;
		if (inBody) {
			bodyLines.push(line);
		}
	}

	if (!type || !featureId || !taskId || !title) {
		return null;
	}

	return {
		type,
		featureId,
		taskId,
		title,
		body: bodyLines.length > 0 ? bodyLines.join("\n") : undefined,
		storyId,
	};
}

export function validateCommitMessageFormat(message: string): boolean {
	const parts = parseCommitMessage(message);
	return parts !== null && parts.storyId !== undefined;
}

export function buildCommitMessage(
	type: string,
	featureId: string,
	taskId: string,
	title: string,
	bodyLines: string[],
	storyId: string,
): string {
	const header = `${type}(F${featureId}): T${taskId} - ${title}`;
	const body = bodyLines.length > 0 ? `\n\n${bodyLines.join("\n")}` : "";
	const footer = `\n\nStory: S${storyId}`;

	return `${header}${body}${footer}`;
}
