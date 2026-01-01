/**
 * Unit tests for types and schemas
 */

import { describe, expect, it } from "vitest";
import {
	FeatureSchema,
	parseTaskId,
	STATUS_TRANSITIONS,
	StorySchema,
	TaskFileContentSchema,
	TaskRefSchema,
	TaskStatusSchema,
} from "../../src/lib/types.js";

describe("Types and Schemas", () => {
	describe("TaskStatusSchema", () => {
		it("should validate valid task statuses", () => {
			const validStatuses = [
				"not-started",
				"setup",
				"implementing",
				"verifying",
				"validating",
				"committing",
				"completed",
				"blocked",
				"on-hold",
			];

			for (const status of validStatuses) {
				expect(() => TaskStatusSchema.parse(status)).not.toThrow();
			}
		});

		it("should reject invalid task statuses", () => {
			expect(() => TaskStatusSchema.parse("invalid")).toThrow();
			expect(() => TaskStatusSchema.parse("in-progress")).toThrow();
		});
	});

	describe("TaskFileContentSchema", () => {
		it("should validate valid task content", () => {
			const validTask = {
				id: "1.1.0",
				title: "Test Task",
				description: "Test description",
				status: "not-started",
				skill: "backend",
			};

			const result = TaskFileContentSchema.parse(validTask);
			expect(result.id).toBe("1.1.0");
			expect(result.skill).toBe("backend");
		});

		it("should reject invalid task ID format", () => {
			const invalidTask = {
				id: "1.1", // Should be N.M.K
				title: "Test Task",
				description: "Test description",
				status: "not-started",
			};

			expect(() => TaskFileContentSchema.parse(invalidTask)).toThrow();
		});

		it("should use default values for optional fields", () => {
			const minimalTask = {
				id: "1.1.0",
				title: "Test Task",
				description: "Test description",
				status: "not-started",
			};

			const result = TaskFileContentSchema.parse(minimalTask);
			expect(result.skill).toBe("backend"); // Default value
			expect(result.subtasks).toEqual([]); // Default value
			expect(result.context).toEqual([]); // Default value
		});
	});

	describe("TaskRefSchema", () => {
		it("should validate valid task reference", () => {
			const validRef = {
				id: "1.1.0",
				title: "Test Task",
				status: "not-started",
				dependencies: ["1.1.1", "1.2.0"],
			};

			const result = TaskRefSchema.parse(validRef);
			expect(result.dependencies).toHaveLength(2);
		});

		it("should use empty array for dependencies by default", () => {
			const minimalRef = {
				id: "1.1.0",
				title: "Test Task",
				status: "not-started",
			};

			const result = TaskRefSchema.parse(minimalRef);
			expect(result.dependencies).toEqual([]);
		});
	});

	describe("StorySchema", () => {
		it("should validate valid story", () => {
			const validStory = {
				id: "1.1",
				title: "Test Story",
				status: "not-started",
				tasks: [
					{
						id: "1.1.0",
						title: "Task 1",
						status: "not-started",
						dependencies: [],
					},
				],
			};

			const result = StorySchema.parse(validStory);
			expect(result.tasks).toHaveLength(1);
		});

		it("should reject invalid story ID format", () => {
			const invalidStory = {
				id: "1", // Should be N.M
				title: "Test Story",
				status: "not-started",
				tasks: [],
			};

			expect(() => StorySchema.parse(invalidStory)).toThrow();
		});
	});

	describe("FeatureSchema", () => {
		it("should validate valid feature", () => {
			const validFeature = {
				id: "1",
				title: "Test Feature",
				status: "not-started",
				stories: [
					{
						id: "1.1",
						title: "Story 1",
						status: "not-started",
						tasks: [],
					},
				],
			};

			const result = FeatureSchema.parse(validFeature);
			expect(result.stories).toHaveLength(1);
		});

		it("should reject invalid feature ID format", () => {
			const invalidFeature = {
				id: "1.1", // Should be just N
				title: "Test Feature",
				status: "not-started",
				stories: [],
			};

			expect(() => FeatureSchema.parse(invalidFeature)).toThrow();
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

		it("should return null for invalid task ID", () => {
			expect(parseTaskId("1.2")).toBeNull();
			expect(parseTaskId("invalid")).toBeNull();
			expect(parseTaskId("1")).toBeNull();
		});
	});

	describe("STATUS_TRANSITIONS", () => {
		it("should define correct status transitions", () => {
			expect(STATUS_TRANSITIONS.setup).toBe("planning");
			expect(STATUS_TRANSITIONS.planning).toBe("implementing");
			expect(STATUS_TRANSITIONS.implementing).toBe("verifying");
			expect(STATUS_TRANSITIONS.verifying).toBe("validating");
			expect(STATUS_TRANSITIONS.validating).toBe("committing");
			expect(STATUS_TRANSITIONS.committing).toBe("completed");
		});
	});
});
