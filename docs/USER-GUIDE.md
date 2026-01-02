# Taskflow User Guide

Common workflows, patterns, and best practices for daily use of Taskflow.

---

## Table of Contents

- [Task Workflow](#task-workflow)
- [Working with Dependencies](#working-with-dependencies)
- [Handling Validation Failures](#handling-validation-failures)
- [Blocking and Resuming Tasks](#blocking-and-resuming-tasks)
- [Using with AI Agents](#using-with-ai-agents)
- [Branching Strategy](#branching-strategy)
- [Commit Conventions](#commit-conventions)
- [Retrospective System](#retrospective-system)
- [Best Practices](#best-practices)

---

## Task Workflow

Every task follows the same state progression:

```
not-started → setup → implementing → verifying → validating → committing → completed
```

### State: setup

**Purpose**: Understand the task requirements and context.

**What to do**:
- Run `taskflow do` to read the task description
- Review dependencies and acceptance criteria
- Check related architecture docs

**Advance**: Run `taskflow check` when ready to start coding.

---

### State: implementing

**Purpose**: Write the code to complete the task.

**What to do**:
- Implement the feature following the task description
- Complete all subtasks
- Write or update tests

**Advance**: Run `taskflow check` when implementation is done.

---

### State: verifying

**Purpose**: Self-review your implementation.

**What to do**:
- Review your code changes
- Check for edge cases
- Ensure all subtasks are complete
- Verify tests cover the changes

**Advance**: Run `taskflow check` when satisfied with your work.

---

### State: validating

**Purpose**: Run automated quality checks.

**What to do**:
- Run `taskflow check` to execute validations
- Taskflow runs configured checks (lint, type-check, tests, build)
- Fix any failures and re-run `taskflow check`

**Advance**: Automatically moves to `committing` when all checks pass.

---

### State: committing

**Purpose**: Commit and push your changes.

**What to do**:
- Run `taskflow commit "bullet points describing changes"`
- Taskflow creates a conventional commit and pushes to remote

**Result**: Task is marked `completed` and you can start the next task.

---

## Working with Dependencies

Tasks can depend on other tasks. Taskflow prevents you from starting a task until its dependencies are complete.

### Example: Task with dependencies

```json
{
  "id": "1.2.1",
  "title": "Add user profile page",
  "dependencies": ["1.1.0", "1.1.1"],
  "status": "not-started"
}
```

If you try to start this task before completing dependencies:

```bash
taskflow start 1.2.1
```

Output:

```
Cannot start task

Dependencies not met:
  T1.1.0: Create auth endpoints [in-progress]
  T1.1.1: Add password hashing [not-started]

Complete dependencies first.
```

### Viewing dependencies

Check task dependencies:

```bash
taskflow status 1.2.1
```

---

## Handling Validation Failures

When `taskflow check` runs validations in the `validating` state, failures are reported with context.

### Example failure

```bash
taskflow check
```

Output:

```
Running validations...

✓ format      PASSED
✗ typeCheck   FAILED

ERROR: Property 'email' does not exist on type 'User'
  at src/auth.ts:15:12

Check .taskflow/logs/T1-1-0-typeCheck-2024-01-15.log for details

Fix the errors and run: taskflow check
```

### Steps to fix

1. **Read the error summary** shown in the terminal
2. **Check the log file** for full details:
   ```bash
   cat .taskflow/logs/T1-1-0-typeCheck-2024-01-15.log
   ```
3. **Fix the error** in your code
4. **Re-run validation**:
   ```bash
   taskflow check
   ```

### Using the retrospective system

If you encounter a recurring error pattern, add it to the retrospective:

```bash
taskflow retro add
```

Follow the prompts to categorize the error and document the solution. Future validations will recognize the pattern and suggest the fix.

---

## Blocking and Resuming Tasks

### Blocking a task

If you can't complete a task due to external blockers (waiting for API, dependency, etc.):

```bash
taskflow skip "Waiting for backend API to be deployed"
```

Output:

```
Task T1.2.0 blocked
Reason: Waiting for backend API to be deployed

NEXT AVAILABLE TASK:
T1.3.0: Add error handling

Run: taskflow start 1.3.0
```

The task status is set to `blocked` and its previous state is saved.

### Resuming a blocked task

When the blocker is resolved:

```bash
taskflow start 1.2.0
```

Output:

```
Task T1.2.0 resumed
Status restored to: implementing

Continue where you left off
```

### Checking blocked tasks

View all blocked tasks:

```bash
taskflow status | grep blocked
```

---

## Using with AI Agents

Taskflow is designed to work seamlessly with AI coding assistants.

### Claude Desktop (via MCP)

Once configured, Claude can:
- Read task instructions
- Follow the workflow automatically
- Run validations
- Commit changes with proper messages

**Example prompt**:
> "Start task 1.1.0 and implement the feature following the Taskflow workflow."

Claude will use MCP tools to execute `start_task`, `check_task`, and `commit_task` automatically.

### Cursor, Windsurf, and other AI editors

**Recommended prompt**:
```
Use Taskflow to manage this task. Follow this workflow:

1. Start: taskflow start <id>
2. Read: taskflow do
3. Implement the feature
4. Check: taskflow check (advance through states)
5. Commit: taskflow commit "- bullet points"
```

The AI will execute these commands via the terminal.

---

## Branching Strategy

Taskflow uses a **one branch per story** strategy:

```
main
  ├── story/S1.1-login-endpoint
  │     ├── T1.1.0 commit
  │     ├── T1.1.1 commit
  │     └── T1.1.2 commit  → PR → merge to main
  │
  ├── story/S1.2-user-profile
  │     ├── T1.2.0 commit
  │     └── T1.2.1 commit  → PR → merge to main
  │
  └── story/S2.1-dashboard
        └── ...
```

### Branch creation

When you start a task, Taskflow automatically:
- Creates the branch `story/S{story-id}-{story-slug}` if it doesn't exist
- Switches to the branch if it exists

### Branch naming

Branch names follow the pattern: `story/S{major}.{minor}-{slug}`

Example: `story/S1.1-login-endpoint`

### Merging

After completing all tasks in a story:
1. Push the branch (already done by `taskflow commit`)
2. Create a pull request
3. Review and merge to main

---

## Commit Conventions

Taskflow enforces conventional commit messages:

### Commit format

```
{type}(F{feature}): T{task-id} - {title}

{bullet-point-1}
{bullet-point-2}
{bullet-point-3}

Story: S{story-id}
```

### Example

```
feat(F1): T1.1.0 - Create auth endpoints

- Add POST /api/auth/login endpoint
- Add POST /api/auth/logout endpoint
- Implement JWT token generation
- Add input validation

Story: S1.1
```

### Commit types

- `feat`: New feature
- `fix`: Bug fix
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `docs`: Documentation changes
- `chore`: Build, tooling, dependencies

The type is automatically determined from the task metadata.

---

## Retrospective System

The retrospective system tracks common errors and their solutions.

### Adding an error pattern

When you encounter a new error:

```bash
taskflow retro add
```

Follow the prompts:

```
Category: type_error
Pattern: Cannot find module './types'
Solution: Ensure all imports use .js extension for ESM compatibility
Criticality: high
```

### Viewing patterns

List all patterns:

```bash
taskflow retro list
```

List patterns by category:

```bash
taskflow retro list type_error
```

### How it helps

When validation fails, Taskflow checks known patterns and suggests solutions:

```
✗ typeCheck FAILED

ERROR: Cannot find module './types'

KNOWN ERROR PATTERN:
Category: type_error
Solution: Ensure all imports use .js extension for ESM compatibility

Fix the error and run: taskflow check
```

---

## Best Practices

### 1. One task at a time

Complete or block a task before starting another. Taskflow enforces this with session management.

### 2. Write clear commit messages

Use bullet points that describe **what changed**, not how:

**Good**:
```
- Add user login endpoint
- Implement JWT authentication
- Add rate limiting
```

**Bad**:
```
- Updated auth.ts
- Changed some files
- Fixed stuff
```

### 3. Use the verifying state

Don't skip the self-review phase. Catch issues before automated validation runs.

### 4. Break large tasks into subtasks

If a task feels too large, break it into smaller subtasks in the task JSON:

```json
{
  "id": "1.1.0",
  "title": "Create auth endpoints",
  "subtasks": [
    { "id": "1.1.0.1", "title": "Create login endpoint", "completed": false },
    { "id": "1.1.0.2", "title": "Create logout endpoint", "completed": false },
    { "id": "1.1.0.3", "title": "Add input validation", "completed": false }
  ]
}
```

### 5. Configure validations for your stack

Edit `taskflow.config.json` to match your project:

```json
{
  "validation": {
    "commands": {
      "format": "prettier --check .",
      "lint": "eslint .",
      "test": "jest",
      "typeCheck": "tsc --noEmit",
      "build": "npm run build"
    }
  }
}
```

### 6. Use AI for task generation

If you have AI configured, let it generate tasks from PRDs:

```bash
taskflow tasks generate tasks/prds/your-feature.md
```

This saves time and ensures consistent task structure.

### 7. Keep PRDs up-to-date

When requirements change, update the PRD and regenerate tasks:

```bash
taskflow tasks generate tasks/prds/your-feature.md --regenerate
```

### 8. Review the retrospective regularly

Periodically review your error patterns:

```bash
taskflow retro list
```

Remove outdated patterns and keep the list relevant.

### 9. Use intermittent tasks for unplanned work

For urgent fixes or unplanned tasks, use the intermittent task pattern (see [Troubleshooting](./TROUBLESHOOTING.md) for details).

### 10. Commit frequently

One task = one commit. Keep your Git history clean and atomic.

---

## Workflow Examples

### Example 1: Simple feature implementation

```bash
# Check what's next
taskflow next

# Start task
taskflow start 1.1.0

# Read instructions
taskflow do

# Write code...

# Advance to implementing
taskflow check

# More code...

# Self-review
taskflow check

# Run validations
taskflow check

# Commit
taskflow commit "- Implemented feature X"
```

### Example 2: Handling validation failure

```bash
# Run validation
taskflow check

# ✗ typeCheck FAILED

# Check logs
cat .taskflow/logs/T1-1-0-typeCheck-2024-01-15.log

# Fix error
vim src/auth.ts

# Retry
taskflow check

# ✓ All checks passed

# Commit
taskflow commit "- Fixed type errors
- Added proper type annotations"
```

### Example 3: Blocked task workflow

```bash
# Start task
taskflow start 1.2.0

# Realize it's blocked
taskflow skip "Waiting for API deployment"

# Work on something else
taskflow start 1.3.0
taskflow do
# ...

# Later, resume blocked task
taskflow start 1.2.0
taskflow do
# Continue where you left off
```

---

## Next Steps

- See [Commands Reference](./COMMANDS.md) for all available commands
- See [Configuration Guide](./CONFIG.md) for AI and validation setup
- See [Troubleshooting](./TROUBLESHOOTING.md) for common issues

---

**Master these patterns and you'll have a smooth, structured development workflow.**
