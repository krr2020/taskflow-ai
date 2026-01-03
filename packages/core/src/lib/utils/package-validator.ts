export interface PackageInfo {
	name: string;
	latestStableVersion: string;
	isDeprecated: boolean;
	deprecationMessage?: string;
	replacementPackage?: string | undefined;
	weeklyDownloads?: number;
	lastPublished?: string;
}

export interface ValidationResult {
	package: string;
	ecosystem: "npm" | "pypi";
	validated: PackageInfo;
	recommendation?: string | undefined;
}

const ALTERNATIVES_MAP: Record<string, string> = {
	moment: "date-fns or luxon",
	request: "axios or fetch",
	"node-fetch": "global fetch (Node 18+)",
	uuid: "crypto.randomUUID() (Node 15+)",
	// lodash is fine, but native is preferred for simple things
	// underscore is largely replaced by lodash
	underscore: "lodash or native JS",
	"express-validator": "zod",
	joi: "zod",
	"class-validator": "zod",
	"type-graphql": "pothos or nexus",
	enzyme: "react-testing-library",
	tslint: "eslint",
};

export class PackageValidator {
	/**
	 * Validate npm package via registry API
	 */
	async validateNpmPackage(packageName: string): Promise<PackageInfo> {
		try {
			// 1. Get package metadata
			const res = await fetch(`https://registry.npmjs.org/${packageName}`);
			if (!res.ok) {
				throw new Error(`Failed to fetch package info: ${res.statusText}`);
			}
			// biome-ignore lint/suspicious/noExplicitAny: External API response
			const data = (await res.json()) as any;

			// 2. Get download stats
			let weeklyDownloads = 0;
			try {
				const statsRes = await fetch(
					`https://api.npmjs.org/downloads/point/last-week/${packageName}`,
				);
				if (statsRes.ok) {
					// biome-ignore lint/suspicious/noExplicitAny: External API response
					const stats = (await statsRes.json()) as any;
					weeklyDownloads = stats.downloads || 0;
				}
			} catch (_e) {
				// Ignore stats error
			}

			const latestVersion = data["dist-tags"]?.latest;
			const latestInfo = data.versions?.[latestVersion];

			const isDeprecated = !!latestInfo?.deprecated;
			const deprecationMessage = latestInfo?.deprecated;
			const lastPublished = data.time?.[latestVersion];

			const alternative = ALTERNATIVES_MAP[packageName];
			const replacement = isDeprecated
				? this.extractReplacementPackage(deprecationMessage)
				: undefined;

			return {
				name: packageName,
				latestStableVersion: latestVersion || "unknown",
				isDeprecated,
				deprecationMessage,
				replacementPackage: replacement || alternative,
				weeklyDownloads,
				lastPublished,
			};
		} catch (error) {
			console.error(`Error validating npm package ${packageName}:`, error);
			return {
				name: packageName,
				latestStableVersion: "unknown",
				isDeprecated: false, // Assume not deprecated if check fails
				weeklyDownloads: 0,
				replacementPackage: undefined,
			};
		}
	}

	/**
	 * Validate PyPI package via PyPI API
	 */
	async validatePyPiPackage(packageName: string): Promise<PackageInfo> {
		try {
			const res = await fetch(`https://pypi.org/pypi/${packageName}/json`);
			if (!res.ok) {
				throw new Error(`Failed to fetch package info: ${res.statusText}`);
			}
			// biome-ignore lint/suspicious/noExplicitAny: External API response
			const data = (await res.json()) as any;

			const info = data.info;
			const latestVersion = info.version;

			// PyPI doesn't have a standard "deprecated" field like npm,
			// but sometimes it's in classifiers or description.
			// For now we assume false unless we implement better detection.
			const isDeprecated = info.yanked || false;
			const deprecationMessage = info.yanked_reason || undefined;

			// Downloads are not available in standard PyPI JSON API anymore (deprecated)
			// We can't easily get them without BigQuery.

			return {
				name: packageName,
				latestStableVersion: latestVersion || "unknown",
				isDeprecated,
				deprecationMessage,
				weeklyDownloads: 0, // Not available
				lastPublished: data.releases?.[latestVersion]?.[0]?.upload_time,
				replacementPackage: undefined,
			};
		} catch (error) {
			console.error(`Error validating PyPI package ${packageName}:`, error);
			return {
				name: packageName,
				latestStableVersion: "unknown",
				isDeprecated: false,
				weeklyDownloads: 0,
				replacementPackage: undefined,
			};
		}
	}

	/**
	 * Validate multiple packages
	 */
	async validatePackages(
		packages: Array<{ name: string; ecosystem: "npm" | "pypi" }>,
	): Promise<ValidationResult[]> {
		const results: ValidationResult[] = [];

		for (const pkg of packages) {
			let info: PackageInfo;
			if (pkg.ecosystem === "npm") {
				info = await this.validateNpmPackage(pkg.name);
			} else {
				info = await this.validatePyPiPackage(pkg.name);
			}

			let recommendation: string | undefined;
			if (info.isDeprecated && info.replacementPackage) {
				recommendation = `Use ${info.replacementPackage} instead`;
			} else if (info.replacementPackage) {
				recommendation = `Consider using ${info.replacementPackage} instead`;
			}

			results.push({
				package: pkg.name,
				ecosystem: pkg.ecosystem,
				validated: info,
				recommendation: recommendation || undefined,
			});
		}

		return results;
	}

	/**
	 * Check if actively maintained (last publish date within 1 year)
	 */
	isActivelyMaintained(info: PackageInfo): boolean {
		if (!info.lastPublished) return true; // Assume yes if unknown

		const lastDate = new Date(info.lastPublished);
		const oneYearAgo = new Date();
		oneYearAgo.setFullYear(oneYearAgo.getFullYear() - 1);

		return lastDate > oneYearAgo;
	}

	/**
	 * Extract replacement package from deprecation message
	 */
	extractReplacementPackage(message?: string): string | undefined {
		if (!message) return undefined;

		// Common patterns: "Use X instead", "Deprecated in favor of X", "Moved to X"
		const patterns = [
			/use\s+([a-z0-9@/-]+)\s+instead/i,
			/in\s+favor\s+of\s+([a-z0-9@/-]+)/i,
			/moved\s+to\s+([a-z0-9@/-]+)/i,
			/deprecated.*use\s+([a-z0-9@/-]+)/i,
		];

		for (const pattern of patterns) {
			const match = message.match(pattern);
			if (match?.[1]) {
				return match[1];
			}
		}

		return undefined;
	}
}
