#!/usr/bin/env node

/**
 * TaskFlow CLI Executable
 *
 * This is the entry point for the taskflow command-line tool.
 */

import { runCLI } from "../dist/cli/index.js";

// Run the CLI
runCLI().catch((error) => {
	console.error("Fatal error:", error);
	process.exit(1);
});
