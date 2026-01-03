# Mode-Aware Prompting: The Key Design Principle

## The Core Problem

You identified a critical issue: **Strict formatting requirements (like asking exactly 5 questions in a specific format) are only necessary for manual CLI usage, NOT for MCP mode.**

## Why This Matters

### Manual Mode (User runs commands)
```bash
$ taskflow prd create
```

**The CLI needs to:**
1. Call LLM to generate questions
2. **Parse the output** using regex/patterns
3. Create interactive terminal prompts
4. Collect user answers
5. Format answers and call LLM again

**Therefore, LLM output MUST be strictly formatted:**
```
QUESTIONS:
1. What authentication method? (Type: multiple-choice)
   A. JWT tokens
   B. Session cookies
   C. OAuth 2.0
   Recommended: Option A - Simple and stateless
2. How to handle errors? (Type: open-ended)
```

### MCP Mode (Claude Desktop uses MCP server)
```typescript
// Claude Desktop calls:
await use_mcp_tool("taskflow_prd_create", { featureName: "..." })
```

**The AI agent:**
1. Calls the tool
2. Reads the natural language response
3. Handles file operations directly
4. Can iterate with follow-up tool calls
5. No parsing needed!

**Therefore, LLM output can be natural:**
```
I have a few questions to help create a comprehensive PRD:

1. What authentication method are you considering? I'd recommend JWT
   tokens for their simplicity and stateless nature, but session
   cookies or OAuth 2.0 could work depending on your requirements.

2. How should the system handle authentication errors?

Would you like me to explore any of these options in more detail?
```

## The Solution: Dual Prompts

Every LLM prompt in the system has **TWO variants**:

```typescript
const LLM_PROMPTS = {
  PRD_QUESTION_GENERATION: {
    // MANUAL: Strict format for CLI parsing
    manual: {
      system: (template) => `
        You are a Product Manager.

        CRITICAL OUTPUT FORMAT (must follow exactly):
        QUESTIONS:
        1. [Question] (Type: open-ended|multiple-choice)
           [If multiple-choice:]
           A. [Option]
           B. [Option]
           Recommended: Option X - [Reason]
        ...
      `,
      parsingRules: {
        questionPattern: /^\d+\.\s+(.+?)\s+\(Type:\s+(open-ended|multiple-choice)\)/,
        optionPattern: /^\s+([A-Z])\.\s+(.+)/
      }
    },

    // MCP: Natural conversation for AI agent
    mcp: {
      system: (template) => `
        You are a Product Manager helping create a PRD.

        Ask clarifying questions naturally. For options, provide
        recommendations with brief rationale. The AI agent will
        handle iterations, so focus on gathering complete information.
      `,
      // No parsing rules - natural output
    }
  }
};
```

## Application Across the System

This pattern applies to **ALL** LLM interactions:

| Operation | Manual Mode Needs | MCP Mode Needs |
|-----------|------------------|----------------|
| **PRD Question Gen** | Numbered list with types | Natural questions |
| **PRD Generation** | Complete markdown in one shot | Iterative with refinement |
| **Task Breakdown** | Strict JSON structure | Natural hierarchy |
| **Architecture Docs** | Delimited file outputs | Natural doc generation |
| **Error Analysis** | Structured report format | Conversational explanation |
| **Validation** | Checklist format (✓/✗) | Natural feedback |

## Example: Task Generation

### Manual Mode Prompt
```typescript
manual: {
  system: (protocol) => `
    Generate task breakdown in STRICT JSON format:
    {
      "features": [
        {
          "id": "F1",
          "name": "...",
          "stories": [...]
        }
      ]
    }
    Output ONLY valid JSON, no additional text.
  `
}
```

**Why:** CLI must `JSON.parse()` the output and write to files.

### MCP Mode Prompt
```typescript
mcp: {
  system: (protocol) => `
    Generate hierarchical breakdown of Features → Stories → Tasks.
    Work iteratively to ensure comprehensive coverage.
    The AI agent will format and save tasks, so focus on content.
  `
}
```

**Why:** Claude Desktop can read natural output and handle file operations.

## Benefits

### For Manual CLI Users
- ✅ Predictable, parseable outputs
- ✅ Clear error messages when parsing fails
- ✅ Consistent interactive experience

### For MCP Users (Claude Desktop)
- ✅ Natural, conversational AI behavior
- ✅ Iterative refinement without format constraints
- ✅ Better AI reasoning (not constrained by strict formats)
- ✅ More context-aware responses

### For Developers
- ✅ Single codebase handles both modes
- ✅ Clear separation of concerns
- ✅ Easy to add new prompts (just define both variants)
- ✅ Mode detection is automatic

## Implementation in Code

### Before (Current - Broken for MCP)
```typescript
// Single prompt enforces strict format everywhere
const prompt = `Generate exactly 5 questions in this format:
QUESTIONS:
1. [Question] (Type: open-ended)
...`;

const result = await llm.generate(prompt);
const questions = parseQuestions(result); // Fails in MCP mode!
```

### After (Mode-Aware)
```typescript
// PromptBuilder selects correct variant
const prompt = this.promptBuilder.build('PRD_QUESTION_GENERATION', {
  template,
  summary,
  referencedFiles
});

const result = await llm.generate([
  { role: 'system', content: prompt.system },
  { role: 'user', content: prompt.user }
]);

// Only parse in manual mode
if (this.mode === 'manual' && prompt.parsingRules) {
  return this.parseQuestions(result.content, prompt.parsingRules);
} else {
  // MCP mode: pass natural response to agent
  return result.content;
}
```

## Migration Strategy

1. **Identify all LLM calls** in the codebase
2. **For each prompt**, create two variants:
   - `manual`: Strict format with parsing rules
   - `mcp`: Natural, conversational
3. **Update commands** to use `PromptBuilder`
4. **Test both modes** thoroughly
5. **Document** the pattern for future features

## Future-Proofing

New features automatically work in both modes:

```typescript
// Adding a new LLM-powered feature
const LLM_PROMPTS = {
  NEW_FEATURE: {
    manual: {
      system: () => "Strict format for CLI...",
      parsingRules: { /* ... */ }
    },
    mcp: {
      system: () => "Natural guidance for AI agent..."
    }
  }
};

// In command code
const prompt = this.buildPrompt('NEW_FEATURE', context);
// Works in both modes automatically!
```

## Summary

**The key insight:** Don't force AI agents (MCP) into rigid formats designed for CLI parsing. Let each mode use prompts optimized for its workflow.

- **Manual CLI**: Strict formats → Reliable parsing → Good UX
- **MCP Mode**: Natural language → AI flexibility → Better results

This is now the **foundational principle** of the updated implementation plan.
