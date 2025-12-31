# PRD GENERATOR

Generate detailed Product Requirements Document (PRD) in Markdown format.

## Process

1. **Receive Initial Prompt:** User provides brief description of feature.
2. **Ask Clarifying Questions:** AI must ask essential questions (3-5 critical gaps).
3. **Generate PRD:** Based on prompt + answers, generate PRD using structure below.
4. **Save PRD:** Save as `prd-[feature-name].md` in `/tasks` directory.

## Clarifying Questions

Ask only most critical questions: Problem/Goal ("What problem does this feature solve?"), Core Functionality ("What are the key actions?"), Success Criteria ("How will we know when feature is successfully implemented?").

**Ask ONE question at a time**: Build iteratively, do not batch questions.

**Format:** Numbered list with options (A, B, C) for easy response.

## PRD Structure

1. Introduction/Overview
2. Goals (Specific, Measurable)
3. User Stories
4. Functional Requirements (Clear, concise, numbered)
5. Non-Goals (Out of Scope)
6. Success Metrics
7. Architecture Decisions
8. Data Model Considerations
9. API Contract Considerations (if applicable)
10. Integration Considerations
11. Testing Strategy
12. Error Handling Requirements
13. Security & Performance Considerations
14. Deployment Considerations
15. Monitoring & Observability
16. Documentation Requirements
17. Open Questions

## Requirements Syntax

**Use EARS syntax** for unambiguous acceptance criteria: WHEN [event] THEN [system] SHALL [response] | IF [precondition] THEN [system] SHALL [response].

## Alternative Analysis

When multiple approaches exist, present alternatives with pros/cons. Let user choose based on trade-offs.

## Success Metrics

Define measurable success criteria: quantitative metrics (response time, error rate, user engagement), qualitative metrics (user satisfaction, ease of use), performance targets (latency, throughput), acceptance criteria (specific benchmarks).

## Architecture Decisions

Document key architectural decisions: data model considerations, API contract considerations (endpoints, payloads, versioning), integration considerations (external services, webhooks), state management approach, caching strategy (if applicable).

## Testing Strategy

Define testing approach: unit tests (which components), integration tests (which flows), end-to-end tests (which user journeys), manual vs automated verification.

## Error Handling

Specify error scenarios: user input validation errors, API failure handling, timeout handling, retry logic (if applicable), error messages (user-friendly vs technical).

## Security & Performance

For each requirement, consider: security implications (authentication, authorization, data protection), performance impact (latency, throughput, scalability), rate limiting/throttling (if applicable).

## Library Compatibility

Before suggesting new libraries: verify no similar library exists, check compatibility with current stack, consider security/maintenance.

## Deployment Considerations

Define deployment requirements: database migrations (if applicable), feature flags (gradual rollout), rollback strategy, configuration changes required.

## Backward Compatibility

Define compatibility requirements: API versioning strategy, data migration needs, breaking changes documentation, deprecation timeline (if applicable).

## Monitoring & Observability

Define monitoring requirements: key metrics to track (performance, errors, usage), logging requirements (what to log, log levels), alerting thresholds, debugging capabilities.

## Documentation Requirements

Specify documentation needs: API documentation (endpoints, examples), user-facing documentation (guides, tutorials), internal documentation (architecture, design decisions), code comments requirements.

## Approval Gates & Definition of Done

**Explicit approval required**: Ask "yes/approved/LGTM?" before finalizing PRD content and moving to task breakdown.

**PRD complete when**: all sections filled (no TBD), requirements unambiguous (EARS syntax), success metrics measurable, architecture documented, security/performance addressed, testing defined, open questions documented.

## Output

**Format:** Markdown (`.md`) | **Location:** `/tasks/` | **Filename:** `prd-[feature-name].md`

## Target Audience

Assume primary reader is **junior developer**. Requirements should be explicit and unambiguous.
