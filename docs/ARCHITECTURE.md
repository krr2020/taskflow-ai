# Taskflow Architecture

## Overview

Taskflow provides a state-machine-based workflow for executing development tasks. Each task progresses through defined states with validation gates, ensuring consistency, traceability, and quality.

## System Architecture

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

## Module Structure

```
.taskflow/
├── src/
│   ├── cli/
│   │   └── index.ts           # Entry point with Commander.js
│   ├── commands/              # Command implementations
│   │   ├── workflow/          # Task workflow commands
│   │   │   ├── start.ts       # Begin task session
│   │   │   ├── do.ts          # Show state-specific instructions
│   │   │   ├── check.ts       # Validate and advance state
│   │   │   ├── commit.ts      # Git commit and push
│   │   │   ├── status.ts      # View progress
│   │   │   ├── next.ts        # Find next task
│   │   │   ├── resume.ts      # Resume session
│   │   │   └── skip.ts        # Block a task
│   │   ├── prd/               # PRD commands
│   │   ├── tasks/             # Task generation commands
│   │   ├── retro/             # Retrospective commands
│   │   └── init.ts            # Project initialization
│   └── lib/                   # Core library modules
│       ├── types.ts           # TypeScript types & Zod schemas
│       ├── config-paths.ts    # Configuration paths
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

## Task Hierarchy

```
Project
└── Features (F1, F2, ...)
    └── Stories (S1.1, S1.2, ...)
        └── Tasks (T1.1.0, T1.1.1, ...)
```

## Task File Schema

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

## Data Structures

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

| Status | Description |
|--------|-------------|
| `not-started` | No work has begun |
| `in-progress` | Work is actively being done (contains active tasks) |
| `completed` | All tasks/stories are completed |
| `blocked` | Progress is blocked |
| `on-hold` | Progress is paused |

## Error Handling

### Error Classes

- `NoActiveSessionError` - No active task session
- `ActiveSessionExistsError` - Tried to start a new task while one is in progress
- `TaskNotFoundError` - Invalid task ID
- `TaskAlreadyCompletedError` - Tried to start a completed task
- `DependencyNotMetError` - Task dependencies not completed
- `WrongBranchError` - Not on correct story branch
- `StoryInProgressError` - Starting task from different story
- `InvalidWorkflowStateError` - Invalid operation for current state
- `ValidationFailedError` - Automated validations failed
- `CommitError` - Git operations failed
- `NoSubtasksCompletedError` - Commit without completed subtasks

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
