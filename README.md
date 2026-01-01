# Taskflow - AI Task Management Framework

A structured task management CLI framework designed for AI-assisted development workflows. Taskflow enforces a consistent workflow pattern to ensure quality, traceability, and automated validation at every step.

## Overview

Taskflow provides a state-machine-based workflow for executing development tasks. Each task progresses through defined states with validation gates, ensuring:

- **Consistency**: Every task follows the same execution pattern
- **Traceability**: Git commits are linked to specific tasks
- **Quality**: Automated validation before commits
- **Learning**: Error patterns are tracked for prevention

## Quick Start

### Installation Options

**Option 1: Global CLI (Recommended for most users)**
```bash
npm install -g @krr2020/taskflow-core
```

**Option 2: MCP Server for Claude Desktop**
```bash
npm install -g @krr2020/taskflow-mcp-server
```

**Option 3: As Dev Dependency (for local development)**
```bash
cd your-project
npm install -D @krr2020/taskflow-core
```

### Which Command to Use?

After installation, you have two ways to run Taskflow:

| If You Installed... | Use This Command... | Example |
|-------------------|---------------------|-----------|
| **Globally** (`npm install -g`) | `taskflow` | `taskflow start 1.1.0` |
| **As Dev Dependency** (`npm install -D`) | `pnpm task` | `pnpm task start 1.1.0` |
| **npx (without install)** | `npx @krr2020/taskflow-core` | `npx @krr2020/taskflow-core start 1.1.0` |

**Note:** Throughout this documentation, we use `taskflow` for simplicity. Replace with `pnpm task` if using as dev dependency.

### After Installation

Once Taskflow is installed, follow these steps in your project:

#### 1. Initialize Your Project
```bash
cd your-project
taskflow init your-project-name
```

This creates:
```
your-project/
├── taskflow.config.json      # Configuration
├── tasks/                     # Task files (empty initially)
└── .taskflow/
    ├── ref/                   # Reference documentation
    └── logs/                  # Validation logs (empty initially)
```

#### 2. Create Your First PRD
```bash
taskflow prd create user-authentication
```

Edit the generated PRD to define your feature requirements.

#### 3. Generate Tasks
```bash
taskflow tasks generate tasks/prds/YYYY-MM-DD-feature-name.md
```

This creates a complete task breakdown with features, stories, and individual tasks.

#### 4. Start Working
```bash
taskflow status            # View all tasks
taskflow start 1.1.0       # Start first task
taskflow do                # Read instructions
taskflow check             # Advance through states
taskflow commit "- Done"   # Commit and complete
```

#### 5. Complete the Workflow
Repeat step 4 for each task. Taskflow will guide you through the complete workflow:
- **setup** → Understand requirements
- **implementing** → Write code
- **verifying** → Self-review
- **validating** → Run automated checks
- **committing** → Commit changes
- **completed** → Task done!

### AI Agent Integration

When using Taskflow with AI agents (like Claude Desktop, Cursor, etc.):

#### For MCP Server (Claude Desktop)

Configure Claude Desktop to use the MCP Server:
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

The AI agent will automatically:
1. Use `taskflow` commands through MCP tools
2. Follow the defined workflow states
3. Read instructions at each step
4. Execute validations before committing
5. Generate proper commit messages

#### For CLI-Based AI Agents

If using a non-MCP AI agent:

**Important:** Instruct the AI agent to:
1. Use `taskflow` commands (or `pnpm task` if dev dependency)
2. Follow the workflow: `start` → `do` → `check` → `commit`
3. Always read instructions via `taskflow do`
4. Run validations via `taskflow check`
5. Commit via `taskflow commit` with proper bullet points

Example prompt for AI agent:
```
Use Taskflow to manage this task. Start with `taskflow start <task-id>`,
then follow the workflow states and commit when complete.
```

### Updating to New Versions

When a new version of Taskflow is released:

#### Step 1: Update the Package
```bash
# If installed globally
npm update -g @krr2020/taskflow-core
npm update -g @krr2020/taskflow-mcp-server

# If installed as dev dependency
npm update @krr2020/taskflow-core
```

#### Step 2: Check for Breaking Changes

Review the [CHANGELOG](./CHANGELOG.md) (if available) or [Release Notes](https://github.com/...) for:
- New features
- Breaking changes
- Required migrations

#### Step 3: Update Project Files (If Required)

**Most versions will NOT require project file updates.** However, major versions might:

**When project file updates are needed:**
1. **Backup your current setup:**
   ```bash
   cp -r .taskflow .taskflow.backup
   cp taskflow.config.json taskflow.config.json.backup
   ```

2. **Reinitialize to get new templates:**
   ```bash
   rm -rf .taskflow
   taskflow init
   ```

3. **Restore your custom settings:**
   - Edit `taskflow.config.json` to restore your validation commands
   - Compare `.taskflow.backup/ref/` with `.taskflow/ref/` to restore custom reference files
   - Your `tasks/` directory and task files are NOT affected

4. **Verify everything works:**
   ```bash
   taskflow status
   taskflow do  # Test on a task
   ```

**When project file updates are NOT needed:**
- Simply run the new version
- Your existing `.taskflow/` directory and task files will work as-is
- New features will be available automatically

#### Step 4: Test the Update

```bash
# Test basic commands
taskflow --version
taskflow status

# If using MCP server, restart Claude Desktop
```

### Basic Workflow Example

```bash
taskflow start 1.1.0        # Start a task
taskflow do                  # Read instructions
taskflow check               # Advance through states
taskflow commit "- Changes"   # Commit and complete
```

## Packages

- **[@krr2020/taskflow-core](./packages/core/)** - Core commands and CLI
- **[@krr2020/taskflow-mcp-server](./packages/mcp-server/)** - MCP Server for Claude Desktop

## Documentation

| Document | Description |
|----------|-------------|
| **[USAGE.md](./docs/USAGE.md)** | Complete usage guide with step-by-step examples |
| **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | Architecture details and module structure |
| **[WORKFLOW.md](./docs/WORKFLOW.md)** | Workflow states and flow diagrams |
| **[COMMANDS.md](./docs/COMMANDS.md)** | Complete command reference |
| **[FAQ.md](./docs/FAQ.md)** | Frequently asked questions and solutions |

## Quick Reference

```
taskflow start <id>     # Start task
taskflow do             # Read instructions for current state
taskflow check          # Advance to next state / run validations
taskflow commit "..."    # Commit and complete task
taskflow status         # View project overview
taskflow next           # Find next available task
taskflow resume         # Resume interrupted session
taskflow skip           # Block current task
```
