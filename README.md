# TaskFlow - AI Task Management Framework

A structured task management CLI framework designed for AI-assisted development workflows. TaskFlow enforces a consistent workflow pattern to ensure quality, traceability, and automated validation at every step.

## Table of Contents

- [Overview](#overview)
- [Architecture](#architecture)
- [Workflow States](#workflow-states)
- [Commands](#commands)
- [Task Structure](#task-structure)
- [Flow Diagrams](#flow-diagrams)
- [Error Handling](#error-handling)
- [Retrospective System](#retrospective-system)

---

## Overview

TaskFlow provides a state-machine-based workflow for executing development tasks. Each task progresses through defined states with validation gates, ensuring:

- **Consistency**: Every task follows the same execution pattern with standardized OUTPUT/NEXT STEPS format
- **Traceability**: Git commits are linked to specific tasks
- **Quality**: Automated validation before commits with state-specific guidance
- **Learning**: Error patterns are tracked for prevention via retrospective system
- **AI-Friendly**: Clear DO/DON'T instructions at each workflow state

---

## Architecture

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TASKFLOW ARCHITECTURE                         │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌──────────────┐    ┌──────────────┐    ┌──────────────┐               │
│  │   CLI Layer  │───▶│   Commands   │───▶│  Lib Modules │               │
│  │   (cli.ts)   │    │  (10 files)  │    │  (8 files)   │               │
│  └──────────────┘    └──────────────┘    └──────────────┘               │
│         │                   │                   │                       │
│         ▼                   ▼                   ▼                       │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │            STANDARDIZED OUTPUT FORMAT                   │            │
│  │  Every command outputs: OUTPUT + NEXT STEPS + WARNINGS  │            │
│  └─────────────────────────────────────────────────────────┘            │
│         │                   │                   │                       │
│         ▼                   ▼                   ▼                       │
│  ┌─────────────────────────────────────────────────────────┐            │
│  │                     DATA LAYER                          │            │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐      │            │
│  │  │project-index│  │  Features   │  │   Tasks     │      │            │
│  │  │   .json     │  │  (F*.json)  │  │  (T*.json)  │      │            │
│  │  └─────────────┘  └─────────────┘  └─────────────┘      │            │
│  └─────────────────────────────────────────────────────────┘            │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Module Structure

```
.taskflow/
├── src/
│   ├── cli.ts                 # Entry point with Commander.js
│   ├── commands/              # Command implementations
│   │   ├── start.ts           # Begin task session
│   │   ├── do.ts              # Show state-specific instructions (varies by state)
│   │   ├── check.ts           # Validate and advance state
│   │   ├── commit.ts          # Git commit and push (completes task)
│   │   ├── status.ts          # View progress
│   │   ├── next.ts            # Find next task
│   │   ├── resume.ts          # Resume interrupted session
│   │   ├── skip.ts            # Block a task
│   │   ├── retro.ts           # Manage error patterns
│   │   └── help.ts            # Display help
│   └── lib/                   # Core library modules
│       ├── types.ts           # TypeScript types & Zod schemas
│       ├── config.ts          # Configuration constants
│       ├── errors.ts          # Custom error classes
│       ├── data-access.ts     # JSON file operations
│       ├── git.ts             # Git operations
│       ├── validation.ts      # Validation runner
│       ├── output.ts          # Terminal output utilities
│       └── retrospective.ts   # Error pattern tracking
├── tests/                     # 340 unit tests
├── ref/                       # Reference documentation
└── README.md                  # This file
```

---

## Task Status Flow

Tasks progress through a unified status flow:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TASK STATUS FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────┐  ┌───────┐  ┌─────────────┐  ┌──────────┐  ┌──────────┐ │
│  │not-started│─▶│ setup │─▶│implementing │─▶│verifying │─▶│validating│ │
│  └───────────┘  └───────┘  └─────────────┘  └──────────┘  └──────────┘ │
│                                                                │         │
│                                                                ▼         │
│                     ┌───────────┐    ┌──────────┐                       │
│                     │ completed │◀───│committing│                       │
│                     └───────────┘    └──────────┘                       │
│                                                                          │
│  Other states: blocked, on-hold                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

| Status | Description | Transition |
|--------|-------------|------------|
| **not-started** | Task has not been started | → setup (via `start`) |
| **setup** | Reading task requirements, understanding context | → implementing (via `check`) |
| **implementing** | Writing code, implementing the feature | → verifying (via `check`) |
| **verifying** | Self-reviewing the implementation | → validating (via `check`) |
| **validating** | Running automated checks (lint, type-check, arch) | → committing (via `check`) |
| **committing** | Ready to commit and push | → completed (via `commit`) |
| **completed** | Task finished | Terminal state |
| **blocked** | Task blocked by external issue | Via `skip` command |
| **on-hold** | Task paused | Manual update |

---

## Commands

### Primary Workflow

| Command | Description | Status Transition |
|---------|-------------|-------------------|
| `pnpm task start <id>` | Start a task session (resumes if already active) | not-started → setup |
| `pnpm task do` | Show state-specific instructions (changes per state) | (no change) |
| `pnpm task check` | Validate and advance to next status | Current → Next (or runs validations) |
| `pnpm task commit "..."` | Commit and push changes with bullet points | committing → completed |

### Navigation

| Command | Description |
|---------|-------------|
| `pnpm task status` | Show project overview |
| `pnpm task status <id>` | Show feature/story details |
| `pnpm task next` | Find next available task |

### Recovery

| Command | Description |
|---------|-------------|
| `pnpm task resume` | Resume an interrupted session |
| `pnpm task skip --reason "..."` | Mark task as blocked |

### Retrospective

| Command | Description |
|---------|-------------|
| `pnpm task retro add` | Add new error pattern |
| `pnpm task retro list` | List known error patterns |

---

## Task Structure

### Hierarchy

```
Project
└── Features (F1, F2, ...)
    └── Stories (S1.1, S1.2, ...)
        └── Tasks (T1.1.0, T1.1.1, ...)
```

### Task File Schema

```json
{
  "id": "1.1.0",
  "title": "Implement user authentication",
  "description": "Add login/logout functionality",
  "status": "not-started",
  "skill": "backend",
  "subtasks": [
    { "id": "1", "description": "Create auth endpoints", "status": "pending" },
    { "id": "2", "description": "Add session management", "status": "pending" }
  ],
  "context": [
    "See auth requirements in docs/auth.md"
  ]
}
```

### Task Status Values

| Status | Description |
|--------|-------------|
| `not-started` | Task has not been started |
| `setup` | Reading context and requirements |
| `implementing` | Writing code |
| `verifying` | Self-reviewing implementation |
| `validating` | Running automated checks |
| `committing` | Ready to commit and push |
| `completed` | Task is finished |
| `blocked` | Task is blocked by an issue |
| `on-hold` | Task is paused |

### Feature & Story Status Values

Features and Stories use a simplified status set:

| Status | Description |
|--------|-------------|
| `not-started` | No work has begun |
| `in-progress` | Work is actively being done (contains active tasks) |
| `completed` | All tasks/stories are completed |
| `blocked` | Progress is blocked |
| `on-hold` | Progress is paused |

---

## Flow Diagrams

### Complete Happy Path Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            HAPPY PATH WORKFLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Developer                          CLI                           System    │
│     │                                │                               │       │
│     │  pnpm task start 1.1.0         │                               │       │
│     │───────────────────────────────▶│                               │       │
│     │                                │  Check no active session      │       │
│     │                                │  Verify branch                │       │
│     │                                │  Check dependencies           │       │
│     │                                │───────────────────────────────▶│      │
│     │                                │  Update status: setup         │       │
│     │◀───────────────────────────────│                               │       │
│     │  "Task started! Run: do"       │                               │       │
│     │                                │                               │       │
│     │  pnpm task do                  │                               │       │
│     │───────────────────────────────▶│                               │       │
│     │                                │  Display setup instructions   │       │
│     │◀───────────────────────────────│                               │       │
│     │                                │                               │       │
│     │  pnpm task check               │                               │       │
│     │───────────────────────────────▶│                               │       │
│     │                                │  Advance to implementing      │       │
│     │◀───────────────────────────────│                               │       │
│     │                                │                               │       │
│     │  pnpm task do                  │                               │       │
│     │───────────────────────────────▶│                               │       │
│     │                                │  Show protocols & task details│       │
│     │◀───────────────────────────────│                               │       │
│     │                                │                               │       │
│     │  (Developer writes code...)    │                               │       │
│     │                                │                               │       │
│     │  pnpm task check               │                               │       │
│     │───────────────────────────────▶│                               │       │
│     │                                │  Advance to verifying         │       │
│     │◀───────────────────────────────│                               │       │
│     │                                │                               │       │
│     │  pnpm task check               │                               │       │
│     │───────────────────────────────▶│                               │       │
│     │                                │  Advance to validating        │       │
│     │◀───────────────────────────────│                               │       │
│     │                                │                               │       │
│     │  pnpm task check               │                               │       │
│     │───────────────────────────────▶│                               │       │
│     │                                │  Run: biome:fix               │       │
│     │                                │  Run: type-check              │       │
│     │                                │  Run: biome:check             │       │
│     │                                │  Run: arch:validate           │       │
│     │                                │───────────────────────────────▶│      │
│     │                                │         All passed ✓          │       │
│     │                                │  Advance to committing        │       │
│     │◀───────────────────────────────│                               │       │
│     │                                │                               │       │
│     │  pnpm task commit "..."        │                               │       │
│     │───────────────────────────────▶│                               │       │
│     │                                │  Generate commit message      │       │
│     │                                │  git add .                    │       │
│     │                                │  git commit                   │       │
│     │                                │  git push                     │       │
│     │                                │  Update status: completed     │       │
│     │                                │  Find next available task     │       │
│     │                                │───────────────────────────────▶│      │
│     │◀───────────────────────────────│                               │       │
│     │  "Task completed! Next: 1.1.1" │                               │       │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Validation Failure Scenario

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         VALIDATION FAILURE FLOW                              │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  [Status: validating]                                                        │
│        │                                                                     │
│        ▼                                                                     │
│  ┌─────────────┐                                                             │
│  │ pnpm task   │                                                             │
│  │   check     │                                                             │
│  └──────┬──────┘                                                             │
│         │                                                                    │
│         ▼                                                                    │
│  ┌─────────────────────────────────────────────────────┐                    │
│  │              RUN VALIDATIONS                        │                    │
│  │  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐ │                    │
│  │  │ biome:fix   │  │ type-check  │  │biome:check  │ │                    │
│  │  └──────┬──────┘  └──────┬──────┘  └──────┬──────┘ │                    │
│  │         │                │                │        │                    │
│  │         ▼                ▼                ▼        │                    │
│  │        ✓ Pass          ✗ FAIL           (skip)    │                    │
│  └─────────────────────────┬───────────────────────────┘                    │
│                            │                                                 │
│                            ▼                                                 │
│  ┌─────────────────────────────────────────────────────┐                    │
│  │           CHECK RETROSPECTIVE                       │                    │
│  │                                                     │                    │
│  │   Is this a KNOWN error pattern?                    │                    │
│  │         │                    │                      │                    │
│  │        YES                  NO                      │                    │
│  │         │                    │                      │                    │
│  │         ▼                    ▼                      │                    │
│  │   Display solution     Prompt to add                │                    │
│  │   from retrospective   new pattern                  │                    │
│  └─────────────────────────┬───────────────────────────┘                    │
│                            │                                                 │
│                            ▼                                                 │
│  ┌─────────────────────────────────────────────────────┐                    │
│  │                 DEVELOPER ACTION                    │                    │
│  │                                                     │                    │
│  │  1. Read error summary in terminal                  │                    │
│  │  2. Check full log: .taskflow/logs/                 │                    │
│  │  3. Fix the error in code                           │                    │
│  │  4. (Optional) Add to retrospective:                │                    │
│  │     pnpm task retro add --category "Type Error" ... │                    │
│  │  5. Re-run: pnpm task check                         │                    │
│  └─────────────────────────────────────────────────────┘                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Session Recovery Scenarios

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          RECOVERY SCENARIOS                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  SCENARIO 1: Interrupted Session                                             │
│  ───────────────────────────────                                             │
│                                                                              │
│  [Session interrupted - context lost, task still active]                     │
│        │                                                                     │
│        ▼                                                                     │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐        │
│  │ pnpm task       │────▶│ Find task with  │────▶│ Set status to   │        │
│  │   resume        │     │ active status   │     │ implementing    │        │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘        │
│                                                          │                   │
│                                                          ▼                   │
│                                                  ┌─────────────────┐        │
│                                                  │ Continue with   │        │
│                                                  │ pnpm task do    │        │
│                                                  └─────────────────┘        │
│                                                                              │
│  SCENARIO 2: Blocked Task                                                    │
│  ────────────────────────                                                    │
│                                                                              │
│  [Task cannot proceed - external blocker]                                    │
│        │                                                                     │
│        ▼                                                                     │
│  ┌─────────────────────────────────────────────┐                            │
│  │ pnpm task skip --reason "Waiting for API"   │                            │
│  └─────────────────┬───────────────────────────┘                            │
│                    │                                                         │
│                    ▼                                                         │
│  ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐        │
│  │ Mark task as    │────▶│ Clear session   │────▶│ Find next       │        │
│  │ blocked         │     │                 │     │ available task  │        │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘        │
│                                                                              │
│  SCENARIO 3: Start with Different Active Session                            │
│  ─────────────────────────────────────                                      │
│                                                                              │
│  [Try to start Task 2.1.0 while Task 1.1.0 is active]                       │
│        │                                                                     │
│        ▼                                                                     │
│  ┌─────────────────┐                                                         │
│  │ pnpm task start │                                                         │
│  │   2.1.0         │                                                         │
│  └────────┬────────┘                                                         │
│           │                                                                  │
│           ▼                                                                  │
│  ┌─────────────────────────────────────────────┐                            │
│  │  ❌ ERROR: ActiveSessionExistsError         │                            │
│  │                                             │                            │
│  │  "Active session exists for task 1.1.0"     │                            │
│  │                                             │                            │
│  │  Options:                                   │                            │
│  │  - Complete current: pnpm task commit "..." │                            │
│  │  - Skip current: pnpm task skip --reason "" │                            │
│  └─────────────────────────────────────────────┘                            │
│                                                                              │
│  Note: Running start on the *active* task (1.1.0) will                       │
│  simply resume the session without error.                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Git Workflow Integration

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                          GIT WORKFLOW INTEGRATION                            │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Branch Strategy: One branch per Story                                       │
│  ─────────────────────────────────────                                       │
│                                                                              │
│  main                                                                        │
│    │                                                                         │
│    ├── story/S1.1-user-authentication                                        │
│    │     ├── T1.1.0 commit                                                   │
│    │     ├── T1.1.1 commit                                                   │
│    │     └── T1.1.2 commit ──────▶ PR ──────▶ merge to main                 │
│    │                                                                         │
│    ├── story/S1.2-user-profile                                               │
│    │     ├── T1.2.0 commit                                                   │
│    │     └── T1.2.1 commit ──────▶ PR ──────▶ merge to main                 │
│    │                                                                         │
│    └── story/S2.1-dashboard                                                  │
│          └── ...                                                             │
│                                                                              │
│  Commit Message Format:                                                      │
│  ──────────────────────                                                      │
│                                                                              │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │  feat(F1): T1.1.0 - Implement user login                        │        │
│  │                                                                  │        │
│  │  - Add login endpoint with JWT                                   │        │
│  │  - Implement password hashing                                    │        │
│  │  - Add session management                                        │        │
│  │                                                                  │        │
│  │  Story: S1.1                                                     │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                              │
│  Branch Verification:                                                        │
│  ────────────────────                                                        │
│                                                                              │
│  Before starting a task, CLI verifies:                                       │
│  1. Current branch matches story branch (auto-switches/creates if needed)   │
│  2. No other story is in-progress                                            │
│  3. Task dependencies are completed                                          │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Complete Error Handling Matrix

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         ERROR HANDLING MATRIX                                │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Error                        │ Trigger                 │ Recovery           │
│  ─────────────────────────────┼─────────────────────────┼───────────────────│
│  NoActiveSessionError         │ do/check/commit/submit  │ pnpm task start   │
│                               │ without active task     │                   │
│  ─────────────────────────────┼─────────────────────────┼───────────────────│
│  ActiveSessionExistsError     │ start while task        │ submit/skip       │
│                               │ in-progress             │ current task      │
│  ─────────────────────────────┼─────────────────────────┼───────────────────│
│  TaskNotFoundError            │ Invalid task ID         │ Check task ID     │
│  ─────────────────────────────┼─────────────────────────┼───────────────────│
│  TaskAlreadyCompletedError    │ Start completed task    │ pnpm task next    │
│  ─────────────────────────────┼─────────────────────────┼───────────────────│
│  DependencyNotMetError        │ Start task with         │ Complete          │
│                               │ incomplete dependencies │ dependencies first│
│  ─────────────────────────────┼─────────────────────────┼───────────────────│
│  WrongBranchError             │ Not on story branch     │ git checkout      │
│                               │                         │ story/S...        │
│  ─────────────────────────────┼─────────────────────────┼───────────────────│
│  StoryInProgressError         │ Start task from         │ Complete current  │
│                               │ different story         │ story first       │
│  ─────────────────────────────┼─────────────────────────┼───────────────────│
│  InvalidWorkflowStateError    │ commit not in           │ pnpm task check   │
│                               │ committing status       │ to advance        │
│  ─────────────────────────────┼─────────────────────────┼───────────────────│
│  ValidationFailedError        │ check fails in          │ Fix errors,       │
│                               │ validating status       │ re-run check      │
│  ─────────────────────────────┼─────────────────────────┼───────────────────│
│  CommitError                  │ git add/commit/push     │ Fix git issue,    │
│                               │ fails                   │ retry commit      │
│  ─────────────────────────────┼─────────────────────────┼───────────────────│
│  NoSubtasksCompletedError     │ commit with no          │ Mark subtasks     │
│                               │ completed subtasks      │ as completed      │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Retrospective System

The retrospective system tracks error patterns to prevent repeated mistakes:

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        RETROSPECTIVE SYSTEM                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  ┌───────────────┐    ┌───────────────┐    ┌───────────────┐                │
│  │  Validation   │───▶│ Check against │───▶│ Display known │                │
│  │    Fails      │    │ known patterns│    │ solution      │                │
│  └───────────────┘    └───────────────┘    └───────────────┘                │
│                              │                                               │
│                              │ Not found                                     │
│                              ▼                                               │
│                       ┌───────────────┐                                      │
│                       │ Prompt to add │                                      │
│                       │ new pattern   │                                      │
│                       └───────────────┘                                      │
│                                                                              │
│  Categories:                                                                 │
│  • Type Error    - TypeScript compilation errors                             │
│  • Lint          - ESLint/Biome violations                                   │
│  • Architecture  - Dependency/import violations                              │
│  • Runtime       - Runtime errors                                            │
│  • Build         - Build process failures                                    │
│  • Test          - Test failures                                             │
│  • Formatting    - Code style issues                                         │
│                                                                              │
│  Criticality Levels:                                                         │
│  • Critical  - Blocks deployment                                             │
│  • High      - Must fix before commit                                        │
│  • Medium    - Should fix soon                                               │
│  • Low       - Nice to fix                                                   │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## Testing

The framework includes 340 unit tests covering all modules:

```bash
# Run all tests
pnpm test

# Run with watch mode
pnpm test:watch

# Run with coverage
pnpm test:coverage
```

Test structure mirrors source structure:
- `tests/lib/` - Library module tests
- `tests/commands/` - Command module tests

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           QUICK REFERENCE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Standard Workflow:                                                          │
│  ──────────────────                                                          │
│  pnpm task start <id>     # Start task                                       │
│  pnpm task do             # Read SETUP instructions                           │
│  pnpm task check          # Advance to IMPLEMENTING                          │
│  pnpm task do             # Read implementation details                      │
│  (write code)                                                                │
│  pnpm task check          # Advance through: VERIFYING → VALIDATING          │
│  pnpm task commit "..."   # Commit and complete (auto-marks completed)       │
│                                                                              │
│  Navigation:                                                                 │
│  ───────────                                                                 │
│  pnpm task status         # Project overview                                 │
│  pnpm task next           # Find next task                                   │
│                                                                              │
│  Recovery:                                                                   │
│  ─────────                                                                   │
│  pnpm task resume         # Resume interrupted session                       │
│  pnpm task skip           # Block current task                               │
│                                                                              │
│  Retrospective:                                                              │
│  ──────────────                                                              │
│  pnpm task retro add      # Add error pattern                                │
│  pnpm task retro list     # View patterns                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
