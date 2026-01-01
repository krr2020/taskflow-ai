# Taskflow Usage Guide

Complete guide to using Taskflow for AI-assisted development workflows.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Complete Workflow Example](#complete-workflow-example)
3. [CLI Usage](#cli-usage)
4. [MCP Server Usage (Claude Desktop)](#mcp-server-usage-claude-desktop)
5. [Common Patterns](#common-patterns)
6. [Troubleshooting](#troubleshooting)

---

## Getting Started

### Installation

**Option 1: Global CLI Installation**
```bash
npm install -g @krr2020/taskflow-core
```

**Option 2: MCP Server for Claude Desktop**
```bash
npm install -g @krr2020/taskflow-mcp-server
```

### Initialize Your Project

```bash
cd your-project
taskflow init

# Or using npx
npx @krr2020/taskflow-core init
```

💡 **Note:** Project name is auto-detected from `package.json`, or falls back to directory name. You can optionally specify `taskflow init my-project`.

This creates:
```
your-project/
├── taskflow.config.json      # Configuration
├── tasks/                     # Task files go here
└── .taskflow/
    ├── ref/                   # Reference documentation
    │   ├── ai-protocol.md
    │   ├── task-generator.md
    │   ├── task-executor.md
    │   └── retrospective.md
    └── logs/                  # Validation logs
```

---

## Complete Workflow Example

Let's walk through building a user authentication feature from start to finish.

### Step 1: Create a PRD (Product Requirements Document)

```bash
taskflow prd create user-authentication
```

This creates `tasks/prds/YYYY-MM-DD-user-authentication.md`. Edit it to define your feature:

```markdown
# User Authentication

## Overview
Add secure user authentication with login, logout, and session management.

## User Stories
1. As a user, I want to log in with email and password
2. As a user, I want to stay logged in across sessions
3. As a user, I want to securely log out

## Technical Requirements
- JWT-based authentication
- Secure password hashing (bcrypt)
- HTTP-only cookies for session tokens
- Rate limiting on login endpoint
...
```

### Step 2: Generate Coding Standards (Optional but Recommended)

```bash
taskflow prd generate-arch 2024-01-15-user-authentication.md
```

This analyzes your codebase and PRD to create:
- `.taskflow/ref/coding-standards.md` - Project-specific coding standards
- `.taskflow/ref/ARCHITECTURE-RULES.md` - Architecture patterns and constraints

### Step 3: Generate Task Breakdown

```bash
taskflow tasks generate 2024-01-15-user-authentication.md
```

This creates:
```
tasks/
├── project-index.json         # Project overview
└── F1/                        # Feature 1: User Authentication
    ├── F1.json                # Feature file with all stories
    └── S1.1/                  # Story 1.1: Login endpoint
        ├── T1.1.0.json        # Task: Create auth endpoints
        ├── T1.1.1.json        # Task: Add password hashing
        └── T1.1.2.json        # Task: Implement session management
```

### Step 4: View Status

```bash
taskflow status

# Output:
# PROJECT: my-project
#
# Features:
#   F1: User Authentication [not-started]
#     S1.1: Login endpoint [not-started]
#       T1.1.0: Create auth endpoints [not-started]
#       T1.1.1: Add password hashing [not-started]
#       T1.1.2: Implement session management [not-started]
```

### Step 5: Start Working on First Task

```bash
taskflow start 1.1.0

# Output:
# ✓ Task started: T1.1.0 - Create auth endpoints
# ✓ Status: setup
# ✓ Branch: story/S1.1-login-endpoint
#
# NEXT STEPS:
# Run: taskflow check
```

This automatically:
- Creates/switches to branch `story/S1.1-login-endpoint`
- Sets task status to `setup`
- Loads task context

### Step 6: Progress Through Task States

```bash
# 1. Get instructions for current state
taskflow do

# Output:
# 🚀 STATUS: SETUP
#
# GOAL: Understand requirements and prepare environment
# ...
#
# NEXT STEPS:
# 1. Read context files
# 2. Run: taskflow check

# 2. Move to PLANNING
taskflow check


# Output:
# ✓ Status advanced: setup → planning
#
# GOAL: Plan your implementation approach
# ...
#
# NEXT STEPS:
# 1. Think through the implementation
# 2. Run: taskflow check

# 3. Move to IMPLEMENTING
taskflow check

# Output:
# ✓ Status advanced: planning → implementing
#
# TASK: T1.1.0 - Create auth endpoints
#
# DESCRIPTION:
# Create POST /api/auth/login and POST /api/auth/logout endpoints...
#
# SUBTASKS:
#   [ ] 1. Create login endpoint
#   [ ] 2. Create logout endpoint
#   [ ] 3. Add input validation
#
# NEXT STEPS:
# 1. Read the task description and subtasks
# 2. Implement the required functionality
# 3. Run: taskflow check when done
```

Now write your code...

```bash
# 4. Move to VERIFYING (self-review phase)
taskflow check

# Output:
# ✓ Status advanced: implementing → verifying
#
# NEXT STEPS:
# 1. Review your implementation
# 2. Check for edge cases
# 3. Ensure subtasks are completed
# 4. Run: taskflow check when ready

# 3. Move to VALIDATING (automated checks)
taskflow check

# Output:
# ✓ Status advanced: verifying → validating
#
# NEXT STEPS:
# Run: taskflow check to run validations
```

### Step 7: Run Validations

```bash
taskflow check

# Output:
# Running validations...
#
# ✓ format    (as configured)       PASSED
# ✓ typeCheck (as configured)       PASSED
# ✓ lint      (as configured)       PASSED
#
# ✓ Status advanced: validating → committing
#
# NEXT STEPS:
# Run: taskflow commit "- Bullet point 1\n- Bullet point 2"
```

If validation fails:
```bash
# Output:
# Running validations...
#
# ✓ format    PASSED
# ✗ typeCheck FAILED
#
# ERROR: Type error in src/auth.ts:15
# Property 'email' does not exist on type 'User'
#
# ⚠️ Check .taskflow/logs/T1-1-0-typeCheck-2024-01-15.log for details
#
# Fix the errors and run: taskflow check again
```

### Step 8: Commit and Complete

```bash
taskflow commit "- Add POST /api/auth/login endpoint
- Add POST /api/auth/logout endpoint
- Implement JWT token generation
- Add input validation for email and password"

# Output:
# ✓ Changes committed
# ✓ Pushed to origin/story/S1.1-login-endpoint
# ✓ Task completed: T1.1.0
#
# Commit: 3a8f9d2
# Message: feat(F1): T1.1.0 - Create auth endpoints
#
# - Add POST /api/auth/login endpoint
# - Add POST /api/auth/logout endpoint
# - Implement JWT token generation
# - Add input validation for email and password
#
# Story: S1.1
#
# NEXT AVAILABLE TASK:
# T1.1.1: Add password hashing
#
# NEXT STEPS:
# Run: taskflow start 1.1.1
```

### Step 9: Continue with Next Tasks

```bash
taskflow start 1.1.1
# Repeat steps 6-8 for each task...
```

### Step 10: View Progress Anytime

```bash
# View project overview
taskflow status

# View specific feature
taskflow status 1

# View specific story
taskflow status 1.1
```

---

## CLI Usage

### Initialization

```bash
# Initialize with default project name (directory name)
taskflow init

# Initialize with custom project name
taskflow init my-awesome-project
```

### PRD Workflow

```bash
# Create PRD template
taskflow prd create feature-name

# Generate architecture docs from PRD
taskflow prd generate-arch 2024-01-15-feature-name.md

# Generate tasks from PRD
taskflow tasks generate 2024-01-15-feature-name.md
```

### Primary Workflow

| Command | Description | Status Transition |
|---------|-------------|-------------------|
| `taskflow start <id>` | Start a task session (resumes if already active) | not-started → setup |
| `taskflow do` | Show state-specific instructions and next steps | (no change) |
| `taskflow check` | Validate and advance to next status | Current → Next (or runs validations) |
| `taskflow commit "..."` | Commit and push changes with bullet points | committing → completed |
| `taskflow resume` | Resume interrupted session | (restores status) |
| `taskflow skip` | Block current task | (blocks task) |

### Navigation

```bash
# View project status
taskflow status

# View feature status
taskflow status 1

# View story status
taskflow status 1.1

# Find next available task
taskflow next
```

### Retrospective

```bash
# Add error pattern interactively
taskflow retro add

# List all patterns
taskflow retro list

# List patterns by category
taskflow retro list type_error
```

---

## MCP Server Usage (Claude Desktop)

### Setup

1. Install the MCP server:
```bash
npm install -g @krr2020/taskflow-mcp-server
```

2. Configure Claude Desktop (`~/Library/Application Support/Claude/claude_desktop_config.json`):
```json
{
  "mcpServers": {
    "taskflow": {
      "command": "npx",
      "args": ["-y", "@krr2020/taskflow-mcp-server"]
    }
  }
}
```

3. Restart Claude Desktop

4. Look for 🔌 in the tools menu - you should see 13 Taskflow tools

### Using with Claude

Once configured, Claude can use Taskflow tools naturally:

**Example conversation:**

> **You:** "I want to add a user profile feature to my app. Can you help me plan it out?"

> **Claude:** "I'll help you create a PRD for the user profile feature."
>
> *[Uses `prd_create` tool]*
>
> "I've created a PRD template at tasks/prds/2024-01-15-user-profile.md. Let me read it and we can fill it out together..."

> **You:** "Great! I've filled out the PRD. Can you generate the tasks?"

> **Claude:** *[Uses `tasks_generate` tool]*
>
> "I've generated a complete task breakdown:
> - Feature F2: User Profile
> - 3 stories with 8 total tasks
> - All dependencies mapped
>
> Would you like to start working on the first task?"

> **You:** "Yes, let's start!"

> **Claude:** *[Uses `start_task` tool with taskId "2.1.0"]*
>
> "Task T2.1.0 started! I'm on the setup phase. Let me read the task requirements...
>
> This task involves creating a user profile schema. I'll need to:
> 1. Define the user model
> 2. Add profile fields
> 3. Set up database migration
>
> Let me start implementing this..."

The workflow continues naturally with Claude using `check_task`, `commit_task`, etc. as needed.

### Available MCP Tools

All 13 tools are available:

**Initialization:** `init`
**Status:** `get_status`, `find_next_task`
**PRD:** `prd_create`, `prd_generate_arch`
**Tasks:** `tasks_generate`
**Workflow:** `start_task`, `check_task`, `commit_task`, `resume_task`, `block_task`
**Retrospective:** `add_retrospective`, `list_retrospectives`

---

## Common Patterns

### Handling Validation Failures

When validation fails, the retrospective system helps:

```bash
taskflow check

# Output:
# ✗ typeCheck FAILED
# ERROR: Cannot find module './types'
#
# 🔍 KNOWN ERROR PATTERN:
# Category: type_error
# Solution: Ensure all imports use .js extension for ESM compatibility
#
# Fix the error and run: taskflow check again
```

Add to retrospective if it's a new error:

```bash
taskflow retro add

# Prompts:
# Category: type_error
# Pattern: Cannot find module
# Solution: Ensure imports use .js extension
# Criticality: high
```

### Working with Dependencies

Tasks can have dependencies:

```json
{
  "id": "1.2.1",
  "title": "Add user profile page",
  "dependencies": ["1.1.0", "1.1.1"],
  "status": "not-started"
}
```

The system prevents starting tasks with incomplete dependencies:

```bash
taskflow start 1.2.1

# Output:
# ✗ Cannot start task
#
# Dependencies not met:
#   T1.1.0: Create auth endpoints [in-progress]
#   T1.1.1: Add password hashing [not-started]
#
# Complete dependencies first.
```

### Blocking and Resuming Tasks

Block a task when external issues prevent progress:

```bash
taskflow skip "Waiting for backend API to be deployed"

# Output:
# ✓ Task T1.2.0 blocked
# Reason: Waiting for backend API to be deployed
#
# NEXT AVAILABLE TASK:
# T1.3.0: Add error handling
```

Resume when ready:

```bash
taskflow status

# Shows:
# T1.2.0: Add user profile [blocked] (was: implementing)

# Start the blocked task again
taskflow start 1.2.0

# Output:
# ✓ Task T1.2.0 resumed
# ✓ Status restored to: implementing
```

### Interrupted Sessions

If your session is interrupted (computer restart, etc.):

```bash
taskflow resume

# Output:
# ✓ Resumed task: T1.1.0 - Create auth endpoints
# ✓ Status: implementing
#
# Continue where you left off...
```

---

## Troubleshooting

### "Active session exists for task X"

You tried to start a new task while another is in progress.

**Solution:**
```bash
# Complete current task
taskflow commit "- Changes"

# OR block current task
taskflow skip "Reason"

# Then start new task
taskflow start X.Y.Z
```

### "Wrong branch" error

You're not on the correct story branch.

**Solution:**
```bash
# Taskflow will auto-switch branches when you start a task
taskflow start 1.1.0  # Switches to story/S1.1-* branch
```

### Validation command not found

Your validation commands in `taskflow.config.json` don't exist.

**Solution:** Update config with your actual commands:
```json
{
  "validation": {
    "commands": {
      "format": "echo 'running format'",
      "test": "echo 'running tests'",
      "build": "echo 'building project'"
    }
  }
}
```
*Note: You can use any command for your tech stack (e.g., `pytest`, `cargo test`, `go test`).*

### Task files not found

**Solution:**
```bash
# Ensure you've generated tasks
taskflow tasks generate your-prd-file.md

# Check if project-index.json exists
cat tasks/project-index.json
```

### MCP tools not showing in Claude Desktop

**Solutions:**
1. Check config file path: `~/Library/Application Support/Claude/claude_desktop_config.json`
2. Restart Claude Desktop completely
3. Check logs: `~/Library/Logs/Claude/mcp*.log`
4. Verify installation: `npx @krr2020/taskflow-mcp-server` should run without errors

---

## Best Practices

1. **One task at a time** - Complete or block before starting another
2. **Write clear bullet points** - Commit messages should be specific
3. **Use retrospective** - Document solutions to prevent repeated errors
4. **Review before validating** - The VERIFYING phase catches issues early
5. **Small, focused tasks** - Break large tasks into subtasks
6. **Commit frequently** - One task = one commit for clean history

---

## Next Steps

- See [README.md](./README.md) for architecture details
- See [packages/core/README.md](./packages/core/README.md) for API usage
- See [packages/mcp-server/README.md](./packages/mcp-server/README.md) for MCP tool reference
