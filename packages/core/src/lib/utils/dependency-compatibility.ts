import semver from "semver";

export interface CompatibilityIssue {
	message: string;
	severity: "error" | "warning";
}

export interface CompatibilityResult {
	compatible: boolean;
	issues: CompatibilityIssue[];
	adjustedVersions?: Map<string, string>;
	compatibilityMatrix?: string[][];
}

export class DependencyCompatibilityChecker {
	/**
	 * Check if a set of packages are compatible
	 */
	async checkCompatibility(
		packages: Array<{ name: string; version: string }>,
	): Promise<CompatibilityResult> {
		const issues: CompatibilityIssue[] = [];
		const packageMap = new Map<string, string>();

		for (const pkg of packages) {
			packageMap.set(pkg.name, pkg.version);
		}

		// Check known incompatibilities
		const knownIssues = this.checkKnownIncompatibilities(packageMap);
		issues.push(...knownIssues);

		// TODO: Check peer dependencies via npm API if needed
		// For now, we'll rely on known rules and semver checks of provided versions

		return {
			compatible: issues.filter((i) => i.severity === "error").length === 0,
			issues,
			compatibilityMatrix: this.generateMatrix(packages),
		};
	}

	private checkKnownIncompatibilities(
		packages: Map<string, string>,
	): CompatibilityIssue[] {
		const issues: CompatibilityIssue[] = [];

		const nextVersion = packages.get("next");
		const reactVersion = packages.get("react");
		const reactDomVersion = packages.get("react-dom");
		const prismaVersion = packages.get("prisma");
		const prismaClientVersion = packages.get("@prisma/client");
		const typesReactVersion = packages.get("@types/react");

		// Next.js + React compatibility
		if (nextVersion && reactVersion) {
			const nextMajor = semver.major(semver.coerce(nextVersion) || nextVersion);
			const reactMajor = semver.major(
				semver.coerce(reactVersion) || reactVersion,
			);

			if (nextMajor === 13 && reactMajor >= 19) {
				issues.push({
					message:
						"Next.js 13 requires React 18.x. Upgrade to Next.js 14+ for React 19.",
					severity: "error",
				});
			}
		}

		// React + React DOM matching
		if (reactVersion && reactDomVersion) {
			if (reactVersion !== reactDomVersion) {
				issues.push({
					message: `React (${reactVersion}) and React DOM (${reactDomVersion}) versions MUST match exactly.`,
					severity: "error",
				});
			}
		}

		// Prisma version matching
		if (prismaVersion && prismaClientVersion) {
			if (prismaVersion !== prismaClientVersion) {
				issues.push({
					message: `Prisma CLI (${prismaVersion}) and @prisma/client (${prismaClientVersion}) versions MUST match exactly.`,
					severity: "error",
				});
			}
		}

		// TypeScript types matching
		if (typesReactVersion && reactVersion) {
			const typesMajor = semver.major(
				semver.coerce(typesReactVersion) || typesReactVersion,
			);
			const reactMajor = semver.major(
				semver.coerce(reactVersion) || reactVersion,
			);

			if (typesMajor !== reactMajor) {
				issues.push({
					message: `@types/react (${typesReactVersion}) should match React major version (${reactVersion}).`,
					severity: "warning",
				});
			}
		}

		return issues;
	}

	private generateMatrix(
		packages: Array<{ name: string; version: string }>,
	): string[][] {
		return packages.map((pkg) => {
			let reqs = "-";
			if (pkg.name === "next") reqs = "react: ^18.2.0 or ^19";
			if (pkg.name === "react-dom") reqs = `react: ${pkg.version}`;

			return [pkg.name, pkg.version, reqs, "✅"];
		});
	}
}
