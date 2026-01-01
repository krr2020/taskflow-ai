/**
 * PRD Create command - Create a new PRD (Product Requirements Document)
 */

import fs from "node:fs";
import path from "node:path";
import { ConfigLoader } from "../../lib/config-loader.js";
import { getRefFilePath, REF_FILES } from "../../lib/config-paths.js";
import { BaseCommand, type CommandResult } from "../base.js";

export class PrdCreateCommand extends BaseCommand {
	async execute(
		featureName: string,
		description?: string,
	): Promise<CommandResult> {
		const configLoader = new ConfigLoader(this.context.projectRoot);
		const paths = configLoader.getPaths();

		// Validate feature name
		if (!featureName || featureName.trim().length === 0) {
			return this.failure(
				"Feature name is required",
				["You must provide a name for the feature"],
				[
					"Create a PRD with a feature name:",
					"  taskflow prd create user-authentication",
					"  taskflow prd create payment-processing",
					"  taskflow prd create dashboard-redesign",
				].join("\n"),
			);
		}

		// Sanitize feature name for filename
		const sanitizedName = featureName
			.toLowerCase()
			.replace(/[^a-z0-9-]/g, "-")
			.replace(/-+/g, "-")
			.replace(/^-|-$/g, "");

		// Create PRDs directory if it doesn't exist
		const prdsDir = path.join(paths.tasksDir, "prds");
		if (!fs.existsSync(prdsDir)) {
			fs.mkdirSync(prdsDir, { recursive: true });
		}

		// Generate PRD filename with timestamp
		const timestamp = new Date().toISOString().split("T")[0];
		const prdFilename = `${timestamp}-${sanitizedName}.md`;
		const prdFilePath = path.join(prdsDir, prdFilename);

		// Check if file already exists
		if (fs.existsSync(prdFilePath)) {
			return this.failure(
				"PRD file already exists",
				[`A PRD file already exists at: ${prdFilePath}`],
				[
					"Options:",
					"1. Use a different feature name",
					"2. Edit the existing PRD file",
					"3. Delete the existing file if you want to start over",
				].join("\n"),
			);
		}

		// Create PRD template
		const prdTemplate = this.generatePrdTemplate(featureName, description);

		// Write PRD file
		fs.writeFileSync(prdFilePath, prdTemplate, "utf-8");

		const initialRequirements = description
			? [
					"",
					"INITIAL REQUIREMENTS PROVIDED:",
					"───────────────────────────────",
					description,
					"",
					"Use this as a starting point for the PRD.",
				]
			: [];

		const nextStepsBase = [
			`✓ PRD created: ${prdFilename}`,
			`✓ Location: ${prdFilePath}`,
			"",
			"NEXT:",
			"─".repeat(60),
			"1. Fill out the PRD document with feature requirements",
		];

		if (description) {
			nextStepsBase.push("   (Initial requirements already provided)");
		}

		nextStepsBase.push("2. Generate coding standards and architecture rules");
		nextStepsBase.push("3. Generate task breakdown from PRD");

		return this.success(
			nextStepsBase.join("\n"),
			[
				"1. Edit the PRD file to add feature details:",
				`   Open: ${prdFilePath}`,
				...initialRequirements,
				"",
				"2. Use AI to help fill out the PRD:",
				"   - Read .taskflow/ref/prd-generator.md for guidance",
				"   - Gather requirements through conversation",
				"   - Document goals, user stories, and acceptance criteria",
				"",
				"3. When PRD is complete, generate project standards:",
				`   taskflow prd generate-arch ${prdFilename}`,
				"",
				"4. Then generate task breakdown:",
				`   taskflow tasks generate ${prdFilename}`,
			].join("\n"),
			{
				aiGuidance: [
					"PRD Created - Ready to Fill Out",
					"",
					"WHAT IS A PRD?",
					"───────────────",
					"A Product Requirements Document (PRD) defines:",
					"- What you're building (goals and scope)",
					"- Why you're building it (business value)",
					"- Who it's for (target users)",
					"- How it should work (user stories, flows)",
					"- What success looks like (acceptance criteria)",
					"",
					"YOUR TASK:",
					"───────────",
					"Fill out the PRD template that was just created.",
					"",
					"CRITICAL - Read This First:",
					"────────────────────────────",
					`1. Read: ${getRefFilePath(paths.refDir, REF_FILES.prdGenerator)}`,
					"   This contains the complete PRD creation process",
					"",
					"2. Gather information from the user:",
					"   - What is the feature about?",
					"   - Who will use it?",
					"   - What problem does it solve?",
					"   - What are the key requirements?",
					"   - What are the acceptance criteria?",
					"",
					"3. Structure the PRD following the template sections:",
					"   - Overview and Goals",
					"   - User Stories",
					"   - Functional Requirements",
					"   - Non-Functional Requirements",
					"   - Technical Considerations",
					"   - Success Criteria",
					"",
					"IMPORTANT:",
					"───────────",
					"Do NOT create coding-standards.md or architecture-rules.md yet.",
					"Those will be generated in the next step using:",
					`  taskflow prd generate-arch ${prdFilename}`,
					"",
					"WORKFLOW:",
					"──────────",
					"1. ✓ PRD template created",
					"2. → Fill out PRD with requirements (you are here)",
					"3. → Generate coding standards and architecture rules",
					"4. → Generate task breakdown",
					"5. → Start executing tasks",
				].join("\n"),
				contextFiles: [
					`${prdFilePath} - PRD template to fill out`,
					`${getRefFilePath(paths.refDir, REF_FILES.prdGenerator)} - PRD creation guidelines`,
					`${getRefFilePath(paths.refDir, REF_FILES.aiProtocol)} - Core AI operating discipline`,
				],
				warnings: [
					"DO NOT skip the prd-generator.md - it contains critical guidance",
					"DO NOT guess at requirements - ask the user for clarification",
					"DO NOT create coding standards yet - wait for generate-arch command",
					"DO ensure PRD is complete before generating tasks",
				],
			},
		);
	}

	private generatePrdTemplate(
		featureName: string,
		description?: string,
	): string {
		const problemStatement = description
			? description.trim()
			: "<!-- What problem does this feature solve? -->";

		return `# PRD: ${featureName}

**Created:** ${new Date().toISOString().split("T")[0]}
**Status:** Draft
**Owner:** TBD

---

## 1. Overview

### Problem Statement
${problemStatement}

### Goals
<!-- What are we trying to achieve? -->

### Non-Goals
<!-- What is explicitly out of scope? -->

---

## 2. User Stories

### Primary User Stories
<!-- Format: As a [type of user], I want [goal] so that [benefit] -->

1.
2.
3.

### Secondary User Stories
<!-- Nice-to-have stories -->

1.
2.

---

## 3. Functional Requirements

### Core Features
<!-- What must this feature do? -->

1.
2.
3.

### User Flows
<!-- Describe key user interactions -->

#### Flow 1: [Name]
1.
2.
3.

---

## 4. Non-Functional Requirements

### Performance
<!-- Response times, throughput, scalability -->

### Security
<!-- Authentication, authorization, data protection -->

### Usability
<!-- User experience considerations -->

### Reliability
<!-- Uptime, error handling, recovery -->

---

## 5. Technical Considerations

### Architecture
<!-- High-level technical approach -->

### Dependencies
<!-- External systems, libraries, APIs -->

### Data Model
<!-- Key entities and relationships -->

### API Design
<!-- Endpoints, requests, responses -->

---

## 6. Success Criteria

### Acceptance Criteria
<!-- How do we know when this is done? -->

1.
2.
3.

### Metrics
<!-- How do we measure success? -->

-
-

---

## 7. Open Questions

<!-- Unresolved questions that need answers -->

1.
2.

---

## 8. Timeline and Phasing

### Phase 1 (MVP)
<!-- What's in the minimum viable product? -->

### Phase 2 (Enhancements)
<!-- What comes after MVP? -->

---

## Notes

<!-- Additional context, links, references -->
`;
	}
}
