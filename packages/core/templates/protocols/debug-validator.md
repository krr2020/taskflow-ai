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
