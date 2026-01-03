import fs from "node:fs";
import path from "node:path";
import { execa } from "execa";
import type { BackupManager, Sandbox } from "./safety.js";

export interface ToolResult {
	success: boolean;
	output: string;
}

export interface Tool {
	name: string;
	description: string;
	execute(args: Record<string, string>): Promise<ToolResult>;
}

export interface ToolRegistry {
	register(tool: Tool): void;
	get(name: string): Tool | undefined;
	list(): Tool[];
}

export class FileSystemTools {
	constructor(
		private sandbox: Sandbox,
		private backupManager: BackupManager,
		private enableBackups = true,
	) {}

	getTools(): Tool[] {
		return [
			{
				name: "read_file",
				description: "Read content of a file",
				execute: async (args) => this.readFile(args.path || ""),
			},
			{
				name: "write_file",
				description: "Create or overwrite a file",
				execute: async (args) =>
					this.writeFile(args.path || "", args.content || ""),
			},
			{
				name: "list_files",
				description: "List files in a directory",
				execute: async (args) => this.listFiles(args.path || ""),
			},
			{
				name: "run_command",
				description: "Run a shell command",
				execute: async (args) => this.runCommand(args.command || ""),
			},
		];
	}

	private async readFile(filePath: string): Promise<ToolResult> {
		try {
			const safePath = this.sandbox.validatePath(filePath);
			if (!fs.existsSync(safePath)) {
				return { success: false, output: `File not found: ${filePath}` };
			}
			const content = fs.readFileSync(safePath, "utf-8");
			return { success: true, output: content };
		} catch (error) {
			return {
				success: false,
				output: `Error reading file: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	private async writeFile(
		filePath: string,
		content: string,
	): Promise<ToolResult> {
		try {
			const safePath = this.sandbox.validatePath(filePath);

			// Backup existing file
			if (this.enableBackups) {
				this.backupManager.backupFile(safePath);
			}

			// Ensure directory exists
			const dir = path.dirname(safePath);
			if (!fs.existsSync(dir)) {
				fs.mkdirSync(dir, { recursive: true });
			}

			// Atomic write
			const tempPath = `${safePath}.tmp`;
			fs.writeFileSync(tempPath, content);
			fs.renameSync(tempPath, safePath);

			return { success: true, output: `Successfully wrote to ${filePath}` };
		} catch (error) {
			return {
				success: false,
				output: `Error writing file: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	private async listFiles(dirPath: string): Promise<ToolResult> {
		try {
			const safePath = this.sandbox.validatePath(dirPath);
			if (!fs.existsSync(safePath)) {
				return { success: false, output: `Directory not found: ${dirPath}` };
			}
			const files = fs.readdirSync(safePath);
			return { success: true, output: files.join("\n") };
		} catch (error) {
			return {
				success: false,
				output: `Error listing files: ${error instanceof Error ? error.message : String(error)}`,
			};
		}
	}

	private async runCommand(command: string): Promise<ToolResult> {
		try {
			// Basic security: block dangerous commands if needed
			// For now, we trust the sandbox context but maybe block 'rm -rf /' etc.
			const result = await execa(command, { shell: true });
			return { success: true, output: result.stdout || result.stderr };
		} catch (error) {
			const output =
				typeof error === "object" && error !== null && "message" in error
					? (error as { message: string }).message
					: String(error);
			return { success: false, output: `Command failed: ${output}` };
		}
	}
}

export class DefaultToolRegistry implements ToolRegistry {
	private tools = new Map<string, Tool>();

	register(tool: Tool): void {
		this.tools.set(tool.name, tool);
	}

	get(name: string): Tool | undefined {
		return this.tools.get(name);
	}

	list(): Tool[] {
		return Array.from(this.tools.values());
	}
}
