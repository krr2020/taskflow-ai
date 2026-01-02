/**
 * Response Validators for LLM Outputs
 * Validates PRD structure, task breakdown JSON, and other LLM responses
 */

/**
 * LLM Response validation result
 */
export interface LLMValidationResult {
	valid: boolean;
	errors: string[];
	warnings?: string[];
}

/**
 * PRD Section names (required sections)
 */
export const REQUIRED_PRD_SECTIONS = [
	"Overview",
	"Problem Statement",
	"Goals",
	"User Stories",
	"Functional Requirements",
	"Success Criteria",
] as const;

/**
 * Optional PRD sections
 */
export const OPTIONAL_PRD_SECTIONS = [
	"Non-Goals",
	"Non-Functional Requirements",
	"Technical Considerations",
	"Dependencies",
	"Timeline",
	"Risks",
] as const;

/**
 * Task breakdown structure
 */
export interface TaskBreakdown {
	project: string;
	features: Feature[];
}

export interface Feature {
	id: string;
	title: string;
	description: string;
	stories: Story[];
}

export interface Story {
	id: string;
	title: string;
	description: string;
	tasks: Task[];
}

export interface Task {
	id: string;
	title: string;
	skill: string;
	description: string;
	context: string[];
	subtasks: Subtask[];
	acceptanceCriteria: string[];
	dependencies: string[];
}

export interface Subtask {
	id: string;
	description: string;
	status: "not-started" | "in-progress" | "completed";
}

/**
 * PRD Validator
 */

/**
 * Check if PRD has a specific section
 */
function hasPRDSection(content: string, sectionName: string): boolean {
	// Match section headers (## Section Name or ### Section Name)
	const regex = new RegExp(`^#{2,3}\\s+.*${sectionName}.*$`, "mi");
	return regex.test(content);
}

/**
 * Find empty sections
 */
function findEmptyPRDSections(content: string): string[] {
	const emptySections: string[] = [];

	// Split by section headers
	const sections = content.split(/^#{2,3}\s+/m);

	for (let i = 1; i < sections.length; i++) {
		const section = sections[i];
		if (!section) continue;

		// Extract section name (first line)
		const lines = section.split("\n");
		const sectionName = lines[0]?.trim() ?? "";

		// Check if section has content
		const sectionContent = lines.slice(1).join("\n").trim();

		if (sectionContent.length < 10) {
			emptySections.push(sectionName);
		}
	}

	return emptySections;
}

/**
 * Validate PRD structure and content
 */
export function validatePRD(prdContent: string): LLMValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Check if content is empty
	if (!prdContent || prdContent.trim().length === 0) {
		errors.push("PRD content is empty");
		return { valid: false, errors, warnings };
	}

	// Check for required sections
	for (const section of REQUIRED_PRD_SECTIONS) {
		if (!hasPRDSection(prdContent, section)) {
			errors.push(`Missing required section: ${section}`);
		}
	}

	// Check for title/heading
	if (!prdContent.match(/^#\s+.+/m)) {
		errors.push("PRD must start with a title (# heading)");
	}

	// Check minimum length
	if (prdContent.length < 500) {
		warnings.push(
			"PRD is very short (< 500 characters). Consider adding more detail.",
		);
	}

	// Check for empty sections
	const emptySections = findEmptyPRDSections(prdContent);
	if (emptySections.length > 0) {
		warnings.push(`Empty sections found: ${emptySections.join(", ")}`);
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Generate PRD improvement suggestions based on validation
 */
export function generatePRDFeedback(
	validationResult: LLMValidationResult,
): string {
	if (validationResult.valid) {
		return "PRD structure is valid.";
	}

	const feedback: string[] = [];

	feedback.push("PRD validation failed. Please address:");

	for (const error of validationResult.errors) {
		feedback.push(`- ${error}`);
	}

	if (validationResult.warnings && validationResult.warnings.length > 0) {
		feedback.push("\nWarnings:");
		for (const warning of validationResult.warnings) {
			feedback.push(`- ${warning}`);
		}
	}

	return feedback.join("\n");
}

/**
 * Task Breakdown Validator
 */

/**
 * Type guard for TaskBreakdown
 */
function isTaskBreakdown(obj: unknown): obj is TaskBreakdown {
	return (
		typeof obj === "object" &&
		obj !== null &&
		"project" in obj &&
		"features" in obj
	);
}

/**
 * Validate feature structure
 */
function validateFeature(feature: unknown, index: number): string[] {
	const errors: string[] = [];

	if (typeof feature !== "object" || feature === null) {
		errors.push(`Feature ${index} is not an object`);
		return errors;
	}

	const f = feature as Record<string, unknown>;

	// Check required fields
	if (!("id" in f) || typeof f.id !== "string") {
		errors.push(`Feature ${index}: missing or invalid 'id'`);
	}

	if (!("title" in f) || typeof f.title !== "string") {
		errors.push(`Feature ${index}: missing or invalid 'title'`);
	}

	if (!("description" in f) || typeof f.description !== "string") {
		errors.push(`Feature ${index}: missing or invalid 'description'`);
	}

	if (!("stories" in f) || !Array.isArray(f.stories)) {
		errors.push(`Feature ${index}: missing or invalid 'stories' array`);
	} else {
		if (f.stories.length === 0) {
			errors.push(`Feature ${index}: at least one story is required`);
		}
	}

	return errors;
}

/**
 * Validate task breakdown JSON structure
 */
export function validateTaskBreakdown(
	jsonContent: string,
): LLMValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	// Parse JSON
	let parsed: unknown;
	try {
		parsed = JSON.parse(jsonContent);
	} catch (error) {
		errors.push(
			`Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
		return { valid: false, errors, warnings };
	}

	// Validate structure
	if (!isTaskBreakdown(parsed)) {
		errors.push("Invalid task breakdown structure");
		return { valid: false, errors, warnings };
	}

	// Validate project name
	if (!parsed.project || parsed.project.trim().length === 0) {
		errors.push("Project name is required");
	}

	// Validate features
	if (!parsed.features || parsed.features.length === 0) {
		errors.push("At least one feature is required");
	} else {
		for (const [index, feature] of parsed.features.entries()) {
			const featureErrors = validateFeature(feature, index);
			errors.push(...featureErrors);
		}
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Generate task breakdown improvement suggestions
 */
export function generateTaskBreakdownFeedback(
	validationResult: LLMValidationResult,
): string {
	if (validationResult.valid) {
		return "Task breakdown structure is valid.";
	}

	const feedback: string[] = [];

	feedback.push("Task breakdown validation failed. Please address:");

	for (const error of validationResult.errors) {
		feedback.push(`- ${error}`);
	}

	return feedback.join("\n");
}

/**
 * Generic JSON Validator
 */

/**
 * Validate if content is valid JSON
 */
export function validateJSON(content: string): LLMValidationResult {
	const errors: string[] = [];

	try {
		JSON.parse(content);
	} catch (error) {
		errors.push(
			`Invalid JSON: ${error instanceof Error ? error.message : "Unknown error"}`,
		);
	}

	return {
		valid: errors.length === 0,
		errors,
	};
}

/**
 * Extract JSON from markdown code blocks
 */
export function extractJSONFromMarkdown(content: string): string | null {
	// Try to find JSON in code blocks
	const jsonBlockMatch = content.match(/```json\s*\n([\s\S]*?)\n```/);
	if (jsonBlockMatch?.[1]) {
		return jsonBlockMatch[1];
	}

	// Try to find any code block
	const codeBlockMatch = content.match(/```\s*\n([\s\S]*?)\n```/);
	if (codeBlockMatch?.[1]) {
		return codeBlockMatch[1];
	}

	// Try to find JSON without code blocks
	const jsonMatch = content.match(/\{[\s\S]*\}/);
	if (jsonMatch?.[0]) {
		return jsonMatch[0];
	}

	return null;
}

/**
 * Response Length Validator
 */

/**
 * Validate response length
 */
export function validateResponseLength(
	content: string,
	options: {
		minLength?: number;
		maxLength?: number;
	},
): LLMValidationResult {
	const errors: string[] = [];
	const warnings: string[] = [];

	const length = content.length;

	if (options.minLength !== undefined && length < options.minLength) {
		errors.push(
			`Response too short: ${length} characters (minimum: ${options.minLength})`,
		);
	}

	if (options.maxLength !== undefined && length > options.maxLength) {
		errors.push(
			`Response too long: ${length} characters (maximum: ${options.maxLength})`,
		);
	}

	// Warnings for edge cases
	if (length < 50) {
		warnings.push("Response is very short");
	}

	return {
		valid: errors.length === 0,
		errors,
		warnings,
	};
}

/**
 * Generic validator that runs multiple validators
 */

/**
 * Run multiple validators and combine results
 */
export function runCompositeValidators(
	validators: Array<() => LLMValidationResult>,
): LLMValidationResult {
	const allErrors: string[] = [];
	const allWarnings: string[] = [];

	for (const validator of validators) {
		const result = validator();
		allErrors.push(...result.errors);
		if (result.warnings) {
			allWarnings.push(...result.warnings);
		}
	}

	const result: LLMValidationResult = {
		valid: allErrors.length === 0,
		errors: allErrors,
	};

	if (allWarnings.length > 0) {
		result.warnings = allWarnings;
	}

	return result;
}
