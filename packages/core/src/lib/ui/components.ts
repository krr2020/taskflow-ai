/**
 * TaskFlow CLI Design System Components
 *
 * Reusable UI components for consistent CLI experience
 *
 * @example
 * ```typescript
 * import { Box, Separator, Menu } from '@/lib/ui/ui/components';
 *
 * console.log(Box.info('Important message'));
 * console.log(Separator.section());
 * const choice = await Menu.select(options);
 * ```
 */

import pc from "picocolors";

/**
 * Box Drawing Characters (Unicode)
 */
export const BoxChars = {
	// Single-line borders
	topLeft: "┌",
	topRight: "┐",
	bottomLeft: "└",
	bottomRight: "┘",
	horizontal: "─",
	vertical: "│",

	// Double-line borders
	doubleTopLeft: "╔",
	doubleTopRight: "╗",
	doubleBottomLeft: "╚",
	doubleBottomRight: "╝",
	doubleHorizontal: "═",
	doubleVertical: "║",

	// Separators
	light: "─",
	heavy: "━",
	dash: "╌",
} as const;

/**
 * Color Palette
 */
export const Colors = {
	primary: pc.cyan,
	secondary: pc.blue,
	success: pc.green,
	error: pc.red,
	warning: pc.yellow,
	info: pc.blue,
	muted: pc.gray,
	dim: pc.dim,
	bold: pc.bold,
	underline: pc.underline,
} as const;

/**
 * Icons
 */
export const Icons = {
	success: "✓",
	error: "✗",
	warning: "⚠",
	info: "ℹ",
	bullet: "•",
	arrow: "→",
	check: "✓",
	cross: "✗",
	star: "★",
	circle: "●",
	square: "■",
	triangle: "▲",
	chevronRight: "›",
	chevronLeft: "‹",
	ellipsis: "…",
} as const;

/**
 * Separator Lines
 *
 * @example
 * ```typescript
 * console.log(Separator.light());
 * console.log(Separator.section("My Section"));
 * console.log(Separator.heavy());
 * ```
 */
export const Separator = {
	/**
	 * Light separator (60 chars)
	 */
	light(length = 60): string {
		return pc.dim(BoxChars.light.repeat(length));
	},

	/**
	 * Heavy separator (60 chars)
	 */
	heavy(length = 60): string {
		return BoxChars.heavy.repeat(length);
	},

	/**
	 * Dashed separator (60 chars)
	 */
	dashed(length = 60): string {
		return pc.dim(BoxChars.dash.repeat(length));
	},

	/**
	 * Section separator with optional title
	 */
	section(title?: string, length = 60): string {
		if (!title) {
			return `\n${this.light(length)}\n`;
		}

		const padding = Math.max(0, Math.floor((length - title.length - 2) / 2));
		const leftPad = BoxChars.light.repeat(padding);
		const rightPad = BoxChars.light.repeat(length - padding - title.length - 2);

		return `\n${pc.dim(leftPad)} ${pc.bold(title)} ${pc.dim(rightPad)}\n`;
	},

	/**
	 * Empty line for spacing
	 */
	blank(): string {
		return "";
	},
} as const;

/**
 * Box Components
 *
 * @example
 * ```typescript
 * console.log(Box.info("Important message"));
 * console.log(Box.success("Task completed!"));
 * console.log(Box.error("Something went wrong"));
 * ```
 */
export const Box = {
	/**
	 * Success box with green border
	 */
	success(content: string, title?: string): string {
		return this._create(content, {
			borderColor: Colors.success,
			title,
			icon: Icons.success,
		});
	},

	/**
	 * Error box with red border
	 */
	error(content: string, title?: string): string {
		return this._create(content, {
			borderColor: Colors.error,
			title,
			icon: Icons.error,
		});
	},

	/**
	 * Warning box with yellow border
	 */
	warning(content: string, title?: string): string {
		return this._create(content, {
			borderColor: Colors.warning,
			title,
			icon: Icons.warning,
		});
	},

	/**
	 * Info box with blue border
	 */
	info(content: string, title?: string): string {
		return this._create(content, {
			borderColor: Colors.info,
			title,
			icon: Icons.info,
		});
	},

	/**
	 * Plain box with no color
	 */
	plain(content: string, title?: string): string {
		return this._create(content, {
			borderColor: (s: string) => s,
			title,
		});
	},

	/**
	 * Create a box with custom options
	 */
	_create(
		content: string,
		options: {
			borderColor?: (s: string) => string;
			title?: string | undefined;
			icon?: string;
			width?: number;
		},
	): string {
		const { borderColor = (s: string) => s, title, icon, width = 60 } = options;

		const lines = content.split("\n");
		const contentWidth = width - 4; // Account for borders and padding

		// Wrap long lines
		const wrappedLines: string[] = [];
		for (const line of lines) {
			if (line.length <= contentWidth) {
				wrappedLines.push(line);
			} else {
				// Simple word wrapping
				const words = line.split(" ");
				let currentLine = "";
				for (const word of words) {
					if (`${currentLine} ${word}`.length <= contentWidth) {
						currentLine += (currentLine ? " " : "") + word;
					} else {
						if (currentLine) wrappedLines.push(currentLine);
						currentLine = word;
					}
				}
				if (currentLine) wrappedLines.push(currentLine);
			}
		}

		// Build box
		const parts: string[] = [];

		// Top border
		if (title) {
			const titleText = icon ? `${icon} ${title}` : title;
			const titleLine = `${BoxChars.topLeft}${BoxChars.horizontal} ${titleText} ${BoxChars.horizontal.repeat(width - titleText.length - 5)}${BoxChars.topRight}`;
			parts.push(borderColor(titleLine));
		} else {
			parts.push(
				borderColor(
					`${BoxChars.topLeft}${BoxChars.horizontal.repeat(width - 2)}${BoxChars.topRight}`,
				),
			);
		}

		// Content lines
		for (const line of wrappedLines) {
			const padding = " ".repeat(Math.max(0, contentWidth - line.length));
			parts.push(
				`${borderColor(BoxChars.vertical)} ${line}${padding} ${borderColor(BoxChars.vertical)}`,
			);
		}

		// Bottom border
		parts.push(
			borderColor(
				`${BoxChars.bottomLeft}${BoxChars.horizontal.repeat(width - 2)}${BoxChars.bottomRight}`,
			),
		);

		return parts.join("\n");
	},
} as const;

/**
 * Text Formatting Utilities
 *
 * @example
 * ```typescript
 * console.log(Text.heading("My Title"));
 * console.log(Text.question(1, "What is your name?"));
 * console.log(Text.success("Done!"));
 * ```
 */
export const Text = {
	/**
	 * Large heading with double-line separator
	 */
	heading(text: string): string {
		return pc.bold(
			Colors.primary(
				`\n${BoxChars.doubleHorizontal.repeat(60)}\n${text}\n${BoxChars.doubleHorizontal.repeat(60)}\n`,
			),
		);
	},

	/**
	 * Section title with single-line separator
	 */
	section(title: string): string {
		return pc.bold(
			Colors.secondary(`\n${title}\n${BoxChars.light.repeat(40)}`),
		);
	},

	/**
	 * Subsection title (smaller)
	 */
	subsection(title: string): string {
		return pc.bold(`\n${title}`);
	},

	/**
	 * Numbered question
	 */
	question(number: number, text: string): string {
		return `\n${Colors.primary(pc.bold(`${number}.`))} ${pc.bold(text)}`;
	},

	/**
	 * Answer text with checkmark
	 */
	answer(text: string): string {
		return `${Colors.success(`${Icons.success} Your Answer:`)}\n${text}`;
	},

	/**
	 * Success message
	 */
	success(text: string): string {
		return Colors.success(`${Icons.success} ${text}`);
	},

	/**
	 * Error message
	 */
	error(text: string): string {
		return Colors.error(`${Icons.error} ${text}`);
	},

	/**
	 * Warning message
	 */
	warning(text: string): string {
		return Colors.warning(`${Icons.warning} ${text}`);
	},

	/**
	 * Info message
	 */
	info(text: string): string {
		return Colors.info(`${Icons.info} ${text}`);
	},

	/**
	 * Muted/dimmed text
	 */
	muted(text: string): string {
		return Colors.muted(text);
	},

	/**
	 * Code/monospace text
	 */
	code(text: string): string {
		return Colors.muted(`\`${text}\``);
	},

	/**
	 * URL/link text
	 */
	url(text: string): string {
		return Colors.underline(Colors.primary(text));
	},

	/**
	 * Bullet point list item
	 */
	bullet(text: string): string {
		return `  ${Icons.bullet} ${text}`;
	},

	/**
	 * Numbered list item
	 */
	numbered(number: number, text: string): string {
		return `  ${number}. ${text}`;
	},

	/**
	 * Indented text
	 */
	indent(text: string, level = 1): string {
		const spaces = "  ".repeat(level);
		return text
			.split("\n")
			.map((line) => `${spaces}${line}`)
			.join("\n");
	},
} as const;

/**
 * List Components
 *
 * @example
 * ```typescript
 * console.log(List.bullet(["Item 1", "Item 2", "Item 3"]));
 * console.log(List.numbered(["First", "Second", "Third"]));
 * ```
 */
export const List = {
	/**
	 * Bullet point list
	 */
	bullet(items: string[], indent = 0): string {
		const spaces = "  ".repeat(indent);
		return items.map((item) => `${spaces}${Text.bullet(item)}`).join("\n");
	},

	/**
	 * Numbered list
	 */
	numbered(items: string[], startAt = 1): string {
		return items.map((item, i) => Text.numbered(startAt + i, item)).join("\n");
	},

	/**
	 * Checklist (with checkboxes)
	 */
	checklist(items: Array<{ text: string; checked: boolean }>): string {
		return items
			.map((item) => {
				const icon = item.checked ? Icons.check : " ";
				const color = item.checked ? Colors.success : (s: string) => s;
				return `  [${color(icon)}] ${item.text}`;
			})
			.join("\n");
	},
} as const;

/**
 * Table Component
 *
 * @example
 * ```typescript
 * const table = Table.create([
 *   { name: "John", age: "30", city: "NYC" },
 *   { name: "Jane", age: "25", city: "LA" }
 * ]);
 * console.log(table);
 * ```
 */
export const Table = {
	/**
	 * Create a simple table from objects
	 */
	create(
		rows: Array<Record<string, string | number>>,
		options?: { headers?: string[]; maxWidth?: number },
	): string {
		if (rows.length === 0) return "";

		const firstRow = rows[0];
		const headers = options?.headers || (firstRow ? Object.keys(firstRow) : []);

		// Calculate column widths
		const colWidths = headers.map((header) => {
			const headerWidth = header.length;
			const maxContentWidth = Math.max(
				...rows.map((row) => String(row[header] ?? "").length),
			);
			return Math.min(Math.max(headerWidth, maxContentWidth) + 2, 30);
		});

		// Build header row
		const headerRow =
			BoxChars.vertical +
			headers
				.map((header, i) => {
					const padded = header.padEnd(colWidths[i] ?? 0);
					return ` ${pc.bold(padded)} `;
				})
				.join(BoxChars.vertical) +
			BoxChars.vertical;

		// Build separator
		const separator =
			BoxChars.vertical +
			colWidths
				.map((width) => BoxChars.horizontal.repeat(width + 2))
				.join(BoxChars.vertical) +
			BoxChars.vertical;

		// Build data rows
		const dataRows = rows.map((row) => {
			return (
				BoxChars.vertical +
				headers
					.map((header, i) => {
						const value = String(row[header] ?? "");
						const padded = value.padEnd(colWidths[i] ?? 0);
						return ` ${padded} `;
					})
					.join(BoxChars.vertical) +
				BoxChars.vertical
			);
		});

		return [headerRow, separator, ...dataRows].join("\n");
	},

	/**
	 * Create a key-value table
	 */
	keyValue(data: Record<string, string | number>): string {
		const entries = Object.entries(data);
		const maxKeyLength = Math.max(...entries.map(([key]) => key.length));

		return entries
			.map(([key, value]) => {
				const paddedKey = key.padEnd(maxKeyLength);
				return `  ${pc.bold(paddedKey)} ${BoxChars.vertical} ${value}`;
			})
			.join("\n");
	},
} as const;

/**
 * Progress Bar Component
 *
 * @example
 * ```typescript
 * console.log(ProgressBar.create(50, 100)); // 50%
 * console.log(ProgressBar.percentage(75));
 * ```
 */
export const ProgressBar = {
	/**
	 * Create a progress bar
	 */
	create(current: number, total: number, width = 40): string {
		const percentage = Math.min(100, Math.max(0, (current / total) * 100));
		const filled = Math.round((percentage / 100) * width);
		const empty = width - filled;

		const filledBar = "█".repeat(filled);
		const emptyBar = "░".repeat(empty);

		// Color based on progress
		let color = Colors.success;
		if (percentage < 50) color = Colors.error;
		else if (percentage < 80) color = Colors.warning;

		return `[${color(filledBar)}${pc.dim(emptyBar)}] ${percentage.toFixed(1)}%`;
	},

	/**
	 * Simple percentage display
	 */
	percentage(value: number): string {
		let color = Colors.success;
		if (value < 50) color = Colors.error;
		else if (value < 80) color = Colors.warning;

		return color(`${value.toFixed(1)}%`);
	},

	/**
	 * Spinner-style progress (for unknown duration)
	 */
	spinner(frame: number): string {
		const frames = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];
		return Colors.primary(frames[frame % frames.length]);
	},
} as const;

/**
 * Safe string formatter - prevents "undefined" from appearing
 */
export function safeString(value: unknown, fallback = ""): string {
	if (value === null || value === undefined) return fallback;
	return String(value);
}

/**
 * Wrap text to fit within a specified width
 */
export function wrapText(text: string, width: number): string[] {
	const words = text.split(" ");
	const lines: string[] = [];
	let currentLine = "";

	for (const word of words) {
		if (`${currentLine} ${word}`.trim().length <= width) {
			currentLine += (currentLine ? " " : "") + word;
		} else {
			if (currentLine) lines.push(currentLine);
			currentLine = word;
		}
	}

	if (currentLine) lines.push(currentLine);
	return lines;
}

/**
 * Truncate text with ellipsis
 */
export function truncate(text: string, maxLength: number): string {
	if (text.length <= maxLength) return text;
	return text.substring(0, maxLength - 1) + Icons.ellipsis;
}

/**
 * Pad text to center it within a width
 */
export function centerText(text: string, width: number): string {
	const padding = Math.max(0, Math.floor((width - text.length) / 2));
	return " ".repeat(padding) + text;
}

/**
 * Create a visual spacing/padding
 */
export function spacing(lines = 1): string {
	return "\n".repeat(lines);
}
