import { describe, expect, it } from "vitest";
import {
	ACTIVE_STATUSES,
	CriticalitySchema,
	ErrorCategorySchema,
	FeatureRefSchema,
	FeatureSchema,
	isActiveStatus,
	isValidFeatureId,
	isValidStoryId,
	isValidTaskId,
	ProjectIndexSchema,
	parseTaskId,
	STATUS_TRANSITIONS,
	StorySchema,
	SubtaskSchema,
	SubtaskStatusSchema,
	TaskFileContentSchema,
	TaskRefSchema,
	TaskSkillSchema,
	TaskStatusSchema,
	validateFeature,
	validateProjectIndex,
	validateTaskFileContent,
} from "../../src/lib/types";

describe("types", () => {
	describe("TaskStatusSchema", () => {
		it("should accept valid statuses", () => {
			expect(TaskStatusSchema.parse("not-started")).toBe("not-started");
			expect(TaskStatusSchema.parse("setup")).toBe("setup");
			expect(TaskStatusSchema.parse("implementing")).toBe("implementing");
			expect(TaskStatusSchema.parse("verifying")).toBe("verifying");
			expect(TaskStatusSchema.parse("validating")).toBe("validating");
			expect(TaskStatusSchema.parse("committing")).toBe("committing");
			expect(TaskStatusSchema.parse("completed")).toBe("completed");
			expect(TaskStatusSchema.parse("blocked")).toBe("blocked");
			expect(TaskStatusSchema.parse("on-hold")).toBe("on-hold");
		});

		it("should reject invalid statuses", () => {
			expect(() => TaskStatusSchema.parse("invalid")).toThrow();
			expect(() => TaskStatusSchema.parse("")).toThrow();
			expect(() => TaskStatusSchema.parse(123)).toThrow();
			expect(() => TaskStatusSchema.parse("in-progress")).toThrow(); // old status no longer valid
		});
	});

	describe("isActiveStatus", () => {
		it("should return true for active statuses", () => {
			expect(isActiveStatus("setup")).toBe(true);
			expect(isActiveStatus("implementing")).toBe(true);
			expect(isActiveStatus("verifying")).toBe(true);
			expect(isActiveStatus("validating")).toBe(true);
			expect(isActiveStatus("committing")).toBe(true);
		});

		it("should return false for non-active statuses", () => {
			expect(isActiveStatus("not-started")).toBe(false);
			expect(isActiveStatus("completed")).toBe(false);
			expect(isActiveStatus("blocked")).toBe(false);
			expect(isActiveStatus("on-hold")).toBe(false);
		});
	});

	describe("STATUS_TRANSITIONS", () => {
		it("should define correct transitions", () => {
			expect(STATUS_TRANSITIONS.setup).toBe("implementing");
			expect(STATUS_TRANSITIONS.implementing).toBe("verifying");
			expect(STATUS_TRANSITIONS.verifying).toBe("validating");
			expect(STATUS_TRANSITIONS.validating).toBe("committing");
			expect(STATUS_TRANSITIONS.committing).toBe("completed");
		});
	});

	describe("ACTIVE_STATUSES", () => {
		it("should contain all active statuses", () => {
			expect(ACTIVE_STATUSES).toContain("setup");
			expect(ACTIVE_STATUSES).toContain("implementing");
			expect(ACTIVE_STATUSES).toContain("verifying");
			expect(ACTIVE_STATUSES).toContain("validating");
			expect(ACTIVE_STATUSES).toContain("committing");
			expect(ACTIVE_STATUSES).toHaveLength(5);
		});
	});

	describe("TaskSkillSchema", () => {
		it("should accept valid skills", () => {
			expect(TaskSkillSchema.parse("backend")).toBe("backend");
			expect(TaskSkillSchema.parse("frontend")).toBe("frontend");
			expect(TaskSkillSchema.parse("fullstack")).toBe("fullstack");
			expect(TaskSkillSchema.parse("devops")).toBe("devops");
			expect(TaskSkillSchema.parse("docs")).toBe("docs");
			expect(TaskSkillSchema.parse("development")).toBe("development");
		});

		it("should reject invalid skills", () => {
			expect(() => TaskSkillSchema.parse("invalid")).toThrow();
		});
	});

	describe("SubtaskStatusSchema", () => {
		it("should accept valid subtask statuses", () => {
			expect(SubtaskStatusSchema.parse("pending")).toBe("pending");
			expect(SubtaskStatusSchema.parse("completed")).toBe("completed");
		});

		it("should reject invalid subtask statuses", () => {
			expect(() => SubtaskStatusSchema.parse("in-progress")).toThrow();
		});
	});

	describe("SubtaskSchema", () => {
		it("should accept valid subtasks", () => {
			const subtask = SubtaskSchema.parse({
				id: "1",
				description: "Test subtask",
				status: "pending",
			});
			expect(subtask.id).toBe("1");
			expect(subtask.description).toBe("Test subtask");
			expect(subtask.status).toBe("pending");
		});

		it("should reject subtasks with empty id", () => {
			expect(() =>
				SubtaskSchema.parse({
					id: "",
					description: "Test",
					status: "pending",
				}),
			).toThrow();
		});

		it("should reject subtasks with empty description", () => {
			expect(() =>
				SubtaskSchema.parse({
					id: "1",
					description: "",
					status: "pending",
				}),
			).toThrow();
		});
	});

	describe("TaskFileContentSchema", () => {
		it("should accept valid task file content", () => {
			const content = TaskFileContentSchema.parse({
				id: "1.1.1",
				title: "Test Task",
				description: "Test description",
				status: "not-started",
			});
			expect(content.id).toBe("1.1.1");
			expect(content.skill).toBe("backend"); // default
			expect(content.subtasks).toEqual([]); // default
			expect(content.context).toEqual([]); // default
		});

		it("should accept full task file content", () => {
			const content = TaskFileContentSchema.parse({
				id: "1.1.1",
				title: "Test Task",
				description: "Test description",
				status: "implementing",
				skill: "frontend",
				subtasks: [{ id: "1", description: "Subtask 1", status: "completed" }],
				context: ["file1.ts", "file2.ts"],
				blockedReason: "Waiting for API",
			});
			expect(content.skill).toBe("frontend");
			expect(content.status).toBe("implementing");
			expect(content.subtasks).toHaveLength(1);
		});

		it("should reject invalid task ID format", () => {
			expect(() =>
				TaskFileContentSchema.parse({
					id: "1.1", // Missing third part
					title: "Test",
					description: "Test",
					status: "not-started",
				}),
			).toThrow();
		});

		it("should accept all active statuses", () => {
			for (const status of ACTIVE_STATUSES) {
				const content = TaskFileContentSchema.parse({
					id: "1.1.1",
					title: "Test",
					description: "Test",
					status,
				});
				expect(content.status).toBe(status);
			}
		});
	});

	describe("TaskRefSchema", () => {
		it("should accept valid task reference", () => {
			const taskRef = TaskRefSchema.parse({
				id: "1.1.1",
				title: "Test Task",
				status: "not-started",
				dependencies: ["1.1.0"],
			});
			expect(taskRef.dependencies).toEqual(["1.1.0"]);
		});

		it("should default dependencies to empty array", () => {
			const taskRef = TaskRefSchema.parse({
				id: "1.1.1",
				title: "Test Task",
				status: "not-started",
			});
			expect(taskRef.dependencies).toEqual([]);
		});
	});

	describe("StorySchema", () => {
		it("should accept valid story", () => {
			const story = StorySchema.parse({
				id: "1.1",
				title: "Test Story",
				status: "not-started",
				tasks: [
					{
						id: "1.1.0",
						title: "Task 0",
						status: "not-started",
						dependencies: [],
					},
				],
			});
			expect(story.tasks).toHaveLength(1);
		});

		it("should reject invalid story ID format", () => {
			expect(() =>
				StorySchema.parse({
					id: "1.1.1", // Should be N.M, not N.M.K
					title: "Test",
					status: "not-started",
					tasks: [],
				}),
			).toThrow();
		});
	});

	describe("FeatureSchema", () => {
		it("should accept valid feature", () => {
			const feature = FeatureSchema.parse({
				id: "1",
				title: "Test Feature",
				status: "not-started",
				stories: [],
			});
			expect(feature.id).toBe("1");
		});

		it("should reject invalid feature ID", () => {
			expect(() =>
				FeatureSchema.parse({
					id: "1.1", // Should be just N
					title: "Test",
					status: "not-started",
					stories: [],
				}),
			).toThrow();
		});
	});

	describe("FeatureRefSchema", () => {
		it("should accept valid feature reference", () => {
			const ref = FeatureRefSchema.parse({
				id: "1",
				title: "Test Feature",
				status: "not-started",
				path: "F1-test-feature",
			});
			expect(ref.path).toBe("F1-test-feature");
		});

		it("should reject empty path", () => {
			expect(() =>
				FeatureRefSchema.parse({
					id: "1",
					title: "Test",
					status: "not-started",
					path: "",
				}),
			).toThrow();
		});
	});

	describe("ProjectIndexSchema", () => {
		it("should accept valid project index", () => {
			const index = ProjectIndexSchema.parse({
				project: "Test Project",
				features: [
					{
						id: "1",
						title: "Feature 1",
						status: "not-started",
						path: "F1-feature-1",
					},
				],
			});
			expect(index.project).toBe("Test Project");
			expect(index.features).toHaveLength(1);
		});

		it("should reject empty project name", () => {
			expect(() =>
				ProjectIndexSchema.parse({
					project: "",
					features: [],
				}),
			).toThrow();
		});
	});

	describe("CriticalitySchema", () => {
		it("should accept valid criticality levels", () => {
			expect(CriticalitySchema.parse("Low")).toBe("Low");
			expect(CriticalitySchema.parse("Medium")).toBe("Medium");
			expect(CriticalitySchema.parse("High")).toBe("High");
			expect(CriticalitySchema.parse("Critical")).toBe("Critical");
		});

		it("should reject invalid criticality", () => {
			expect(() => CriticalitySchema.parse("low")).toThrow();
			expect(() => CriticalitySchema.parse("Invalid")).toThrow();
		});
	});

	describe("ErrorCategorySchema", () => {
		it("should accept valid error categories", () => {
			expect(ErrorCategorySchema.parse("Type Error")).toBe("Type Error");
			expect(ErrorCategorySchema.parse("Lint")).toBe("Lint");
			expect(ErrorCategorySchema.parse("Architecture")).toBe("Architecture");
			expect(ErrorCategorySchema.parse("Runtime")).toBe("Runtime");
			expect(ErrorCategorySchema.parse("Build")).toBe("Build");
			expect(ErrorCategorySchema.parse("Test")).toBe("Test");
			expect(ErrorCategorySchema.parse("Formatting")).toBe("Formatting");
		});
	});

	describe("validateTaskFileContent", () => {
		it("should validate and return task file content", () => {
			const result = validateTaskFileContent({
				id: "1.1.1",
				title: "Test",
				description: "Test desc",
				status: "not-started",
			});
			expect(result.id).toBe("1.1.1");
		});

		it("should throw on invalid data", () => {
			expect(() => validateTaskFileContent({ id: "invalid" })).toThrow();
		});
	});

	describe("validateFeature", () => {
		it("should validate and return feature", () => {
			const result = validateFeature({
				id: "1",
				title: "Test Feature",
				status: "not-started",
				stories: [],
			});
			expect(result.id).toBe("1");
		});

		it("should throw on invalid data", () => {
			expect(() => validateFeature({ id: "1.1" })).toThrow();
		});
	});

	describe("validateProjectIndex", () => {
		it("should validate and return project index", () => {
			const result = validateProjectIndex({
				project: "Test",
				features: [],
			});
			expect(result.project).toBe("Test");
		});

		it("should throw on invalid data", () => {
			expect(() => validateProjectIndex({ project: "" })).toThrow();
		});
	});

	describe("isValidTaskId", () => {
		it("should return true for valid task IDs", () => {
			expect(isValidTaskId("1.1.1")).toBe(true);
			expect(isValidTaskId("1.1.0")).toBe(true);
			expect(isValidTaskId("10.20.30")).toBe(true);
		});

		it("should return false for invalid task IDs", () => {
			expect(isValidTaskId("1.1")).toBe(false);
			expect(isValidTaskId("1")).toBe(false);
			expect(isValidTaskId("1.1.1.1")).toBe(false);
			expect(isValidTaskId("a.b.c")).toBe(false);
			expect(isValidTaskId("")).toBe(false);
		});
	});

	describe("isValidStoryId", () => {
		it("should return true for valid story IDs", () => {
			expect(isValidStoryId("1.1")).toBe(true);
			expect(isValidStoryId("10.20")).toBe(true);
		});

		it("should return false for invalid story IDs", () => {
			expect(isValidStoryId("1")).toBe(false);
			expect(isValidStoryId("1.1.1")).toBe(false);
			expect(isValidStoryId("a.b")).toBe(false);
		});
	});

	describe("isValidFeatureId", () => {
		it("should return true for valid feature IDs", () => {
			expect(isValidFeatureId("1")).toBe(true);
			expect(isValidFeatureId("10")).toBe(true);
		});

		it("should return false for invalid feature IDs", () => {
			expect(isValidFeatureId("1.1")).toBe(false);
			expect(isValidFeatureId("a")).toBe(false);
			expect(isValidFeatureId("")).toBe(false);
		});
	});

	describe("parseTaskId", () => {
		it("should parse valid task ID", () => {
			const result = parseTaskId("1.2.3");
			expect(result).toEqual({
				featureId: "1",
				storyId: "1.2",
				taskNumber: "3",
			});
		});

		it("should parse task ID with larger numbers", () => {
			const result = parseTaskId("10.20.30");
			expect(result).toEqual({
				featureId: "10",
				storyId: "10.20",
				taskNumber: "30",
			});
		});

		it("should return null for invalid task ID", () => {
			expect(parseTaskId("1.1")).toBeNull();
			expect(parseTaskId("invalid")).toBeNull();
			expect(parseTaskId("")).toBeNull();
		});
	});
});
