/**
 * Confirmation Prompts Utility
 *
 * Provides safe confirmation prompts for destructive or important actions.
 */

import { confirm, input } from "@inquirer/prompts";
import chalk from "chalk";

export interface ConfirmOptions {
	default?: boolean;
	requireExplicitYes?: boolean; // Require typing "yes" instead of y/n
	warningMessage?: string;
	confirmText?: string; // Custom text to type for confirmation
}

/**
 * Basic yes/no confirmation
 *
 * @example
 * const shouldDelete = await confirmAction('Delete all files?');
 */
export async function confirmAction(
	message: string,
	options?: ConfirmOptions,
): Promise<boolean> {
	// Show warning if provided
	if (options?.warningMessage) {
		console.log(chalk.yellow(`⚠️  ${options.warningMessage}`));
		console.log();
	}

	// Require explicit confirmation for dangerous actions
	if (options?.requireExplicitYes) {
		const confirmText = options.confirmText || "yes";
		const answer = await input({
			message: `${message} (Type "${confirmText}" to confirm)`,
		});

		return answer.trim().toLowerCase() === confirmText.toLowerCase();
	}

	// Standard yes/no confirmation
	return await confirm({
		message,
		default: options?.default ?? false,
	});
}

/**
 * Confirm with explicit typing for destructive actions
 *
 * @example
 * const confirmed = await confirmDestructive(
 *   'Delete entire project?',
 *   'project-name'
 * );
 */
export async function confirmDestructive(
	action: string,
	targetName: string,
	options?: { warningMessage?: string },
): Promise<boolean> {
	if (options?.warningMessage) {
		console.log(chalk.red(`⚠️  WARNING: ${options.warningMessage}`));
	} else {
		console.log(
			chalk.red("⚠️  WARNING: This action is destructive and cannot be undone!"),
		);
	}
	console.log();

	return confirmAction(action, {
		requireExplicitYes: true,
		confirmText: targetName,
	});
}

/**
 * Confirm multiple actions in sequence
 *
 * @example
 * const results = await confirmBatch([
 *   { message: 'Delete temp files?', key: 'deleteTmp' },
 *   { message: 'Clear cache?', key: 'clearCache' }
 * ]);
 *
 * if (results.deleteTmp) { ... }
 */
export async function confirmBatch(
	confirmations: Array<{ message: string; key: string; default?: boolean }>,
): Promise<Record<string, boolean>> {
	const results: Record<string, boolean> = {};

	for (const conf of confirmations) {
		const opts: ConfirmOptions = {};
		if (conf.default !== undefined) {
			opts.default = conf.default;
		}

		results[conf.key] = await confirmAction(conf.message, opts);
	}

	return results;
}

/**
 * Confirm with countdown (gives user time to cancel)
 *
 * @example
 * const confirmed = await confirmWithCountdown(
 *   'Deleting in',
 *   3,
 *   'Delete operation will start'
 * );
 */
export async function confirmWithCountdown(
	message: string,
	seconds: number = 5,
	actionDescription?: string,
): Promise<boolean> {
	if (actionDescription) {
		console.log(chalk.yellow(`⚠️  ${actionDescription}`));
		console.log();
	}

	// First ask for confirmation
	const shouldProceed = await confirmAction(message, { default: false });

	if (!shouldProceed) {
		return false;
	}

	// Countdown
	for (let i = seconds; i > 0; i--) {
		process.stdout.write(`\r${chalk.yellow(`Starting in ${i}...`)} `);
		await new Promise((resolve) => setTimeout(resolve, 1000));
	}
	process.stdout.write(`\r${" ".repeat(50)}\r`); // Clear countdown

	return true;
}

/**
 * Confirm with preview of what will be affected
 *
 * @example
 * const confirmed = await confirmWithPreview(
 *   'Delete these files?',
 *   ['file1.txt', 'file2.txt', 'file3.txt']
 * );
 */
export async function confirmWithPreview(
	message: string,
	items: string[],
	options?: { maxPreview?: number; destructive?: boolean },
): Promise<boolean> {
	const maxPreview = options?.maxPreview || 10;

	console.log(chalk.cyan("\nAffected items:"));
	const preview = items.slice(0, maxPreview);

	for (const item of preview) {
		console.log(chalk.gray(`  • ${item}`));
	}

	if (items.length > maxPreview) {
		console.log(
			chalk.gray(`  ... and ${items.length - maxPreview} more items`),
		);
	}
	console.log();

	const opts: ConfirmOptions = { default: false };
	if (options?.destructive !== undefined) {
		opts.requireExplicitYes = options.destructive;
	}

	return confirmAction(message, opts);
}

/**
 * Prompt for re-confirmation if user accidentally confirms
 *
 * @example
 * const confirmed = await doubleConfirm(
 *   'Are you sure?',
 *   'This will delete everything!'
 * );
 */
export async function doubleConfirm(
	firstMessage: string,
	secondMessage: string,
	options?: { warningMessage?: string },
): Promise<boolean> {
	if (options?.warningMessage) {
		console.log(chalk.yellow(`⚠️  ${options.warningMessage}`));
		console.log();
	}

	const first = await confirmAction(firstMessage, { default: false });

	if (!first) {
		return false;
	}

	console.log(chalk.yellow("\n⚠️  Please confirm again to proceed.\n"));

	return confirmAction(secondMessage, { default: false });
}
