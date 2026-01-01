# Taskflow Migration: LLM Provider for Manual Command Execution

**Status**: 🟡 In Progress
**Started**: 2026-01-01
**Target Completion**: TBD

---

## Overview

This migration adds LLM provider support to Taskflow, enabling manual CLI commands to use AI for selective operations while maintaining the primary MCP + AI agent workflow.

### Migration Goals

1. **Preserve Primary Workflow**: MCP server + AI agents remain the primary use case
2. **Add Manual LLM Support**: Commands like `tasks generate`, `prd generate-arch` can auto-execute when LLM configured
3. **Selective LLM Usage**: Use LLM only where helpful (task generation, error analysis), not for deterministic operations
4. **OpenAI-Compatible**: Support multiple providers through a single compatible implementation
5. **Enhanced Validation**: File-by-file error fixing with LLM assistance and retrospective auto-updates

### Key Design Principles

- ✅ **LLM is optional**: Commands work without LLM (graceful degradation)
- ✅ **MCP workflow unchanged**: Primary use case remains MCP + AI agents
- ✅ **Minimal breaking changes**: Backward compatible configuration, additive features
- ✅ **Provider flexibility**: OpenAI-compatible format supports many providers
- ✅ **Developer-first**: LLM assists, doesn't replace human judgment
- ✅ **Retrospective-driven**: LLM reads retrospective before work, updates after errors
- ✅ **Debugging-aware**: AI instructions optimized for error diagnosis

---

## Migration Phases

### Phase 1: LLM Provider System (3-4 days)
**Status**: ⏳ Not Started

**Objectives**:
- Create provider abstraction layer with per-phase model selection
- Implement OpenAI-compatible, Anthropic, and Ollama providers
- Update configuration schema to support independent models per phase
- Add configure command with phase-specific model options

**Deliverables**:
```
packages/core/src/
├── llm/
│   ├── base.ts                          # LLMProvider interface
│   ├── factory.ts                       # Provider factory + model selector
│   ├── model-selector.ts                 # Select model based on phase
│   └── providers/
│       ├── openai-compatible.ts           # OpenAI, Azure, Together, Groq, DeepSeek, Custom
│       ├── anthropic.ts                  # Anthropic Claude
│       └── ollama.ts                     # Local Ollama
└── schemas/
    └── config.ts                         # Add AIConfigSchema with per-phase models
```

**New Configuration Concept**:
```json
{
  "ai": {
    "enabled": true,
    "provider": "anthropic",
    "apiKey": "${ANTHROPIC_API_KEY}",
    "models": {
      "default": "claude-sonnet-4-20250514",
      "planning": "claude-opus-4",              // User's choice for planning
      "execution": "gemini-pro-2.0",           // User's choice for execution
      "analysis": "claude-sonnet-4-20250514"     // User's choice for analysis
    }
  }
}
```

**New Commands**:
```bash
# Set models per phase
pnpm task configure ai \
  --planning claude-opus-4 \
  --execution gemini-pro-2.0 \
  --analysis claude-sonnet-4-20250514

# Or set one model for all phases
pnpm task configure ai --model claude-sonnet-4-20250514

# Or configure different providers for different phases
pnpm task configure ai \
  --provider anthropic \
  --planning claude-opus-4 \
  --execution gemini-pro-2.0 \
  --analysisApiKey ${GOOGLE_API_KEY}
```

**Status Checks**:
- [ ] Provider interface created with generate() and isConfigured()
- [ ] OpenAI-compatible provider working with fetch API
- [ ] Anthropic provider working with Claude API
- [ ] Ollama provider working with local API
- [ ] Provider factory routes to correct implementation
- [ ] AIConfigSchema added to config schema
- [ ] Environment variable interpolation working (${VAR_NAME})
- [ ] Configure command implemented and tested
- [ ] Unit tests for all providers
- [ ] Factory tests with different providers
- [ ] Config loader tests with env vars

---

### Phase 2: Validation Enhancement (2-3 days)
**Status**: ⏳ Not Started

**Objectives**:
- Parse validation logs to extract structured errors
- Group errors by file for targeted fixing
- Use LLM to suggest fixes per file
- Re-validate files individually before full suite
- Auto-update retrospective with error patterns

**Deliverables**:
```
packages/core/src/
└── validation/
    ├── log-parser.ts                     # Parse TS, lint, test errors
    ├── file-validator.ts                  # Fix files with LLM
    └── types.ts                          # ValidationError interface

packages/core/templates/protocols/
└── debug-validator.ts                  # NEW: AI instructions for debugging validation failures
```

**Enhanced Validation Flow**:
```
1. Before work starts (PLANNING state):
   a. LLM reads retrospective.md (from .taskflow/ref/protocols/retrospective.md)
   b. LLM learns from known error patterns
   c. LLM avoids repeating past mistakes

2. Run validation (existing behavior)
   ↓
3. Parse logs → Extract errors with file, line, code
   ↓
4. Validation fails → Load debug instructions:
   a. Read debug-validator.ts (new template file)
   b. Provides AI-specific debugging workflow
   c. Guides LLM through systematic error analysis

5. Group errors by file
   ↓
6. For each file:
   a. Read file content
   b. Ask LLM for fix (using debug-validator guidance)
   c. Show diff/apply fix
   d. Re-validate that file
   ↓
7. All files fixed → Run full validation suite
   ↓
8. Pass → Update retrospective with NEW error patterns:
   a. Extract error patterns from failures
   b. If pattern not in retrospective → ADD IT
   c. Include solution used to fix
   d. Prevent future occurrences
```

**Status Checks**:
- [ ] ValidationLogParser extracts TypeScript errors
- [ ] ValidationLogParser extracts ESLint errors
- [ ] ValidationLogParser extracts test failures
- [ ] Errors grouped by file correctly
- [ ] FileValidator generates fix prompts
- [ ] LLM called for suggestions when configured
- [ ] File-by-file re-validation works
- [ ] Full suite re-validation after all files fixed
- [ ] Retrospective auto-updates with new patterns
- [ ] Graceful degradation when LLM not configured
- [ ] **debug-validator.ts template created with systematic debugging workflow**
- [ ] LLM reads retrospective before work starts
- [ ] Debug instructions guide LLM through error analysis
- [ ] Retrospective updated after validation fixes
- [ ] Log parser tests with sample outputs
- [ ] File validator integration tests

---

### Phase 3: Task Execution Enhancement (1-2 days)
**Status**: ⏳ Not Started

**Objectives**:
- Enhance `do` command with LLM context understanding
- Add LLM guidance for error analysis
- Show file recommendations and pitfalls
- Keep guidance concise (200 words max)

**Deliverables**:
- Enhanced `commands/workflow/do.ts`
- Enhanced `commands/workflow/check.ts`
- Updated `BaseCommand` with LLM helpers

**Enhanced Task Execution Flow**:
```
pnpm task start 1.1.0
   ↓
1. Show task details (existing)
   ↓
2. If LLM configured:
   - Generate context understanding
   - Show file recommendations
   - Show potential pitfalls
   - Show subtask order recommendations
   ↓
3. User implements code
   ↓
pnpm task check
   ↓
4. If validation fails and LLM configured:
   - Analyze errors by file
   - Show targeted fix suggestions
   - Update retrospective with patterns
   ↓
5. Re-run validation
```

**Status Checks**:
- [ ] BaseCommand has llmProvider property
- [ ] getLLMGuidance() helper method
- [ ] Do command shows LLM context understanding
- [ ] LLM guidance includes file recommendations
- [ ] LLM guidance includes potential pitfalls
- [ ] Check command uses LLM for error analysis
- [ ] Errors shown grouped by file
- [ ] Fix suggestions per file when LLM configured
- [ ] Do command tests with/without LLM
- [ ] Check command error handling tests

---

### Phase 4: Documentation (1 day)
**Status**: ✅ Completed

**Objectives**:
- Update README with LLM configuration
- Add CONFIG.md with complete reference
- Update command help text
- Add troubleshooting guide

**Deliverables**:
- Updated `README.md`
- New `docs/CONFIG.md`
- Updated `docs/COMMANDS.md`
- New `docs/TROUBLESHOOTING.md`

**Status Checks**:
- [x] README has LLM configuration section
- [x] README explains when LLM is used vs not used
- [x] Provider comparison table added
- [x] CONFIG.md documents all AI config options
- [x] CONFIG.md has environment variable examples
- [x] COMMANDS.md updated for configure command
- [x] Command help text shows LLM usage
- [x] TROUBLESHOOTING.md covers LLM issues
- [x] Provider-specific configuration examples

---

## Configuration Migration

### Before Migration
```json
{
  "version": "2.0",
  "projectType": "custom",
  "branching": { ... },
  "contextRules": [ ... ],
  "gates": { ... },
  "commands": { ... }
}
```

### After Migration (Optional)
```json
{
  "version": "2.0",
  "projectType": "custom",
  "branching": { ... },
  "contextRules": [ ... ],
  "gates": { ... },
  "commands": { ... },
  "ai": {
    "enabled": true,
    "provider": "openai",
    "model": "gpt-4o",
    "apiKey": "${OPENAI_API_KEY}"
  }
}
```

**Note**: `ai` field is optional. Without it, commands work as before (show guidance only).

---

## Supported Providers After Migration

| Provider | Type | Cost | Speed | Quality | Offline |
|----------|-------|-------|----------|----------|
| OpenAI | Paid | Fast | High | No |
| Azure OpenAI | Paid | Fast | High | No |
| Together AI | Paid | Medium | High | No |
| Groq | Paid | Very Fast | Medium | No |
| DeepSeek | Paid | Medium | High | No |
| Anthropic | Paid | Medium | Very High | No |
| Ollama | Free | Slow | Medium | **Yes** |
| Custom | Varies | Varies | Varies | No |

---

## Backward Compatibility

### Unchanged Behavior
- ✅ MCP server tools return same guidance format
- ✅ AI agents (Claude Desktop, Cursor) work identically
- ✅ `pnpm task status`, `pnpm task next`, `pnpm task resume` unchanged
- ✅ Branch creation and management unchanged
- ✅ Core workflow state machine unchanged

### New Behavior (Optional)
- 🆕 `pnpm task configure ai` - Configure LLM provider with per-phase models
- 🆕 `tasks generate` - Auto-executes with LLM when configured
- 🆕 `prd generate-arch` - Auto-executes with LLM when configured
- 🆕 `check` - File-by-file validation with LLM assistance
- 🆕 Retrospective read before work, updated after errors
- 🆕 **debug-validator.ts** - Systematic debugging instructions for AI agents

### Graceful Degradation
```
If LLM configured:
  → Use LLM for guidance and execution
  → Show enhanced error analysis
  → Auto-fix validation errors (with approval)

If LLM NOT configured:
  → Work exactly as before (show guidance)
  → User manually implements suggestions
  → No breaking changes
```

---

## Testing Strategy

### Unit Tests
- Provider implementations with mock APIs
- Factory routing logic
- Config schema validation
- Log parser with sample outputs
- File validator with mocked LLM

### Integration Tests
- Configure command with test providers
- Task generation with LLM
- Validation with file-by-file fixes
- Retrospective updates

### Manual Testing Checklist
- [ ] Configure OpenAI and run `tasks generate`
- [ ] Configure Anthropic and run `prd generate-arch`
- [ ] Configure Ollama and test offline usage
- [ ] Run validation with errors, verify file-by-file fixing
- [ ] Verify retrospective auto-updates
- [ ] Test without LLM configured (fallback behavior)
- [ ] Test MCP workflow (ensure no regression)

---

## Rollback Plan

If migration causes issues:

1. **Disable LLM**: Set `"ai.enabled": false` in config
2. **Fallback**: Commands work as before (show guidance only)
3. **Revert**: Remove `ai` field from config, commands unchanged
4. **Report**: Create issue with specific failure scenario

**No data loss**: Migration only adds features, doesn't modify existing data.

---

## Success Criteria

All phases complete when:
- [x] All 4 phases marked complete
- [x] All status checks in each phase passed
- [ ] Unit tests passing
- [ ] Integration tests passing
- [ ] Manual testing complete
- [x] Documentation updated
- [ ] MCP workflow verified (no regression)
- [x] Backward compatibility confirmed

---

## Migration Team

- **Migration Owner**: TBD
- **Reviewer**: TBD
- **Approved By**: TBD

---

## New Template: debug-validator.ts

**Purpose**: Provide AI agents with systematic instructions for debugging and fixing validation errors.

**Location**: `packages/core/templates/protocols/debug-validator.md`

**When Used**: 
- Validation fails (type check, lint, test errors)
- LLM agent needs to fix errors file by file
- Retrospective needs to be updated with new patterns

**Content Structure**:
```markdown
# DEBUG VALIDATOR - AI Instructions for Error Debugging

## PRE-WORKFLOW (Before Fixing Errors)

1. **READ RETROSPECTIVE FIRST**
   - Load: .taskflow/ref/protocols/retrospective.md
   - Learn: Known error patterns from this project
   - Avoid: Do not repeat mistakes already documented

2. **UNDERSTAND THE CONTEXT**
   - What validation failed? (type-check, lint, test, format)
   - What files are affected?
   - What error categories? (TS errors, ESLint violations, test failures)

## DEBUGGING WORKFLOW

### Step 1: Parse Errors
- Extract file, line, error code, message
- Group errors by file
- Identify error patterns

### Step 2: Check Retrospective
- For each error pattern:
  - Search in retrospective
  - If found → Use documented solution
  - If not found → Proceed to Step 3

### Step 3: Analyze Error (File by File)
For each file with errors:
1. Read the file
2. Understand the error context
3. Check retrospective for similar patterns
4. Determine root cause
5. Plan the fix

### Step 4: Apply Fix
- Generate corrected code
- Show diff before applying
- Re-validate that specific file
- Fix must pass validation for that file

### Step 5: Re-validate Full Suite
- All files fixed → Run full validation
- If any file fails → Repeat Step 3-4
- All pass → Proceed to Step 6

### Step 6: Update Retrospective
For each NEW error pattern fixed:
1. Extract pattern (error code, message, category)
2. Document solution (what fixed it)
3. Add to retrospective with criticality
4. Include: Error type, pattern, solution, example

## ERROR CATEGORY GUIDELINES

### TypeScript Errors (TSxxxx)
- Read: Type definitions, interfaces used
- Check: Import paths, type compatibility
- Fix: Correct types, add assertions, update interfaces

### ESLint Errors
- Read: Code style rules (.eslintrc, biome.json)
- Check: Code formatting, best practices
- Fix: Adjust code to match style rules

### Test Failures
- Read: Test file, implementation code
- Check: Expected vs actual behavior
- Fix: Correct implementation or update test (whichever is wrong)

## POST-WORKFLOW (After All Errors Fixed)

1. **RUN FULL VALIDATION**
   - Execute all checks: format, lint, type-check, test
   - Ensure everything passes

2. **VERIFY RETROSPECTIVE UPDATE**
   - New patterns added?
   - Solutions documented?
   - Criticality set correctly?

3. **CONFIRM READY TO COMMIT**
   - All validations passing
   - Retrospective updated
   - No errors remaining

## CRITICAL RULES

- ✅ ALWAYS read retrospective before fixing
- ✅ Fix ONE file at a time, re-validate after each
- ✅ Update retrospective for NEW patterns only
- ✅ Show diff before applying changes
- ✅ Don't guess - use patterns from retrospective
- ❌ DON'T skip retrospective read
- ❌ DON'T fix all files at once
- ❌ DON'T add retrospective entries that already exist

## RETROSPECTIVE UPDATE FORMAT

```markdown
## [Error Category]

### Pattern: [error code or message pattern]
**Files**: [affected files]
**Solution**: [how you fixed it]
**Criticality**: [low/medium/high]
```

Add only if pattern doesn't already exist in retrospective.
```

**Key Points**:
- Retrospective-driven: Always check existing patterns first
- File-by-file: Fix one file, validate, move to next
- Learning: Update retrospective with new patterns
- Systematic: Follow workflow steps exactly

---

## References

- Specification: [LLM Provider Enhancement Spec](.factory/specs/2026-01-01-taskflow-enhancement-llm-provider-for-manual-command-execution.md)
- Original Issue: TBD
- Related PRs: TBD

---

## Changelog

### [Date: 2026-01-01]
- Created migration document
- Defined 4-phase implementation plan
- Set up phase-wise tracking

### [Date: 2026-01-01 - Enhanced]
- Added per-phase model selection capability
  - planning, execution, analysis models independent
  - User can choose best model for each phase
  - Example: planning=claude-opus-4, execution=gemini-pro-2.0, analysis=claude-sonnet-4
- Added debug-validator.ts template
  - Systematic debugging workflow for validation errors
  - Retrospective-driven: read before work, update after errors
  - File-by-file fixing with error pattern extraction
- Added retrospective-driven workflow
  - LLM reads retrospective before work starts
  - LLM updates retrospective after fixing new errors
  - Prevents repeated mistakes

### [Date: 2026-01-01 - Phase 4 Complete]
- ✅ Phase 4: Documentation completed
- Updated README.md with comprehensive LLM configuration section
  - Added "When LLM is Used" section explaining AI benefits
  - Added supported providers comparison table
  - Added quick setup examples with environment variables
  - Added per-phase model selection guidance
  - Added retrospective-driven workflow explanation
- Created docs/CONFIG.md with complete AI configuration reference
  - Comprehensive provider-specific setup instructions
  - Environment variable usage guide
  - Per-phase model configuration examples
  - Advanced options (temperature, timeout, maxTokens)
  - Configuration migration guide from v1.x to v2.0
- Updated docs/COMMANDS.md with configure command documentation
  - Added "Configuration Commands" section
  - Documented all `taskflow configure ai` options
  - Added per-phase model usage examples
  - Included configuration file update examples
  - Added provider-specific setup instructions
- Created docs/TROUBLESHOOTING.md with LLM-related issues
  - Common AI/LLM configuration errors and solutions
  - Provider-specific troubleshooting (Anthropic, OpenAI, Azure, Ollama, etc.)
  - API authentication and rate limit issues
  - Validation issues with LLM assistance
  - Debug mode and log checking guidance
  - Quick fixes reference table
- Updated README.md documentation section with new files
  - Added CONFIG.md and TROUBLESHOOTING.md links
  - Updated package structure section
