import { describe, expect, it } from "vitest";
import { ToolParser } from "../../agent/parser.js";

describe("ToolParser", () => {
	it("should parse single tool call", () => {
		const text = `
I will update the file.
<write_file path="src/index.ts">
console.log("hello");
</write_file>
`;
		const calls = ToolParser.parse(text);
		expect(calls).toHaveLength(1);
		expect(calls[0]?.tool).toBe("write_file");
		expect(calls[0]?.args.path).toBe("src/index.ts");
		expect(calls[0]?.args.content?.trim()).toBe('console.log("hello");');
	});

	it("should parse multiple tool calls", () => {
		const text = `
<read_file path="src/a.ts" />
<run_command command="npm test" />
`;
		const calls = ToolParser.parse(text);
		expect(calls).toHaveLength(2);
		expect(calls[0]?.tool).toBe("read_file");
		expect(calls[1]?.tool).toBe("run_command");
	});

	it("should parse self-closing tags", () => {
		const text = '<list_files path="src" />';
		const calls = ToolParser.parse(text);
		expect(calls).toHaveLength(1);
		expect(calls[0]?.args.path).toBe("src");
	});

	it("should handle attributes with spaces", () => {
		const text = '<run_command command="echo hello world" />';
		const calls = ToolParser.parse(text);
		expect(calls[0]?.args.command).toBe("echo hello world");
	});
});
