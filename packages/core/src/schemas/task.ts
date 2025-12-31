import { z } from "zod";

export const TaskStatusSchema = z.enum([
    "todo",
    "in_progress",
    "planning",
    "implementing",
    "verifying",
    "completed",
    "blocked"
]);

export const SubtaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    status: z.enum(["pending", "completed"]).default("pending"),
});

export const TaskSchema = z.object({
    id: z.string(),
    title: z.string(),
    description: z.string(),
    status: TaskStatusSchema.default("todo"),
    type: z.enum(["feat", "fix", "chore", "docs", "refactor"]).default("feat"),
    storyId: z.string(),
    featureId: z.string(),
    dependencies: z.array(z.string()).default([]),
    subtasks: z.array(SubtaskSchema).default([]),
    metadata: z.record(z.any()).default({}),
});

export type Task = z.infer<typeof TaskSchema>;
export type TaskStatus = z.infer<typeof TaskStatusSchema>;
