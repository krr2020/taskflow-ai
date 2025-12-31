---
name: docs
description: Create clear, maintainable documentation. Use when writing README files, API docs, guides, or any technical documentation. Generates useful content that readers can actually follow.
---

## Design Thinking

Before writing any documentation, understand the context and commit to a READER-FIRST direction:

- **Audience**: Who reads this? Developers new to the project, operators deploying to production, end users configuring features. Different audiences need different content.
- **Goal**: What should they accomplish after reading? Not "understand the system" but "successfully deploy the application" or "add a new API endpoint."
- **Context**: When do they reach for this document? Stuck on an error, exploring options, following a tutorial. Meet them where they are.
- **Next Step**: Where do they go after? Link to related docs, suggest next actions, provide escape hatches for common problems.

**CRITICAL**: Write for scanning, not reading. Headers, bullets, and code blocks create entry points. Walls of text create exits. Nobody reads documentation linearly. The key is findability, not completeness.

## Execution Guidelines

Create production-grade, functional documentation that readers can actually use.

**Show, Don't Explain**: One working example beats three paragraphs of description. Lead with code, follow with context. If you're explaining what code does, the code isn't clear enough.

**Structure for Scanning**: Use headers that answer questions. "How do I deploy?" not "Deployment." Use bullet points for lists. Use code blocks for commands. Bold the action items.

**Maintain Ruthlessly**: Outdated documentation is worse than no documentation. It leads users astray and wastes their time. If you change code, change docs. If you can't commit to maintenance, don't create the doc.

**Test the Instructions**: Follow your own docs on a clean machine. If steps are missing, add them. If commands fail, fix them. Documentation that doesn't work isn't documentation.

## What NOT To Do

Avoid patterns that undermine documentation:

- Writing for yourself instead of the reader
- Documenting how it works instead of how to use it
- Walls of text without visual structure
- Examples that don't actually work
- Instructions that assume unstated prerequisites
- TODOs in published documentation
- Duplicate content that will drift out of sync
- Explaining obvious things, skipping non-obvious things
