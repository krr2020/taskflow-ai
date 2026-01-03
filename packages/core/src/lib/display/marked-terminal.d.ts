/**
 * Type declarations for marked-terminal
 */

declare module "marked-terminal" {
	interface TerminalRendererOptions {
		code?: (code: string) => string;
		blockquote?: (quote: string) => string;
		heading?: (text: string) => string;
		firstHeading?: (text: string) => string;
		listitem?: (text: string) => string;
		list?: (body: string) => string;
		strong?: (text: string) => string;
		em?: (text: string) => string;
		codespan?: (code: string) => string;
		del?: (text: string) => string;
		link?: (href: string) => string;
		href?: (href: string) => string;
		table?: (header: string, body: string) => string;
		tablerow?: (content: string) => string;
		tablecell?: (content: string) => string;
		hr?: string;
		br?: string;
		paragraph?: (text: string) => string;
		tab?: number;
		width?: number;
		reflowText?: boolean;
		showSectionPrefix?: boolean;
		unescape?: boolean;
		[key: string]: unknown;
	}

	class TerminalRenderer {
		constructor(options?: TerminalRendererOptions);
		options: TerminalRendererOptions;
	}

	export = TerminalRenderer;
}
