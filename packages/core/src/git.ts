import { execaSync } from "execa";

export class GitManager {
	constructor(private cwd: string = process.cwd()) {}

	private runGit(args: string[]): string {
		try {
			const result = execaSync("git", args, { cwd: this.cwd });
			return result.stdout.trim();
		} catch (error) {
			if (error instanceof Error) {
				throw new Error(
					`Git command failed: git ${args.join(" ")} - ${error.message}`,
				);
			}
			throw error;
		}
	}

	public getCurrentBranch(): string {
		return this.runGit(["branch", "--show-current"]);
	}

	public storyBranchExists(storyId: string, slug: string): boolean {
		const branchName = `story/S${storyId}-${slug}`;
		try {
			this.runGit(["rev-parse", "--verify", branchName]);
			return true;
		} catch {
			return false;
		}
	}

	public ensureStoryBranch(
		storyId: string,
		slug: string,
		baseBranch = "main",
	): string {
		const branchName = `story/S${storyId}-${slug}`;
		const current = this.getCurrentBranch();

		if (current === branchName) {
			return branchName;
		}

		if (this.storyBranchExists(storyId, slug)) {
			this.runGit(["checkout", branchName]);
		} else {
			// Ensure we are on base or update from it?
			// For now, strict mode: check out base, pull, create new.
			// Check if base branch exists
			try {
				this.runGit(["rev-parse", "--verify", baseBranch]);
			} catch {
				throw new Error(`Base branch '${baseBranch}' does not exist.`);
			}

			this.runGit(["checkout", baseBranch]);
			try {
				this.runGit(["pull"]);
			} catch (_e) {
				// warn but proceed?
			}
			this.runGit(["checkout", "-b", branchName]);
		}

		return branchName;
	}

	public hasUncommittedChanges(): boolean {
		const status = this.runGit(["status", "--porcelain"]);
		return status.length > 0;
	}

	public commit(message: string): void {
		if (!this.hasUncommittedChanges()) {
			return; // Nothing to commit
		}
		this.runGit(["add", "."]);
		this.runGit(["commit", "-m", message]);
	}
}
