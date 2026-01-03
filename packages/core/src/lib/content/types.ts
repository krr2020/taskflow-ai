/**
 * Content Management Types
 *
 * Defines types for mode-aware content delivery across the application.
 */

/**
 * Execution mode - determines content format and verbosity
 */
export type ExecutionMode = "manual" | "mcp";

/**
 * Options for content retrieval
 */
export interface ContentOptions {
	mode: ExecutionMode;
	context?: Record<string, unknown>;
}

/**
 * Structured content block with mode-specific variants
 */
export interface ContentBlock {
	title?: string;
	instructions: string;
	aiGuidance?: string; // Only shown in MCP mode
	nextSteps?: string[];
	examples?: string[];
}

/**
 * Mode-aware content definition
 */
export interface ModeAwareContent<T = string> {
	manual: T;
	mcp: T;
}

/**
 * Prompt configuration for LLM calls
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic context needs to be flexible
export interface PromptConfig<TContext = any> {
	system: (context: TContext) => string;
	user: (context: TContext) => string;
	outputFormat?: string;
	parsingRules?: Record<string, RegExp>;
}

/**
 * Mode-aware prompt definition
 */
// biome-ignore lint/suspicious/noExplicitAny: Generic context needs to be flexible
export interface ModeAwarePrompt<TContext = any> {
	manual: PromptConfig<TContext>;
	mcp: PromptConfig<TContext>;
}

/**
 * Built prompt ready for LLM call
 */
export interface BuiltPrompt {
	system: string;
	user: string;
	parsingRules?: Record<string, RegExp>;
}

/**
 * Template source configuration
 */
export interface TemplateSource {
	type: "file" | "url" | "inline";
	source: string;
}
