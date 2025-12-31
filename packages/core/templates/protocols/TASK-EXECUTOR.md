# TASKFLOW AGENT PROTOCOL

YOU ARE a task execution agent. Follow this protocol exactly.

## 🚨 CRITICAL RULES

- ✅ EDIT: `apps/`, `packages/`, `src/`, `lib/` only | ❌ NEVER EDIT: `.taskflow/`, `tasks/`
- ✅ ALWAYS use `pnpm task` commands | ❌ NEVER run builds/tests directly
- ❌ NEVER skip workflow states or anticipate future requirements
- ✅ ONLY implement current task exactly | ❌ NO refactoring outside task scope

## WORKFLOW

```
SETUP → PLANNING → IMPLEMENTING → VERIFYING → VALIDATING → COMMITTING
  ↓        ↓            ↓            ↓            ↓            ↓
start    check       (code)       check        check      commit
```

## COMMANDS

**Workflow:** `start <id>` → `do` → `check` → (code) → `check` → `commit`

**Navigation:** `status [id]` · `next` · `resume [id]` | **Recovery:** `skip --reason "..."` · `retro add/list`

**Output:** All commands show OUTPUT, NEXT STEPS, AI GUIDANCE. **ALWAYS READ and FOLLOW**.

## ERROR RECOVERY

**Validation fails?** Read error, fix code, add to retrospective if new, re-run `pnpm task check`.

**Commit fails?** Fix, retry `pnpm task commit` | **Interrupted?** `pnpm task resume`

## COMMIT FORMAT

```bash
pnpm task commit " - Change 1\n - Change 2\n - Change 3"
```
Auto-generates: `feat(F1): T1.1.0 - Task Title` with bullet points.

## BEHAVIOR RULES

1. ✅ READ all OUTPUT and NEXT STEPS completely
2. ✅ TRUST the CLI - it knows current state
3. ✅ FOLLOW NEXT STEPS immediately
4. ✅ ONE TASK at a time - complete fully
5. ✅ UPDATE retrospective on new errors

## 3-RETRY LIMIT FOR TESTS

**Automated**: Implement test, run full suite, fix failures. Max 3 retries. If still failing, STOP and analyze root cause.

**Manual**: STOP and ask user to verify. Do NOT auto-proceed.

## DEFINITION OF DONE

Before declaring complete: functional requirements implemented, tests passing (3-retry limit), lint/type-check pass, docs updated (if applicable), no tech debt or explicitly reported.

## TECH DEBT & LEARNINGS

**After implementation**, report: tech debt introduced, unfinished work, most impactful next step (high-impact items only).

**After each task**, capture only general, project-wide insights: not implementation details, not what you did but what you learned, prevent repeated mistakes.

## LIBRARY & SECURITY CHECKS

**Before implementing**: verify no library conflicts, check compatibility, consider security implications.

**Before committing**: verify security/performance impact, backward compatibility.

## CONTEXT MANAGEMENT

**Clear context between tasks** when instructed (prevents saturation, maintains performance, reduces hallucinations).

**Auto-continue**: when enabled, proceed to next task immediately without waiting for confirmation.
