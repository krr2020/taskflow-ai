# @krr2020/taskflow

Core task management framework for AI-assisted development workflows. This package provides the foundational commands, state management, and configuration handling used by the Taskflow MCP Server and CLI.

## 📦 Installation

```bash
npm install @krr2020/taskflow
```

## 🏗️ Architecture

The core package provides a complete task management system with:

### AI Integration

TaskFlow features built-in AI capabilities to automate documentation, planning, and execution.

#### Configuration

Configure your preferred LLM provider (OpenAI, Anthropic, or Local/Ollama):

```bash
taskflow configure ai --provider openai-compatible --apiKey sk-... --model gpt-4
```

#### AI-Powered Features

- **PRD Generation**: `taskflow prd create` can generate complete requirements from a description.
- **Task Breakdown**: `taskflow tasks generate` analyzes your PRD and creates atomic, testable tasks.
- **Context Analysis**: `taskflow start` analyzes the task and codebase to provide implementation guidance.
- **Smart Execution**: `taskflow do` suggests the next step based on your current progress.

### Commands Layer
13 command classes that handle all workflow operations:

**Initialization & Setup**
- `InitCommand` - Initialize Taskflow in a project

**Status & Navigation**
- `StatusCommand` - View project, feature, or story status
- `NextCommand` - Find next available task

**PRD & Task Generation**
- `PrdCreateCommand` - Create PRD template
- `PrdGenerateArchCommand` - Generate coding standards and architecture rules from PRD
- `TasksGenerateCommand` - Generate task breakdown from PRD

**Task Workflow**
- `StartCommand` - Start a task (SETUP phase)
- `CheckCommand` - Validate and advance task status
- `CommitCommand` - Commit changes and complete task
- `ResumeCommand` - Resume blocked/on-hold tasks
- `SkipCommand` - Mark task as blocked

**Retrospective System**
- `RetroAddCommand` - Add error pattern to retrospective
- `RetroListCommand` - List retrospective entries

### Library Modules

**Core Types & Validation**
- `types.ts` - TypeScript types and Zod schemas for all data structures
- `errors.ts` - Custom error classes (FileNotFoundError, InvalidFileFormatError, etc.)

**Data & Configuration**
- `config-loader.ts` - Load and validate taskflow.config.json
- `config-paths.ts` - Path helpers and configuration constants
- `data-access.ts` - JSON file operations for tasks, features, and project index

**Workflow Support**
- `git.ts` - Git operations (branch switching, commit, push)
- `validation.ts` - Run configured validation commands
- `retrospective.ts` - Error pattern tracking and matching
- `output.ts` - Terminal output formatting utilities

### CLI Interface

The package includes a CLI via `bin/taskflow.js` using Commander.js:

```bash
# Initialize project
taskflow init [project-name]

# Configure AI
taskflow configure ai --provider <provider> --apiKey <key>

# Status and navigation
taskflow status [id]
taskflow next

# PRD workflow
taskflow prd create <feature-name>
taskflow prd generate-arch <prd-file>
taskflow tasks generate <prd-file>

# Task workflow
taskflow start <task-id>
taskflow check
taskflow commit <message>
taskflow resume [status]
taskflow skip <reason>

# Retrospective
taskflow retro add
taskflow retro list [category]
```

## 📊 Task Status Flow

Tasks progress through a state machine:

```
not-started → setup → implementing → verifying → validating → committing → completed
```

Other states: `blocked`, `on-hold`

## 🔧 Programmatic Usage

```typescript
import {
  StartCommand,
  CheckCommand,
  CommitCommand,
  type CommandContext
} from '@krr2020/taskflow';

const context: CommandContext = {
  projectRoot: process.cwd()
};

// Start a task
const startCmd = new StartCommand(context);
const result = await startCmd.execute('1.1.0');

console.log(result.output);     // Human-readable output
console.log(result.nextSteps);  // Next action guidance
console.log(result.aiGuidance); // AI-specific instructions
```

## 📁 Data Structure

### Project Hierarchy
```
project-index.json         # Top-level project and features index
tasks/
  └── F1/                  # Feature directory
      └── F1.json          # Feature file with stories
      └── S1.1/            # Story directory
          └── T1.1.0.json  # Individual task files
```

### Configuration

`taskflow.config.json`:
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
      "format": "echo 'running format'",
      "test": "echo 'running tests'",
      "build": "echo 'building project'"
    }
  }
}
```

## 🧪 Testing

```bash
# Run tests
pnpm test

# Watch mode
pnpm test --watch

# Coverage
pnpm test --coverage
```

## 📚 Integration

Most users should use this package via:
- **[@krr2020/taskflow-mcp](https://www.npmjs.com/package/@krr2020/taskflow-mcp)** - MCP Server for Claude Desktop
- **CLI** - Direct command-line usage via `npx @krr2020/taskflow`

See the main [Taskflow documentation](../README.md) for complete usage examples.

## 📄 License

MIT
