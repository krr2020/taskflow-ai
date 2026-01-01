# @krr2020/taskflow-mcp

Model Context Protocol (MCP) server that exposes Taskflow's task management capabilities to AI assistants like Claude Desktop. Delegates all logic to `@krr2020/taskflow` for a clean, maintainable architecture.

## 📦 Installation

```bash
npm install -g @krr2020/taskflow-mcp
```

## 🚀 Quick Start

### Option 1: Use with Claude Desktop (Recommended)

Add to your `claude_desktop_config.json` (located at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

```json
{
  "mcpServers": {
    "taskflow": {
      "command": "npx",
      "args": ["-y", "@krr2020/taskflow-mcp"]
    }
  }
}
```

After updating the configuration:
1. Restart Claude Desktop
2. Look for the 🔌 tools menu
3. You should see 13 Taskflow tools available

### Option 2: Run Standalone

```bash
npx @krr2020/taskflow-mcp
```

## 🛠️ Available Tools (13 Total)

### Initialization

#### `init`
Initialize Taskflow in the current project.

**Inputs:**
- `projectName` (optional): Project name (defaults to directory name)

**Actions:**
- Creates `taskflow.config.json`
- Creates `.taskflow` directory structure
- Copies template files (ai-protocol.md, task-generator.md, etc.)
- Creates `tasks/` directory

---

### Status & Navigation

#### `get_status`
Get project status, feature status, or story status.

**Inputs:**
- `id` (optional): Feature ID (N) or Story ID (N.M) for specific status

**Returns:**
- Project overview with all features and stories
- Task progress and completion statistics
- Active task information

#### `find_next_task`
Find the next available task that can be worked on.

**Actions:**
- Checks task dependencies
- Returns first available task with `not-started` status
- Provides task details and context

---

### PRD (Product Requirements Document)

#### `prd_create`
Create a new PRD template for defining features.

**Inputs:**
- `featureName` (required): Name of feature (e.g., "user-authentication")

**Actions:**
- Generates structured markdown template in `tasks/prds/`
- Includes sections: Overview, User Stories, Technical Requirements, etc.

#### `prd_generate_arch`
Generate coding-standards.md and ARCHITECTURE-RULES.md from a PRD.

**Inputs:**
- `prdFile` (required): PRD filename (e.g., "2024-01-15-user-auth.md")

**Actions:**
- Analyzes codebase and PRD
- Generates project-specific coding standards
- Creates architecture rules and validation patterns
- Saves to `.taskflow/ref/` directory

---

### Task Generation

#### `tasks_generate`
Generate complete task breakdown from a PRD.

**Inputs:**
- `prdFile` (required): PRD filename to generate tasks from

**Actions:**
- Creates feature, story, and task hierarchy
- Sets up dependencies between tasks
- Generates `project-index.json` and task files
- Saves to `tasks/` directory structure

---

### Task Workflow

#### `start_task`
Start working on a task.

**Inputs:**
- `taskId` (required): Task ID in format N.M.K (e.g., "1.1.0")

**Actions:**
- Switches to story branch (creates if needed)
- Loads task requirements and context
- Sets status to `SETUP`
- Provides comprehensive AI guidance

**Returns:**
- Task details and description
- Subtasks and dependencies
- Context files to read
- AI-specific execution guidance

#### `check_task`
Validate current task and advance to next status.

**Behavior varies by current status:**
- `SETUP` → `PLANNING`: Confirms task understanding
- `PLANNING` → `IMPLEMENTING`: Confirms execution plan is ready
- `IMPLEMENTING` → `VERIFYING`: Confirms code completion
- `VERIFYING` → `VALIDATING`: Confirms self-review
- `VALIDATING` → `COMMITTING`: Runs configured validation commands (format, lint, etc.)
- Returns validation results and next steps

#### `commit_task`
Commit changes and complete the task.

**Inputs:**
- `message` (required): Bullet points describing changes (e.g., "- Added feature X\n- Fixed bug Y")

**Actions:**
- Generates conventional commit message
- Runs `git add .`
- Commits with formatted message
- Pushes to remote
- Marks task as `completed`
- Finds next available task

**Commit Format:**
```
feat(F1): T1.1.0 - Task title

- Bullet point 1
- Bullet point 2

Story: S1.1
```

#### `resume_task`
Resume a blocked or on-hold task.

**Inputs:**
- `status` (optional): Status to resume to (setup, implementing, verifying, validating)

**Actions:**
- Restores task to active status
- Provides guidance on continuing work
- Loads task context

#### `block_task`
Mark current task as blocked.

**Inputs:**
- `reason` (required): Reason for blocking the task

**Actions:**
- Saves current status before blocking
- Marks task as `blocked`
- Clears active session
- Finds next available task

---

### Retrospective System

#### `add_retrospective`
Add a new error pattern to the retrospective.

**Inputs:**
- `category` (required): Error category (type_error, lint, runtime, build, test, etc.)
- `pattern` (required): Error pattern to match in validation output
- `solution` (required): Solution to the error
- `criticality` (optional): Criticality level (low, medium, high) - defaults to medium

**Actions:**
- Adds entry to `retrospective.md`
- Pattern will be matched against future validation failures
- Solution will be displayed when pattern matches

#### `list_retrospectives`
List all retrospective entries.

**Inputs:**
- `category` (optional): Filter by category

**Returns:**
- All retrospective entries with patterns and solutions
- Error occurrence counts
- Filterable by category

---

## 🏗️ Architecture

This MCP server is a thin wrapper around `@krr2020/taskflow`:

```
MCP Server (index.ts)
  ├── Tool Definitions (13 tools)
  ├── Input Validation (Zod schemas)
  └── Command Delegation
      └── @krr2020/taskflow
          ├── 13 Command Classes
          └── 8 Library Modules
```

**Key Benefits:**
- Zero business logic duplication
- All logic in tested core package
- MCP server focuses on protocol translation
- Easy to maintain and extend

## 📊 Command Output Format

Every command returns structured output:

```typescript
{
  success: boolean;
  output: string;           // Human-readable output
  nextSteps?: string;       // Next action guidance
  aiGuidance?: string;      // AI-specific instructions
  contextFiles?: string[];  // Files to read for context
  warnings?: string[];      // Non-fatal warnings
  errors?: string[];        // Error details if success=false
}
```

## 🔧 Development

```bash
# Install dependencies
pnpm install

# Build
pnpm build

# Start server
pnpm start
```

## 📚 Related Packages

- **[@krr2020/taskflow](https://www.npmjs.com/package/@krr2020/taskflow)** - Core logic and CLI
- **[Main Documentation](../README.md)** - Complete workflow documentation

## 📄 License

MIT
