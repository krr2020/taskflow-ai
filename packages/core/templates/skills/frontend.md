---
name: frontend
description: Create polished, production-grade user interfaces. Use when building React components, pages, forms, or any user-facing features. Generates consistent, accessible code that leverages the design system and follows established patterns.
---

## Design Thinking

Before placing any element, understand the context and commit to a DELIBERATE design direction:

- **Purpose**: What user goal does this interface serve? Not "display data" but "help users find their orders quickly" or "let admins manage permissions confidently."
- **States**: Pick the states this interface must handle: loading, empty, populated, error, partial, stale, permission-denied, offline. Every interface has at least four. Design all of them intentionally.
- **Feedback**: How does the user know their action worked? Immediate visual response, optimistic updates, progress indicators, success confirmations. Silence breeds uncertainty.
- **Context**: Where does this live in the user's journey? What did they just do? What will they do next? Design for the flow, not the screen.

**CRITICAL**: Choose a clear interaction pattern and execute it with precision. Dense data tables and spacious cards both work—the key is consistency with the existing design system. Use what exists. Your components should be indistinguishable from what the team already built.

## Execution Guidelines

Implement production-grade, functional UI code that is visually consistent and operationally robust.

**Component Discipline**: The design system is your vocabulary. Before building anything, ask: does a component already handle this? Button, Input, Card, Dialog, Table—these exist for a reason. Custom components fragment the experience and multiply maintenance burden.

**Edge Cases**: The happy path is trivial. Excellence lives in: validation errors that guide rather than scold, loading states that feel fast, empty states that prompt action, error states that offer recovery paths. These moments define whether users trust your interface.

**Responsive Reality**: Design mobile-first. Test at 320px width. Touch targets must be tappable. Text must be readable. Layouts must not require horizontal scrolling. Half your users are on phones.

**Accessibility**: Labels on inputs. Focus states on interactive elements. Aria attributes where semantics fall short. Color contrast that works. Screen readers that make sense.

## What NOT To Do

Avoid generic UI patterns that undermine user experience:

- Raw HTML elements when design system components exist
- Building only the success state
- Inconsistent patterns across similar interfaces
- Invisible state changes (buttons that don't respond, actions that complete silently)
- Desktop-only layouts that collapse on mobile
- Missing loading, error, or empty states
- Hardcoded colors instead of design tokens
