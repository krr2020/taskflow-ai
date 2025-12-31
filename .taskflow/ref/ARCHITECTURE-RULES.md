# ARCHITECTURE RULES

**Forbidden patterns and required structure. Every rule is a command, not a suggestion.**

---

## 🏗️ Vertical Slice Structure (MANDATORY)

```
apps/api/src/modules/[feature]/
  ├── commands/[action]/handler.ts  # Write ops
  ├── queries/[action]/handler.ts   # Read ops
  ├── database/*.repository.impl.ts # Data access
  └── index.ts                      # Public exports ONLY
```

---

## ❌ FORBIDDEN (ZERO TOLERANCE)

**Layer Violations**
- Domain NEVER imports infrastructure
- Use dependency inversion (interfaces)

**Cross-Slice Imports**
- NEVER import other modules' internals
- Use domain events or shared interfaces

**Direct Database Access**
- NEVER `db.query.users.findMany()` in handlers
- ALWAYS use repository pattern

**Hardcoded Values**
- NEVER `/api/v1/users`, `/admin/dashboard`
- ALWAYS `API_ENDPOINTS.X`, `ROUTES.X` from `@repo/common`

**Raw UI Elements**
- NEVER `<button>`, `<input>`, `<div>` with className
- ALWAYS `Button`, `Input`, `Card` from `@repo/ui`

**Type: any**
- NEVER use `any`
- ALWAYS define proper types/interfaces

**console.log**
- NEVER use `console.log()`, `console.error()`
- ALWAYS use `@repo/logger`

---

## ✅ REQUIRED

**Import Order (STRICT)**
1. External libraries
2. @repo/* packages
3. Module public exports
4. Shared utilities
5. Local imports

**Repository Pattern**
- All database access through repositories
- Interface (.port.ts) + Implementation (.impl.ts)

**Dependency Injection**
- Constructor injection with `@Inject('name')`
- NEVER `new Repository()` in handlers

**TypeScript**
- Explicit return types on functions
- Strict mode enabled
- No `any`, use `unknown` if needed

**Error Handling**
- Specific error types, not generic `catch (e)`
- Log with context: `logger.error({ userId }, 'Error message')`

---

## 📦 @repo/* Imports (MANDATORY)

**Database**
```typescript
import { db } from '@repo/database';
import { users } from '@repo/database/schema';
import { eq } from '@repo/database/orm';
```

**Logger**
```typescript
import { logger } from '@repo/logger';
logger.info({ userId }, 'User created');
```

**UI Components**
```typescript
import { Button, Card, Input } from '@repo/ui';
```

**Routes & Endpoints**
```typescript
import { API_ENDPOINTS, ROUTES } from '@repo/common';
```

**Validation**
```typescript
import { z, emailSchema } from '@repo/validation';
```

**Test Utils**
```typescript
import { createMockUser, mockDbTransaction } from '@repo/test-utils';
```

---

## 📤 Module Exports (index.ts)

**Export:**
- Repository implementations
- Repository interfaces (as types)
- Domain entities
- DTOs (as types)

**NEVER Export:**
- Routes
- Handlers
- Internal utilities
- Mappers

---

## 🔍 Pre-Implementation Checklist

1. Found similar implementation: `find apps/api/src/modules -name "handler.ts"`
2. Verified vertical slice structure
3. Confirmed repository pattern exists
4. Checked DI container setup
5. Reviewed module exports (index.ts)
6. All imports use @repo/*
7. No hardcoded paths/routes
8. No raw HTML elements
9. Proper TypeScript types
10. Error handling with logger

---

## 🚨 Find Examples

```bash
# Find similar handlers
find apps/api/src/modules -name "handler.ts" -path "*/commands/*"

# Find repositories
find apps/api/src/modules -name "*.repository.impl.ts"

# Check module exports
cat apps/api/src/modules/auth/index.ts
```

**Remember: Each command/query is self-contained. NO cross-slice imports.**
