# 🔨 TASK GENERATOR

**Purpose:** Break PRDs into Features → Stories → Tasks (JSON-based)

---

## Directory Structure

```
tasks/
├── project-index.json              # Root index
└── F[N]-[feature-name]/            # Feature folder
    ├── F[N]-[feature-name].json    # Stories & tasks list
    └── S[N].[M]-[story-name]/      # Story folder
        └── T[N].[M].[K]-[task-title].json  # Task file
```

---

## ID Conventions

| Level | Format | Example |
|-------|--------|---------|
| Feature | `N` | `1`, `2` |
| Story | `N.M` | `1.1`, `1.2` |
| Task | `N.M.K` | `1.1.0`, `1.1.1` |

**No leading zeros.** `1.1.0` ✓ `1.01.0` ✗

---

## Generation Workflow

1. Parse PRD → Identify Features & Stories
2. Create folder structure
3. Generate `project-index.json`
4. Generate `F[N]-[feature-name].json` per feature
5. Generate task JSON files

---

## Templates

### project-index.json
```json
{
  "project": "Project Name",
  "features": [
    {
      "id": "1",
      "title": "Feature Title",
      "status": "not-started",
      "path": "F1-feature-name"
    }
  ]
}
```

### F[N]-[feature-name].json
```json
{
  "id": "1",
  "title": "Feature Title",
  "status": "not-started",
  "stories": [
    {
      "id": "1.1",
      "title": "Story Title",
      "status": "not-started",
      "tasks": [
        {
          "id": "1.1.0",
          "title": "Task Title",
          "status": "not-started",
          "dependencies": []
        }
      ]
    }
  ]
}
```

### Task File (T1.1.0-setup-database-schema.json)
```json
{
  "id": "1.1.0",
  "title": "Setup Database Schema",
  "description": "Create migration files and initial schema definitions.",
  "status": "not-started",
  "skill": "backend",
  "subtasks": [
    {
      "id": "1",
      "description": "Create migration file",
      "status": "pending"
    },
    {
      "id": "2",
      "description": "Define entity in schema",
      "status": "pending"
    }
  ],
  "context": [
    "src/database/schema.ts",
    "src/database/schema2.ts"
  ]
}
```

### Task Status Values

| Status | Description |
|--------|-------------|
| `not-started` | Task not yet begun |
| `setup` | Reading context and requirements |
| `implementing` | Writing code |
| `verifying` | Self-review |
| `validating` | Running automated checks |
| `committing` | Ready to commit and push |
| `completed` | Task finished |
| `blocked` | Cannot proceed |
| `on-hold` | Paused |

### Skill Values

| Skill | Use When |
|-------|----------|
| `development` | General development tasks, refactoring, utilities |
| `backend` | API, database, server logic, handlers, repositories |
| `frontend` | UI components, pages, forms, client-side logic |
| `fullstack` | End-to-end features crossing frontend/backend |
| `devops` | Docker, K8s, CI/CD, deployment, infrastructure |
| `docs` | Documentation, README, guides |

**Rule:** Tasks MUST have single responsibility. Avoid mixing `frontend` and `backend` in one task. Use `fullstack` only for true integration work where contract definition matters.

---

## Task Granularity & Scoping

**CRITICAL:** The AI must optimize for **MINIMAL** number of tasks.
- **Preference:** Fewer, larger tasks > Many small tasks.
- **Metric:** A functional feature should typically be **1-2 stories**, and each story **2-4 tasks**.

### ✅ Good Task Design
- **Scope:** A task should complete a meaningful unit of work (e.g., "Implement entire API endpoint with tests" or "Create full UI page with components").
- **Size:** 30-60 minutes of coding work.
- **Files:** Touches multiple files (controller, service, types, tests).

### ❌ Anti-Patterns (AVOID THESE)
- **One task per file:** ❌ `T1.1.0-create-controller` (Too small)
- **One task per function:** ❌ `T1.1.0-add-validation-function` (Too small)
- **Separating simple steps:** ❌ `T1.1.0-install-package` -> `T1.1.1-config-package` (Merge these!)

### Example Grouping
**Instead of:**
1. `Create migration`
2. `Create model`
3. `Create repo`
4. `Create service`

**DO THIS:**
1. `T1.1.0-implement-user-persistence` (Includes migration, model, repo, service)

---

## Rules

- **Sequential stories:** Complete all tasks in one story before starting another.
- **Branch per story:** Each story gets `story/S[N].[M]-[story-name]` branch.
- **Kebab-case:** All folder/file names use kebab-case.
