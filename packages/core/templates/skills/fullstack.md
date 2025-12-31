---
name: fullstack
description: Create cohesive, production-grade features spanning frontend and backend. Use when building complete user flows that require coordinated changes across layers. Generates well-integrated code where both sides speak the same language.
---

## Design Thinking

Before implementing across layers, understand the context and commit to a CONTRACT-FIRST direction:

- **Interface**: What exact shape does data take crossing the boundary? Request fields, response structure, error codes, status meanings. Write this down. Type it. Both sides code against the contract, not against each other.
- **Ownership**: Who owns what? Backend owns validation logic. Frontend owns presentation. Shared package owns types. Draw clear lines or watch them blur into bugs.
- **Error Semantics**: How does the frontend know what went wrong? A 400 means many things—validation failed, resource missing, permission denied. Define error codes that enable helpful messages, not "Something went wrong."
- **Timing**: The network exists. Requests take time, fail, return stale data, arrive out of order. Design the frontend for these realities, not for instant success.

**CRITICAL**: Define the contract before implementing either side. Backend and frontend developed in parallel without agreement will diverge. Someone will rewrite significant code when they meet. The key is explicit contracts, not optimistic assumptions.

## Execution Guidelines

Implement production-grade, functional code where frontend and backend work as a unified system.

**Sequential Ownership**: Don't context-switch mid-implementation. Complete the API fully—tested, typed, documented. Then build the frontend against a stable target. Half-done work on both sides is worse than complete work on one.

**Shared Types**: The same validation schema can run on both sides. The same error codes can be referenced everywhere. The same types can define payloads. Sharing eliminates the "frontend expects X but backend sends Y" class of bugs entirely.

**Integration Testing**: Unit tests verify layers work in isolation. Integration tests verify they work together. The bugs that reach production live in the handshake—request formats the backend doesn't expect, response shapes the frontend can't parse. Test the actual integration.

**Error Consistency**: Backend returns structured errors. Frontend renders them helpfully. Same error types, same codes, same handling patterns. Users should see useful guidance regardless of where the error originated.

## What NOT To Do

Avoid patterns that undermine cross-layer work:

- Developing frontend and backend in parallel without agreeing on contracts
- Assuming integration works because unit tests pass
- Duplicating logic instead of sharing types/schemas
- Inconsistent error handling (backend structured, frontend generic)
- Frontend guessing API shape from examples instead of types
- Backend changing contracts without frontend coordination
- Missing integration tests for the actual request/response flow

## Testing Strategy

- **Unit Tests**: Backend services/repositories; frontend components/hooks/utils
- **Integration Tests**: Frontend-backend contract verification
- **End-to-End Tests**: Complete user journeys through UI to backend to DB
- **Test Handling**: Max 3 retries, analyze root cause if still failing
- **Manual Tests**: STOP and ask user to verify
- **Database Tests**: Do NOT clean up test data

## Security & Performance

- **Security**: Auth, authorization, data protection (both sides), input validation, XSS/SQL injection
- **Performance**: API latency, frontend rendering, bundle size, DB indexing, caching
- **Rate Limiting**: Implement where appropriate
- **Error Handling**: External operations need recovery strategies

## Library Verification

- Verify no similar library exists
- Check stack compatibility
- Consider security/maintenance status
- Evaluate bundle size impact (if frontend)
