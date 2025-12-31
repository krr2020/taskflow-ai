import path from "node:path";
import { defineConfig } from "vitest/config";

export default defineConfig({
	test: {
		globals: true,
		environment: "node",
		root: path.resolve(__dirname),
		include: ["tests/**/*.test.ts"],
		coverage: {
			provider: "v8",
			reporter: ["text", "json", "html"],
			include: ["src/**/*.ts"],
			exclude: [
				"**/node_modules/**",
				"**/dist/**",
				"**/*.config.ts",
				"**/cli.ts", // Entry point, tested via integration
			],
			thresholds: {
				// Start with reasonable thresholds, can increase as coverage improves
				statements: 35,
				branches: 85,
				functions: 40,
				lines: 35,
			},
		},
	},
});
