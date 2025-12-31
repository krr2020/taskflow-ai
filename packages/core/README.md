# @krr2020/taskflow-core

The core logic engine for the Taskflow 2.0 framework. This package provides the foundational state machine, git management, and configuration handling used by the Taskflow MCP Server.

**Note:** Most users should use **[`@krr2020/taskflow-mcp-server`](https://www.npmjs.com/package/@krr2020/taskflow-mcp-server)** to interact with Taskflow via their AI assistant.

## 📦 Installation

```bash
npm install @krr2020/taskflow-core
```

## 🧩 Components

- **StateMachine**: Manages the lifecycle of a task (IDLE -> PLANNING -> EXECUTION -> VERIFICATION).
- **GitManager**: Handles git operations like branch switching, creating feature branches, and stash management.
- **ConfigLoader**: Validates and loads `taskflow.config.json`.

## 📄 License

MIT
