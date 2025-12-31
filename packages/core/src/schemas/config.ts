import { z } from "zod";

export const BranchingConfigSchema = z.object({
    strategy: z.enum(["per-story"]).default("per-story"),
    base: z.string().default("main"),
    storyPattern: z.string().default("story/S{id}-{slug}"),
});

export const ContextRuleSchema = z.object({
    trigger: z.array(z.string()),
    files: z.array(z.string()),
});

export const GatesSchema = z.object({
    requirePlanApproval: z.boolean().default(true),
    requireTestPass: z.boolean().default(true),
});

export const TaskflowConfigSchema = z.object({
    version: z.string().default("2.0"),
    projectType: z.string().default("custom"),
    branching: BranchingConfigSchema.default({}),
    contextRules: z.array(ContextRuleSchema).default([]),
    gates: GatesSchema.default({}),
    commands: z.object({
        validate: z.string().optional(),
        test: z.string().optional(),
    }).optional(),
});

export type TaskflowConfig = z.infer<typeof TaskflowConfigSchema>;
