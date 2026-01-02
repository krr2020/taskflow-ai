import fs from "node:fs";
import path from "node:path";

export interface DetectedTech {
	category: "frontend" | "backend" | "database" | "devops" | "language";
	name: string;
	version?: string | undefined;
	confidence: "high" | "medium" | "low";
	evidence: string; // e.g., "Found package.json with 'react': '18.2.0'"
}

export interface TechStack {
	frontend?: DetectedTech[];
	backend?: DetectedTech[];
	database?: DetectedTech[];
	language?: DetectedTech[];
	devops?: DetectedTech[];
}

export class TechStackDetector {
	constructor(private projectRoot: string) {}

	/**
	 * Detect tech stack from existing codebase
	 */
	async detect(): Promise<TechStack> {
		const stack: TechStack = {};

		// Check package.json
		const packageJsonPath = path.join(this.projectRoot, "package.json");
		if (fs.existsSync(packageJsonPath)) {
			try {
				const packageJson = JSON.parse(
					fs.readFileSync(packageJsonPath, "utf-8"),
				);
				const deps = {
					...packageJson.dependencies,
					...packageJson.devDependencies,
				};

				stack.frontend = this.detectFrontend(deps);
				stack.backend = this.detectBackend(deps);
				stack.database = this.detectDatabase(deps);
			} catch (error) {
				console.warn("Failed to parse package.json:", error);
			}
		}

		// Check for language-specific files
		stack.language = this.detectLanguage();

		// Check for config files
		stack.devops = this.detectDevOps();

		return stack;
	}

	private detectFrontend(deps: Record<string, string>): DetectedTech[] {
		const detected: DetectedTech[] = [];

		// React
		if (deps.react) {
			detected.push({
				category: "frontend",
				name: "React",
				version: deps.react,
				confidence: "high",
				evidence: `package.json contains 'react': '${deps.react}'`,
			});

			// Next.js
			if (deps.next) {
				detected.push({
					category: "frontend",
					name: "Next.js",
					version: deps.next,
					confidence: "high",
					evidence: `package.json contains 'next': '${deps.next}'`,
				});
			}
		}

		// Vue
		if (deps.vue) {
			detected.push({
				category: "frontend",
				name: "Vue",
				version: deps.vue,
				confidence: "high",
				evidence: `package.json contains 'vue': '${deps.vue}'`,
			});
		}

		// Svelte
		if (deps.svelte) {
			detected.push({
				category: "frontend",
				name: "Svelte",
				version: deps.svelte,
				confidence: "high",
				evidence: `package.json contains 'svelte': '${deps.svelte}'`,
			});
		}

		// Styling
		if (deps.tailwindcss) {
			detected.push({
				category: "frontend",
				name: "Tailwind CSS",
				version: deps.tailwindcss,
				confidence: "high",
				evidence: `package.json contains 'tailwindcss': '${deps.tailwindcss}'`,
			});
		}

		return detected;
	}

	private detectBackend(deps: Record<string, string>): DetectedTech[] {
		const detected: DetectedTech[] = [];

		// Express
		if (deps.express) {
			detected.push({
				category: "backend",
				name: "Express",
				version: deps.express,
				confidence: "high",
				evidence: `package.json contains 'express': '${deps.express}'`,
			});
		}

		// Fastify
		if (deps.fastify) {
			detected.push({
				category: "backend",
				name: "Fastify",
				version: deps.fastify,
				confidence: "high",
				evidence: `package.json contains 'fastify': '${deps.fastify}'`,
			});
		}

		// NestJS
		if (deps["@nestjs/core"]) {
			detected.push({
				category: "backend",
				name: "NestJS",
				version: deps["@nestjs/core"],
				confidence: "high",
				evidence: `package.json contains '@nestjs/core'`,
			});
		}

		return detected;
	}

	private detectDatabase(deps: Record<string, string>): DetectedTech[] {
		const detected: DetectedTech[] = [];

		// Prisma
		if (deps["@prisma/client"] || deps.prisma) {
			detected.push({
				category: "database",
				name: "Prisma",
				version: deps["@prisma/client"] || deps.prisma,
				confidence: "high",
				evidence: "Found Prisma in package.json",
			});

			// Try to detect database type from schema.prisma
			const schemaPath = path.join(this.projectRoot, "prisma", "schema.prisma");
			if (fs.existsSync(schemaPath)) {
				try {
					const schema = fs.readFileSync(schemaPath, "utf-8");
					if (schema.includes('provider = "postgresql"')) {
						detected.push({
							category: "database",
							name: "PostgreSQL",
							version: undefined,
							confidence: "high",
							evidence: "schema.prisma specifies postgresql",
						});
					} else if (schema.includes('provider = "mysql"')) {
						detected.push({
							category: "database",
							name: "MySQL",
							version: undefined,
							confidence: "high",
							evidence: "schema.prisma specifies mysql",
						});
					}
				} catch (_error) {
					// Ignore error reading schema
				}
			}
		}

		// MongoDB
		if (deps.mongodb || deps.mongoose) {
			detected.push({
				category: "database",
				name: "MongoDB",
				version: deps.mongodb || deps.mongoose,
				confidence: "high",
				evidence: "Found MongoDB/Mongoose in package.json",
			});
		}

		// Supabase
		if (deps["@supabase/supabase-js"]) {
			detected.push({
				category: "database",
				name: "Supabase",
				version: deps["@supabase/supabase-js"],
				confidence: "high",
				evidence: "Found Supabase client in package.json",
			});
		}

		return detected;
	}

	private detectLanguage(): DetectedTech[] {
		const detected: DetectedTech[] = [];

		// TypeScript
		const tsconfigPath = path.join(this.projectRoot, "tsconfig.json");
		if (fs.existsSync(tsconfigPath)) {
			try {
				const tsconfig = JSON.parse(fs.readFileSync(tsconfigPath, "utf-8"));
				detected.push({
					category: "language",
					name: "TypeScript",
					version: tsconfig.compilerOptions?.target || "unknown",
					confidence: "high",
					evidence: "Found tsconfig.json",
				});
			} catch (_error) {
				detected.push({
					category: "language",
					name: "TypeScript",
					version: "unknown",
					confidence: "high",
					evidence: "Found tsconfig.json (parse error)",
				});
			}
		}

		return detected;
	}

	private detectDevOps(): DetectedTech[] {
		const detected: DetectedTech[] = [];

		// Docker
		const dockerfilePath = path.join(this.projectRoot, "Dockerfile");
		if (fs.existsSync(dockerfilePath)) {
			detected.push({
				category: "devops",
				name: "Docker",
				version: undefined,
				confidence: "high",
				evidence: "Found Dockerfile",
			});
		}

		// Vercel
		const vercelPath = path.join(this.projectRoot, "vercel.json");
		if (fs.existsSync(vercelPath)) {
			detected.push({
				category: "devops",
				name: "Vercel",
				version: undefined,
				confidence: "high",
				evidence: "Found vercel.json",
			});
		}

		return detected;
	}

	/**
	 * Format detected stack for display
	 */
	formatStack(stack: TechStack): string[] {
		const lines: string[] = [];

		if (stack.language && stack.language.length > 0) {
			lines.push("Language:");
			for (const tech of stack.language) {
				lines.push(`  • ${tech.name}${tech.version ? ` ${tech.version}` : ""}`);
			}
		}

		if (stack.frontend && stack.frontend.length > 0) {
			lines.push("\nFrontend:");
			for (const tech of stack.frontend) {
				lines.push(`  • ${tech.name}${tech.version ? ` ${tech.version}` : ""}`);
			}
		}

		if (stack.backend && stack.backend.length > 0) {
			lines.push("\nBackend:");
			for (const tech of stack.backend) {
				lines.push(`  • ${tech.name}${tech.version ? ` ${tech.version}` : ""}`);
			}
		}

		if (stack.database && stack.database.length > 0) {
			lines.push("\nDatabase:");
			for (const tech of stack.database) {
				lines.push(`  • ${tech.name}${tech.version ? ` ${tech.version}` : ""}`);
			}
		}

		if (stack.devops && stack.devops.length > 0) {
			lines.push("\nDevOps:");
			for (const tech of stack.devops) {
				lines.push(`  • ${tech.name}${tech.version ? ` ${tech.version}` : ""}`);
			}
		}

		return lines;
	}

	/**
	 * Check if codebase appears to be greenfield (new project)
	 */
	isGreenfield(): boolean {
		// Check if there are any source files
		const srcDir = path.join(this.projectRoot, "src");
		const hasSourceFiles =
			fs.existsSync(srcDir) && fs.readdirSync(srcDir).length > 0;

		// Check if package.json has dependencies
		const packageJsonPath = path.join(this.projectRoot, "package.json");
		let hasDependencies = false;
		if (fs.existsSync(packageJsonPath)) {
			try {
				const packageJson = JSON.parse(
					fs.readFileSync(packageJsonPath, "utf-8"),
				);
				const deps = {
					...packageJson.dependencies,
					...packageJson.devDependencies,
				};
				hasDependencies = Object.keys(deps).length > 5; // More than basic setup
			} catch (_error) {
				// Assume no dependencies if parse error
			}
		}

		return !hasSourceFiles && !hasDependencies;
	}
}
