import pc from "picocolors";

/**
 * Standardized terminal formatting for TaskFlow
 */
export const TerminalFormatter = {
	header(text: string): string {
		return pc.bold(
			pc.cyan(`\n${"═".repeat(60)}\n${text}\n${"═".repeat(60)}\n`),
		);
	},

	section(title: string): string {
		return pc.bold(pc.yellow(`\n${title}\n${"─".repeat(40)}`));
	},

	question(number: number, text: string): string {
		return pc.bold(pc.white(`\n${number}. ${text}`));
	},

	option(text: string): string {
		return pc.gray(`   ${text}`);
	},

	prompt(text: string): string {
		return pc.green(`\n${text}\n> `);
	},

	success(text: string): string {
		return pc.green(`✓ ${text}`);
	},

	error(text: string): string {
		return pc.red(`✗ ${text}`);
	},

	warning(text: string): string {
		return pc.yellow(`⚠ ${text}`);
	},

	info(text: string): string {
		return pc.blue(`ℹ ${text}`);
	},

	url(text: string): string {
		return pc.underline(pc.cyan(text));
	},

	code(text: string): string {
		return pc.gray(text);
	},

	listItem(text: string): string {
		return pc.white(`  • ${text}`);
	},
};
