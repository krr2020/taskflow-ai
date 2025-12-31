/**
 * Do command - Get instructions for current status
 *
 * FLOW: Called after 'pnpm task start' or anytime during implementation
 * PRE-HOOK: Checks for active session
 * OUTPUT: Context-aware instructions based on current workflow state
 * NEXT STEPS: Varies by state (implement, check, commit, etc.)
 */

import { getRefFilePath, getSkillFilePath, REF_FILES } from "../lib/config";
import {
	findActiveTask,
	findTaskLocation,
	loadReferenceFile,
	loadTasksProgress,
} from "../lib/data-access";
import { NoActiveSessionError } from "../lib/errors";
import {
	colors,
	icons,
	printAIWarning,
	printColoredLine,
	printCommandResult,
	printDivider,
	printEmptyLine,
	printKeyValue,
	printLine,
	printNextStepsSection,
	printOutputSection,
	printReferenceContent,
	printSubheader,
	printTaskDetails,
} from "../lib/output";
import type { ActiveStatus, TaskFileContent } from "../lib/types";
import { parseTaskId } from "../lib/types";

export async function doCommand(): Promise<void> {
	const tasksProgress = loadTasksProgress();

	// ─────────────────────────────────────────────────────────────────────────
	// PRE-HOOK: Check for active session
	// ─────────────────────────────────────────────────────────────────────────
	const activeTask = findActiveTask(tasksProgress);
	if (!activeTask) {
		throw new NoActiveSessionError();
	}

	const location = findTaskLocation(tasksProgress, activeTask.taskId);
	if (!location) {
		throw new NoActiveSessionError();
	}

	const { feature, story, task } = location;
	const status = activeTask.content.status as ActiveStatus;

	// ─────────────────────────────────────────────────────────────────────────
	// OUTPUT: Display state-specific instructions
	// ─────────────────────────────────────────────────────────────────────────
	printCommandResult("DO", `Task ${task.id} - State: ${status.toUpperCase()}`);
	printOutputSection();
	printKeyValue("Task ID", colors.task(task.id));
	printKeyValue("Title", task.title);
	printKeyValue("Story", `${story.id} - ${story.title}`);
	printKeyValue("Feature", `${feature.id} - ${feature.title}`);
	printKeyValue("Status", colors.state(status));

	switch (status) {
		case "setup":
			await printSetupState(activeTask.content, task.id);
			break;

		case "implementing":
			await printImplementState(activeTask.content, task.id);
			break;

		case "verifying":
			await printVerifyState(activeTask.content, task.id);
			break;

		case "validating":
			printValidateState();
			break;

		case "committing":
			printCommitState(feature.id, task.id, task.title);
			break;

		default:
			printCommandResult("DO", `Unknown status: ${status}`, false);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// AI AGENT REMINDER
	// ─────────────────────────────────────────────────────────────────────────
	printAIWarning();
}

// ============================================================================
// State-specific helper functions
// ============================================================================

/**
 * SETUP STATE - AI Agent should READ and UNDERSTAND, not code yet
 *
 * This state provides full context:
 * - AI Protocol
 * - Skill-specific guidance
 * - Architecture rules
 * - Coding standards
 * - Retrospective (known error patterns)
 * - Task details with subtasks and context files
 */
async function printSetupState(
	taskContent: TaskFileContent,
	taskId: string,
): Promise<void> {
	const skill = taskContent.skill || "backend";
	parseTaskId(taskId); // Validates task ID format

	// ─────────────────────────────────────────────────────────────────────────
	// CRITICAL SECTION (Must Read Before Coding)
	// ─────────────────────────────────────────────────────────────────────────
	printDivider();
	printColoredLine(
		`${icons.alert} CRITICAL (Must Read Before Coding)`,
		colors.errorBold,
	);
	printColoredLine("─".repeat(50), colors.error);

	const retrospective = loadReferenceFile(
		getRefFilePath(REF_FILES.retrospective),
	);
	if (retrospective) {
		printReferenceContent(
			`${icons.stop} RETROSPECTIVE - Known Error Patterns to AVOID`,
			retrospective,
			colors.error,
		);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// REQUIRED SECTION (Should Read Before Starting)
	// ─────────────────────────────────────────────────────────────────────────
	printEmptyLine();
	printDivider();
	printColoredLine(
		`${icons.brain} REQUIRED (Should Read Before Starting)`,
		colors.warningBold,
	);
	printColoredLine("─".repeat(50), colors.warning);

	const aiProtocol = loadReferenceFile(getRefFilePath(REF_FILES.aiProtocol));
	if (aiProtocol) {
		printReferenceContent(
			`${icons.brain} AI PROTOCOL - Workflow Rules`,
			aiProtocol,
			colors.muted,
		);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// TASK DETAILS SECTION
	// ─────────────────────────────────────────────────────────────────────────
	printEmptyLine();
	printDivider();
	printColoredLine(
		`${icons.memo} TASK DETAILS - What to Implement`,
		colors.infoBold,
	);
	printColoredLine("─".repeat(50), colors.info);

	printTaskDetails(
		taskId,
		taskContent.title,
		skill,
		taskContent.description,
		taskContent.subtasks || [],
		taskContent.context || [],
	);

	// ─────────────────────────────────────────────────────────────────────────
	// REFERENCE SECTION (Read as Needed During Implementation)
	// ─────────────────────────────────────────────────────────────────────────
	printEmptyLine();
	printDivider();
	printColoredLine(
		`${icons.memo} REFERENCE (Read as Needed During Implementation)`,
		colors.infoBold,
	);
	printColoredLine("─".repeat(50), colors.info);

	const skillContent = loadReferenceFile(getSkillFilePath(skill));
	if (skillContent) {
		printReferenceContent(
			`${icons.target} SKILL: ${skill.toUpperCase()}`,
			skillContent,
			colors.command,
		);
	}

	const archRules = loadReferenceFile(
		getRefFilePath(REF_FILES.architectureRules),
	);
	if (archRules) {
		printReferenceContent(
			`${icons.architecture} ARCHITECTURE RULES`,
			archRules,
			colors.info,
		);
	}

	const codingStandards = loadReferenceFile(
		getRefFilePath(REF_FILES.codingStandards),
	);
	if (codingStandards) {
		printReferenceContent(
			`${icons.code} CODING STANDARDS`,
			codingStandards,
			colors.info,
		);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// QUICK START SECTION
	// ─────────────────────────────────────────────────────────────────────────
	printEmptyLine();
	printDivider();
	printColoredLine(`${icons.rocket} QUICK START (3 Steps)`, colors.successBold);
	printColoredLine("─".repeat(50), colors.success);
	printLine(`  1. Read RETROSPECTIVE to avoid known errors`);
	printLine(`  2. Read AI PROTOCOL to understand workflow rules`);
	printLine(`  3. Review TASK DETAILS and subtasks`);

	// ─────────────────────────────────────────────────────────────────────────
	// NEXT STEPS for SETUP state
	// ─────────────────────────────────────────────────────────────────────────
	printNextStepsSection([
		{
			cmd: "pnpm task check",
			desc: "When you understand task, run this to advance to IMPLEMENTING",
		},
	]);
}

/**
 * IMPLEMENTING STATE - AI Agent should WRITE CODE now
 *
 * This state shows:
 * - Clear "start coding" instruction
 * - Task details with subtasks (checklist to follow)
 * - Context files for reference
 * - Quick reference to guidelines
 */
async function printImplementState(
	taskContent: TaskFileContent,
	taskId: string,
): Promise<void> {
	const skill = taskContent.skill || "backend";
	parseTaskId(taskId); // Validates task ID format

	// ─────────────────────────────────────────────────────────────────────────
	// CLEAR INSTRUCTION: What AI should do in IMPLEMENTING state
	// ─────────────────────────────────────────────────────────────────────────
	printDivider();
	printColoredLine(
		`${icons.code} IMPLEMENTING STATE - WRITE CODE NOW`,
		colors.successBold,
	);
	printColoredLine("─".repeat(50), colors.success);
	printColoredLine(
		"DO: Implement each subtask in the checklist below",
		colors.success,
	);
	printColoredLine(
		"DO: Follow the coding standards and architecture rules",
		colors.success,
	);
	printColoredLine("DO: Reference context files as needed", colors.success);
	printColoredLine(
		"DO NOT: Modify files in .taskflow/ or tasks/ directories",
		colors.error,
	);
	printColoredLine("DO NOT: Skip subtasks - complete them all", colors.error);
	printColoredLine("─".repeat(50), colors.success);

	// Show Task Details with subtasks (the main implementation guide)
	printTaskDetails(
		taskId,
		taskContent.title,
		skill,
		taskContent.description,
		taskContent.subtasks || [],
		taskContent.context || [],
	);

	// Show RETROSPECTIVE reminder (avoid past mistakes)
	const retrospective = loadReferenceFile(
		getRefFilePath(REF_FILES.retrospective),
	);
	if (retrospective) {
		printReferenceContent(
			`${icons.stop} AVOID THESE KNOWN ERRORS`,
			retrospective,
			colors.error,
		);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// NEXT STEPS for IMPLEMENTING state
	// ─────────────────────────────────────────────────────────────────────────
	printNextStepsSection([
		{
			cmd: "1. Implement each subtask in order",
			desc: "Follow the checklist above, modifying ONLY project source files",
		},
		{
			cmd: "2. Test your changes locally if possible",
			desc: "Run relevant tests or check functionality",
		},
		{
			cmd: "3. pnpm task check",
			desc: "When ALL subtasks are complete, run this to advance to VERIFYING",
		},
	]);
}

/**
 * VERIFYING STATE - AI Agent should SELF-REVIEW the code
 *
 * This state shows:
 * - Verification checklist
 * - Task details for reference (to verify against)
 * - Retrospective patterns to check
 */
async function printVerifyState(
	taskContent: TaskFileContent,
	_taskId: string,
): Promise<void> {
	// ─────────────────────────────────────────────────────────────────────────
	// CLEAR INSTRUCTION: What AI should do in VERIFYING state
	// ─────────────────────────────────────────────────────────────────────────
	printDivider();
	printColoredLine(
		`${icons.search} VERIFYING STATE - SELF-REVIEW YOUR CODE`,
		colors.infoBold,
	);
	printColoredLine("─".repeat(50), colors.info);
	printColoredLine("DO: Review ALL code changes you made", colors.info);
	printColoredLine(
		"DO: Check against the subtask checklist below",
		colors.info,
	);
	printColoredLine(
		"DO: Verify against retrospective error patterns",
		colors.info,
	);
	printColoredLine(
		"DO NOT: Skip verification - catch errors before validation",
		colors.error,
	);
	printColoredLine("─".repeat(50), colors.info);

	// Show verification checklist
	printSubheader(`${icons.search} VERIFICATION CHECKLIST`);
	printLine(`  ${colors.info("□")} 1. All subtasks completed?`);
	printLine(`  ${colors.info("□")} 2. No hardcoded paths or magic values?`);
	printLine(`  ${colors.info("□")} 3. No 'any' types (TypeScript)?`);
	printLine(`  ${colors.info("□")} 4. Proper error handling?`);
	printLine(`  ${colors.info("□")} 5. Following architecture rules?`);
	printLine(`  ${colors.info("□")} 6. No patterns from RETROSPECTIVE?`);

	// Show task subtasks for verification reference
	if (taskContent.subtasks && taskContent.subtasks.length > 0) {
		printEmptyLine();
		printSubheader(`${icons.target} SUBTASK CHECKLIST TO VERIFY`);
		for (const subtask of taskContent.subtasks) {
			const icon =
				subtask.status === "completed"
					? colors.success("✓")
					: colors.warning("□");
			printLine(`  ${icon} ${subtask.description}`);
		}
	}

	// Show RETROSPECTIVE patterns to check against
	const retrospective = loadReferenceFile(
		getRefFilePath(REF_FILES.retrospective),
	);
	if (retrospective) {
		printReferenceContent(
			`${icons.stop} CHECK YOUR CODE AGAINST THESE PATTERNS`,
			retrospective,
			colors.error,
		);
	}

	// ─────────────────────────────────────────────────────────────────────────
	// NEXT STEPS for VERIFYING state
	// ─────────────────────────────────────────────────────────────────────────
	printNextStepsSection([
		{
			cmd: "1. Review each item in the verification checklist",
			desc: "Mentally check off each item above",
		},
		{
			cmd: "2. Fix any issues found",
			desc: "If you find problems, fix them in the source code",
		},
		{
			cmd: "3. pnpm task check",
			desc: "When self-review is complete, run this to start VALIDATION",
		},
	]);
}

/**
 * VALIDATING STATE - System runs automated checks
 *
 * This state explains:
 * - What checks will run
 * - What happens on success
 * - What happens on failure (and how to fix)
 */
function printValidateState(): void {
	// ─────────────────────────────────────────────────────────────────────────
	// CLEAR INSTRUCTION: What happens in VALIDATING state
	// ─────────────────────────────────────────────────────────────────────────
	printDivider();
	printColoredLine(
		`${icons.test} VALIDATING STATE - AUTOMATED CHECKS`,
		colors.infoBold,
	);
	printColoredLine("─".repeat(50), colors.info);
	printColoredLine(
		"The system will run these checks automatically:",
		colors.info,
	);
	printColoredLine("─".repeat(50), colors.info);

	printLine(
		`  ${colors.command("1. pnpm biome:fix")}   - Auto-fix formatting/lint issues`,
	);
	printLine(
		`  ${colors.command("2. pnpm type-check")} - TypeScript type checking`,
	);
	printLine(
		`  ${colors.command("3. pnpm arch:validate")} - Architecture rule validation`,
	);
	printLine(`  ${colors.command("4. pnpm test")}       - Run all tests`);

	printEmptyLine();
	printColoredLine("ON SUCCESS: Advances to COMMITTING state", colors.success);
	printColoredLine(
		"ON FAILURE: Stay in VALIDATING, fix errors, run check again",
		colors.error,
	);

	// ─────────────────────────────────────────────────────────────────────────
	// NEXT STEPS for VALIDATING state
	// ─────────────────────────────────────────────────────────────────────────
	printNextStepsSection([
		{
			cmd: "pnpm task check",
			desc: "Run automated validations now",
		},
	]);

	printEmptyLine();
	printColoredLine("IF VALIDATION FAILS:", colors.warning);
	printColoredLine("  1. Read the error output carefully", colors.muted);
	printColoredLine(
		"  2. Fix the errors in your project source code",
		colors.muted,
	);
	printColoredLine('  3. Run "pnpm task check" again', colors.muted);
	printColoredLine(
		"  4. If new error pattern, add to retrospective:",
		colors.muted,
	);
	printColoredLine(
		'     pnpm task retro add --category "..." --pattern "..." --solution "..." --criticality "..."',
		colors.muted,
	);
}

/**
 * COMMITTING STATE - Ready to commit and push
 *
 * This state shows:
 * - Commit message format
 * - Exact command to run
 * - What happens after commit
 */
function printCommitState(
	featureId: string,
	taskId: string,
	taskTitle: string,
): void {
	// ─────────────────────────────────────────────────────────────────────────
	// CLEAR INSTRUCTION: What AI should do in COMMITTING state
	// ─────────────────────────────────────────────────────────────────────────
	printDivider();
	printColoredLine(
		`${icons.save} COMMITTING STATE - READY TO COMMIT`,
		colors.successBold,
	);
	printColoredLine("─".repeat(50), colors.success);
	printColoredLine(
		"All validations passed! Now commit your changes.",
		colors.success,
	);
	printColoredLine("─".repeat(50), colors.success);

	printEmptyLine();
	printColoredLine("Commit Message Format:", colors.highlight);
	printColoredLine("  Header (auto-generated):", colors.muted);
	printLine(`    feat(F${featureId}): T${taskId} - ${taskTitle}`);
	printColoredLine("  Body (you provide):", colors.muted);
	printLine(`    - Bullet point 1 describing a change`);
	printLine(`    - Bullet point 2 describing another change`);
	printLine(`    - Bullet point 3 (provide 3-4 bullet points)`);

	// ─────────────────────────────────────────────────────────────────────────
	// NEXT STEPS for COMMITTING state
	// ─────────────────────────────────────────────────────────────────────────
	printNextStepsSection([
		{
			cmd: `pnpm task commit " - Change 1\\n - Change 2\\n - Change 3"`,
			desc: "Run this exact command with YOUR bullet points",
		},
	]);

	printEmptyLine();
	printColoredLine("WHAT HAPPENS:", colors.warningBold);
	printColoredLine("  1. Status updated to COMPLETED", colors.muted);
	printColoredLine(
		"  2. All changes committed with formatted message",
		colors.muted,
	);
	printColoredLine("  3. Changes pushed to remote branch", colors.muted);
	printColoredLine("  4. Next task suggested", colors.muted);
}
