# @krr2020/taskflow-mcp-server

The **Taskflow MCP Server** exposes the Taskflow 2.0 State Machine and Context Broker capabilities via the [Model Context Protocol (MCP)](https://modelcontextprotocol.io/). This allows AI assistants (like Claude) to directly interact with your development workflow, managing tasks, git branches, and project state.

## 📦 Installation

```bash
npm install @krr2020/taskflow-mcp-server
```

## 🚀 Usage

You can run the server directly using `npx`. This is the recommended way to use it with MCP clients.

```bash
npx @krr2020/taskflow-mcp-server
```

### Configuration for Claude Desktop

To use Taskflow with Claude Desktop, add the following configuration to your `claude_desktop_config.json` file (usually located at `~/Library/Application Support/Claude/claude_desktop_config.json` on macOS):

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

After updating the configuration, restart Claude Desktop. You should see the Taskflow tools available in the 🔌 menu.

## 🛠️ Available Tools

The server exposes the following tools to the AI assistant:

### Workflow Management
- **`start_task`**: Starts a new task.
  - **Inputs**: `taskId` (e.g., "1.2.3"), `storyId` (e.g., "15"), `slug` (e.g., "user-auth").
  - **Action**: Checks out the feature branch `story/S{storyId}-{slug}` and transitions the state machine to `PLANNING` mode.
- **`approve_plan`**: Approves the current implementation plan.
  - **Action**: Transitions the state machine from `PLANNING` to `EXECUTION` mode, signaling that coding can begin.
- **`run_checks`**: Runs project validations.
  - **Action**: Transitions the state machine to `VERIFICATION` mode to run tests and linters.
- **`submit_task`**: Submits the completed task.
  - **Action**: Completes the workflow for the current task.

### State & Context
- **`get_status`**: Retrieves the current status of the state machine and the active task.

### Generators
- **`generate_prd`**: Generates a Project Requirements Document (PRD) template based on the project context.
- **`generate_tasks`**: Generates a structured list of tasks from a provided PRD content.

## 🏗️ Architecture

This server is built on top of `@krr2020/taskflow-core`, which handles the business logic for:
- **State Machine**: Enforcing valid transitions (e.g., IDLE -> PLANNING -> EXECUTION).
- **Git Manager**: Automating branch management and stash operations.
- **Config Loader**: Reading project configuration.

## 📄 License

MIT
