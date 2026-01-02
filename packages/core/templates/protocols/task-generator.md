# TASK GENERATOR

**Purpose:** Break PRDs into Features → Stories → Tasks (JSON-based)

## Directory Structure

```
tasks/
├── project-index.json
└── F[N]-[feature-name]/
    ├── F[N]-[feature-name].json
    └── S[N].[M]-[story-name]/
        └── T[N].[M].[K]-[task-title].json
```

## ID Conventions

| Level | Format | Example |
|-------|--------|---------|
| Feature | `N` | `1`, `2` |
| Story | `N.M` | `1.1`, `1.2` |
| Task | `N.M.K` | `1.1.0`, `1.1.1` |

**No leading zeros.** `1.1.0` ✓ `1.01.0` ✗

## Generation Workflow

1. Parse PRD → Identify Features & Stories
2. Create folder structure
3. Generate `project-index.json`
4. Generate `F[N]-[feature-name].json` per feature
5. Generate task JSON files

## Task Template

```json
{
  "id": "1.1.0",
  "title": "Setup Database Schema",
  "description": "Create migration files and initial schema definitions.",
  "status": "not-started",
  "skill": "backend",
  "subtasks": [
    {"id": "1", "description": "Create migration file", "status": "pending"},
    {"id": "2", "description": "Define entity in schema", "status": "pending"}
  ],
  "context": ["src/database/schema.ts"]
}
```

## Task Status Values

`not-started`, `setup`, `implementing`, `verifying`, `validating`, `committing`, `completed`, `blocked`, `on-hold`

## Skill Values

| Skill | Use When |
|-------|----------|
| `development` | General dev, refactoring, utilities |
| `backend` | API, database, server logic |
| `frontend` | UI components, pages, client logic |
| `fullstack` | End-to-end features (frontend + backend) |
| `devops` | Docker, K8s, CI/CD, infrastructure |
| `docs` | Documentation, README, guides |

**Rule:** Tasks MUST have single responsibility. Avoid mixing `frontend` and `backend`. Use `fullstack` only for integration work where contract definition matters.

## Task Granularity

**CRITICAL PRINCIPLE: FEWER, LARGER TASKS**

Optimize for MINIMAL number of tasks. Each task should be a meaningful unit (30-90 min) that implements a complete sub-feature across multiple files.

### Target Task Counts

| Project Complexity | Total Tasks |
|-------------------|-------------|
| Simple (Sudoku game, calculator) | 6-10 tasks |
| Medium (Todo app, blog) | 15-25 tasks |
| Large (E-commerce, CRM) | 30-50 tasks |

### Anti-Patterns (DON'T DO THIS)

❌ One task per file:
- Task 1.1.0: Create migration
- Task 1.1.1: Create model
- Task 1.1.2: Create repository
- Task 1.1.3: Add tests

❌ Separating simple steps:
- Task 2.1.0: Add input field
- Task 2.1.1: Add validation
- Task 2.1.2: Style input

### Good Patterns (DO THIS)

✅ Complete sub-feature:
- Task 1.1.0: Implement user persistence (migration + model + repository + tests)

✅ Meaningful UI component:
- Task 2.1.0: Implement validated user input form (fields + validation + styling + error handling)

### Rule of Thumb

Before creating a task, ask:
1. Can this be combined with adjacent tasks? → If yes, combine them
2. Does this touch <3 files? → Probably too small, combine it
3. Is this a single-line change? → Definitely combine it
4. Will this take <20 minutes? → Combine it

Good task size: 30-90 minutes, touches 3-10 files, implements a complete sub-feature.

## Requirements & Approvals

**EARS syntax** for acceptance criteria: WHEN [event] THEN [system] SHALL [response] | IF [precondition] THEN [system] SHALL [response].

**Explicit approval required**: Ask "yes/approved/LGTM?" before finalizing task breakdown, executing tasks, moving from planning to implementation.

**Ask ONE question at a time**: Build iteratively, do not batch questions.

**Alternative analysis**: When multiple approaches exist, present alternatives with pros/cons, let user choose.

## Definition of Done

Functional requirements implemented, tests passing (3-retry limit for automated), lint/type-check pass, documentation updated (if applicable), code reviewed (mandatory), no tech debt or explicitly reported.

## Quality Checks

**Library conflicts**: Before suggesting new libraries, verify no similar library exists, check compatibility, consider security/maintenance.
**Security & performance**: For each task, consider security implications, performance impact, backward compatibility, error handling.
**Testing strategy**: Define approach per task: unit tests (if applicable), integration tests (if applicable), manual/automated test verification.
**Documentation updates**: For tasks requiring docs, specify what needs updating (README, API docs, guides), ensure examples included.
**Code review**: All code changes require review (self-review in VERIFYING state, mandatory code review before commit).
**Tech debt tracking**: Report after implementation: tech debt introduced, unfinished work, most impactful next step (focus on high-impact items).
**Learnings capture**: After each task, capture only general, project-wide insights (not implementation details, not what you did but what you learned, prevent repeated mistakes).

## Rules

- **Sequential stories:** Complete all tasks in one story before starting another.
- **Branch per story:** Each story gets `story/S[N].[M]-[story-name]` branch.
- **Kebab-case:** All folder/file names use kebab-case.
