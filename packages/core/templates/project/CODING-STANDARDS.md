# CODING STANDARDS

> **Tech stack versions:** [PROJECT-SETUP.md](./PROJECT-SETUP.md) | **Full docs:** [docs/PROJECT-SETUP-FULL.md](../docs/PROJECT-SETUP-FULL.md)

---

## 🚫 FORBIDDEN (Zero Tolerance)

### UI Elements

```tsx
// ❌ NO raw HTML
<label>, <input>, <button>, <select>, <textarea>

// ✅ Use @repo/ui
import { Label, Input, Button } from '@repo/ui/*';
```

### Icons

```tsx
// ❌ NO component-based icons (removed lucide-react)
import { Download } from 'lucide-react';

// ✅ Use Lucide React components (consistent, tree-shakeable)
<div className="i-lucide-download text-xl text-blue-600" />;
// Access 100+ icon sets: i-{collection}-{icon}
// lucide, heroicons, carbon, mdi, etc.
// See: https://icones.js.org/
```

### Constants

```tsx
// ❌ NO hardcoded values
"Min 12 characters", if (x > 5), timeout: 30000

// ✅ Use @repo/constants
import { MIN_PASSWORD_LENGTH } from '@repo/constants';
```

### Validation

```tsx
// ❌ NO direct zod
import { z } from 'zod';

// ✅ Use @repo/validation
import { z, emailSchema } from '@repo/validation';
```

---

## ✅ QUALITY GATES (Must Pass)

```bash
pnpm type-check  # 0 errors
pnpm lint        # 0 warnings
pnpm test        # 100% pass, >80% coverage
pnpm build       # Success
```

---

## 📦 Package Usage

**ALWAYS import from:**

- `@repo/ui/*` - All UI components
- `@repo/constants` - All config values, limits, text
- `@repo/validation` - All schemas (including z)
- `@repo/utils` - Utilities (formatDate, maskEmail, etc.)
- `@repo/types` - Shared types
- `@repo/database` - Prisma client
- `@repo/logger` - Logging (not console.log)

**NEVER:**

- Raw HTML elements with className
- Hardcoded strings/numbers
- `import { z } from 'zod'`
- `any` types
- `console.log()`
- Direct `@prisma/client` imports

---

## 📋 Pre-Code Check

```bash
# Check if component/constant exists BEFORE coding
ls packages/ui/src/components/
grep "export const" packages/constants/src/constants.ts
```

---

## 📝 Code Style

- **Naming:** camelCase (vars), PascalCase (components), UPPER_SNAKE_CASE (constants)
- **TypeScript:** Explicit return types, use `unknown` not `any`, strict mode
- **React:** Functional components, named exports (except Next.js pages)
- **Imports:** External → @repo → Local

---

## 🔒 Security

```typescript
// Input validation
import { createUserSchema } from '@repo/validation';
const data = createUserSchema.parse(request.body);

// Error handling
import { AppError } from '@repo/errors';
throw new AppError('AUTH_001', 'Invalid credentials', 401);

// Data masking
import { maskEmail } from '@repo/utils';
logger.info({ email: maskEmail(user.email) });
```

---

## 🧪 Testing

- Coverage >80%
- Test files: `*.test.ts`
- Use `@repo/test-utils`

```typescript
describe('Feature', () => {
  it('should work', () => {
    expect(result).toBeDefined();
  });
});
```
