# 🚀 Taskflow

> AI-powered task management framework for structured development workflows

Taskflow brings structure, quality gates, and traceability to your development process. Perfect for teams and AI-assisted coding.

---

## ✨ What Taskflow Does

| ✅ Feature | 📖 Description |
|--------------|------------------|
| **State Machine** | Tasks follow a clear path: setup → implement → verify → validate → commit |
| **Quality Gates** | Automated checks (lint, tests, build) before every commit |
| **Git Integration** | Automatic branch management and conventional commit messages |
| **AI-Ready** | Designed for Claude Desktop, Cursor, and other AI agents |
| **Error Learning** | Tracks common errors and their solutions |

---

## 📦 Installation

Choose your installation method:

### Option A: Global CLI (Recommended)

Best for: Most developers who want to use Taskflow across multiple projects

```bash
npm install -g @krr2020/taskflow-core
```

**Command:** `taskflow <command>`

---

### Option B: MCP Server for Claude Desktop

Best for: Using Claude Desktop with AI assistance

```bash
npm install -g @krr2020/taskflow-mcp-server
```

**Setup:** See [MCP Configuration](#mcp-server-setup) below

---

### Option C: Dev Dependency

Best for: Adding Taskflow to an existing project

```bash
cd your-project
npm install -D @krr2020/taskflow-core
```

**Command:** `npx @krr2020/taskflow-core <command>`

**Example:**
```bash
npx @krr2020/taskflow-core init my-project
npx @krr2020/taskflow-core status
```

💡 **Note:** Want shorter commands (`taskflow` or `pnpm task`)? See [Manual Setup Guide](#manual-setup) below.

---

## 🎯 Quick Start (5 Minutes)

### Step 1️⃣: Navigate to Your Project

```bash
cd your-project-directory
# If installed globally
taskflow init my-project

# If installed as dev dependency
npx @krr2020/taskflow-core init my-project
# If installed globally
taskflow init my-project

# If installed as dev dependency
npx @krr2020/taskflow-core init my-project
# If installed globally
taskflow init my-project

# If installed as dev dependency
npx @krr2020/taskflow-core init my-project
# If installed globally
taskflow init my-project

# If installed as dev dependency
npx @krr2020/taskflow-core init my-project
# If installed globally
taskflow init my-project

# If installed as dev dependency
npx @krr2020/taskflow-core init my-project
# If installed globally
taskflow init my-project

# If installed as dev dependency
npx @krr2020/taskflow-core init my-project
> ⚠️ **Important:** Installation only downloads the package. You MUST initialize it to set up your project.

```bash
# If installed globally
taskflow init my-project

# If installed as dev dependency AND added "task" script to package.json
pnpm task init my-project

# OR if installed as dev dependency WITHOUT adding script (using npx)
npx @krr2020/taskflow-core init my-project
pnpm task init my-project
```

**What happens:** Creates these files and directories:
```
your-project/
├── taskflow.config.json      # Configuration
├── tasks/                     # Task files (empty initially)
└── .taskflow/
    ├── ref/                   # Reference documentation
    └── logs/                  # Validation logs (empty initially)
```

---

### Step 3️⃣: Create Your First Feature PRD

```bash
# If installed globally
taskflow prd create user-authentication

# If installed as dev dependency
npx @krr2020/taskflow-core prd create user-authentication
# If installed globally
taskflow prd create user-authentication

# If installed as dev dependency
npx @krr2020/taskflow-core prd create user-authentication
# If installed globally
taskflow prd create user-authentication

# If installed as dev dependency
npx @krr2020/taskflow-core prd create user-authentication
# If installed globally
taskflow prd create user-authentication

# If installed as dev dependency
npx @krr2020/taskflow-core prd create user-authentication
# If installed globally
taskflow prd create user-authentication

# If installed as dev dependency
npx @krr2020/taskflow-core prd create user-authentication
# If installed globally
taskflow prd create user-authentication

# If installed as dev dependency
npx @krr2020/taskflow-core prd create user-authentication
# If installed globally
taskflow prd create user-authentication

# If installed as dev dependency
npx @krr2020/taskflow-core prd create user-authentication
npx @krr2020/taskflow-core init my-project
pnpm task prd create user-authentication
```

**What happens:** Creates `tasks/prds/YYYY-MM-DD-user-authentication.md`

Edit this file to define your feature:
- User stories
- Technical requirements
- Dependencies
- Success criteria

---

### Step 4️⃣: Generate Tasks

```bash
# If installed globally
taskflow tasks generate tasks/prds/YYYY-MM-DD-user-authentication.md

# If installed as dev dependency
npx @krr2020/taskflow-core tasks generate tasks/prds/YYYY-MM-DD-user-authentication.md
# If installed globally
taskflow tasks generate tasks/prds/YYYY-MM-DD-user-authentication.md

# If installed as dev dependency
npx @krr2020/taskflow-core tasks generate tasks/prds/YYYY-MM-DD-user-authentication.md
# If installed globally
taskflow tasks generate tasks/prds/YYYY-MM-DD-user-authentication.md

# If installed as dev dependency
npx @krr2020/taskflow-core tasks generate tasks/prds/YYYY-MM-DD-user-authentication.md
# If installed globally
taskflow tasks generate tasks/prds/YYYY-MM-DD-user-authentication.md

# If installed as dev dependency
npx @krr2020/taskflow-core tasks generate tasks/prds/YYYY-MM-DD-user-authentication.md
# If installed globally
taskflow tasks generate tasks/prds/YYYY-MM-DD-user-authentication.md

# If installed as dev dependency
npx @krr2020/taskflow-core tasks generate tasks/prds/YYYY-MM-DD-user-authentication.md
# If installed globally
taskflow tasks generate tasks/prds/YYYY-MM-DD-user-authentication.md

# If installed as dev dependency
npx @krr2020/taskflow-core tasks generate tasks/prds/YYYY-MM-DD-user-authentication.md
# If installed globally
taskflow tasks generate tasks/prds/YYYY-MM-DD-user-authentication.md

# If installed as dev dependency
npx @krr2020/taskflow-core tasks generate tasks/prds/YYYY-MM-DD-user-authentication.md
npx @krr2020/taskflow-core init my-project
pnpm task tasks generate tasks/prds/YYYY-MM-DD-user-authentication.md
```

**What happens:** Analyzes your PRD and creates:
- Features (F1, F2, ...)
- Stories (S1.1, S1.2, ...)
- Tasks (T1.1.0, T1.1.1, ...)
- Dependencies between tasks

---

### Step 5️⃣: Start Your First Task

```bash
# If installed globally
taskflow start 1.1.0

# If installed as dev dependency
npx @krr2020/taskflow-core start 1.1.0
# If installed globally
taskflow start 1.1.0

# If installed as dev dependency
npx @krr2020/taskflow-core start 1.1.0
# If installed globally
taskflow start 1.1.0

# If installed as dev dependency
npx @krr2020/taskflow-core start 1.1.0
# If installed globally
taskflow start 1.1.0

# If installed as dev dependency
npx @krr2020/taskflow-core start 1.1.0
# If installed globally
taskflow start 1.1.0

# If installed as dev dependency
npx @krr2020/taskflow-core start 1.1.0
# If installed globally
taskflow start 1.1.0

# If installed as dev dependency
npx @krr2020/taskflow-core start 1.1.0
# If installed globally
taskflow start 1.1.0

# If installed as dev dependency
npx @krr2020/taskflow-core start 1.1.0
npx @krr2020/taskflow-core init my-project
pnpm task start 1.1.0
```

**What happens:**
- Creates/switches to Git branch: `story/S1.1-*`
- Loads task context
- Sets status to `setup`

---

## 🔄 Daily Workflow

Once set up, this is your daily routine:

```bash
# 1. Check what to work on
taskflow status
taskflow next

# 2. Start a task
taskflow start 1.1.0

# 3. Read instructions for current state
taskflow do

# 4. Write code...

# 5. Advance to next state (runs validations)
taskflow check

# 6. Repeat until commit-ready, then:
taskflow commit "- Implemented feature X
             - Fixed bug Y
             - Added tests"
```

## 📊 Task Lifecycle Explained

Each task goes through these states:

```
┌─────────────────────────────────────────────────────────────┐
│                                                     │
│   setup     →   implementing   →   verifying      │
│      ↓              ↓                ↓              │
│   (understand)  (write code)   (self-review)      │
│                                ↓                ↓              │
│                           validating   →   committing        │
│                              ↓              ↓              │
│                         (run checks)   (git commit)        │
│                                                     │
│                           completed ✓                    │
│                                                     │
└─────────────────────────────────────────────────────────────┘
```

| State | What You Do | Command |
|--------|--------------|----------|
| **setup** | Read requirements, understand context | `taskflow do` |
| **implementing** | Write code, implement feature | `taskflow check` (to advance) |
| **verifying** | Self-review, check for edge cases | `taskflow check` (to advance) |
| **validating** | Wait for automated checks to run | `taskflow check` (to run) |
| **committing** | Ready to commit changes | `taskflow commit "- message"` |
| **completed** | Done! Move to next task | (start next task) |

---

## 🤖 Using with AI Agents

### For Claude Desktop (MCP Server)

**Setup:**

1. Install MCP Server: `npm install -g @krr2020/taskflow-mcp-server`
2. Open Claude Desktop config:
   - **macOS:** `~/Library/Application Support/Claude/claude_desktop_config.json`
   - **Windows:** `%APPDATA%\Claude\claude_desktop_config.json`
3. Add this configuration:
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
4. Restart Claude Desktop

**How it works:**
- Claude sees 13 Taskflow tools in tools menu (🔌)
- Claude automatically calls Taskflow commands
- Claude reads instructions and follows workflow
- Claude generates proper commit messages

---

### For Other AI Agents (Cursor, Windsurf, etc.)

**Prompt your AI:**
```
Use Taskflow to manage this task. Follow this pattern:

1. Start to task: taskflow start <id>
2. Read instructions: taskflow do
3. Implement the feature
4. Advance states: taskflow check
5. When complete: taskflow commit "- summary of changes"

Replace `taskflow` with `pnpm task` if you installed as dev dependency.
```

---


## 🔧 Manual Setup (Optional)

### Add "task" Script to package.json

Want shorter commands (`pnpm task` instead of `npx @krr2020/taskflow-core`)? Add this to your `package.json`:

```json
{
  "scripts": {
    "task": "node node_modules/@krr2020/taskflow-core/bin/taskflow.js"
  }
}
```
Then use:
```bash
pnpm task init my-project
pnpm task status
pnpm task start 1.1.0
```

### Why Manual Setup?

- **Pros:** Shorter commands (`pnpm task` vs `npx @krr2020/taskflow-core`)
- **Cons:** Must manually add script to package.json
- **Recommendation:** Use `npx` if you prefer zero-setup workflow. Use manual script if you type commands frequently and want brevity.## 📚 Reference

### Core Commands

```bash
# Task Management
taskflow start <id>     # Begin working on a task
taskflow do             # Show instructions for current state
taskflow check          # Advance to next state / run validations
taskflow commit "..."    # Commit and complete task

# Navigation
taskflow status         # View project progress
taskflow status <id>   # View feature/story details
taskflow next           # Find next available task

# Recovery
taskflow resume         # Resume interrupted session
taskflow skip           # Block current task

# PRD & Tasks
taskflow prd create <name>           # Create PRD template
taskflow prd generate-arch <file>    # Generate architecture docs
taskflow tasks generate <file>        # Generate tasks from PRD
```

---

### Configuration

Edit `taskflow.config.json` to customize:

```json
{
  "project": {
    "name": "my-project"
  },
  "branching": {
    "strategy": "per-story",
    "base": "main",
    "prefix": "story/"
  },
  "validation": {
    "commands": {
      "format": "biome check --write .",
      "lint": "biome lint .",
      "test": "vitest run",
      "type-check": "tsc --noEmit"
    }
  }
}
```

---

## 🆘 Troubleshooting

### "Command not found: taskflow"

**Cause:** Installed as dev dependency but using wrong command

**Solution:**
```bash
# Use this instead
pnpm task init
```

---

### "No .taskflow directory"

**Cause:** Project not initialized yet

**Solution:**
```bash
# Initialize first
pnpm task init my-project
```

---

### "Active session exists"

**Cause:** Tried to start a new task while one is already in progress

**Solution:**
```bash
# Complete current task
pnpm task commit "- Changes"

# Or block it
pnpm task skip --reason "Reason"
```

---

### Validation failed

**Cause:** Automated checks (lint, tests) didn't pass

**Solution:**
```bash
# 1. Read the error
# 2. Check logs: .taskflow/logs/
# 3. Fix the errors
# 4. Try again
pnpm task check
```

---

## 📦 Package Structure

```
taskflow-ai/
├── packages/
│   ├── core/                    # Main package
│   │   ├── src/
│   │   │   ├── commands/       # 13 command classes
│   │   │   └── lib/           # 8 library modules
│   │   └── bin/
│   │       └── taskflow.js     # CLI entry point
│   └── mcp-server/             # MCP server package
└── docs/                         # This documentation
    ├── USAGE.md
    ├── ARCHITECTURE.md
    ├── WORKFLOW.md
    ├── COMMANDS.md
    └── FAQ.md
```

---

## 📖 Documentation

| Document | Description |
|-----------|-------------|
| **[USAGE.md](./docs/USAGE.md)** | Step-by-step usage guide with examples |
| **[WORKFLOW.md](./docs/WORKFLOW.md)** | Detailed workflow diagrams and state flows |
| **[COMMANDS.md](./docs/COMMANDS.md)** | Complete command reference |
| **[ARCHITECTURE.md](./docs/ARCHITECTURE.md)** | Technical architecture and module details |
| **[FAQ.md](./docs/FAQ.md)** | Frequently asked questions |

---

## 🚀 Getting Help

- **Documentation:** Check `/docs` folder for detailed guides
- **Issues:** Report bugs on GitHub repository
- **Discussions:** Ask questions in GitHub Discussions

---

**Made with ❤️ for better development workflows**
