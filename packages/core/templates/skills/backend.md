---
name: backend
description: Create robust, production-grade server implementations. Use when building APIs, database operations, business logic, or server infrastructure. Generates clean, maintainable code that follows established patterns and architectural boundaries.
---

## Design Thinking

Before writing any code, understand the context and commit to a CLEAR architectural direction:

- **Purpose**: What system behavior does this enable? Who consumes this endpoint/service? What data flows in and out?
- **Pattern**: Pick a pattern that fits: command/query separation, repository pattern, event-driven, request-response, saga orchestration, etc. There are many proven patterns. Choose one that matches the problem's shape and execute it consistently.
- **Boundaries**: Where does this module's responsibility end? What does it own? What does it delegate? Define the edges precisely.
- **Failure**: What can go wrong? Network timeouts, database conflicts, validation failures, resource exhaustion, permission denials. Design for these realities, not around them.

**CRITICAL**: Choose a clear structural direction and execute it with precision. Simple handlers and complex orchestrators both work—the key is consistency, not cleverness. Match the existing patterns. Your code should be indistinguishable from what the team already built.

## Execution Guidelines

Implement production-grade, functional server code that is architecturally sound and operationally ready.

**Data Flow**: Trace every request from entry to response. Understand validation, transformation, persistence, and error handling at each step. If you can't draw the flow, you don't understand it.

**Error Semantics**: Errors are not exceptional—they're expected. Use specific error types: ValidationError, NotFoundError, ConflictError, PermissionError. Generic catches hide bugs. Structured errors enable structured handling.

**Observability**: Log with context. Every significant operation should emit structured logs with request IDs, user context, and operation details. Silent code is undebuggable code.

**Testability**: If you can't test it without spinning up the database, you've coupled wrong. Inject dependencies. Isolate side effects. Pure functions at the core.

## What NOT To Do

Avoid generic server patterns that undermine production systems:

- Direct database queries in handlers (leaky abstraction)
- Generic `catch (e) { log(e) }` without recovery strategy
- Silent failures that swallow errors
- Business logic scattered across layers
- Hardcoded values that should be configurable
- Missing validation at trust boundaries
- Cross-module imports that break boundaries

## Testing Strategy

- **Unit Tests**: Test each service, repository, and validation function in isolation
- **Integration Tests**: Verify API endpoints work with actual database
- **End-to-End Tests**: Verify complete user journeys through system
- **Test Handling**: Implement test, run full suite, fix failures. Max 3 retry attempts. If still failing, STOP and analyze root cause.
- **Manual Tests**: STOP and ask user to verify. Do NOT auto-proceed.
- **Database Tests**: Do NOT clean up test data.

## Security & Performance

For each implementation:
- **Security**: Consider authentication, authorization, data protection, input validation, SQL injection prevention
- **Performance**: Consider latency, throughput, scalability, database indexing, query optimization, caching strategy
- **Rate Limiting**: Implement where appropriate to prevent abuse
- **Error Handling**: All external operations need error handling with recovery strategies

## Library Verification

Before suggesting new libraries:
- Verify no similar library exists in project
- Check compatibility with current stack
- Consider security and maintenance status
- Evaluate bundle size impact (if frontend)
