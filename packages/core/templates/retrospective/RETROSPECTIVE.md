# 🛑 RETROSPECTIVE & ACCOUNTABILITY LOG

**AI AGENT INSTRUCTIONS:**
1. **BEFORE CODING:** Read this file. Avoid these specific patterns.
2. **ON FAILURE:** The system will automatically check for these errors and increment the count.
3. **ON NEW ERROR:** If you encounter a new error type that is NOT in this table, you must add it manually.

| ID | Category | Error Pattern (Regex/Keywords) | Solution / Fix | Count | Criticality |
|---|---|---|---|---|---|
| 1 | Formatting | File content differs from formatting output | Run pnpm format | 2 | Medium |
| 2 | Type Error | z\.coerce\.number.*\.default\(|z\.boolean\(\)\.default\(|z\.enum.*\.default\( | In Zod v3, .default() affects type inference. For react-hook-form with zodResolver, remove .default() from Zod schema and provide default values in useForm's defaultValues option instead. | 1 | High |
