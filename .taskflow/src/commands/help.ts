/**
 * Help command - Display help information
 *
 * FLOW: Informational command - can be run at any time
 * OUTPUT: Complete command reference and workflow guide
 */

import {
	colors,
	icons,
	printAIWarning,
	printColoredLine,
	printEmptyLine,
	printLine,
	SINGLE_LINE,
} from "../lib/output";

export async function helpCommand(): Promise<void> {
	printEmptyLine();
	printColoredLine(
		"═══════════════════════════════════════════════════════════════",
		colors.successBold,
	);
	printColoredLine(
		"  TASK MANAGER CLI - AI-Assisted Development Framework",
		colors.successBold,
	);
	printColoredLine(
		"═════════════════════════════════════════════════════════════",
		colors.successBold,
	);

	// AI AGENT RULES - PROMINENTLY DISPLAYED AT TOP
	printEmptyLine();
	printColoredLine(
		`${icons.alert} CRITICAL RULES FOR AI AGENTS ${icons.alert}`,
		colors.errorBold,
	);
	printColoredLine(SINGLE_LINE, colors.error);
	printColoredLine(
		"• NEVER read or modify files in .taskflow/ or tasks/ directories",
		colors.error,
	);
	printColoredLine(
		"• ALWAYS use pnpm task commands for ALL task management",
		colors.error,
	);
	printColoredLine(
		"• ONLY modify project source code to implement tasks",
		colors.error,
	);
	printColoredLine(
		"• ALWAYS follow the OUTPUT and NEXT STEPS sections in command output",
		colors.error,
	);
	printColoredLine(SINGLE_LINE, colors.error);

	printEmptyLine();
	printLine(
		`${colors.highlight("WORKFLOW COMMANDS")} ${colors.muted("(execute in order)")}`,
	);
	printLine(
		`  ${colors.success("pnpm task start <id>")}   Start a new task session`,
	);
	printLine(
		`  ${colors.success("pnpm task do")}           Get context-aware instructions for current state`,
	);
	printLine(
		`  ${colors.success("pnpm task check")}        Run validations and advance workflow state`,
	);
	printLine(
		`  ${colors.success('pnpm task commit "..."')} Commit and push changes (provide bullet points)`,
	);
	printLine(
		`  ${colors.success("pnpm task abort")}        Abandon current active task`,
	);
	printLine(
		`  ${colors.success("pnpm task subtask <taskId> <subtaskId>")}  Mark a subtask as completed or pending`,
	);
	printLine(
		`  ${colors.success("pnpm task note <taskId> <note>")}  Add a note to a task`,
	);

	printEmptyLine();
	printLine(colors.highlight("WORKFLOW STATES"));
	printLine(
		`  ${colors.state("SETUP")} → ${colors.state("IMPLEMENTING")} → ${colors.state("VERIFYING")} → ${colors.state("VALIDATING")} → ${colors.state("COMMITTING")} → ${colors.success("COMPLETED")}`,
	);
	printEmptyLine();
	printLine(
		`  ${colors.state("SETUP")}        Read task context, understand requirements`,
	);
	printLine(
		`  ${colors.state("IMPLEMENTING")} Write code in project source files`,
	);
	printLine(
		`  ${colors.state("VERIFYING")}    Self-review code against retrospective patterns`,
	);
	printLine(
		`  ${colors.state("VALIDATING")}   Run automated checks (type, lint, arch, test)`,
	);
	printLine(`  ${colors.state("COMMITTING")}   Commit and push changes`);

	printEmptyLine();
	printLine(colors.highlight("NAVIGATION COMMANDS"));
	printLine(`  ${colors.info("pnpm task status")}       Show project overview`);
	printLine(
		`  ${colors.info("pnpm task status <id>")}  Show details for a feature (1) or story (1.1)`,
	);
	printLine(
		`  ${colors.info("pnpm task next")}         Find the next available task`,
	);

	printEmptyLine();
	printLine(colors.highlight("RECOVERY COMMANDS"));
	printLine(
		`  ${colors.warning("pnpm task resume")}       Resume an interrupted session`,
	);
	printLine(
		`  ${colors.warning("pnpm task skip")}         Mark a task as blocked with a reason`,
	);

	printEmptyLine();
	printLine(colors.highlight("RETROSPECTIVE COMMANDS"));
	printLine(
		`  ${colors.error("pnpm task retro add")}    Add a new error pattern (MANDATORY on new errors)`,
	);
	printLine(
		`  ${colors.error("pnpm task retro list")}   List all known error patterns`,
	);

	printEmptyLine();
	printLine(colors.highlight("TYPICAL WORKFLOW"));
	printLine(`  ${colors.muted("# 1. Find and start a task")}`);
	printLine(`  pnpm task start 1.1.1`);
	printLine(`  ${colors.muted("# 2. Get context and implement")}`);
	printLine(
		`  pnpm task do                    ${colors.muted("# Shows all context and instructions")}`,
	);
	printLine(`  ${colors.muted("# ... implement in project source code ...")}`);
	printEmptyLine();
	printLine(`  ${colors.muted("# 3. Advance through states")}`);
	printLine(
		`  pnpm task check                 ${colors.muted("# SETUP → IMPLEMENTING")}`,
	);
	printLine(
		`  pnpm task check                 ${colors.muted("# IMPLEMENTING → VERIFYING")}`,
	);
	printLine(
		`  pnpm task check                 ${colors.muted("# VERIFYING → VALIDATING")}`,
	);
	printLine(
		`  pnpm task check                 ${colors.muted("# VALIDATING → COMMITTING (runs validations)")}`,
	);
	printLine(
		`  pnpm task check                 ${colors.muted("# COMMITTING → COMMITTING (runs validations)")}`,
	);
	printLine(
		`  pnpm task check                 ${colors.muted("# COMMITTING → COMMITTING (runs validations)")}`,
	);
	printLine(
		`  pnpm task check                 ${colors.muted("# COMMITTING → COMMITTING (runs validations)")}`,
	);
	printLine(
		`  pnpm task check                 ${colors.muted("# COMMITTING → COMMITTING (runs validations)")}`,
	);
	printLine(
		`  pnpm task check                 ${colors.muted("# COMMITTING → COMMITTING (runs validations)")}`,
	);
	printLine(
		`  pnpm task check                 ${colors.muted("# COMMITTING → COMMITTING (runs validations)")}`,
	);
	printEmptyLine();
	printLine(`  ${colors.muted("# 4. Commit with description")}`);
	printLine(
		`  pnpm task commit " - Added feature X\\n - Updated tests\\n - Fixed edge case"`,
	);
	printEmptyLine();
	printEmptyLine();
	printLine(colors.highlight("OUTPUT FORMAT"));
	printLine(
		`  ${colors.muted("Every command outputs a standardized format:")}`,
	);
	printLine(`  ${colors.muted("══════════════════════════════════")}`);
	printLine(`  ${colors.muted("[COMMAND] Result description")}`);
	printLine(`  ${colors.muted("══════════════════════════════════════")}`);
	printLine(`  ${colors.muted("OUTPUT")}`);
	printLine(`  ${colors.muted("────────────────────────────────")}`);
	printLine(`  ${colors.muted("[Command result details]")}`);
	printLine(
		`  ${colors.muted("══════════════════════════════════════════════")}`,
	);
	printLine(`  ${colors.muted("NEXT STEPS")}`);
	printLine(`  ${colors.muted("────────────────────────────────")}`);
	printLine(`  ${colors.muted("▸ pnpm task <command>")}`);
	printLine(`  ${colors.muted("  Description")}`);

	printAIWarning();
}
