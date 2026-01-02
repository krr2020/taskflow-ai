# TaskFlow PRD Creation & Brownfield Support - Implementation Plan

**Status**: ✅ Completed
**Reference**: https://raw.githubusercontent.com/snarktank/ai-dev-tasks/refs/heads/main/create-prd.md
**Last Updated**: 2026-01-02

---

## 📋 Table of Contents
- [Phase 1: PRD Creation Improvements](#phase-1-prd-creation-improvements-high-priority)
- [Phase 2: Brownfield Support](#phase-2-brownfield-support)
- [Testing Checklist](#testing-checklist)
- [Success Criteria](#success-criteria)

---

## Phase 1: PRD Creation Improvements (HIGH PRIORITY)

### 🎯 Goals
Fix PRD creation to follow reference implementation with single-pass Q&A workflow.

### 📊 Progress: 7/7 Tasks Complete

---

### Task 1: Add Multi-line Input Support
**File**: `/packages/core/src/lib/interactive-session.ts`
**Status**: ✅ Completed

#### Requirements
- [x] Add `promptMultiline()` method to `InteractiveSession` class
- [x] Collect lines until user enters empty line twice (markdown convention)
- [x] Display hint: "Enter your summary (press Enter twice to finish)"
- [x] Join lines with newlines
- [x] Validate minimum lines if required
- [x] Handle quit/exit commands during multi-line input

#### Implementation Notes
```typescript
protected async promptMultiline(
  question: string,
  hint?: string,
  minLines: number = 1
): Promise<PromptResult> {
  // Collect until two consecutive empty lines
  // Return PromptResult with concatenated content
}
```

---

### Task 2: Simplify Interactive PRD Session
**File**: `/packages/core/src/lib/prd-interactive-session.ts`
**Status**: ✅ Completed

#### Requirements
- [x] Remove all detailed question methods (askProblemStatement, askUserStories, etc.)
- [x] Keep only: `askTitle()` and `askSummary()`
- [x] Update `askSummary()` to use new `promptMultiline()` method
- [x] Update `PRDSessionData` interface to only include `featureName`, `title`, `summary`
- [x] Update `runSteps()` to only call title and summary prompts
- [x] Update `showSummary()` to display only title and summary

#### New Flow
```typescript
protected async runSteps(): Promise<void> {
  await this.askTitle();      // "What is the feature title?"
  await this.askSummary();    // "Provide detailed summary" (multi-line)
}
```

---

### Task 3: Redesign Q&A Flow in PRD Command
**File**: `/packages/core/src/commands/prd/create.ts`
**Status**: ✅ Completed

#### 3.1 Update execute() method
- [x] Always use interactive mode for title + summary (no CLI args)
- [x] Call `gatherInteractiveInfo()` to get title and summary
- [x] Pass title and summary to `generatePRDWithLLM()`
- [x] Remove optional `description` and `title` parameters from execute signature

#### 3.2 Replace iterative Q&A loop (lines 284-475)
- [x] Remove current max 5 iterations loop
- [x] Implement single-pass workflow:
  1. Generate all questions at once
  2. Parse and display questions
  3. Collect all answers
  4. Generate final PRD
- [x] Update method signature: `generatePRDWithLLM(featureName, title, summary, paths)`

#### 3.3 Add new helper methods
- [x] `buildSystemPromptForQuestions()`: System prompt for question generation
- [x] `buildQuestionPrompt(title, summary)`: User prompt with title/summary
- [x] `parseAllQuestions(content)`: Parse mixed format questions
- [x] `displayQuestions(questions)`: Display all questions to user
- [x] `getUserAnswersAllAtOnce(questions)`: Collect all answers
- [x] `buildPRDPrompt(title, summary, questions, answers)`: Build final PRD request
- [x] `generatePRDDirectly(title, summary)`: Generate PRD when no questions needed

#### Question Interface
```typescript
interface Question {
  number: number;
  text: string;
  type: 'multiple-choice' | 'open-ended';
  options?: string[]; // ['A. Option 1', 'B. Option 2']
}
```

---

### Task 4: Update PRD Validation
**File**: `/packages/core/src/llm/validators.ts`
**Status**: ✅ Completed

#### Requirements
- [x] Update `REQUIRED_PRD_SECTIONS` to include "Non-Goals" (was optional)
- [x] Update section names to match reference doc (Introduction/Overview)
- [x] Update `OPTIONAL_PRD_SECTIONS` to match reference doc
- [x] Update validation logic to check for "Introduction" OR "Overview"
- [x] Ensure "Non-Goals" is present and not empty
- [x] Update error messages for new structure

#### New Structure
```typescript
export const REQUIRED_PRD_SECTIONS = [
  "Introduction",        // or "Overview"
  "Goals",
  "User Stories",
  "Functional Requirements",
  "Non-Goals",          // NOW REQUIRED
  "Success Metrics",
] as const;

export const OPTIONAL_PRD_SECTIONS = [
  "Design Considerations",
  "Technical Considerations",
  "Open Questions",
] as const;
```

---

### Task 5: Update PRD Generator Template
**File**: `/packages/core/templates/prd/prd-generator.md`
**Status**: ✅ Completed

#### Requirements
- [x] Replace entire content with reference doc template
- [x] Verify 9-section structure matches reference
- [x] Verify question format examples are included
- [x] Verify "ask ALL questions at once" instruction is clear
- [x] Remove any taskflow-specific additions not in reference

**Reference**: https://raw.githubusercontent.com/snarktank/ai-dev-tasks/refs/heads/main/create-prd.md

---

### Task 6: Update Fallback Template
**File**: `/packages/core/src/commands/prd/create.ts` (lines 565-702)
**Status**: ✅ Completed

#### Requirements
- [x] Update `generatePrdTemplate()` method
- [x] Add "Non-Goals" section after "Functional Requirements"
- [x] Rename sections to match reference doc structure
- [x] Ensure 9-section structure
- [x] Update section placeholder text
- [x] Remove deprecated sections

---

### Task 7: Integration & Testing
**Status**: ✅ Completed

#### Requirements
- [x] Test full workflow end-to-end
- [x] Verify no regressions in existing functionality
- [x] Update any related documentation
- [x] Update CLI help text if needed
- [x] Test with Z.ai LLM provider
- [x] Test fallback template (no LLM mode)

---

## Phase 2: Brownfield Support

### 🎯 Goals
Enable taskflow to work with existing codebases through detection, analysis, and migration planning.

### 📊 Progress: 5/5 Tasks Complete

---

### Task 1: Create Codebase Scanner
**File**: `/packages/core/src/lib/codebase-scanner.ts` (new)
**Status**: ✅ Completed

#### Requirements
- [x] Implement `CodebaseScanner` class
- [x] Add `scan(config)` method
- [x] Implement pattern detection for common features:
  - Auth: `passport`, `jwt`, `auth`, `login`, `session`
  - Payment: `stripe`, `payment`, `checkout`, `subscription`
  - API: `express`, `fastify`, `@nestjs`, `routes`
- [x] Add file type filtering (.ts, .js, .tsx, .jsx)
- [x] Add ignore patterns (node_modules, dist, .git)
- [x] Return `DiscoveredFeature[]` with confidence scoring

#### Interfaces
```typescript
interface ScanConfig {
  rootDir: string;
  ignore?: string[];
  fileTypes?: string[];
}

interface DiscoveredFeature {
  name: string;
  type: 'auth' | 'payment' | 'api' | 'ui' | 'generic';
  files: string[];
  confidence: 'high' | 'medium' | 'low';
  patterns: CodePattern[];
}

interface CodePattern {
  pattern: string;
  matches: Array<{ file: string; line: number; snippet: string }>;
}
```

---

### Task 2: Create PRD Matcher
**File**: `/packages/core/src/lib/prd-matcher.ts` (new)
**Status**: ✅ Completed

#### Requirements
- [x] Implement `PRDMatcher` class
- [x] Add `matchRequirements(prd, discovered)` method
- [x] Implement `extractRequirements(prd)` to parse PRD sections
- [x] Implement `matchRequirement()` for semantic matching
- [x] Use LLM for semantic matching (requirement text → code patterns)
- [x] Implement keyword fallback for simple cases
- [x] Add confidence scoring based on evidence

#### Interfaces
```typescript
interface Requirement {
  id: string;
  text: string;
  type: 'functional' | 'non-functional';
}

interface RequirementMatch {
  requirement: Requirement;
  status: 'implemented' | 'partial' | 'missing';
  confidence: number;
  evidence: Array<{ file: string; line: number; reason: string }>;
}
```

---

### Task 3: Create Gap Analyzer
**File**: `/packages/core/src/lib/gap-analyzer.ts` (new)
**Status**: ✅ Completed

#### Requirements
- [x] Implement `GapAnalyzer` class
- [x] Add `analyzeGaps(matches)` method
- [x] Calculate summary statistics (total, implemented, partial, missing, % complete)
- [x] Prioritize gaps (high/medium/low)
- [x] Estimate effort (small/medium/large)
- [x] Generate suggestions for each gap
- [x] Add `generateMigrationPlan(from, to, context)` method
- [x] Identify migration steps
- [x] Detect risks and breaking changes
- [x] Estimate overall migration effort

#### Interfaces
```typescript
interface GapAnalysis {
  summary: {
    total: number;
    implemented: number;
    partial: number;
    missing: number;
    percentComplete: number;
  };
  gaps: Array<{
    requirement: Requirement;
    priority: 'high' | 'medium' | 'low';
    effort: 'small' | 'medium' | 'large';
    suggestion: string;
  }>;
}

interface MigrationPlan {
  from: string;
  to: string;
  steps: MigrationStep[];
  risks: string[];
  estimatedEffort: string;
}
```

---

### Task 4: Create Brownfield Analysis Command
**File**: `/packages/core/src/commands/prd/analyze-brownfield.ts` (new)
**Status**: ✅ Completed

#### Requirements
- [x] Implement `PrdAnalyzeBrownfieldCommand` class
- [x] Add `detect` mode: Scan and display discovered features
- [x] Add `analyze` mode: Compare PRD vs codebase, show gaps
- [x] Add `migrate` mode: Generate migration plan from Package A to B
- [x] Implement display methods:
  - `displayDiscoveredFeatures()`
  - `displayGapAnalysis()`
  - `displayMigrationPlan()`
- [x] Add progress indicators for long operations
- [x] Add export options (JSON, Markdown)

#### CLI Commands
```bash
taskflow prd detect                           # Detect existing features
taskflow prd analyze <prd-file>               # Analyze PRD vs codebase
taskflow prd migrate --from=pkgA --to=pkgB    # Generate migration plan
```

---

### Task 5: Add Brownfield Types
**File**: `/packages/core/src/lib/types.ts`
**Status**: ✅ Completed

#### Requirements
- [x] Add `DiscoveredFeature` interface
- [x] Add `CodePattern` interface
- [x] Add `Requirement` interface
- [x] Add `RequirementMatch` interface
- [x] Add `GapAnalysis` interface
- [x] Add `MigrationPlan` interface
- [x] Add `MigrationStep` interface
- [x] Export all new types

---

## Testing Checklist

### Phase 1: PRD Creation
- [x] Interactive title prompt works correctly
- [x] Multi-line summary input accepts multiple lines
- [x] Multi-line input ends on double Enter
- [x] Questions are generated (multiple-choice format)
- [x] Questions are generated (open-ended format)
- [x] Questions are generated (mixed format)
- [x] All questions displayed at once (not one-by-one)
- [x] Answer parsing works for "1A, 2C" format
- [x] Answer parsing works for open-ended answers
- [x] Invalid answers are rejected with helpful error
- [x] PRD is generated with 9 sections
- [x] PRD follows reference doc structure
- [x] Validation accepts valid PRDs
- [x] Validation rejects PRDs missing required sections
- [x] "Non-Goals" is required and validated
- [x] No timeout issues (waits for user input)
- [x] Fallback template works (no LLM mode)
- [x] No questions scenario works (generates PRD directly)
- [x] Works with Z.ai LLM provider
- [x] No regressions in existing commands

### Phase 2: Brownfield Support
- [x] Codebase scanner detects auth features
- [x] Codebase scanner detects payment features
- [x] Codebase scanner detects API features
- [x] Scanner respects ignore patterns
- [x] Scanner handles large codebases
- [x] Requirement extraction from PRD works
- [x] Semantic matching accuracy is acceptable
- [x] Gap analysis calculates % complete correctly
- [x] Gap prioritization is reasonable
- [x] Migration plan generation works
- [x] Migration risks are identified
- [x] CLI commands work as expected
- [x] Performance is acceptable for real projects
- [x] Results can be exported to JSON/Markdown

---

## Success Criteria

### Phase 1 Complete When:
- [x] User is prompted for title + multi-line summary interactively
- [x] LLM asks ALL 3-5 questions in single response (not iterative)
- [x] User can answer with "1A, 2C, 3: my answer" format
- [x] PRD is generated in single session (no timeouts)
- [x] PRD follows exact 9-section structure from reference doc
- [x] Validation enforces new structure ("Non-Goals" required)
- [x] No regressions in existing functionality
- [x] All Phase 1 tests passing

### Phase 2 Complete When:
- [x] Can scan codebase and detect existing features
- [x] Can extract requirements from PRD
- [x] Can compare PRD requirements against existing code
- [x] Can estimate % completion for features
- [x] Can identify gaps with priorities
- [x] Can generate migration plans for package switches
- [x] Results are accurate enough for practical use
- [x] Performance is acceptable for large codebases (>1000 files)
- [x] All Phase 2 tests passing

---

## Notes & Decisions

### Design Decisions
- **Single-pass Q&A**: Eliminates timeout issues, reduces LLM calls, better UX
- **Mixed question format**: Balances efficiency (multiple-choice) and flexibility (open-ended)
- **Always interactive**: Simplifies UX, ensures high-quality PRDs
- **Brownfield as Phase 2**: Allows phased rollout, independent testing
- **LLM-powered matching**: Provides semantic understanding for code analysis

### Edge Cases Handled
1. No questions needed → Generate PRD directly
2. Invalid multiple-choice answers → Validate and retry
3. Empty questions response → Handle gracefully
4. Large codebases → Implement pagination/sampling
5. Ambiguous requirements → Flag for manual review

---

## Timeline Estimate

- **Phase 1**: 3-4 days (high priority)
- **Phase 2**: 6-7 days (after Phase 1 complete)

---

## References

- **PRD Template**: https://raw.githubusercontent.com/snarktank/ai-dev-tasks/refs/heads/main/create-prd.md
- **Z.ai Config**: `/Users/rk/workspace/next-fastify-boilerplate/taskflow.config.json`

---

**Last Updated**: 2026-01-02
**Next Review**: After Phase 1 Task 1 completion
