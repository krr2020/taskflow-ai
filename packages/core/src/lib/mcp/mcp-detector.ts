/**
 * MCP (Model Context Protocol) Context Detection
 * Detects if TaskFlow is running via MCP server or direct CLI
 */

export interface MCPContext {
	isMCP: boolean;
	serverName?: string;
	serverVersion?: string;
	clientInfo?: {
		name: string;
		version: string;
	};
	detectionMethod: "env_var" | "parent_process" | "stdio" | "none" | "test";
}

export const MCPDetector = {
	/**
	 * Detect if running in MCP context
	 */
	detect(): MCPContext {
		const context: MCPContext = {
			isMCP: false,
			detectionMethod: "none",
		};

		// Method 1: Environment variables (most reliable)
		const mcpEnvVars = [
			{ key: "MCP_SERVER_NAME", field: "serverName" as const },
			{ key: "MCP_SERVER_VERSION", field: "serverVersion" as const },
			{
				key: "MCP_CLIENT_NAME",
				field: "clientInfo" as const,
				transform: (val: string) => ({ name: val, version: "unknown" }),
			},
			{
				key: "MCP_CLIENT_VERSION",
				field: "clientInfo" as const,
				transform: (val: string) => ({ name: "unknown", version: val }),
			},
		];

		for (const envVar of mcpEnvVars) {
			const value = process.env[envVar.key];
			if (value) {
				context.isMCP = true;
				context.detectionMethod = "env_var";
				if (envVar.field === "clientInfo" && envVar.transform) {
					context.clientInfo = {
						...context.clientInfo,
						...envVar.transform(value),
					};
				} else if (envVar.field === "serverName") {
					context.serverName = value;
				} else if (envVar.field === "serverVersion") {
					context.serverVersion = value;
				}
			}
		}

		if (context.isMCP) {
			return context;
		}

		// Method 2: Parent process analysis (e.g., npm task with mcp)
		if (process.env.npm_lifecycle_event?.includes("mcp")) {
			context.isMCP = true;
			context.detectionMethod = "parent_process";
			context.serverName = "npm-taskflow-mcp";
			return context;
		}

		// Method 3: Check for MCP-specific stdin/stdout markers
		// MCP protocol uses JSON-RPC over stdio
		if (MCPDetector.hasJSONRPCStdio()) {
			context.isMCP = true;
			context.detectionMethod = "stdio";
			context.serverName = "stdio-json-rpc";
			return context;
		}

		return context;
	},

	/**
	 * Check if stdin is JSON-RPC formatted (MCP protocol)
	 */
	hasJSONRPCStdio(): boolean {
		// Check if process is receiving JSON-RPC messages
		// This is a heuristic - actual implementation may vary
		return !!(
			process.stdin.isTTY === false &&
			(process.env.MCP_PROTOCOL === "stdio" ||
				MCPDetector.detectJSONRPCMessages())
		);
	},

	/**
	 * Try to detect if stdin contains JSON-RPC messages
	 */
	detectJSONRPCMessages(): boolean {
		// This is a basic heuristic
		// In practice, MCP servers communicate via JSON-RPC 2.0 protocol
		// We check for typical JSON-RPC patterns in the environment or process setup
		const indicators = [
			process.env.MCP_TOOL_CALL,
			process.env.MCP_SESSION_ID,
			process.env.MCP_REQUEST_ID,
		];

		return indicators.some((indicator) => !!indicator);
	},

	/**
	 * Get execution mode string for logging
	 */
	getExecutionMode(): "mcp" | "cli" {
		return MCPDetector.detect().isMCP ? "mcp" : "cli";
	},

	/**
	 * Check if currently in MCP mode
	 */
	isMCPMode(): boolean {
		return MCPDetector.detect().isMCP;
	},

	/**
	 * Get human-readable detection explanation
	 */
	getDetectionExplanation(): string {
		const context = MCPDetector.detect();
		if (!context.isMCP) {
			return "Running in direct CLI mode";
		}

		const explanations: Record<string, string> = {
			env_var: `Detected via environment variables (MCP_SERVER_NAME=${context.serverName || "set"}, etc.)`,
			parent_process: "Detected via parent process analysis (npm taskflow mcp)",
			stdio: "Detected via stdio JSON-RPC protocol markers",
		};

		return `Running in MCP mode - ${explanations[context.detectionMethod]}`;
	},
};
