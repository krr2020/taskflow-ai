# Taskflow FAQ

Frequently asked questions and solutions for common issues.

## Table of Contents

- [Installation & Setup](#installation--setup)
- [Project Initialization](#project-initialization)
- [Task Workflow](#task-workflow)
- [Error Messages](#error-messages)
- [Git Integration](#git-integration)
- [Validation Issues](#validation-issues)
- [Claude Desktop / MCP](#claude-desktop--mcp)
- [General Troubleshooting](#general-troubleshooting)

---

## Installation & Setup

### Q: How do I install Taskflow?

**A:** You have two options:

1. **Global CLI Installation:**
   ```bash
   npm install -g @krr2020/taskflow-core
   ```

2. **MCP Server for Claude Desktop:**
   ```bash
   npm install -g @krr2020/taskflow-mcp-server
   ```

### Q: Installation completed but `taskflow` command not found?

**A:** This is a common issue. Try these solutions:

**Solution 1: Check npm global bin path**
```bash
npm config get prefix
# Output: /usr/local (for example)
```

Add the bin path to your PATH:
```bash
# For macOS/Linux - Add to ~/.bashrc, ~/.zshrc, or ~/.config/fish/config.fish
export PATH="/usr/local/bin:$PATH"

# Reload shell
source ~/.bashrc  # or ~/.zshrc
```

**Solution 2: Use npx (works without global install)**
```bash
npx @krr2020/taskflow-core init my-project
npx @krr2020/taskflow-core status
```

**Solution 3: Reinstall with npm**
```bash
npm uninstall -g @krr2020/taskflow-core
npm install -g @krr2020/taskflow-core
```

**Solution 4: Clear npm cache and reinstall**
```bash
npm cache clean --force
npm install -g @krr2020/taskflow-core
```

### Q: I installed a new version but it's not working. What should I do?

**A:** When upgrading to a new version, follow these steps:

1. **Uninstall old version:**
   ```bash
   npm uninstall -g @krr2020/taskflow-core
   npm uninstall -g @krr2020/taskflow-mcp-server
   ```

2. **Clear npm cache:**
   ```bash
   npm cache clean --force
   ```

3. **Install new version:**
   ```bash
   npm install -g @krr2020/taskflow-core
   npm install -g @krr2020/taskflow-mcp-server
   ```

4. **Verify installation:**
   ```bash
   taskflow --version
   ```

5. **If using in an existing project, update .taskflow files:**
   ```bash
   cd your-project
   rm -rf .taskflow
   taskflow init your-project
   ```
   **Warning:** This will reset your .taskflow directory. Backup any customizations first.

### Q: Can I use Taskflow without npm?

**A:** Currently, Taskflow requires npm or pnpm. However, you can use `npx` without global installation:

```bash
npx @krr2020/taskflow-core <command>
```

### Q: I'm getting permission errors during installation?

**A:** Try these solutions:

**Solution 1: Use sudo (macOS/Linux)**
```bash
sudo npm install -g @krr2020/taskflow-core
```

**Solution 2: Fix npm permissions (recommended)**
```bash
# Create a directory for global packages
mkdir ~/.npm-global

# Configure npm to use it
npm config set prefix '~/.npm-global'

# Add to PATH in ~/.bashrc or ~/.zshrc
export PATH="~/.npm-global/bin:$PATH"

# Reload shell
source ~/.bashrc

# Install without sudo
npm install -g @krr2020/taskflow-core
```

**Solution 3: Use nvm (Node Version Manager)**
```bash
# Install nvm if not installed
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.39.0/install.sh | bash

# Reload shell
source ~/.bashrc

# Install latest Node.js
nvm install node

# Install Taskflow
npm install -g @krr2020/taskflow-core
```

---

## Project Initialization

### Q: I ran `taskflow init` but nothing happened?

**A:** Check if there's an existing `.taskflow` directory:

```bash
ls -la | grep taskflow
```

**Solution 1: Remove and reinitialize**
```bash
rm -rf .taskflow tasks
taskflow init
```

**Solution 2: Initialize with explicit project name**
```bash
taskflow init my-project-name
```

**Solution 3: Check for errors**
```bash
taskflow init --verbose  # If verbose flag is available
```

### Q: Can I initialize Taskflow in an existing project?

**A:** Yes! Taskflow is designed to work with existing projects.

```bash
cd your-existing-project
taskflow init
```

This will add Taskflow without modifying your existing code.

### Q: I deleted the .taskflow directory. How do I restore it?

**A:** You can reinitialize, but you'll lose your custom settings:

```bash
# Backup any important files first (optional)
cp .taskflow/ref/coding-standards.md ~/coding-standards-backup.md

# Reinitialize
taskflow init

# Restore custom files (if you backed them up)
cp ~/coding-standards-backup.md .taskflow/ref/coding-standards.md
```

**Note:** Your task files in `tasks/` directory are preserved, so you won't lose your progress.

### Q: How do I migrate to a new version of Taskflow?

**A:** When upgrading to a major version:

1. **Backup your data:**
   ```bash
   cp -r .taskflow .taskflow.backup
   cp -r tasks tasks.backup
   ```

2. **Uninstall old version:**
   ```bash
   npm uninstall -g @krr2020/taskflow-core
   ```

3. **Install new version:**
   ```bash
   npm install -g @krr2020/taskflow-core
   ```

4. **Test in a new branch:**
   ```bash
   git checkout -b taskflow-migration
   taskflow init
   ```

5. **Compare and migrate task files manually if needed**

6. **If everything works:**
   ```bash
   git checkout main
   rm -rf .taskflow
   taskflow init
   ```

---

## Task Workflow

### Q: "Active session exists for task X" - What do I do?

**A:** You tried to start a new task while another is already in progress.

**Solution 1: Complete the current task**
```bash
taskflow commit "- Completed feature XYZ"
```

**Solution 2: Block the current task**
```bash
taskflow skip --reason "Need to work on something else"
```

**Solution 3: Resume the active task**
```bash
taskflow resume
```

**Solution 4: Clear the active session manually** (use with caution)
```bash
# Find the active task
cat tasks/*/F*.json | grep '"active":true'

# Edit the task file to set active: false
# Then start the new task
```

### Q: I forgot which task I was working on. How do I find out?

**A:**

```bash
taskflow status
```

Look for "ACTIVE TASK:" in the output. It will show you:
- Task ID
- Task title
- Current status
- Current branch

### Q: Can I work on multiple tasks at once?

**A:** No, Taskflow enforces single-task focus to ensure quality and prevent merge conflicts. However, you can:

1. **Complete the current task:**
   ```bash
   taskflow commit "- Done with task X"
   ```

2. **Start a new task:**
   ```bash
   taskflow start 2.1.0
   ```

3. **Block the current task to return later:**
   ```bash
   taskflow skip --reason "Need to handle urgent bug"
   ```

### Q: How do I skip a task I don't want to work on?

**A:**

```bash
taskflow skip --reason "Feature deprioritized, will work on later"
```

The task will be marked as `blocked` and you can resume it later.

### Q: My session was interrupted (computer restart, crash, etc.). What do I do?

**A:**

```bash
taskflow resume
```

This will restore your session and show you where you left off.

### Q: Can I change the task status manually?

**A:** It's not recommended to manually edit task files, as it can break the workflow. Instead:

```bash
# If stuck in wrong state
taskflow status  # Check current state
taskflow check    # Try to advance naturally
taskflow resume   # If interrupted
```

If you absolutely must edit, locate the task file:
```bash
tasks/F1/S1.1/T1.1.0.json
```

And update the `status` field manually.

---

## Error Messages

### Q: "NoActiveSessionError" - How do I fix this?

**A:** You tried to run a command that requires an active task.

**Solution:**
```bash
# Start a task
taskflow start 1.1.0
```

Or if you were working on a task:
```bash
taskflow resume
```

### Q: "TaskNotFoundError" - What does this mean?

**A:** The task ID you provided doesn't exist.

**Solution:**
```bash
# List available tasks
taskflow status

# Find the correct task ID
taskflow next
```

### Q: "TaskAlreadyCompletedError" - I want to work on a completed task?

**A:** Once a task is marked as completed, it's in a terminal state.

**Solution:** Create a new task:
```bash
taskflow prd create feature-update
taskflow tasks generate prd-file.md
```

Or manually edit the task file to reset status:
```bash
# tasks/F1/S1.1/T1.1.0.json
# Change "status": "completed" to "status": "not-started"
```

### Q: "DependencyNotMetError" - How do I fix this?

**A:** You tried to start a task before completing its dependencies.

**Solution:**
```bash
# See which tasks are incomplete
taskflow status 1  # Assuming task 1.2.0 failed

# Complete dependencies first
taskflow start 1.1.0
# ... complete the task ...
taskflow commit "- Done"

# Now try again
taskflow start 1.2.0
```

### Q: "WrongBranchError" - How do I fix this?

**A:** You're not on the correct Git branch for this task.

**Solution:**
```bash
# Taskflow will auto-switch when you start a task
taskflow start 1.1.0

# This will automatically create or checkout the correct branch:
# story/S1.1-login-endpoint
```

### Q: "StoryInProgressError" - What does this mean?

**A:** You tried to start a task from a different story while another story is in progress.

**Solution:**
```bash
# Complete or block tasks in current story
taskflow commit "- Story completed"

# Or view current story
taskflow status 1.1
```

### Q: "InvalidWorkflowStateError" - How do I fix this?

**A:** You tried an operation that's not valid for the current task state.

**Example:** Trying to commit while task is in `implementing` state.

**Solution:**
```bash
# Advance to correct state
taskflow check

# Check current state
taskflow status 1.1.0
```

### Q: "ValidationFailedError" - My checks failed. What now?

**A:** Your automated validations (lint, type-check, tests) failed.

**Solution 1: Read the error output**
```bash
# Check the output from taskflow check
# Look for specific error messages
```

**Solution 2: Check the logs**
```bash
cat .taskflow/logs/T1-1-0-*.log
```

**Solution 3: Fix errors and retry**
```bash
# Fix the errors in your code
taskflow check
```

**Solution 4: Check retrospective for known solutions**
```bash
taskflow retro list
```

### Q: "CommitError" - Git operations failed. What do I do?

**A:** There's an issue with your Git repository.

**Solution 1: Check Git status**
```bash
git status
```

**Solution 2: Check if remote exists**
```bash
git remote -v
```

**Solution 3: Configure remote if missing**
```bash
git remote add origin <your-repo-url>
```

**Solution 4: Try manual commit**
```bash
git add .
git commit -m "Manual commit"
git push
```

**Solution 5: Reset and retry**
```bash
git status
# Fix any issues
taskflow commit "- Fixed issues"
```

### Q: "NoSubtasksCompletedError" - I need subtasks completed?

**A:** You tried to commit without marking any subtasks as completed.

**Solution:**
```bash
# Mark at least one subtask as complete
# (Note: subtask completion is tracked in the task file)

# Edit task file manually if needed
# tasks/F1/S1.1/T1.1.0.json
# Find subtasks and change status from "pending" to "completed"

{
  "subtasks": [
    { "id": "1", "description": "Create login endpoint", "status": "completed" },
    { "id": "2", "description": "Create logout endpoint", "status": "pending" }
  ]
}
```

---

## Git Integration

### Q: How does Taskflow handle Git branches?

**A:** Taskflow uses a one-branch-per-story strategy:

```
main
  ├── story/S1.1-login-endpoint
  ├── story/S1.2-logout-endpoint
  └── story/S2.1-dashboard
```

When you `taskflow start 1.1.0`, it automatically:
1. Creates branch `story/S1.1-login-endpoint`
2. Switches to that branch
3. All commits for that story go to that branch

### Q: Do I need to create Git branches manually?

**A:** No! Taskflow handles Git branches automatically.

```bash
# Just start a task
taskflow start 1.1.0

# Taskflow creates and switches to:
# story/S1.1-login-endpoint
```

### Q: How do I merge story branches to main?

**A:** Taskflow doesn't handle merging automatically (to avoid breaking your workflow). You merge manually:

```bash
# After completing all tasks in a story
git checkout main
git merge story/S1.1-login-endpoint
git push origin main

# Optional: Delete story branch
git branch -d story/S1.1-login-endpoint
git push origin --delete story/S1.1-login-endpoint
```

### Q: Can I use my own Git branch naming?

**A:** Taskflow's branch naming is built-in for consistency, but you can:

1. **Modify branch creation in the source code** (advanced)
2. **Rename branches manually after creation**:
   ```bash
   git branch -m story/S1.1-login-endpoint my-custom-branch
   ```

### Q: I have existing branches. Can I use Taskflow?

**A:** Yes! Taskflow works with existing Git repositories. It will create new branches alongside your existing ones.

### Q: How do I handle merge conflicts?

**A:** Taskflow doesn't prevent merge conflicts. Handle them normally:

```bash
# Merge main into your story branch
git checkout story/S1.1-login-endpoint
git merge main

# Resolve conflicts
# (edit files)
git add .
git commit -m "Resolved merge conflicts"

# Continue working
taskflow do
```

---

## Validation Issues

### Q: My validation commands aren't working?

**A:** Check your `taskflow.config.json`:

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

**Solution:** Update with your actual commands:
```json
{
  "validation": {
    "commands": {
      "format": "pnpm biome:fix",
      "typeCheck": "pnpm type-check",
      "lint": "pnpm lint",
      "test": "pnpm test"
    }
  }
}
```

### Q: How do I add custom validation commands?

**A:** Edit `taskflow.config.json`:

```json
{
  "validation": {
    "commands": {
      "format": "pnpm biome:fix",
      "typeCheck": "pnpm type-check",
      "lint": "pnpm lint",
      "test": "pnpm test",
      "custom-check": "pnpm run my-custom-script"
    }
  }
}
```

### Q: How do I skip a validation?

**A:** You can remove or comment out commands in `taskflow.config.json`:

```json
{
  "validation": {
    "commands": {
      "format": "pnpm biome:fix",
      "typeCheck": "pnpm type-check",
      "lint": "pnpm lint"
      // "test": "pnpm test"  // Commented out - will be skipped
    }
  }
}
```

### Q: Where can I find validation logs?

**A:** Logs are stored in `.taskflow/logs/`:

```bash
ls -la .taskflow/logs/
# T1-1-0-format-2024-01-15.log
# T1-1-0-typeCheck-2024-01-15.log
# T1-1-0-lint-2024-01-15.log

# View a log
cat .taskflow/logs/T1-1-0-typeCheck-2024-01-15.log
```

### Q: My validations pass but I still get errors?

**A:** This might be a retrospective pattern issue.

**Solution:**
```bash
# Check retrospective
taskflow retro list

# If no patterns match, the validation passes
# Add custom checks if needed in taskflow.config.json
```

---

## Claude Desktop / MCP

### Q: How do I set up Taskflow with Claude Desktop?

**A:** Follow these steps:

1. **Install MCP server:**
   ```bash
   npm install -g @krr2020/taskflow-mcp-server
   ```

2. **Create/edit config file:**
   ```bash
   # macOS
   ~/Library/Application Support/Claude/claude_desktop_config.json

   # Windows
   %APPDATA%\Claude\claude_desktop_config.json

   # Linux
   ~/.config/Claude/claude_desktop_config.json
   ```

3. **Add this configuration:**
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

4. **Restart Claude Desktop completely** (quit and reopen)

5. **Look for 🔌 icon** in Claude's tools menu

### Q: Taskflow tools aren't showing in Claude Desktop?

**A:** Try these solutions:

**Solution 1: Restart Claude Desktop completely**
- Quit Claude (Cmd/Ctrl + Q)
- Reopen

**Solution 2: Check config file path**
```bash
# macOS
cat ~/Library/Application\ Support/Claude/claude_desktop_config.json

# Windows
type %APPDATA%\Claude\claude_desktop_config.json
```

**Solution 3: Check Claude logs**
```bash
# macOS
cat ~/Library/Logs/Claude/mcp*.log

# Windows
type %APPDATA%\..\Local\Logs\Claude\mcp*.log
```

**Solution 4: Verify MCP server installation**
```bash
npx @krr2020/taskflow-mcp-server
# Should start the server without errors
```

**Solution 5: Try with full path to npx**
```json
{
  "mcpServers": {
    "taskflow": {
      "command": "/usr/local/bin/npx",
      "args": ["-y", "@krr2020/taskflow-mcp-server"]
    }
  }
}
```

### Q: Which MCP tools are available?

**A:** Taskflow provides 13 MCP tools:

**Initialization:**
- `init` - Initialize a project

**Status:**
- `get_status` - Get project/status overview
- `find_next_task` - Find next available task

**PRD:**
- `prd_create` - Create PRD template
- `prd_generate_arch` - Generate architecture docs

**Tasks:**
- `tasks_generate` - Generate tasks from PRD

**Workflow:**
- `start_task` - Start working on a task
- `check_task` - Validate and advance
- `commit_task` - Commit and complete
- `resume_task` - Resume interrupted session
- `block_task` - Block current task

**Retrospective:**
- `add_retrospective` - Add error pattern
- `list_retrospectives` - List patterns

### Q: How do I use Taskflow with Claude?

**A:** Just talk to Claude naturally:

> **You:** "I want to add a user profile feature"

> **Claude:** "I'll help you create a PRD for the user profile feature..."
> *[Uses `prd_create` tool]*

> **You:** "Great, now generate the tasks"

> **Claude:** *[Uses `tasks_generate` tool]*
> "I've generated 8 tasks across 3 stories. Should I start working on the first one?"

> **You:** "Yes"

> **Claude:** *[Uses `start_task` tool]*
> "Task T2.1.0 started! I'm reading the requirements..."

Claude will use the tools as needed throughout your conversation.

---

## General Troubleshooting

### Q: Taskflow is slow. How can I improve performance?

**A:** Try these optimizations:

1. **Reduce validation commands** in `taskflow.config.json`
2. **Use faster alternatives** (e.g., `eslint` instead of `tsc --noEmit`)
3. **Use incremental builds** for test commands
4. **Clear old logs** periodically:
   ```bash
   rm .taskflow/logs/*.log
   ```

### Q: How do I update Taskflow to the latest version?

**A:**

```bash
npm update -g @krr2020/taskflow-core
npm update -g @krr2020/taskflow-mcp-server

# Verify version
taskflow --version
```

### Q: Where can I find help if none of these solutions work?

**A:**

1. **Check the documentation:**
   - [README.md](./README.md) - Quick start
   - [USAGE.md](./USAGE.md) - Complete usage guide
   - [ARCHITECTURE.md](./ARCHITECTURE.md) - Architecture details
   - [WORKFLOW.md](./WORKFLOW.md) - Workflow diagrams
   - [COMMANDS.md](./COMMANDS.md) - Command reference

2. **Open an issue on GitHub:**
   - Describe your problem
   - Include error messages
   - Show your `taskflow.config.json`
   - Include system info (OS, Node version, etc.)

3. **Enable verbose logging** (if available):
   ```bash
   taskflow --verbose status
   ```

### Q: Can I contribute to Taskflow?

**A:** Yes! Taskflow is open source. Check the repository for contribution guidelines.

### Q: How do I report a bug?

**A:** Include:

1. **Taskflow version:**
   ```bash
   taskflow --version
   ```

2. **Node version:**
   ```bash
   node --version
   npm --version
   ```

3. **OS:**
   ```bash
   uname -a  # Linux/macOS
   systeminfo  # Windows
   ```

4. **Error message:** Full output

5. **Steps to reproduce:** What you did that led to the error

6. **taskflow.config.json:** (sanitized - remove any secrets)

---

## Still Have Questions?

If you couldn't find an answer here, please:

1. Check the [main documentation](./README.md)
2. Review the [usage guide](./USAGE.md)
3. Open an issue on the GitHub repository

We're continuously improving this FAQ based on user feedback!
