# Taskflow Workflow

## Task Status Flow

Tasks progress through a unified status flow:

```
┌─────────────────────────────────────────────────────────────────────────┐
│                           TASK STATUS FLOW                               │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                          │
│  ┌───────────┐  ┌───────┐  ┌──────────┐  ┌─────────────┐  ┌──────────┐  │
│  │not-started│─▶│ setup │─▶│planning │─▶│implementing │─▶│verifying │  │
│  └───────────┘  └───────┘  └──────────┘  └─────────────┘  └──────────┘  │
│                                                                     │      │
│                                                                     ▼      │
│  ┌──────────┐  ┌───────────┐    ┌──────────┐                          │
│  │validating│─▶│committing │◀───│ completed │                          │
│  └──────────┘  └───────────┘    └──────────┘                          │
│                                                                          │
│  Other states: blocked, on-hold                                          │
└─────────────────────────────────────────────────────────────────────────┘
```

| Status | Description | Transition |
|--------|-------------|------------|
| **not-started** | Task has not been started | → setup (via `start`) |
| **setup** | Reading task requirements, understanding context | → planning (via `check`) |
| **planning** | Planning the implementation approach | → implementing (via `check`) |
| **implementing** | Writing code, implementing the feature | → verifying (via `check`) |
| **verifying** | Self-reviewing the implementation | → validating (via `check`) |
| **validating** | Running automated checks (lint, type-check, arch) | → committing (via `check`) |
| **committing** | Ready to commit and push | → completed (via `commit`) |
| **completed** | Task finished | Terminal state |
| **blocked** | Task blocked by external issue | Via `skip` command |
| **on-hold** | Task paused | Manual update |

## Flow Diagrams

### Complete Happy Path Flow

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                            HAPPY PATH WORKFLOW                               │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Developer                          CLI                           System    │
│     │                                │                               │       │
│     │  taskflow start 1.1.0         │                               │       │
│     │───────────────────────────────▶│                               │       │
│     │                                │  Check no active session      │       │
│     │                                │  Verify branch                │       │
│     │                                │  Check dependencies           │       │
│     │                                │───────────────────────────────▶│      │
│     │                                │  Update status: setup         │       │
│     │◀───────────────────────────────│                               │       │
│     │  "Task started! Run: do"       │                               │       │
│     │                                │                               │       │
│     │  taskflow do                  │                               │       │
│     │───────────────────────────────▶│                               │       │
│     │                                │  Display setup instructions   │       │
│     │◀───────────────────────────────│                               │       │
│     │                                │                               │       │
│     │  taskflow check               │                               │       │
│     │───────────────────────────────▶│                               │       │
│     │                                │  Advance to implementing      │       │
│     │◀───────────────────────────────│                               │       │
│     │                                │                               │       │
│     │  taskflow do                  │                               │       │
│     │───────────────────────────────▶│                               │       │
│     │                                │  Show protocols & task details│       │
│     │◀───────────────────────────────│                               │       │
│     │                                │                               │       │
│     │  (Developer writes code...)    │                               │       │
│     │                                │                               │       │
│     │  taskflow check               │                               │       │
│     │───────────────────────────────▶│                               │       │
│     │                                │  Advance to verifying         │       │
│     │◀───────────────────────────────│                               │       │
│     │                                │                               │       │
│     │  taskflow check               │                               │       │
│     │───────────────────────────────▶│                               │       │
│     │                                │  Advance to validating        │       │
│     │◀───────────────────────────────│                               │       │
│     │                                │                               │       │
│     │  taskflow check               │                               │       │
│     │───────────────────────────────▶│                               │       │
│     │                                │  Run: configured checks       │       │
│     │                                │  (format, lint, tests, etc.)  │       │
│     │                                │                               │       │
│     │                                │                               │       │
│     │                                │───────────────────────────────▶│      │
│     │                                │         All passed ✓          │       │
│     │                                │  Advance to committing        │       │
│     │◀───────────────────────────────│                               │       │
│     │                                │                               │       │
│     │  taskflow commit "..."        │                               │       │
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
│  │ taskflow   │                                                             │
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
│  │     taskflow retro add --category "Type Error" ... │                    │
│  │  5. Re-run: taskflow check                         │                    │
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
│  │ taskflow       │────▶│ Find task with  │────▶│ Set status to   │        │
│  │   resume        │     │ active status   │     │ implementing    │        │
│  └─────────────────┘     └─────────────────┘     └─────────────────┘        │
│                                                          │                   │
│                                                          ▼                   │
│                                                  ┌─────────────────┐        │
│                                                  │ Continue with   │        │
│                                                  │ taskflow do    │        │
│                                                  └─────────────────┘        │
│                                                                              │
│  SCENARIO 2: Blocked Task                                                    │
│  ────────────────────────                                                    │
│                                                                              │
│  [Task cannot proceed - external blocker]                                    │
│        │                                                                     │
│        ▼                                                                     │
│  ┌─────────────────────────────────────────────┐                            │
│  │ taskflow skip --reason "Waiting for API"   │                            │
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
│  │ taskflow start │                                                         │
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
│  │  - Complete current: taskflow commit "..." │                            │
│  │  - Skip current: taskflow skip --reason "" │                            │
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
│  NoActiveSessionError         │ do/check/commit/submit  │ taskflow start   │
│                               │ without active task     │                   │
│  ─────────────────────────────┼─────────────────────────┼───────────────────│
│  ActiveSessionExistsError     │ start while task        │ submit/skip       │
│                               │ in-progress             │ current task      │
│  ─────────────────────────────┼─────────────────────────┼───────────────────│
│  TaskNotFoundError            │ Invalid task ID         │ Check task ID     │
│  ─────────────────────────────┼─────────────────────────┼───────────────────│
│  TaskAlreadyCompletedError    │ Start completed task    │ taskflow next    │
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
│  InvalidWorkflowStateError    │ commit not in           │ taskflow check   │
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
