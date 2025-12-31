import * as path from "node:path";
import { describe, expect, it } from "vitest";
import {
	CACHE_TTL,
	COMMIT_HEADER_REGEX,
	COMMIT_TYPES,
	ERROR_PATTERNS,
	FIX_COMMAND,
	getExpectedBranchName,
	getFeatureFilePath,
	getLogFilePath,
	getProjectIndexPath,
	getRefFilePath,
	getSkillFilePath,
	LOGS_DIR,
	MAX_OUTPUT_BUFFER,
	MAX_SUMMARY_LINES,
	PROJECT_INDEX_FILE,
	PROJECT_ROOT,
	REF_DIR,
	REF_FILES,
	RETROSPECTIVE_FILE,
	SKILL_FILES,
	TASKFLOW_ROOT,
	TASKS_DIR,
	VALIDATION_COMMANDS,
} from "../../src/lib/config";

describe("config", () => {
	describe("directory paths", () => {
		it("should define TASKFLOW_ROOT", () => {
			expect(TASKFLOW_ROOT).toBeDefined();
			expect(TASKFLOW_ROOT).toContain(".taskflow");
		});

		it("should define PROJECT_ROOT as parent of TASKFLOW_ROOT", () => {
			expect(PROJECT_ROOT).toBeDefined();
			expect(path.relative(PROJECT_ROOT, TASKFLOW_ROOT)).toBe(".taskflow");
		});

		it("should define TASKS_DIR", () => {
			expect(TASKS_DIR).toBeDefined();
			expect(TASKS_DIR).toContain("tasks");
		});

		it("should define REF_DIR", () => {
			expect(REF_DIR).toBeDefined();
			expect(REF_DIR).toContain("ref");
		});

		it("should define LOGS_DIR", () => {
			expect(LOGS_DIR).toBeDefined();
			expect(LOGS_DIR).toContain("logs");
		});
	});

	describe("file names", () => {
		it("should define PROJECT_INDEX_FILE", () => {
			expect(PROJECT_INDEX_FILE).toBe("project-index.json");
		});

		it("should define RETROSPECTIVE_FILE", () => {
			expect(RETROSPECTIVE_FILE).toBe("RETROSPECTIVE.md");
		});
	});

	describe("REF_FILES", () => {
		it("should define all reference files", () => {
			expect(REF_FILES.aiProtocol).toBe("AI-PROTOCOL.md");
			expect(REF_FILES.codingStandards).toBe("CODING-STANDARDS.md");
			expect(REF_FILES.architectureRules).toBe("ARCHITECTURE-RULES.md");
			expect(REF_FILES.retrospective).toBe("RETROSPECTIVE.md");
		});
	});

	describe("SKILL_FILES", () => {
		it("should define all skill files", () => {
			expect(SKILL_FILES.backend).toBe("skills/backend.md");
			expect(SKILL_FILES.frontend).toBe("skills/frontend.md");
			expect(SKILL_FILES.fullstack).toBe("skills/fullstack.md");
			expect(SKILL_FILES.devops).toBe("skills/devops.md");
			expect(SKILL_FILES.docs).toBe("skills/docs.md");
			expect(SKILL_FILES.development).toBe("skills/backend.md"); // fallback
		});
	});

	describe("VALIDATION_COMMANDS", () => {
		it("should define validation commands", () => {
			expect(VALIDATION_COMMANDS).toHaveLength(4);
			expect(VALIDATION_COMMANDS[0]).toEqual({
				cmd: "pnpm type-check",
				label: "type-check",
			});
			expect(VALIDATION_COMMANDS[1]).toEqual({
				cmd: "pnpm biome:check",
				label: "biome-check",
			});
			expect(VALIDATION_COMMANDS[2]).toEqual({
				cmd: "pnpm arch:validate",
				label: "arch-validate",
			});
			expect(VALIDATION_COMMANDS[3]).toEqual({
				cmd: "pnpm test",
				label: "test",
			});
		});
	});

	describe("FIX_COMMAND", () => {
		it("should define fix command", () => {
			expect(FIX_COMMAND).toEqual({
				cmd: "pnpm biome:fix",
				label: "biome:fix",
			});
		});
	});

	describe("constants", () => {
		it("should define MAX_SUMMARY_LINES", () => {
			expect(MAX_SUMMARY_LINES).toBe(50);
		});

		it("should define MAX_OUTPUT_BUFFER", () => {
			expect(MAX_OUTPUT_BUFFER).toBe(10 * 1024 * 1024);
		});

		it("should define CACHE_TTL", () => {
			expect(CACHE_TTL).toBe(60000);
		});
	});

	describe("COMMIT_TYPES", () => {
		it("should define all commit types", () => {
			expect(COMMIT_TYPES).toContain("feat");
			expect(COMMIT_TYPES).toContain("fix");
			expect(COMMIT_TYPES).toContain("docs");
			expect(COMMIT_TYPES).toContain("style");
			expect(COMMIT_TYPES).toContain("refactor");
			expect(COMMIT_TYPES).toContain("test");
			expect(COMMIT_TYPES).toContain("chore");
		});
	});

	describe("COMMIT_HEADER_REGEX", () => {
		it("should match valid commit headers", () => {
			expect(COMMIT_HEADER_REGEX.test("feat(F1): T1.1.1 - Add feature")).toBe(
				true,
			);
			expect(COMMIT_HEADER_REGEX.test("fix(F2): T2.1.0 - Fix bug")).toBe(true);
			expect(
				COMMIT_HEADER_REGEX.test("docs(F10): T10.20.30 - Update docs"),
			).toBe(true);
		});

		it("should reject invalid commit headers", () => {
			expect(COMMIT_HEADER_REGEX.test("feat: Add feature")).toBe(false);
			expect(COMMIT_HEADER_REGEX.test("feat(F1): Add feature")).toBe(false);
			expect(COMMIT_HEADER_REGEX.test("invalid(F1): T1.1.1 - Test")).toBe(
				false,
			);
			expect(COMMIT_HEADER_REGEX.test("feat(F1): T1.1 - Missing number")).toBe(
				false,
			);
		});
	});

	describe("ERROR_PATTERNS", () => {
		it("should define error patterns", () => {
			expect(ERROR_PATTERNS.length).toBeGreaterThan(0);
			expect(ERROR_PATTERNS.some((p) => p.test("error"))).toBe(true);
			expect(ERROR_PATTERNS.some((p) => p.test("FAIL"))).toBe(true);
			expect(ERROR_PATTERNS.some((p) => p.test("TypeError:"))).toBe(true);
		});
	});

	describe("getProjectIndexPath", () => {
		it("should return path to project-index.json", () => {
			const result = getProjectIndexPath();
			expect(result).toContain("tasks");
			expect(result).toContain("project-index.json");
		});
	});

	describe("getFeatureFilePath", () => {
		it("should return path to feature file", () => {
			const result = getFeatureFilePath("F1-test-feature");
			expect(result).toContain("tasks");
			expect(result).toContain("F1-test-feature");
			expect(result).toContain("F1-test-feature.json");
		});
	});

	describe("getRefFilePath", () => {
		it("should return path to reference file", () => {
			const result = getRefFilePath("AI-PROTOCOL.md");
			expect(result).toContain("ref");
			expect(result).toContain("AI-PROTOCOL.md");
		});
	});

	describe("getSkillFilePath", () => {
		it("should return path to skill file", () => {
			const result = getSkillFilePath("backend");
			expect(result).toContain("ref");
			expect(result).toContain("skills");
			expect(result).toContain("backend.md");
		});

		it("should fallback to backend for unknown skills", () => {
			const result = getSkillFilePath("unknown");
			expect(result).toContain("backend.md");
		});
	});

	describe("getLogFilePath", () => {
		it("should return log file path", () => {
			const result = getLogFilePath("1.1.1", "type-check");
			expect(result).toContain("logs");
			expect(result).toContain("1-1-1_type-check.log");
		});

		it("should handle special characters in task ID", () => {
			const result = getLogFilePath("10.20.30", "biome check");
			expect(result).toContain("10-20-30_biome-check.log");
		});
	});

	describe("getExpectedBranchName", () => {
		it("should generate branch name from story ID and title", () => {
			const result = getExpectedBranchName("1.1", "Setup Database Schema");
			expect(result).toBe("story/S1.1-setup-database-schema");
		});

		it("should handle special characters in title", () => {
			const result = getExpectedBranchName(
				"2.3",
				"Add User Authentication (OAuth2)",
			);
			expect(result).toBe("story/S2.3-add-user-authentication-oauth2");
		});

		it("should handle leading/trailing special characters", () => {
			const result = getExpectedBranchName("1.2", "---Test Story---");
			expect(result).toBe("story/S1.2-test-story");
		});
	});
});
