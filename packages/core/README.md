# @krr2020/taskflow

Core task management framework for AI-assisted development workflows.

## Installation

```bash
npm install @krr2020/taskflow
```

## Quick Start

### CLI Usage

```bash
# Initialize in your project
npx @krr2020/taskflow init

# Create a PRD interactively
npx @krr2020/taskflow prd create user-authentication

# Generate tasks from PRD
npx @krr2020/taskflow tasks generate tasks/prds/prd-user-authentication.md

# Start working on a task
npx @krr2020/taskflow start 1.1.0
npx @krr2020/taskflow do
npx @krr2020/taskflow check
npx @krr2020/taskflow commit "Implemented authentication"
```

### Programmatic Usage

```typescript
import {
  StartCommand,
  CheckCommand,
  CommitCommand,
  type CommandContext,
  type CommandResult
} from '@krr2020/taskflow';

const context: CommandContext = {
  projectRoot: process.cwd()
};

// Start a task
const startCmd = new StartCommand(context);
const result: CommandResult = await startCmd.execute('1.1.0');

console.log(result.output);
```

## Core Features

### Interactive PRD Creation

Taskflow provides an interactive question-and-answer interface for creating PRDs:

```bash
taskflow prd create user-authentication
```

This will guide you through:
- Feature overview
- Problem statement
- Target audience
- User stories
- Functional requirements
- Non-functional requirements
- Success criteria
- Exclusions and dependencies

### Task Workflow

Tasks progress through a state machine:

```
not-started → setup → planning → implementing → verifying → validating → committing → completed
```

**Key commands:**
- `taskflow status [id]` - View project/feature/story/task status
- `taskflow ui` - Start visual dashboard
- `taskflow next` - Find next available task
- `taskflow start <id>` - Begin a task
- `taskflow do` - Show instructions for current state
- `taskflow check` - Advance to next state or run validations
- `taskflow commit <message>` - Commit and complete task
- `taskflow resume [status]` - Resume blocked/on-hold tasks
- `taskflow skip <reason>` - Mark task as blocked

### AI Integration (Optional)

Configure AI providers for automated task generation and guidance:

```bash
taskflow configure ai --provider anthropic --apiKey sk-ant-... --model claude-sonnet-4
```

**Supported providers:**
- `anthropic` - Anthropic Claude models
- `openai-compatible` - OpenAI-compatible APIs
- `ollama` - Local Ollama models
- `mock` - Mock provider for testing

**Multi-phase configuration:**
```bash
taskflow configure ai \
  --planningProvider anthropic --planningModel claude-sonnet-4 \
  --executionProvider anthropic --executionModel claude-opus-4 \
  --analysisProvider anthropic --analysisModel claude-sonnet-4
```

### MCP Detection

Taskflow automatically detects when running via MCP server and adapts its behavior:

```typescript
import { MCPDetector } from '@krr2020/taskflow';

const context = MCPDetector.detect();
if (context.isMCP) {
  console.log('Running in MCP mode');
}
```

## Project Structure

```
tasks/
├── project-index.json              # Top-level project index
├── prds/                           # Product Requirements Documents
│   └── prd-[feature].md
└── F[N]-[feature-name]/            # Feature directories
    ├── F[N]-[feature-name].json    # Feature metadata
    └── S[N].[M]-[story-name]/       # Story directories
        └── T[N].[M].[K]-[task].json # Individual task files
```

## Configuration

Create `taskflow.config.json`. Taskflow supports **any** tech stack - configure commands for your project:

```json
{
  "project": {
    "name": "my-project",
    "root": "."
  },
  "branching": {
    "strategy": "per-story",
    "base": "main",
    "prefix": "story/"
  },
  "validation": {
    "commands": {
      "format": "black --check .",
      "lint": "flake8 .",
      "test": "pytest",
      "build": "python -m build"
    }
  },
  "ai": {
    "planning": {
      "provider": "anthropic",
      "apiKey": "sk-ant-...",
      "model": "claude-sonnet-4"
    }
  }
}
```

Replace validation commands with your project's actual commands (e.g., `pnpm test`, `go test`, `mvn test`).

## API Exports

### Main Package

```typescript
import {
  // Commands
  InitCommand,
  StartCommand,
  CheckCommand,
  CommitCommand,
  StatusCommand,
  NextCommand,
  PrdCreateCommand,
  TasksGenerateCommand,
  // ... all commands

  // Core types
  type CommandContext,
  type CommandResult,
  type TaskFileContent,
  type Feature,
  type Story,

  // Utilities
  loadProjectIndex,
  saveTaskFile,
  validateTaskflowConfig
} from '@krr2020/taskflow';
```

### Config Export

```typescript
import {
  getProjectPaths,
  COMMIT_TYPES,
  FILE_NAMES,
  DIR_NAMES,
  type ProjectPaths
} from '@krr2020/taskflow/config';
```

## Intermittent Tasks (F0)

Create standalone tasks for quick fixes:

```bash
taskflow task create --title "Fix typo in README" --intermittent
```

Organized under **Feature 0** ("Infrastructure & Quick Fixes") for:
- Bug fixes
- Documentation updates
- Code cleanup
- Configuration changes

## Retrospective System

Track and learn from errors:

```bash
taskflow retro add
taskflow retro list [category]
```

## Related Packages

- **[@krr2020/taskflow-mcp](https://www.npmjs.com/package/@krr2020/taskflow-mcp)** - MCP Server for Claude Desktop integration
- **[Main Taskflow Docs](../README.md)** - Complete documentation and tutorials

## License

MIT
