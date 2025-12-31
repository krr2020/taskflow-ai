# TASKFLOW AGENT PROTOCOL

YOU ARE a task execution agent. Follow this protocol exactly.

## 🚨 CRITICAL RULES (NEVER VIOLATE)

### File Permissions
- ✅ **EDIT**: `apps/`, `packages/`, `src/`, `lib/` (project source only)
- ✅ **READ**: `.taskflow/ref/` (reference docs)
- ❌ **NEVER EDIT**: `.taskflow/`, `tasks/` (use commands instead)

### Command Usage
- **ALWAYS** use `pnpm task` commands for ALL task management
- **NEVER** run builds/tests directly - use `pnpm task check`
- **NEVER** skip workflow states

## WORKFLOW SEQUENCE

```
START → READ → ADVANCE → IMPLEMENT → ADVANCE → VALIDATE → COMMIT
  ↓       ↓       ↓          ↓          ↓         ↓         ↓
start    do     check      (code)     check     check    commit
```

### States & Transitions
```
not-started → SETUP → PLANNING → IMPLEMENTING → VERIFYING → VALIDATING → COMMITTING → completed
```

| State | What You Do | Advance |
|-------|-------------|---------|
| **SETUP** | Read all context | `pnpm task check` |
| **PLANNING** | Create execution plan | `pnpm task check` |
| **IMPLEMENTING** | Write code | `pnpm task check` |
| **VERIFYING** | Self-review | `pnpm task check` |
| **VALIDATING** | Auto-checks run | `pnpm task check` |
| **COMMITTING** | Commit ready | `pnpm task commit` |

## COMMANDS

**Workflow:** `start <id>` → `do` → `check` → (code) → `check` → `commit`

**Navigation:** `status [id]` · `next` · `resume [id]`

**Recovery:** `skip --reason "..."` · `retro add/list`

## STANDARDIZED OUTPUT

Every command shows:
```
═══════════════════════════════
✓ [COMMAND] Result
═══════════════════════════════
OUTPUT
───────────────────────────────
Key: Value
NEXT STEPS
───────────────────────────────
▸ pnpm task <command>
  What to do next

🚨 AI AGENT RULES
• NEVER edit .taskflow/ or tasks/
• ALWAYS use pnpm task commands
• ONLY modify project source code
```

**ALWAYS READ** the OUTPUT and **FOLLOW** the NEXT STEPS sections.

## STATE-SPECIFIC INSTRUCTIONS

Run `pnpm task do` - it shows **different guidance** per state:

- **SETUP**: Read AI Protocol, Architecture, Standards, Retrospective, Task details
- **PLANNING**: Create execution plan, analyze context, search for patterns
- **IMPLEMENTING**: Shows task checklist, context files, DO/DON'T guidance
- **VERIFYING**: Shows verification checklist, retrospective patterns
- **VALIDATING**: Explains auto-checks (biome, type-check, arch, test)
- **COMMITTING**: Shows commit format

## ERROR RECOVERY

**Validation fails?**
1. Read error output
2. Fix in project source code
3. Add to retrospective if new: `pnpm task retro add --category "..." --pattern "..." --solution "..." --criticality "..."`
4. Re-run `pnpm task check`

**Commit fails?** Fix issue, retry `pnpm task commit`

**Session interrupted?** `pnpm task resume`

## COMMIT FORMAT

```bash
pnpm task commit " - Change 1\n - Change 2\n - Change 3"
```

Auto-generates:
```
feat(F1): T1.1.0 - Task Title

- Change 1
- Change 2
- Change 3

🤖 Generated with Claude Code
Co-Authored-By: Claude Sonnet 4.5
```

## BEHAVIOR RULES

1. ✅ **READ** all OUTPUT and NEXT STEPS completely
2. ✅ **TRUST** the CLI - it knows current state
3. ✅ **FOLLOW** NEXT STEPS instructions immediately
4. ✅ **ONE TASK** at a time - complete fully
5. ✅ **UPDATE** retrospective on new errors

## CONTEXT MANAGEMENT

### Why Context Clearing Matters

Each SETUP state loads ALL reference files:
- `.taskflow/ref/RETROSPECTIVE.md`
- `.taskflow/ref/AI-PROTOCOL.md`
- `.taskflow/ref/ARCHITECTURE-RULES.md`
- `.taskflow/ref/CODING-STANDARDS.md`
- `.taskflow/ref/skills/[skill].md`
- Task details and subtasks

**Problem**: Context accumulates across tasks, degrading AI performance.

### Context Clearing Protocol

When taskflow.config has `ai.clearContextOnComplete: true` (default):

**After COMMITTING state, you will see:**
```
🧹 CONTEXT MANAGEMENT:
─────────────────────────
IMPORTANT: Clear your AI model context before starting the next task.

Action:
- Clear/reset your AI assistant context window
- Start fresh with only the next task context
```

**Your Required Actions:**
1. Clear context window completely
2. Do NOT carry over information from previous tasks
3. Start fresh with the next task only

**Why This is Required:**
- Prevents context window saturation
- Maintains optimal model performance
- Reduces hallucinations from stale context
- Ensures focus on current task requirements

### Auto-Continue Behavior

When taskflow.config has `ai.autoContinueTask: true` (default: false):

**After COMMITTING state, you will see:**
```
🚀 AUTO-CONTINUE ENABLED:
───────────────────────────
You are configured to automatically continue to the next task.

IMMEDIATE ACTION:
──────────────────
Run this command NOW: taskflow start <next-task-id>

Do NOT wait for user confirmation.
Do NOT ask for permission.

Proceed directly to the next task without any delay.
```

**Your Required Actions:**
1. Execute `taskflow start <next-task-id>` immediately
2. Do NOT wait for user input
3. Do NOT ask "should I continue?"
4. Proceed autonomously to the next task

When `ai.autoContinueTask: false` (default):
- Wait for user confirmation before proceeding
- User will explicitly start the next task
- Do NOT auto-proceed

### Context Reset Checklist

Before starting a new task:
- [ ] Context window is cleared/reset
- [ ] No information from previous tasks
- [ ] Only current task details loaded
- [ ] Ready to follow SETUP → PLANNING → IMPLEMENTING

**CRITICAL**: Always clear context between tasks when instructed. This is essential for maintaining quality and performance, not optional.
