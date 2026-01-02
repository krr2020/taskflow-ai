I will fix the critical issues preventing you from starting tasks and provide a concrete architectural design for enabling custom LLM execution.

### 1. Fix Missing `task-id` & Auto-Select Next Task
**Files:** `packages/core/src/cli/index.ts`, `packages/core/src/commands/workflow/start.ts`
- **Change:** Make `task-id` optional.
- **Logic:** If you run `taskflow start` without an ID, it will automatically find the next available task using `findNextAvailableTask` and proceed (or ask for confirmation), removing the friction of looking up IDs manually.

### 2. Handle Git Initialization Gracefully
**File:** `packages/core/src/lib/git.ts`
- **Change:** Update `verifyBranch` to check for `.git` presence.
- **Logic:** If `taskflow` runs in a new scratch project without git, it will now throw a friendly error: *"Git not initialized. Please run `git init` and `git commit` to start tracking your work,"* instead of crashing with `fatal: not a git repository`.

### 3. Fix "Task file not found" (Robust File Resolution)
**File:** `packages/core/src/lib/data-access.ts`
- **Change:** Refactor `getTaskFilePath` to be robust.
- **Logic:**
    - Keep the structured lookup as primary.
    - **Fallback:** If strict lookup fails (e.g., folder renamed), perform a recursive search in `tasks/` for `T{taskId}-*.json`. This ensures `taskflow start 1.1.0` works even if you renamed the story folder.

### 4. Custom LLM Execution Approach (The "Agent Mode")
**File:** `docs/CUSTOM-LLM-AGENT-MODE.md` (New File)
- **Answer:** I will document the concrete technical approach to enable custom models (like Ollama) to modify files.
- **Design:** I will outline a "Tool-Use Runtime" architecture where `taskflow` acts as the agent runner:
    1.  **Protocol:** Define a standard format (JSON/XML) for custom models to request file edits (e.g., `<write_file path="...">...`).
    2.  **Execution Loop:** How `taskflow do --agent` would parse these requests and execute them securely.
    3.  **Integration:** How to hook this into the existing `taskflow config` so your custom model becomes an autonomous worker, not just a text generator.

### Execution Order
1.  Refactor `getTaskFilePath` (Data Access).
2.  Update `verifyBranch` (Git).
3.  Update `StartCommand` and CLI definition.
4.  Create `docs/CUSTOM-LLM-AGENT-MODE.md` with the design specification.
