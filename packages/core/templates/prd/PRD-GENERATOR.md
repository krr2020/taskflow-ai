# Rule: Generating a Product Requirements Document (PRD)

## Goal

To guide an AI assistant in creating a detailed Product Requirements Document (PRD) in Markdown format, based on an initial user prompt. The PRD should be clear, actionable, and suitable for a junior developer to understand and implement the feature.

## Process

1.  **Receive Initial Prompt:** The user provides a brief description or request for a new feature or functionality.
2.  **Ask Clarifying Questions:** Before writing the PRD, the AI *must* ask only the most essential clarifying questions needed to write a clear PRD. Limit questions to 3-5 critical gaps in understanding.
3.  **Generate PRD:** Based on the initial prompt and the user's answers, generate a PRD using the structure outlined below.
4.  **Save PRD:** Save the generated document as `prd-[feature-name].md` inside the `/tasks` directory.

## Clarifying Questions (Guidelines)

Ask only the most critical questions needed to write a clear PRD.
*   **Problem/Goal:** "What problem does this feature solve?"
*   **Core Functionality:** "What are the key actions?"
*   **Success Criteria:** "How will we know when this feature is successfully implemented?"

**Format:** Numbered list with options (A, B, C) for easy user response.

## PRD Structure

The generated PRD should include:

1.  **Introduction/Overview**
2.  **Goals** (Specific, Measurable)
3.  **User Stories**
4.  **Functional Requirements** (Clear, concise, numbered)
5.  **Non-Goals (Out of Scope)**
6.  **Success Metrics**
7.  **Open Questions**

## Target Audience

Assume the primary reader is a **junior developer**. Requirements should be explicit and unambiguous.

## Output

*   **Format:** Markdown (`.md`)
*   **Location:** `/tasks/`
*   **Filename:** `prd-[feature-name].md`
