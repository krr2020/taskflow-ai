# Taskflow

AI-powered task management framework for structured development workflows.

Taskflow brings structure, quality gates, and traceability to your development process through a state-machine-based task workflow, automated validations, and seamless Git integration.

---

## Quick Start

```bash
# Install globally
npm install -g @krr2020/taskflow

# Initialize your project
cd your-project
taskflow init

# Create a feature specification (Interactive AI)
taskflow prd create

# Or analyze existing code
taskflow prd detect

# To create architecture files after prd document creation
taskflow prd generate-arch

# Generate tasks from the spec
taskflow tasks generate tasks/prds/YYYY-MM-DD-user-authentication.md

# Start working
taskflow start 1.1.0
taskflow do        # Read current instructions
# ... write code ...
taskflow check     # Advance through states
taskflow commit "- Implemented login endpoint"
```

---

## What is Taskflow?

Taskflow helps development teams maintain consistent workflows by:

- **Enforcing quality gates**: Every task goes through setup → implementing → verifying → validating → committing
- **Visual Dashboard**: Manage projects, track progress, and view tasks in a modern web UI (`taskflow ui`)
- **Automating validations**: Runs lint, type-check, and tests before allowing commits
- **Managing Git branches**: Automatic branch creation and conventional commit messages
- **Supporting AI agents**: Works with Claude Desktop, Cursor, and other AI coding assistants
- **Learning from errors**: Tracks common mistakes and solutions in a retrospective system

Perfect for teams using AI-assisted development or anyone wanting more structure in their workflow.

---

## Installation

### Option 1: Global CLI (Recommended)

Best for most developers who want to use Taskflow across multiple projects.

```bash
npm install -g @krr2020/taskflow
```

Use with: `taskflow <command>`

### Option 2: MCP Server for Claude Desktop

Best for using Claude Desktop with AI assistance.

```bash
npm install -g @krr2020/taskflow-mcp
```

Configure in Claude Desktop's `claude_desktop_config.json`:

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

### Option 3: Project Dev Dependency

Best for adding Taskflow to a specific project.

```bash
npm install -D @krr2020/taskflow
```

Use with: `npx @krr2020/taskflow <command>` or add a script to package.json

---

## Core Workflow

Each task progresses through a clear state flow:

```
not-started → setup → implementing → verifying → validating → committing → completed
```

**Common commands:**

- `taskflow status` - View project progress
- `taskflow ui` - Start visual dashboard
- `taskflow next` - Find next available task
- `taskflow start <id>` - Begin a task
- `taskflow do` - Show instructions for current state
- `taskflow check` - Advance to next state or run validations
- `taskflow commit "message"` - Commit and complete task

---

## Brownfield Development

Taskflow isn't just for new projects. It includes powerful tools for existing codebases:

- **Feature Detection**: Automatically scan your codebase to detect implemented features.
- **Gap Analysis**: Compare your code against a PRD to find missing requirements.
- **Migration Planning**: Generate detailed plans for framework or library migrations.

```bash
# Scan current codebase
taskflow prd detect

# Check implementation status
taskflow prd analyze tasks/prds/my-feature.md
```

---

## AI Integration (Optional)

Taskflow supports optional LLM integration for:

- Interactive PRD creation and refinement
- Auto-generating tasks from PRD documents
- Analyzing and fixing validation errors
- Providing context-aware guidance

Configure with:

```bash
taskflow configure ai --provider anthropic --model claude-3-5-sonnet-20241022
```

Supports: OpenAI, Anthropic, Ollama, Azure, Together AI, Groq, DeepSeek

See [docs/CONFIG.md](./docs/CONFIG.md) for detailed AI configuration.

---

## Documentation

**Getting Started:**
- [Getting Started Guide](./docs/GETTING-STARTED.md) - Complete tutorial from installation to first commit

**Daily Usage:**
- [User Guide](./docs/USER-GUIDE.md) - Common workflows and patterns
- [Commands Reference](./docs/COMMANDS.md) - All available commands
- [Configuration Guide](./docs/CONFIG.md) - AI/LLM setup and options

**Help:**
- [Troubleshooting](./docs/TROUBLESHOOTING.md) - Common issues and solutions

**Technical:**
- [Architecture](./docs/ARCHITECTURE.md) - System design and internals

---

## Package Structure

```
taskflow/
├── packages/
│   ├── core/           # Main CLI package
│   ├── ui/             # Dashboard web application
│   └── mcp-server/     # MCP server for Claude Desktop
└── docs/               # Documentation
```

---

## Getting Help

- **Documentation**: Check the [docs/](./docs) folder for detailed guides
- **Issues**: Report bugs at [GitHub Issues](https://github.com/krr2020/taskflow/issues)
- **Questions**: Ask in [GitHub Discussions](https://github.com/krr2020/taskflow/discussions)

---

**Built for better development workflows**
