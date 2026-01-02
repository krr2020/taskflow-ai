import { beforeEach, describe, expect, it, vi } from "vitest";
import { BaseCommand } from "../../src/commands/base.js";
import { PRDInteractiveSession } from "../../src/lib/prd-interactive-session.js";

// Mock BaseCommand
class MockCommand extends BaseCommand {
	constructor() {
		super({} as any);
	}
	async execute() {
		return this.success("ok", "next steps");
	}
}

describe("PRDInteractiveSession", () => {
	let session: PRDInteractiveSession;
	let command: MockCommand;

	beforeEach(() => {
		command = new MockCommand();
		session = new PRDInteractiveSession(command);

		// Mock protected prompt method
		(session as any).prompt = vi.fn();
		(session as any).promptMultiline = vi.fn();
		(session as any).showStep = vi.fn();
		(session as any).showHeader = vi.fn();
		(session as any).confirm = vi.fn().mockResolvedValue(true);
	});

	it("should ask for title and summary", async () => {
		// Mock responses
		(session as any).prompt.mockResolvedValue({
			value: "My Feature",
			quit: false,
		});
		(session as any).promptMultiline.mockResolvedValue({
			value: "This is a summary",
			quit: false,
		});

		const result = await session.start();

		expect(result.title).toBe("My Feature");
		expect(result.summary).toBe("This is a summary");

		expect((session as any).prompt).toHaveBeenCalledWith(
			"What is the title of the feature?",
		);
		expect((session as any).promptMultiline).toHaveBeenCalled();
	});

	it("should skip title prompt if feature name provided", async () => {
		// Mock responses
		(session as any).promptMultiline.mockResolvedValue({
			value: "This is a summary",
			quit: false,
		});

		const result = await session.start("Existing Feature");

		expect(result.featureName).toBe("Existing Feature");
		expect(result.title).toBe("Existing Feature");
		expect(result.summary).toBe("This is a summary");

		expect((session as any).prompt).not.toHaveBeenCalled();
	});
});
