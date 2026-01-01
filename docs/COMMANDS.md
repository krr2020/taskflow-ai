# Taskflow Commands Reference

Complete reference for all Taskflow CLI commands.

## Table of Contents

- [Initialization Commands](#initialization-commands)
- [PRD Commands](#prd-commands)
- [Task Workflow Commands](#task-workflow-commands)
- [Navigation Commands](#navigation-commands)
- [Recovery Commands](#recovery-commands)
- [Retrospective Commands](#retrospective-commands)

---

## Initialization Commands

### `taskflow init [project-name]`

Initialize a new Taskflow project in the current directory.

**Usage:**
```bash
# Initialize with default project name (directory name)
taskflow init

# Initialize with custom project name
taskflow init my-awesome-project
```

**What it creates:**
```
your-project/
├── taskflow.config.json      # Configuration
├── tasks/                     # Task files go here
└── .taskflow/
    ├── ref/                   # Reference documentation
    │   ├── ai-protocol.md
    │   ├── task-generator.md
    │   ├── task-executor.md
    │   ├── retrospective.md
    │   ├── prd-generator.md
    │   └── coding-standards.md
    └── logs/                  # Validation logs
```

**Example output:**
```
✓ Taskflow initialized for project: my-project
✓ Created: taskflow.config.json
✓ Created: tasks/
✓ Created: .taskflow/ref/
✓ Created: .taskflow/logs/

NEXT STEPS:
1. Create a PRD: taskflow prd create feature-name
2. Generate tasks: taskflow tasks generate your-prd.md
3. Start working: taskflow start <task-id>
```

---

## PRD Commands

### `taskflow prd create <feature-name>`

Create a PRD (Product Requirements Document) template for a new feature.

**Usage:**
```bash
taskflow prd create user-authentication
```

**Creates:**
- `tasks/prds/YYYY-MM-DD-user-authentication.md`

**Example PRD structure:**
```markdown
# User Authentication

## Overview
Add secure user authentication with login, logout, and session management.

## User Stories
1. As a user, I want to log in with email and password
2. As a user, I want to stay logged in across sessions
3. As a user, I want to securely log out

## Technical Requirements
- JWT-based authentication
- Secure password hashing (bcrypt)
- HTTP-only cookies for session tokens
- Rate limiting on login endpoint

## Dependencies
- Database schema changes
- User model updates

## Success Criteria
- Users can log in with valid credentials
- Users cannot log in with invalid credentials
- Sessions persist across browser refreshes
```

---

### `taskflow prd generate-arch <prd-file>`

Generate architecture documentation from a PRD.

**Usage:**
```bash
taskflow prd generate-arch 2024-01-15-user-authentication.md
```

**Creates/Updates:**
- `.taskflow/ref/coding-standards.md` - Project-specific coding standards
- `.taskflow/ref/ARCHITECTURE-RULES.md` - Architecture patterns and constraints

**Example output:**
```
✓ Architecture documentation generated
✓ Created: .taskflow/ref/coding-standards.md
✓ Created: .taskflow/ref/ARCHITECTURE-RULES.md

NEXT STEPS:
1. Review the generated standards
2. Customize as needed
3. Generate tasks: taskflow tasks generate your-prd.md
```

---

### `taskflow tasks generate <prd-file>`

Generate a complete task breakdown from a PRD.

**Usage:**
```bash
taskflow tasks generate 2024-01-15-user-authentication.md
```

**Creates:**
```
tasks/
├── project-index.json         # Project overview
└── F1/                        # Feature 1: User Authentication
    ├── F1.json                # Feature file with all stories
    └── S1.1/                  # Story 1.1: Login endpoint
        ├── T1.1.0.json        # Task: Create auth endpoints
        ├── T1.1.1.json        # Task: Add password hashing
        └── T1.1.2.json        # Task: Implement session management
```

**Example output:**
```
✓ Tasks generated from PRD
✓ Created: tasks/project-index.json
✓ Created: tasks/F1/F1.json
✓ Created: 3 stories, 8 tasks

TASK SUMMARY:
Feature F1: User Authentication [not-started]
  S1.1: Login endpoint [not-started]
    - T1.1.0: Create auth endpoints [not-started]
    - T1.1.1: Add password hashing [not-started]
    - T1.1.2: Implement session management [not-started]
  S1.2: Logout endpoint [not-started]
  S1.3: Session management [not-started]

NEXT STEPS:
View status: taskflow status
Start task: taskflow start 1.1.0
```

---

## Task Workflow Commands

### `taskflow start <task-id>`

Start working on a task. Resumes if already active.

**Usage:**
```bash
taskflow start 1.1.0
```

**What it does:**
1. Checks for active sessions (error if different task is active)
2. Verifies task dependencies are complete
3. Creates/switches to correct story branch
4. Sets task status to `setup`
5. Marks task as active

**Example output:**
```
✓ Task started: T1.1.0 - Create auth endpoints
✓ Status: setup
✓ Branch: story/S1.1-login-endpoint
✓ Dependencies: All complete

TASK: T1.1.0 - Create auth endpoints
DESCRIPTION: Create POST /api/auth/login and POST /api/auth/logout endpoints
SKILL: backend

NEXT STEPS:
1. Read the context: taskflow do
2. Advance: taskflow check
```

**Error scenarios:**

```bash
# If another task is active
✗ Cannot start task 2.1.0

Active session exists for task 1.1.0

Options:
- Complete current: taskflow commit "..."
- Skip current: taskflow skip --reason "..."
```

```bash
# If dependencies not met
✗ Cannot start task 1.2.0

Dependencies not met:
  T1.1.0: Create auth endpoints [not-started]
  T1.1.1: Add password hashing [not-started]

Complete dependencies first.
```

---

### `taskflow do`

Display state-specific instructions for the current active task.

**Usage:**
```bash
taskflow do
```

**Output varies by state:**

**Setup state:**
```
🚀 STATUS: SETUP

GOAL: Understand requirements and prepare environment

TASK: T1.1.0 - Create auth endpoints

DESCRIPTION: Create POST /api/auth/login and POST /api/auth/logout endpoints

CONTEXT:
- See auth requirements in docs/auth.md
- Review existing user model in src/models/User.ts

NEXT STEPS:
1. Read context files
2. Understand JWT token structure
3. Review API conventions
4. Run: taskflow check to advance

REFERENCES:
- AI Protocol: .taskflow/ref/ai-protocol.md
- Coding Standards: .taskflow/ref/coding-standards.md
```

**Implementing state:**
```
🚀 STATUS: IMPLEMENTING

GOAL: Write code to implement the feature

TASK: T1.1.0 - Create auth endpoints

SUBTASKS:
  [ ] 1. Create login endpoint
  [ ] 2. Create logout endpoint
  [ ] 3. Add input validation

NEXT STEPS:
1. Implement the subtasks above
2. Mark subtasks as completed:
   taskflow subtask complete 1
3. When done, run: taskflow check

DO:
- Follow coding standards in .taskflow/ref/coding-standards.md
- Use existing patterns in the codebase
- Write tests for new code

DON'T:
- Skip tests
- Ignore error handling
- Commit before validation passes
```

**Verifying state:**
```
🚀 STATUS: VERIFYING

GOAL: Self-review your implementation

CHECKLIST:
- [ ] Code follows coding standards
- [ ] All subtasks are completed
- [ ] Error handling is comprehensive
- [ ] Edge cases are handled
- [ ] Code is tested

NEXT STEPS:
1. Review your code
2. Complete checklist items
3. Run: taskflow check to advance
```

**Validating state:**
```
🚀 STATUS: VALIDATING

GOAL: Run automated validations

The following validations will run:
- format: Fix code formatting
- type-check: Type checking
- lint: Lint checks

NEXT STEPS:
Run: taskflow check to execute validations
```

**Committing state:**
```
🚀 STATUS: COMMITTING

GOAL: Commit and push your changes

COMMIT MESSAGE FORMAT:
feat(F1): T1.1.0 - Create auth endpoints

- Add POST /api/auth/login endpoint
- Add POST /api/auth/logout endpoint
- Implement JWT token generation
- Add input validation for email and password

Story: S1.1

NEXT STEPS:
Run: taskflow commit "- Bullet point 1\n- Bullet point 2"
```

---

### `taskflow check`

Validate and advance to the next workflow state.

**Usage:**
```bash
taskflow check
```

**Behavior varies by current state:**

**Setup → Implementing:**
```
✓ Status advanced: setup → implementing

TASK: T1.1.0 - Create auth endpoints

DESCRIPTION: Create POST /api/auth/login and POST /api/auth/logout endpoints

SUBTASKS:
  [ ] 1. Create login endpoint
  [ ] 2. Create logout endpoint
  [ ] 3. Add input validation

NEXT STEPS:
1. Read the task description and subtasks
2. Implement the required functionality
3. Run: taskflow check when done
```

**Implementing → Verifying:**
```
✓ Status advanced: implementing → verifying

NEXT STEPS:
1. Review your implementation
2. Check for edge cases
3. Ensure subtasks are completed
4. Run: taskflow check when ready
```

**Verifying → Validating:**
```
✓ Status advanced: verifying → validating

NEXT STEPS:
Run: taskflow check to run validations
```

**Validating (run validations):**
```
Running validations...

✓ format    (as configured)       PASSED
✓ typeCheck (as configured)       PASSED
✓ lint      (as configured)       PASSED

✓ Status advanced: validating → committing

NEXT STEPS:
Run: taskflow commit "- Bullet point 1\n- Bullet point 2"
```

**Validation failure:**
```
Running validations...

✓ format    PASSED
✗ typeCheck FAILED

ERROR: Type error in src/auth.ts:15
Property 'email' does not exist on type 'User'

⚠️ Check .taskflow/logs/T1-1-0-typeCheck-2024-01-15.log for details

Fix the errors and run: taskflow check again
```

---

### `taskflow commit "<bullet-points>"`

Commit and push changes, marking the task as complete.

**Usage:**
```bash
taskflow commit "- Add POST /api/auth/login endpoint
- Add POST /api/auth/logout endpoint
- Implement JWT token generation
- Add input validation for email and password"
```

**What it does:**
1. Validates we're in `committing` state
2. Checks subtasks are completed
3. Generates commit message in standard format
4. Runs `git add .`
5. Runs `git commit`
6. Runs `git push`
7. Updates task status to `completed`
8. Clears active session
9. Finds next available task

**Example output:**
```
✓ Changes committed
✓ Pushed to origin/story/S1.1-login-endpoint
✓ Task completed: T1.1.0

Commit: 3a8f9d2
Message: feat(F1): T1.1.0 - Create auth endpoints

- Add POST /api/auth/login endpoint
- Add POST /api/auth/logout endpoint
- Implement JWT token generation
- Add input validation for email and password

Story: S1.1

NEXT AVAILABLE TASK:
T1.1.1: Add password hashing

NEXT STEPS:
Run: taskflow start 1.1.1
```

**Error scenarios:**

```bash
# If not in committing state
✗ Cannot commit

Invalid state for commit: implementing

Run: taskflow check to advance to committing state
```

```bash
# If no subtasks completed
✗ Cannot commit

No subtasks have been marked as completed

Complete at least one subtask:
  taskflow subtask complete <subtask-id>
```

---

## Navigation Commands

### `taskflow status [id]`

View project, feature, or story status.

**Usage:**
```bash
# View project overview
taskflow status

# View specific feature
taskflow status 1

# View specific story
taskflow status 1.1
```

**Project overview output:**
```
PROJECT: my-project

Features:
  F1: User Authentication [in-progress]
    S1.1: Login endpoint [in-progress]
      T1.1.0: Create auth endpoints [completed]
      T1.1.1: Add password hashing [implementing]
      T1.1.2: Implement session management [not-started]
    S1.2: Logout endpoint [not-started]
  F2: User Profile [not-started]

ACTIVE TASK: T1.1.1
BRANCH: story/S1.1-login-endpoint
```

**Feature output:**
```
FEATURE: F1 - User Authentication [in-progress]

Stories:
  S1.1: Login endpoint [in-progress]
    ✓ T1.1.0: Create auth endpoints [completed]
    ◐ T1.1.1: Add password hashing [implementing]
    ○ T1.1.2: Implement session management [not-started]
  S1.2: Logout endpoint [not-started]

PROGRESS: 1/8 tasks completed (12%)
```

---

### `taskflow next`

Find the next available task to work on.

**Usage:**
```bash
taskflow next
```

**Example output:**
```
NEXT AVAILABLE TASK:
T1.1.1: Add password hashing

To start:
  taskflow start 1.1.1

Context:
- Depends on: T1.1.0 (completed)
- Story: S1.1 - Login endpoint
- Feature: F1 - User Authentication
```

---

## Recovery Commands

### `taskflow resume`

Resume an interrupted session.

**Usage:**
```bash
taskflow resume
```

**What it does:**
- Finds the task with `active` flag
- Restores the session
- Displays current state

**Example output:**
```
✓ Resumed task: T1.1.0 - Create auth endpoints
✓ Status: implementing

Continue where you left off...

SUBTASKS:
  [✓] 1. Create login endpoint
  [ ] 2. Create logout endpoint
  [ ] 3. Add input validation

NEXT STEPS:
Continue with: taskflow do
```

---

### `taskflow skip --reason "..."`

Block the current task due to external issues.

**Usage:**
```bash
taskflow skip --reason "Waiting for backend API to be deployed"
```

**What it does:**
- Sets task status to `blocked`
- Clears active session
- Records blocking reason
- Finds next available task

**Example output:**
```
✓ Task T1.2.0 blocked
Reason: Waiting for backend API to be deployed

Status: blocked (was: implementing)

NEXT AVAILABLE TASK:
T1.3.0: Add error handling

NEXT STEPS:
Run: taskflow start 1.3.0

To resume T1.2.0 later:
  taskflow start 1.2.0
```

---

## Retrospective Commands

### `taskflow retro add`

Add a new error pattern to the retrospective database.

**Usage:**
```bash
taskflow retro add
```

**Interactive prompts:**
```
Enter error pattern category:
  1. type_error
  2. lint
  3. architecture
  4. runtime
  5. build
  6. test
  7. formatting

Category: 1

Enter error pattern:
Cannot find module

Enter solution:
Ensure all imports use .js extension for ESM compatibility

Enter criticality (critical/high/medium/low):
high

✓ Error pattern added to retrospective
```

**Flags:**
```bash
# Non-interactive mode
taskflow retro add \
  --category type_error \
  --pattern "Cannot find module" \
  --solution "Use .js extensions" \
  --criticality high
```

---

### `taskflow retro list [category]`

List error patterns from the retrospective database.

**Usage:**
```bash
# List all patterns
taskflow retro list

# List by category
taskflow retro list type_error
```

**Example output:**
```
ERROR PATTERNS (type_error):

1. Cannot find module
   Solution: Ensure all imports use .js extension for ESM compatibility
   Criticality: high
   Occurrences: 5

2. Property does not exist
   Solution: Check type definitions and interfaces
   Criticality: medium
   Occurrences: 2

Total patterns: 8 across 4 categories
```

---

## Quick Reference

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           QUICK REFERENCE                                    │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                              │
│  Standard Workflow:                                                          │
│  ──────────────────                                                          │
│  taskflow start <id>     # Start task                                       │
│  taskflow do             # Read SETUP instructions                           │
│  taskflow check          # Advance to IMPLEMENTING                          │
│  taskflow do             # Read implementation details                      │
│  (write code)                                                                │
│  taskflow check          # Advance through: VERIFYING → VALIDATING          │
│  taskflow commit "..."   # Commit and complete (auto-marks completed)       │
│                                                                              │
│  Navigation:                                                                 │
│  ───────────                                                                 │
│  taskflow status         # Project overview                                 │
│  taskflow next           # Find next task                                   │
│                                                                              │
│  Recovery:                                                                   │
│  ─────────                                                                   │
│  taskflow resume         # Resume interrupted session                       │
│  taskflow skip           # Block current task                               │
│                                                                              │
│  Retrospective:                                                              │
│  ──────────────                                                              │
│  taskflow retro add      # Add error pattern                                │
│  taskflow retro list     # View patterns                                    │
│                                                                              │
└─────────────────────────────────────────────────────────────────────────────┘
```
