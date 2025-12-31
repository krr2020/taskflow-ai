---
name: ai-protocol
description: Core operating discipline for AI coding agents. Establishes thinking patterns, execution modes, and quality standards. Follow this protocol to produce code that matches team standards and avoids common AI pitfalls.
---

## Operating Modes

Before taking any action, determine the appropriate depth of analysis:

- **REACTIVE**: Simple fixes, clear requirements, single-file changes. Brief rationale, immediate execution. No preamble, no options, just solve the problem.
- **ANALYTICAL**: Multi-file changes, pattern matching needed, moderate complexity. State the approach in 2-3 sentences, list files to modify, execute systematically.
- **ULTRATHINK**: Architecture decisions, security implications, new patterns, complex integrations. Full analysis—understand context, consider alternatives, plan the approach, execute carefully, verify the result.

**CRITICAL**: Default to REACTIVE. Upgrade only when complexity demands it. The key is appropriate depth, not impressive analysis. Simple problems deserve simple solutions.

## Core Discipline

Before writing any code, commit to a DISCOVERY-FIRST approach:

- **Search First**: Your first action is always search. Find existing implementations. Study current patterns. Understand how similar problems were solved. Never invent what you can match.
- **RETROSPECTIVE is Law**: Check `.taskflow/ref/RETROSPECTIVE.md` before every task. These are mistakes already made. Making them again is unacceptable.
- **Match, Don't Invent**: The codebase has conventions. Your job is to follow them precisely. Your code should be indistinguishable from what the team already built.
- **Verify Before Declaring**: Import paths exist. Types are correct. Functions are called properly. Confirm these before saying "done."

**CRITICAL**: The most common AI mistake is generating plausible-looking code that doesn't match project patterns. Discovery prevents this. The key is fitting in, not standing out.

## Execution Rules

Follow this sequence for every implementation:

1. **Read completely** — Understand the full task before touching code
2. **Search for similar** — Find existing implementations to match
3. **Verify imports** — Confirm paths, packages, and types exist
4. **Handle errors** — Every external call can fail
5. **Run validation** — Type check, lint, test before declaring complete
6. **Check retrospective** — Confirm you haven't repeated known mistakes

## What NOT To Do

Avoid these patterns that plague AI-generated code:

- Guessing import paths instead of verifying they exist
- Declaring "done" without running validation
- Adding features or improvements not requested
- Skipping error handling for "simple" operations
- Creating new patterns when existing ones work
- Using `any` to bypass type checking
- Ignoring linter warnings because "it works"
- Generating code before reading existing implementations

## TaskFlow Integration

When working within the TaskFlow framework:

- **Trust the CLI output** — Every command shows OUTPUT and NEXT STEPS sections. Read them completely and follow exactly.
- **Never bypass the workflow** — The state machine (SETUP → PLANNING → IMPLEMENTING → VERIFYING → VALIDATING → COMMITTING) exists for quality. Don't skip states.
- **Use `pnpm task do` for guidance** — It provides state-specific instructions. Don't guess what to do next.
- **Respect file boundaries** — NEVER edit files in `.taskflow/` or `tasks/`. Use `pnpm task` commands for all task management.
- **Follow NEXT STEPS religiously** — The CLI tells you exactly what to do next. Don't improvise.

**CRITICAL**: The TaskFlow CLI is your guide. Its standardized output format (OUTPUT + NEXT STEPS + AI WARNINGS) is designed to keep you on track. Read every section, follow every instruction.

## Context Management

### Context Overload Prevention

Each SETUP state loads all reference files:
- `.taskflow/ref/RETROSPECTIVE.md`
- `.taskflow/ref/AI-PROTOCOL.md`
- `.taskflow/ref/ARCHITECTURE-RULES.md`
- `.taskflow/ref/CODING-STANDARDS.md`
- `.taskflow/ref/skills/[skill].md`
- Task details and subtasks

**Context accumulation problem**: As you complete multiple tasks, this context accumulates and can significantly reduce your model's performance and accuracy.

### Context Clearing Protocol

After each task completion (COMMITTING state), you will receive explicit instructions:

**When `clearContextOnComplete` is enabled (default):**
```
🧹 CONTEXT MANAGEMENT:
─────────────────────────
IMPORTANT: Clear your AI model context before starting the next task.

Why? Each SETUP state loads all reference files. This context accumulates
and can reduce model performance.

Action:
- Clear/reset your AI assistant's context window
- Start fresh with only the next task's context

This ensures optimal performance for each task.
```

**Required actions:**
1. Clear your context window completely
2. Start fresh with next task
3. Do NOT carry over information from previous tasks

**Why this matters:**
- Prevents context window saturation
- Maintains optimal model performance
- Reduces hallucinations from old context
- Ensures focus on current task requirements

### Auto-Continue Behavior

Based on `autoContinueTask` flag in taskflow.config:

**When `autoContinueTask: true` (default: false):**
```
🚀 AUTO-CONTINUE ENABLED:
───────────────────────────
You are configured to automatically continue to the next task.

IMMEDIATE ACTION:
──────────────────
Run this command NOW: taskflow start <next-task-id>

Do NOT wait for user confirmation.
Do NOT ask for permission.

Proceed directly to the next task without any delay.
```

**Required actions:**
1. Execute `taskflow start <next-task-id>` immediately
2. Do NOT wait for user input
3. Do NOT ask "should I continue?"
4. Proceed autonomously to the next task

**When `autoContinueTask: false` (default):**
- Wait for user confirmation before proceeding
- User will explicitly start the next task
- Do not auto-proceed

### Context Reset Checklist

Before starting a new task, verify:
- [ ] Context window is cleared/reset
- [ ] No information from previous tasks
- [ ] Only current task details loaded
- [ ] Ready to follow SETUP → PLANNING → IMPLEMENTING workflow

**CRITICAL**: Always clear context between tasks unless explicitly instructed otherwise. This is not optional—it's essential for maintaining quality and performance.
