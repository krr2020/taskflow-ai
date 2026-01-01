# AI Protocol Comparison Document

**Analysis of Four AI Coding Workflow Repositories**

Generated: 2025-12-31

---

## Table of Contents

1. [Executive Summary](#executive-summary)
2. [Repository Overview](#repository-overview)
3. [Planning Stage Analysis](#planning-stage-analysis)
4. [Execution Stage Analysis](#execution-stage-analysis)
5. [Effectiveness Comparison Matrix](#effectiveness-comparison-matrix)
6. [Detailed Strengths & Weaknesses](#detailed-strengths--weaknesses)
7. [Recommendations](#recommendations)
8. [Best Practices Synthesis](#best-practices-synthesis)

---

## Executive Summary

This document compares four AI coding workflow repositories, each implementing a planner-executor pattern for AI-assisted software development. The analysis focuses on their approach to planning, execution, quality assurance, and workflow management.

### Repository Comparison at a Glance

| Repository | Stars | Modes | Key Focus | Latest Update |
|------------|-------|-------|-----------|---------------|
| **andreskull/spec-driven-ai-coding** | 65 | 3 (Planner, Executor, Steering) | Comprehensive spec-driven workflow | Aug 2025 |
| **carlrannaberg/ai-coding** | 44 | 3 (Planner, Executor, Isolated-Executor) | Git-integrated atomic execution | Jun 2025 |
| **sapegin/two-step-ai-coding-modes** | 7 | 2 (Planner, Executor) | Concise, minimal prompts | Oct 2025 |
| **nicksp/ai-coding-worflow** | 5 | 2 (Planner, Executor) | Persona-based, Pirate-themed | Sep 2025 |

### Key Findings

1. **Most Comprehensive**: andreskull/spec-driven-ai-coding with its three-mode system and extensive documentation structure
2. **Most Atomic/Isolated**: carlrannaberg/ai-coding with worktree-based isolation
3. **Most Concise**: sapegin/two-step-ai-coding-modes with minimal token usage
4. **Most Personality-Driven**: nicksp/ai-coding-worflow with themed personas

---

## Repository Overview

### 1. andreskull/spec-driven-ai-coding

**Repository**: https://github.com/andreskull/spec-driven-ai-coding

**Structure**:
```
prompts/
├── planner.md       (240 lines)
├── executor.md      (127 lines)
└── steering.md     (71 lines)
```

**Philosophy**: Rigorous spec-driven development with comprehensive documentation requirements

**Key Features**:
- Three distinct modes: Planner, Executor, Steering
- Extensive documentation context loading
- EARS (Easy Approach to Requirements Syntax) compliance
- Mandatory code review and QA requirements
- Definition of Done criteria for each task
- Autonomous mode support
- Rich documentation structure (`docs/architecture/`, `docs/features/`, `docs/operations/`, `docs/schemas/`)

**Documentation Requirements**:
```
docs/
├── architecture/      # Core architecture, data models, naming conventions
├── features/          # Feature-specific docs with requirements, design, tasks
├── operations/        # Deployment guides, configuration reference
└── schemas/           # Database schemas and data models

.ai-rules/             # Global project rules (product, tech, structure)
```

---

### 2. carlrannaberg/ai-coding

**Repository**: https://github.com/carlrannaberg/ai-coding

**Structure**:
```
prompts/
├── planner.md           (48 lines)
├── executor.md          (45 lines)
└── isolated-executor.md (113 lines)
```

**Philosophy**: Atomic, git-integrated execution with strict one-task-per-run discipline

**Key Features**:
- Three modes: Planner, Executor, Isolated-Executor
- Worktree-based isolation for atomic execution
- Automatic git commits and branch management
- Learnings tracking for future task improvements
- Minimal prompt size with high efficiency
- Strict atomic change enforcement
- Single-line task completion messages

**Unique Innovation**: The isolated-executor creates separate git worktrees for each task, providing true isolation and automatic merge workflows.

---

### 3. sapegin/two-step-ai-coding-modes

**Repository**: https://github.com/sapegin/two-step-ai-coding-modes

**Structure**:
```
prompts/
├── planner.md    (80 lines)
└── executor.md   (127 lines)
```

**Philosophy**: Minimal, concise, and direct with emphasis on token efficiency

**Key Features**:
- Two modes: Planner, Executor
- Extremely concise responses (<4 lines unless detail requested)
- Minimal preamble/postamble requirements
- Broad context file loading (supports multiple AI tools)
- Persona: "Mr. Poe" (19th-century scholar theme)
- Focus on avoiding unnecessary explanations
- Explicit ban on "Here is what I will do next" style responses

**Context Files Loaded**:
- README.md, CONTRIBUTING.md, docs/
- .cursor/rules/, CLAUDE.md
- .github/copilot-instructions.md
- .kilocode/rules/
- ~/dotfiles/ai-rules/javascript.instructions.md

---

### 4. nicksp/ai-coding-worflow

**Repository**: https://github.com/nicksp/ai-coding-worflow

**Structure**:
```
prompts/
├── planner.md    (114 lines)
└── executor.md   (148 lines)
```

**Philosophy**: Persona-driven development with themed characters and moderate verbosity

**Key Features**:
- Two modes: Planner, Executor
- Strong persona definitions ("Reef Walker" - surfer vibe, "Mr. Smee" - pirate)
- PRD-based specification approach
- Moderate conciseness requirements
- Tech debt reporting after implementation
- Three-retry limit for test failures
- Documentation in docs/specs/{feature-name}/

**Specification Structure**:
```
docs/specs/{feature-name}/
└── prd.md
    ├── Overview
    ├── Architecture
    ├── Data Flow
    ├── Components and Interfaces
    ├── Data Models
    ├── Error Handling
    ├── Testing Strategy
    └── Implementation Considerations
```

---

## Planning Stage Analysis

### Comparison Framework

| Aspect | andreskull | carlrannaberg | sapegin | nicksp |
|--------|-----------|---------------|---------|--------|
| **Prompt Length** | 240 lines | 48 lines | 80 lines | 114 lines |
| **Approach** | 3-Phase (Requirements, Design, Tasks) | Q&A Only, one question at a time | Interactive, step-by-step plan | PRD-based, collaborative |
| **Output** | requirements.md, design.md, tasks.md | plan.md (markdown only) | Final tech spec as chat response | prd.md |
| **Approval Required** | Explicit at each phase | Explicit before writing spec | Explicit (yes/approved/LGTM) | Explicit (yes/approved/LGTM) |
| **Code in Planning** | Forbidden | Forbidden | Forbidden | Forbidden |
| **Persona** | Professional developer | Neutral | Mr. Poe (19th century scholar) | Reef Walker (surfer vibe) |
| **Task Granularity** | Very detailed with sub-tasks | Checkbox list with hierarchy | Step-by-step blueprint | Technical blueprint |
| **Documentation Updates** | Required for spec changes | None mentioned | None mentioned | None mentioned |

### Deep Dive: Planning Methodologies

#### andreskull/spec-driven-ai-coding

**Three-Phase Interactive Process**:

1. **Phase 1: Requirements Definition**
   - Decompose into user stories
   - EARS-compliant acceptance criteria (WHEN/THEN/IF/AND syntax)
   - Interactive refinement loop
   - Explicit approval required before proceeding

   Example acceptance criteria format:
   ```markdown
   #### Acceptance Criteria
   1. WHEN [event] THEN [system] SHALL [response]
   2. IF [precondition] THEN [system] SHALL [response]
   3. WHEN [event] AND [condition] THEN [system] SHALL [response]
   ```

2. **Phase 2: Technical Design**
   - Complete technical blueprint
   - Architecture, components, data models
   - Error handling, testing strategy
   - Mermaid diagrams when appropriate
   - Alternative approaches with pros/cons
   - Explicit approval required

3. **Phase 3: Task Generation**
   - Granular checklist with 2-level hierarchy
   - Each task has:
     - Definition of Done criteria
     - Tests required
     - Code review requirements
     - References to requirements
   - Quality assurance verification before final approval

**Strengths**:
- Most rigorous and comprehensive
- EARS syntax ensures precise requirements
- Separation of concerns (requirements → design → tasks)
- Mandatory QA and code review integration
- Excellent documentation for human review

**Weaknesses**:
- High token cost for simple features
- May be overkill for small changes
- Three approval cycles can feel slow

---

#### carlrannaberg/ai-coding

**Q&A-Only Approach**:

- **Rule**: Ask ONE focused, clarifying question at a time
- Wait for answer before next question
- Build iteratively on previous answers
- No code, no file changes, no implementation details
- Only after explicit approval: output markdown plan

**Plan Format**:
```markdown
# Plan Title
## Notes
(Context or constraints)

# Tasks
- [ ] 1.0 Parent Task A
  - [ ] 1.1 Sub-task 1
  - [ ] 1.2 Sub-task 2
- [ ] 2.0 Parent Task B
  - [ ] 2.1 Sub-task 1
```

**Strengths**:
- Extremely efficient (48 lines)
- Minimal token usage
- Simple and easy to follow
- Forces iterative understanding
- Fast approval cycle

**Weaknesses**:
- No formal requirements documentation
- No design phase separation
- Plan is only output, not saved as structured files
- Less traceability than andreskull
- No explicit quality criteria in plan

---

#### sapegin/two-step-ai-coding-modes

**Step-by-Step Plan Generation**:

- Single interactive planning session
- Generate clear, step-by-step blueprint
- Present alternatives with pros/cons
- Ask before introducing new libraries
- Explicit approval required before switching to Executor
- Final spec output as chat response (not saved)

**Key Characteristics**:
- "One question at a time if needed"
- "Complete but brief technical blueprint"
- No hierarchical task breakdown
- No separate files generated

**Strengths**:
- Concise (80 lines)
- Flexible approach
- Quick iteration
- Alternative analysis with pros/cons
- Library conflict checking

**Weaknesses**:
- No persistent documentation
- No formal task tracking file
- Plan is transient (chat only)
- Less structure than andreskull
- No sub-task hierarchy

---

#### nicksp/ai-coding-worflow

**PRD-Based Collaborative Approach**:

- Generate design specifications
- Include all necessary sections
- Reference existing project patterns
- Present alternatives with pros/cons
- Verify no duplicate libraries
- Highlight potential issues (security, performance, etc.)
- Explicit approval before Executor mode switch

**PRD Structure**:
```markdown
# {feature-name} — Feature Requirements Document

Complete technical blueprint including:
- Overview
- Architecture
- Data Flow
- Components and Interfaces
- Data Models
- Error Handling
- Testing Strategy
- Implementation Considerations
- Component hierarchy, data flow architecture
```

**Strengths**:
- Comprehensive PRD template
- Good balance between structure and speed
- Alternative analysis
- Security/performance consideration
- Pattern verification

**Weaknesses**:
- Single file approach (no separation)
- No formal requirements syntax like EARS
- Two files only (planner/executor, no steering)
- Middle ground may not suit all use cases

---

## Execution Stage Analysis

### Comparison Framework

| Aspect | andreskull | carlrannaberg | sapegin | nicksp |
|--------|-----------|---------------|---------|--------|
| **Prompt Length** | 127 lines | 45 lines (113 isolated) | 127 lines | 148 lines |
| **Task Scope** | ONE task only | ONE task only | ONE task only | ONE feature only |
| **Context Loading** | Extensive (docs/.ai-rules) | plan.md only | Broad (multiple sources) | docs/specs/ only |
| **Atomic Changes** | Strictly enforced | Strictly enforced | Strictly enforced | Strictly enforced |
| **Test Before Complete** | Mandatory | Mandatory | Mandatory | Mandatory |
| **Auto-commit** | No | Yes | No | No |
| **Task Marking** | In tasks.md | In plan.md | None (implied) | None mentioned |
| **Tech Debt Reporting** | No | No | Yes | Yes |
| **Autonomous Mode** | Yes (skip review) | No | No | No |
| **Worktree Isolation** | No | Yes (isolated-executor) | No | No |
| **Documentation Updates** | Creates follow-up task | Learnings section | No | Yes (update README/docs) |

### Deep Dive: Execution Methodologies

#### andreskull/spec-driven-ai-coding

**Seven-Step Execution Process**:

1. **Identify Task**: Open tasks.md, find first unchecked task
2. **Understand Task**: Read task, design.md, requirements.md
3. **Implement Changes**: Apply exactly one atomic code change
   - Strict scope limitation
   - No future anticipation
   - Fix lint errors immediately
4. **Verify the Change**:
   - Automated test: implement test, run full suite, fix up to 3 times
   - Manual test: STOP and ask user to verify
5. **Reflect on Learnings**:
   - Only general, project-wide insights
   - Not implementation details
   - Merge into "Rules & Tips" section if exists
6. **Update State & Report**:
   - Normal mode: Don't mark complete, ask for review
   - Autonomous mode: Mark complete, proceed to next task
   - Do NOT commit
7. **If unsure, STOP and ask**

**Context Requirements**:
```
Must load before executing:
- .ai-rules/product.md
- .ai-rules/tech.md
- .ai-rules/structure.md
- docs/features/{{feature_name}}/requirements.md
- docs/features/{{feature_name}}/design.md
- docs/features/{{feature_name}}/tasks.md
- docs/architecture/README.md and related files
- docs/features/, docs/operations/, docs/schemas/ as needed
```

**Autonomous Mode**:
- Skip user review requirements
- Mark tasks complete immediately after implementation
- Continue to next unchecked task automatically
- Only stop for errors or when out of tasks

**Strengths**:
- Most comprehensive context loading
- Separates normal vs autonomous modes
- Learnings tracking for future improvements
- Documentation update follow-up tasks
- Manual vs automated test handling
- Task state management

**Weaknesses**:
- High token cost (extensive context)
- No auto-commit (requires manual intervention)
- Complex workflow for simple changes
- Overhead for small tasks

---

#### carlrannaberg/ai-coding

**Standard Executor** (45 lines):

1. Read "Rules & Tips" section in plan.md
2. Find first unchecked task in plan.md
3. Apply one atomic code change
4. Fix lint errors
5. When no lint errors AND yarn test passes:
   - Commit with message: `<task> (auto via agent)`
   - Mark task complete in plan.md
   - Summarize changes
6. Reflect on learnings (general only, add to "Rules & Tips")
7. STOP
8. If yarn test fails: fix, retry up to 3 times, then STOP and report
9. Never make changes outside scope

**Isolated Executor** (113 lines):

Same as standard PLUS:

1. **Worktree and Branch Verification**:
   - Check PWD ends with `-agent-*`
   - Check branch starts with `agent-`
   - If not: create new worktree and agent branch
   - Install dependencies in new worktree

2. **Commit and Merge** (after task completion):
   - Commit changes
   - Push agent branch
   - Read parent branch from `.agent_parent_branch`
   - Switch to parent, pull, merge agent branch
   - Optionally delete worktree and branch
   - Report success or conflicts

3. **Absolute-path rule**: Always use `$AGENT_WORKTREE/...` for file edits

**Strengths**:
- Automatic git commits (no manual intervention)
- Learnings tracking for future improvements
- Worktree isolation (isolated-executor)
- Auto-merge workflow
- Very efficient token usage
- Simple and predictable

**Weaknesses**:
- Minimal context (only plan.md)
- No autonomous mode
- Worktree isolation adds complexity
- Requires git worktree support
- No documentation structure

---

#### sapegin/two-step-ai-coding-modes

**Execution Process**:

1. Greet user (optional, based on flag)
2. Carefully read the spec
3. Explore relevant files and gather context
4. Fully implement through atomic code changes
   - Verify each component before proceeding
   - Limit changes to spec only
   - Never edit unrelated code
5. Verify implementation against requirements
   - Implement/update tests if appropriate
   - Run full test suite
   - If fails: fix or fix test (up to 3 times), then STOP and report
6. Run lint, format, typecheck commands
   - Fix all errors, re-run until all pass
7. Update Readme and documentation if necessary
8. List tech debt, unfinished work, and next step
   - List only high-impact changes
   - Be brief, avoid detailed explanations
9. State feature is complete (max 1 sentence)
10. Do NOT commit changes

**Context Files**:
```markdown
- @README.md
- @CONTRIBUTING.md
- @docs/
- @.cursor/rules/
- @CLAUDE.md
- @.github/copilot-instructions.md
- @.kilocode/rules/
- @~/dotfiles/ai-rules/javascript.instructions.md
```

**Strengths**:
- Broad context support (multiple AI tools)
- Tech debt and next step reporting
- Concise responses enforced
- Clean separation from sapegin's persona
- No auto-commit (user control)

**Weaknesses**:
- No task state tracking (no checkboxes)
- No persistent task file
- No autonomous mode
- No learnings tracking
- Middle ground on complexity

---

#### nicksp/ai-coding-worflow

**Execution Process**:

1. Load spec from docs/specs/{feature-name}/prd.md
2. Briefly summarize 2-3 key requirements
3. Greet user and acknowledge request
4. Determine feature name from user or spec
5. Read technical details from specification
6. Analyze for feasibility and approach
7. Implement feature through atomic code changes
   - Implement incrementally for complex features
   - Verify each component before next
   - Limit changes strictly to spec
   - Clean up temporary files
8. Verify against requirements and acceptance criteria
9. Implement/update tests, run full test suite
   - All must pass before proceeding
   - Report failures and request guidance
10. Run lint, format, typecheck commands
    - Fix issues and re-run until all pass
11. Update Readme and documentation if necessary
12. Reflect on results:
    - Tech debt introduced
    - Unfinished work
    - Most impactful next steps
13. Report completion with brief summary (max 1 sentence)
14. Do NOT commit changes

**Strengths**:
- Tech debt and next step reporting
- Incremental verification for complex features
- Good balance of structure and flexibility
- Pirate-themed persona (engaging but not overdone)
- Clean up of temporary files

**Weaknesses**:
- No task state tracking
- No persistent task file
- Three-retry limit (may not be enough)
- No autonomous mode
- No learnings tracking
- Middle ground on token efficiency

---

## Effectiveness Comparison Matrix

### Scoring Criteria

Each repository is scored on a scale of 1-5 (1 = Poor, 5 = Excellent) across key dimensions.

| Criterion | Weight | andreskull | carlrannaberg | sapegin | nicksp |
|-----------|--------|-----------|---------------|---------|--------|
| **Planning Rigor** | 20% | 5 | 3 | 4 | 4 |
| **Execution Discipline** | 20% | 5 | 5 | 4 | 4 |
| **Quality Assurance** | 15% | 5 | 4 | 4 | 4 |
| **Context Awareness** | 15% | 5 | 2 | 4 | 3 |
| **Token Efficiency** | 10% | 2 | 5 | 5 | 3 |
| **Documentation** | 10% | 5 | 2 | 3 | 3 |
| **Autonomous Support** | 5% | 5 | 1 | 1 | 1 |
| **Git Integration** | 5% | 1 | 5 | 1 | 1 |
| **Weighted Score** | 100% | **4.45** | **3.50** | **3.70** | **3.40** |

### Detailed Scoring Breakdown

#### andreskull/spec-driven-ai-coding: 4.45/5

- **Planning Rigor (5/5)**: Three-phase approach with EARS syntax is gold standard
- **Execution Discipline (5/5)**: Strict atomicity, comprehensive verification
- **Quality Assurance (5/5)**: Mandatory testing, code reviews, DoD criteria
- **Context Awareness (5/5)**: Loads extensive documentation from multiple sources
- **Token Efficiency (2/5)**: Highest token usage due to comprehensive approach
- **Documentation (5/5)**: Best documentation structure and requirements
- **Autonomous Support (5/5)**: Only repo with explicit autonomous mode
- **Git Integration (1/5)**: No auto-commit or branch management

**Best for**: Enterprise projects, critical systems, teams requiring rigorous documentation and quality processes

---

#### carlrannaberg/ai-coding: 3.50/5

- **Planning Rigor (3/5)**: Simple Q&A approach, good but not rigorous
- **Execution Discipline (5/5)**: Perfect atomicity, worktree isolation
- **Quality Assurance (4/5)**: Learnings tracking, good testing requirements
- **Context Awareness (2/5)**: Minimal context (plan.md only)
- **Token Efficiency (5/5)**: Most efficient, minimal prompts
- **Documentation (2/5)**: No formal documentation structure
- **Autonomous Support (1/5)**: No autonomous mode
- **Git Integration (5/5)**: Best integration with auto-commit and worktree management

**Best for**: Solo developers, rapid prototyping, projects valuing speed and git hygiene

---

#### sapegin/two-step-ai-coding-modes: 3.70/5

- **Planning Rigor (4/5)**: Good step-by-step approach, alternatives analysis
- **Execution Discipline (4/5)**: Solid atomicity, good verification
- **Quality Assurance (4/5)**: Tech debt reporting, good testing
- **Context Awareness (4/5)**: Broad support for multiple AI tools
- **Token Efficiency (5/5)**: Very concise, minimal fluff
- **Documentation (3/5)**: No formal structure, supports various formats
- **Autonomous Support (1/5)**: No autonomous mode
- **Git Integration (1/5)**: No auto-commit or branch management

**Best for**: Developers using multiple AI tools, projects needing balance of structure and efficiency

---

#### nicksp/ai-coding-worflow: 3.40/5

- **Planning Rigor (4/5)**: Good PRD approach, comprehensive sections
- **Execution Discipline (4/5)**: Good atomicity, incremental verification
- **Quality Assurance (4/5)**: Three-retry limit, good testing approach
- **Context Awareness (3/5)**: Loads PRD but minimal other context
- **Token Efficiency (3/5)**: Middle ground, not overly verbose
- **Documentation (3/5)**: PRD structure but no broader documentation system
- **Autonomous Support (1/5)**: No autonomous mode
- **Git Integration (1/5)**: No auto-commit or branch management

**Best for**: Teams preferring structured PRDs without excessive formality, projects needing moderate rigor

---

## Detailed Strengths & Weaknesses

### andreskull/spec-driven-ai-coding

#### Strengths

1. **Comprehensive Three-Phase Planning**
   - Separates requirements, design, and implementation
   - Each phase requires explicit approval
   - Reduces rework by catching issues early

2. **EARS Syntax for Requirements**
   - WHEN/THEN/IF/AND syntax eliminates ambiguity
   - Testable acceptance criteria
   - Industry-standard requirement engineering

3. **Rich Documentation Ecosystem**
   - docs/architecture/ for system-level docs
   - docs/features/ for feature-specific specs
   - docs/operations/ for deployment/ops
   - docs/schemas/ for data models
   - .ai-rules/ for global project rules

4. **Mandatory Quality Assurance**
   - Definition of Done for every task
   - Explicit test requirements
   - Mandatory code review steps
   - Integration testing requirements

5. **Autonomous Mode**
   - Skip user review when explicitly requested
   - Continue to next task automatically
   - Only stop for errors
   - Enables hands-off operation

6. **Steering Mode**
   - Third mode for setting up project rules
   - Creates .ai-rules files from codebase analysis
   - Provides onboarding structure

7. **Learnings Tracking**
   - Capture project-wide insights
   - Avoid repeated mistakes
   - Evolve project rules over time

#### Weaknesses

1. **High Token Cost**
   - 240-line planner prompt
   - Extensive context loading
   - Multiple documentation files required
   - May be overkill for simple features

2. **Complex Workflow**
   - Three approval cycles (requirements, design, tasks)
   - Multiple documentation files to maintain
   - Steeper learning curve
   - May slow down rapid iteration

3. **No Git Integration**
   - No auto-commit
   - No branch management
   - No worktree isolation
   - Manual git operations required

4. **Over-Engineering for Small Teams**
   - Designed for enterprise/enterprise-like workflows
   - May not suit solo developers
   - Too much ceremony for small projects

---

### carlrannaberg/ai-coding

#### Strengths

1. **Excellent Token Efficiency**
   - 48-line planner, 45-line executor
   - Minimal context loading
   - Fast, cheap operations

2. **Worktree Isolation**
   - True isolation per task
   - Prevents cross-task contamination
   - Safe experimentation
   - Easy rollback

3. **Automatic Git Workflow**
   - Auto-commit after each task
   - Auto-merge to parent branch
   - Branch management automation
   - Clean git history

4. **Learnings Tracking**
   - Capture insights in "Rules & Tips"
   - Prevent repeated mistakes
   - Evolve plan over time

5. **Absolute Atomicity**
   - One task per run, strictly enforced
   - Cannot edit unrelated code
   - Cannot anticipate future steps
   - Clear scope boundaries

6. **Simple and Predictable**
   - Easy to understand
   - Minimal cognitive load
   - Consistent behavior
   - Low learning curve

#### Weaknesses

1. **Minimal Context**
   - Only loads plan.md
   - No architecture docs
   - No global project rules
   - Limited context awareness

2. **No Planning Rigor**
   - Simple Q&A approach
   - No formal requirements
   - No design phase
   - Plan is just a checklist

3. **No Autonomous Mode**
   - Must stop after each task
   - Manual intervention required
   - Can't run unsupervised

4. **Requires Git Worktree Support**
   - Not all git installations support worktree
   - Adds operational complexity
   - Requires understanding of worktree concepts

5. **No Documentation Structure**
   - No formal documentation requirements
   - No persistent feature specs
   - Plan is transient

---

### sapegin/two-step-ai-coding-modes

#### Strengths

1. **Broad AI Tool Support**
   - Loads context for Cursor, Claude, GitHub Copilot, Kilocode
   - Works with multiple AI assistants
   - Flexible tooling support
   - Personal dotfile support

2. **Excellent Token Efficiency**
   - 80-line planner, 127-line executor
   - Concise response requirements (<4 lines)
   - No unnecessary preamble/postamble
   - Minimal fluff

3. **Tech Debt Reporting**
   - Explicit tech debt tracking
   - Unfinished work reporting
   - Next step recommendations
   - High-impact focus

4. **Good Alternatives Analysis**
   - Presents options with pros/cons
   - Library conflict checking
   - Security/performance considerations
   - User choice emphasis

5. **Simple Workflow**
   - Easy to follow
   - Clear two-mode separation
   - Straightforward execution

#### Weaknesses

1. **No Persistent Task Tracking**
   - No task.md file
   - No checkbox state management
   - Progress tracking is ad-hoc
   - Hard to resume mid-work

2. **No Autonomous Mode**
   - Must stop after each task
   - Cannot run unsupervised
   - Manual progression required

3. **No Formal Documentation**
   - Plan is chat response only
   - No persistent specification files
   - Limited traceability
   - Difficult to review later

4. **Limited Context Depth**
   - Broad but shallow
   - No deep architecture understanding
   - Relies on surface-level docs

---

### nicksp/ai-coding-worflow

#### Strengths

1. **Engaging Personas**
   - "Reef Walker" (planner) - surfer vibe
   - "Mr. Smee" (executor) - pirate theme
   - Makes interactions memorable
   - Not over-the-top

2. **Good PRD Structure**
   - Comprehensive sections
   - Clear organization
   - Covers all aspects
   - Good reference template

3. **Incremental Verification**
   - Verify each component before next
   - Catch issues early
   - Reduced debugging time
   - Better for complex features

4. **Security & Performance Focus**
   - Explicitly highlights issues
   - Security considerations
   - Performance implications
   - Maintainability concerns

5. **Temporary File Cleanup**
   - Automatic cleanup of iteration files
   - Keeps repository clean
   - No leftover artifacts

6. **Middle Ground Approach**
   - Not too simple, not too complex
   - Good balance of structure and flexibility
   - Suitable for many scenarios

#### Weaknesses

1. **No Task State Tracking**
   - No persistent task file
   - No checkbox management
   - Progress is ephemeral
   - Hard to resume

2. **Three-Retry Limit**
   - May not be enough for complex failures
   - Could stop prematurely
   - Manual intervention required

3. **No Autonomous Mode**
   - Cannot run unsupervised
   - Must wait for user after each task
   - Slower overall workflow

4. **No Git Integration**
   - No auto-commit
   - No branch management
   - Manual git operations

5. **Middle Ground May Not Fit**
   - Too simple for enterprise
   - Too complex for rapid prototyping
   - Finding the right balance is difficult

---

## Recommendations

### By Use Case

#### 1. Enterprise Projects / Critical Systems
**Recommended: andreskull/spec-driven-ai-coding**

**Why**:
- Rigorous three-phase planning
- EARS-compliant requirements
- Mandatory QA and code reviews
- Comprehensive documentation
- Autonomous mode for batch processing
- Traceability and auditability

**When to Choose**:
- Teams requiring strict processes
- Regulated industries
- Projects with long lifetimes
- Multiple developers collaborating
- Quality-critical systems

---

#### 2. Solo Development / Rapid Prototyping
**Recommended: carlrannaberg/ai-coding**

**Why**:
- Excellent token efficiency (cost-effective)
- Automatic git workflow (saves time)
- Worktree isolation (safe experimentation)
- Simple and predictable
- Learnings tracking (improves over time)
- Minimal ceremony

**When to Choose**:
- Solo developers
- MVP development
- Rapid iteration cycles
- Cost-sensitive operations
- Developers who value git hygiene

---

#### 3. Multi-Tool AI Environments
**Recommended: sapegin/two-step-ai-coding-modes**

**Why**:
- Broad AI tool support
- Works with Cursor, Claude, Copilot, Kilocode
- Good token efficiency
- Simple two-mode workflow
- Tech debt reporting
- Alternative analysis

**When to Choose**:
- Using multiple AI assistants
- Need flexibility in tooling
- Want concise but structured approach
- Balancing speed with quality

---

#### 4. Teams Wanting Structure Without Overhead
**Recommended: nicksp/ai-coding-worflow**

**Why**:
- Good balance of rigor and simplicity
- Engaging personas (memorable but not distracting)
- Solid PRD structure
- Security and performance focus
- Incremental verification
- Not too formal, not too loose

**When to Choose**:
- Small teams (2-5 developers)
- Projects needing some structure
- Wanting more than Q&A but less than enterprise rigor
- Value engagement and communication style

---

#### 5. Hybrid / Custom Implementation

**Best Approach**: Combine elements from multiple repos

**Recommended Mix**:
- **Planning**: andreskull's three-phase approach (but simplified)
- **Execution**: carlrannaberg's atomicity + auto-commit
- **Context**: andreskull's documentation structure (but selective)
- **Efficiency**: sapegin's conciseness rules
- **Persona**: Optional (or professional tone)

**Why Hybrid**:
- No single approach is perfect for all scenarios
- Can tailor to team needs
- Balance rigor with efficiency
- Flexibility to evolve

---

## Best Practices Synthesis

### Universal Best Practices (Common to All)

1. **Strict Atomicity**
   - One task/feature per execution
   - No anticipation of future steps
   - Limit changes to explicit scope

2. **Explicit Approval Required**
   - Never proceed without user confirmation
   - Clear approval keywords (yes, approved, LGTM)
   - Interactive feedback loops

3. **Mandatory Testing**
   - Tests must pass before marking complete
   - Retry mechanisms (usually 3 times)
   - Clear failure reporting

4. **No Code in Planning Mode**
   - Separation of concerns
   - Planning = Q&A and specification
   - Execution = implementation only

5. **Lint and Type Checking**
   - Run linters, formatters, typecheckers
   - Fix all errors before completion
   - Code quality enforcement

---

### Planning Best Practices

#### 1. Requirements Definition (from andreskull)

```markdown
### Requirement N
**User Story:** As a [role], I want [feature], so that [benefit]

#### Acceptance Criteria
1. WHEN [event] THEN [system] SHALL [response]
2. IF [precondition] THEN [system] SHALL [response]
3. WHEN [event] AND [condition] THEN [system] SHALL [response]
```

**Why**: EARS syntax eliminates ambiguity, creates testable criteria

---

#### 2. Alternative Analysis (from all)

For each key decision:
- Present 2-3 alternatives
- List pros and cons for each
- Highlight tradeoffs
- Ask user to choose

**Why**: Informs user, prevents assumptions, improves decision quality

---

#### 3. Library Verification (from sapegin/nicksp)

Before suggesting new library:
- Check if similar library exists in project
- Verify compatibility
- Consider security/maintenance
- Present findings

**Why**: Prevents dependency bloat and conflicts

---

#### 4. Explicit Approval Gates (from all)

At each phase boundary:
- "Do the requirements look good? If so, we can move on to the design."
- "Does the design look good? If so, we can move on to the implementation plan."
- "Do the tasks look good?"

**Why**: Prevents premature progression, catches issues early

---

#### 5. Conciseness in Questions (from sapegin)

- Ask ONE question at a time
- Build iteratively on previous answers
- Don't overwhelm with multiple questions

**Why**: Reduces cognitive load, improves understanding

---

### Execution Best Practices

#### 1. Learnings Tracking (from andreskull/carlrannaberg)

After each task:
- Capture only general, project-wide insights
- Not implementation details
- Not what you did, but what you learned
- Add to "Rules & Tips" or "Learnings" section

**Example**:
```markdown
## Rules & Tips

- Always validate user input before processing (discovered in task 3)
- The XYZ library doesn't handle null values gracefully (discovered in task 5)
- Performance tip: Use database indexes on foreign key columns (discovered in task 8)
```

**Why**: Prevents repeated mistakes, accelerates future tasks

---

#### 2. Tech Debt Reporting (from sapegin/nicksp)

After implementation:
- List tech debt introduced
- List unfinished work
- List most impactful next step
- Focus on high-impact items only

**Why**: Ensures visibility of technical debt, guides prioritization

---

#### 3. Incremental Verification (from nicksp)

For complex features:
- Implement and verify each logical component
- Only proceed to next component after verification
- Catch issues early

**Why**: Reduces debugging complexity, faster feedback

---

#### 4. Test Strategy (from all)

- **Automated Tests**: Implement test, run full suite, fix up to 3 times
- **Manual Tests**: STOP and ask user to perform verification
- **Database Tests**: Do NOT clean up test data
- **All Tests Must Pass**: Before proceeding to next step

**Why**: Ensures quality, prevents regression

---

#### 5. Context Loading (from andreskull)

Before execution:
```
Load:
- .ai-rules/product.md (product vision)
- .ai-rules/tech.md (technology stack)
- .ai-rules/structure.md (project structure)
- docs/features/{feature}/requirements.md
- docs/features/{feature}/design.md
- docs/features/{feature}/tasks.md
- Relevant architecture, operations, schema docs
```

**Why**: Provides complete context, prevents assumptions

---

### Quality Assurance Best Practices

#### 1. Definition of Done (from andreskull)

Every task must specify:
- Functional Requirements
- Testing Requirements
- Validation Requirements
- Documentation Requirements
- Code Review Requirements

**Example**:
```markdown
- [ ] 2.2 Implement User model with validation
  - Write User class with validation methods
  - Create unit tests for User model validation
  - **Definition of Done**: User class implemented, all validation methods tested,
    integration with existing system verified
  - **Tests Required**: Unit tests for all validation methods, integration tests
    with database, regression tests
  - **Code Review**: Code review by peer developer, security review for validation logic
```

**Why**: Clear completion criteria, ensures quality, enables peer review

---

#### 2. Code Review Integration (from andreskull)

**Mandatory**:
- No task marked complete without code review
- Specify reviewer requirements (peer, senior, domain expert)
- Define review criteria (logic, performance, security)
- All feedback must be addressed

**Why**: Catches issues AI might miss, ensures quality standards

---

#### 3. Documentation Updates (from andreskull)

After code changes:
- Create follow-up task to update relevant documentation
- Specify which docs need updates
- What sections to modify
- How to reflect changes

**Why**: Ensures docs stay in sync with code

---

### Git Workflow Best Practices

#### 1. Auto-Commit (from carlrannaberg)

After task completion:
- Commit changes with: `<task> (auto via agent)`
- Consistent commit message format
- Immediately after passing tests

**Why**: Clean git history, traceability, easy rollback

---

#### 2. Worktree Isolation (from carlrannaberg)

For experimental or risky changes:
- Create separate worktree per task
- Use dedicated agent branch
- Merge to parent only after verification
- Delete worktree after merge

**Why**: Safe experimentation, easy rollback, parallel work

---

#### 3. No Auto-Commit for Manual Review (from andreskull/sapegin/nicksp)

If user review required:
- Do NOT commit automatically
- Present changes for review
- Wait for explicit approval
- Then commit (or proceed to next task in autonomous mode)

**Why**: User control, quality gate before commit

---

### Context Management Best Practices

#### 1. Global Project Rules (from andreskull)

Create `.ai-rules/` directory with:
- `product.md` - product vision, users, features
- `tech.md` - technology stack, frameworks, tools
- `structure.md` - project structure, conventions

**Why**: Single source of truth for project rules, consistent context

---

#### 2. Feature-Specific Documentation (from andreskull)

For each feature:
```
docs/features/{feature-name}/
├── requirements.md    # User stories, acceptance criteria
├── design.md          # Technical design, architecture
├── tasks.md           # Implementation checklist
├── README.md          # Feature overview (optional)
├── technical-spec.md  # Detailed spec (optional)
└── configuration.md   # Config details (optional)
```

**Why**: Organized, comprehensive, traceable feature documentation

---

#### 3. Broad Context Loading (from sapegin)

Load from multiple sources:
- Project docs (README, CONTRIBUTING)
- AI tool rules (.cursor/rules, CLAUDE.md, etc.)
- Feature docs (docs/)
- Personal dotfiles

**Why**: Works with multiple AI tools, flexible, comprehensive

---

### Autonomous Mode Best Practices

#### 1. When to Use Autonomous Mode (from andreskull)

**User signals**:
- "continue tasks by yourself"
- "I'm leaving the office"
- "do not stop for review"

**Behavior**:
- Skip user review requirements
- Mark tasks complete immediately
- Proceed to next task automatically
- Only stop for errors

**Why**: Enables hands-off operation, batch processing, overnight work

---

#### 2. Autonomous Mode Safeguards (from andreskull)

Even in autonomous mode:
- Still must pass all tests
- Still must fix lint errors
- Must stop for unresolved errors
- Still enforce atomicity

**Why**: Quality assurance even without human review

---

### Token Efficiency Best Practices

#### 1. Concise Responses (from sapegin/nicksp)

- Maximum 4 lines unless detail requested
- No preamble ("The answer is...")
- No postamble ("Hope this helps...")
- Direct answers only
- One-word answers when possible

**Why**: Reduces cost, faster response times

---

#### 2. Minimal Context (from carlrannaberg)

- Load only what's necessary
- Prefer plan.md over extensive docs
- Lazy loading when possible
- Cache context across runs

**Why**: Lower token usage, faster operations

---

#### 3. Focus on Actionable Information (from all)

- Prioritize actionable over explanatory
- Avoid general explanations
- Focus on what to do, not why
- Skip step name announcements

**Why**: Reduces fluff, increases density of useful information

---

## Conclusion

### Summary

This comparison reveals four distinct approaches to AI coding workflows, each optimized for different scenarios:

- **andreskull/spec-driven-ai-coding**: Enterprise-grade rigor (4.45/5) - best for critical systems and teams requiring comprehensive processes
- **carlrannaberg/ai-coding**: Efficiency and automation (3.50/5) - best for solo developers and rapid prototyping
- **sapegin/two-step-ai-coding-modes**: Multi-tool flexibility (3.70/5) - best for developers using multiple AI assistants
- **nicksp/ai-coding-worflow**: Balanced structure (3.40/5) - best for small teams wanting some rigor without overhead

### Key Takeaways

1. **No One-Size-Fits-All**: Each approach has tradeoffs; choose based on your context
2. **Core Principles Are Universal**: Atomicity, testing, approval gates, quality focus
3. **Hybrid Approaches Work**: Combining best elements from multiple repos is often optimal
4. **Context Matters**: Consider team size, project complexity, quality requirements, and tooling
5. **Evolution Is Possible**: Start simple, add rigor as needed

### Final Recommendation

For your AI protocol restructuring at TaskFlow:

**Start with carlrannaberg's approach** for efficiency and speed, then:

- Add andreskull's three-phase planning for complex features
- Incorporate sapegin's broad context loading for multi-tool support
- Consider nicksp's incremental verification for complex implementations
- Gradually adopt andreskull's QA and documentation requirements as the project matures

This hybrid approach provides:
- Fast iteration initially (carlrannaberg)
- Rigor when needed (andreskull)
- Flexibility for growth (sapegin)
- Balance of speed and quality (nicksp)

---

**Document End**
