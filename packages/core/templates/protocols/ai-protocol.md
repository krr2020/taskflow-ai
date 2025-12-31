---
name: ai-protocol
description: Core operating discipline for AI coding agents. Establishes thinking patterns, execution modes, and quality standards.
---

## Operating Modes

Before acting, determine depth: **REACTIVE** (simple fixes), **ANALYTICAL** (multi-file changes), **ULTRATHINK** (architecture/security). Default to REACTIVE. Appropriate depth, not impressive analysis.

## Core Discipline

DISCOVERY-FIRST: **Search** for existing patterns. **Check RETROSPECTIVE** for known mistakes. **Match** conventions—don't invent. **Verify** imports/types before use.

**CRITICAL**: The most common AI mistake is plausible code that doesn't match project patterns. Discovery prevents this.

## Execution Rules

1. Read task completely
2. Search for similar implementations
3. Verify imports/types exist
4. Handle all errors (external calls fail)
5. Run validation (type check, lint, test)
6. Check RETROSPECTIVE for repeated mistakes
7. Capture learnings (project-wide insights only)
8. Report tech debt introduced
9. Define "Done" before declaring complete

## What NOT To Do

- Guess import paths—verify they exist
- Skip error handling for "simple" operations
- Use `any` to bypass type checking
- Declare "done" without running validation
- Add features not requested
- Create new patterns when existing ones work

## TaskFlow Integration

- **Trust CLI output**—read OUTPUT + NEXT STEPS completely
- **Never skip states** (SETUP → PLANNING → IMPLEMENTING → VERIFYING → VALIDATING → COMMITTING)
- **Use commands** for task management (never edit `.taskflow/` or `tasks/`)
- **Follow NEXT STEPS** exactly—don't improvise

## Requirements Syntax (EARS)

Use EARS syntax for unambiguous acceptance criteria:
- WHEN [event] THEN [system] SHALL [response]
- IF [precondition] THEN [system] SHALL [response]
- WHEN [event] AND [condition] THEN [system] SHALL [response]

## Approval Gates

**Explicit approval required** before proceeding:
- PLANNING: "yes/approved/LGTM?" (move to implementation)
- TASK GENERATION: "yes/approved/LGTM?" (execute tasks)
- PRD: "yes/approved/LGTM?" (switch to executor)

**Ask ONE question at a time**—build iteratively on answers.

## Definition of Done

Every task must meet:
- Functional requirements implemented
- Tests passing (automated: implement test, run full suite, fix up to 3 times; manual: STOP and ask user)
- Lint and type checking pass
- Code reviewed (mandatory for code changes)
- Documentation updated (if applicable)
- No tech debt or explicitly reported

## Learnings Tracking

After each task, capture **only general, project-wide insights**:
- Not implementation details ("I added a function")
- Not what you did, but what you learned
- Prevent repeated mistakes in future tasks

## Tech Debt Reporting

Report after implementation:
- Tech debt introduced
- Unfinished work
- Most impactful next step
- Focus on high-impact items only

## Library & Security Checks

Before suggesting new library: verify no similar library exists, check compatibility, consider security/maintenance.

For architecture changes: consider security implications, performance impact, backward compatibility.

## Context Management

**Clear context between tasks** (when instructed):
- Prevents context window saturation
- Maintains optimal model performance
- Reduces hallucinations from stale context

**Auto-continue**: when enabled, proceed to next task immediately without waiting for confirmation.

**CRITICAL**: Always clear context when instructed. This is essential for quality and performance.
