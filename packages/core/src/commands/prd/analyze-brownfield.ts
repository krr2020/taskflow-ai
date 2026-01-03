import fs from "node:fs";
import path from "node:path";
import { BaseCommand, type CommandResult } from "@/commands/base";
import { CodebaseScanner } from "@/lib/analysis/codebase-scanner";
import { GapAnalyzer } from "@/lib/analysis/gap-analyzer";
import { PRDMatcher } from "@/lib/analysis/prd-matcher";
import type {
	DiscoveredFeature,
	GapAnalysis,
	MigrationPlan,
} from "../../lib/core/types.js";

export class PrdAnalyzeBrownfieldCommand extends BaseCommand {
	async execute(
		mode: "detect" | "analyze" | "migrate",
		target?: string,
		from?: string,
		to?: string,
	): Promise<CommandResult> {
		const projectRoot = this.context.projectRoot;

		// 1. Detect Mode
		if (mode === "detect") {
			console.log("Scanning codebase for features...");
			const scanner = new CodebaseScanner({ rootDir: projectRoot });
			const features = await scanner.scan();

			this.displayDiscoveredFeatures(features);

			return this.success(
				`Discovered ${features.length} features in codebase.`,
				"",
			);
		}

		// 2. Analyze Mode
		if (mode === "analyze") {
			if (!target) {
				return this.failure(
					"Missing PRD file path for analysis.",
					["Provide path to PRD file"],
					"taskflow prd analyze ./tasks/prds/my-feature.md",
				);
			}

			const prdPath = path.resolve(process.cwd(), target);
			if (!fs.existsSync(prdPath)) {
				return this.failure(
					`PRD file not found: ${prdPath}`,
					["Check if the file path is correct"],
					`taskflow prd analyze ${target}`,
				);
			}

			console.log("Analyzing PRD against codebase...");
			const prdContent = fs.readFileSync(prdPath, "utf-8");

			const scanner = new CodebaseScanner({ rootDir: projectRoot });
			const features = await scanner.scan();

			const matcher = new PRDMatcher(this.llmProvider);
			const matches = await matcher.matchRequirements(prdContent, features);

			const analyzer = new GapAnalyzer();
			const analysis = analyzer.analyzeGaps(matches);

			this.displayGapAnalysis(analysis);

			return this.success(
				`Analysis complete: ${analysis.summary.percentComplete}% implemented.`,
				"",
			);
		}

		// 3. Migrate Mode
		if (mode === "migrate") {
			if (!from || !to) {
				return this.failure(
					"Both --from and --to arguments are required for migration.",
					["Provide --from and --to arguments"],
					"taskflow prd migrate --from=express --to=fastify",
				);
			}

			console.log(`Generating migration plan from ${from} to ${to}...`);
			const analyzer = new GapAnalyzer();
			const plan = analyzer.generateMigrationPlan(
				from,
				to,
				"Migration context",
			);

			this.displayMigrationPlan(plan);

			return this.success("Migration plan generated.", "");
		}

		return this.failure(
			`Unknown mode: ${mode}`,
			[],
			`Mode must be one of: detect, analyze, migrate`,
		);
	}

	private displayDiscoveredFeatures(features: DiscoveredFeature[]): void {
		console.log("\n🔍 Discovered Features:");
		console.log("──────────────────────────────────────────────────");
		if (features.length === 0) {
			console.log("No common feature patterns detected.");
		} else {
			for (const feature of features) {
				console.log(
					`• ${feature.name} (${feature.files.length} files) - ${feature.confidence} confidence`,
				);
				// Show top 3 files
				feature.files.slice(0, 3).forEach((f) => {
					console.log(`  - ${f}`);
				});
				if (feature.files.length > 3) {
					console.log(`  - ...and ${feature.files.length - 3} more`);
				}
			}
		}
		console.log("──────────────────────────────────────────────────\n");
	}

	private displayGapAnalysis(analysis: GapAnalysis): void {
		console.log("\n📊 Gap Analysis:");
		console.log("──────────────────────────────────────────────────");
		console.log(`Total Requirements: ${analysis.summary.total}`);
		console.log(`Implemented: ${analysis.summary.implemented}`);
		console.log(`Partial: ${analysis.summary.partial}`);
		console.log(`Missing: ${analysis.summary.missing}`);
		console.log(`Overall Completion: ${analysis.summary.percentComplete}%`);
		console.log("──────────────────────────────────────────────────");

		if (analysis.gaps.length > 0) {
			console.log("\n⚠️ Identified Gaps:");
			for (const gap of analysis.gaps) {
				console.log(
					`\n[${gap.priority.toUpperCase()}] ${gap.requirement.text}`,
				);
				console.log(`  Effort: ${gap.effort}`);
				console.log(`  Suggestion: ${gap.suggestion}`);
			}
		}
		console.log("\n");
	}

	private displayMigrationPlan(plan: MigrationPlan): void {
		console.log("\n🚀 Migration Plan:");
		console.log("──────────────────────────────────────────────────");
		console.log(`From: ${plan.from}`);
		console.log(`To: ${plan.to}`);
		console.log(`Estimated Effort: ${plan.estimatedEffort}`);
		console.log("\nSteps:");

		plan.steps.forEach((step, index) => {
			console.log(
				`${index + 1}. [${step.type.toUpperCase()}] ${step.description}`,
			);
			if (step.code) {
				console.log(`   Command: ${step.code}`);
			}
		});

		if (plan.risks.length > 0) {
			console.log("\nRisks:");
			plan.risks.forEach((risk) => {
				console.log(`- ${risk}`);
			});
		}
		console.log("──────────────────────────────────────────────────\n");
	}
}
