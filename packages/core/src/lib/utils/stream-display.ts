import { Separator, Text } from "@/lib/ui/components";

/**
 * Utility to display streaming LLM responses
 */
export class StreamDisplay {
	private isFirstChunk = true;
	private contentBuffer = "";

	constructor(private label?: string) {}

	/**
	 * Handle a chunk of text from the stream
	 */
	handleChunk(chunk: string): void {
		if (this.isFirstChunk) {
			if (this.label) {
				console.log(Text.section(this.label));
				console.log(Separator.light(60));
			}
			this.isFirstChunk = false;
		}

		process.stdout.write(chunk);
		this.contentBuffer += chunk;
	}

	/**
	 * Finish the stream display
	 */
	finish(): void {
		// Ensure we end with a newline
		if (this.contentBuffer.length > 0 && !this.contentBuffer.endsWith("\n")) {
			process.stdout.write("\n");
		}

		if (this.label) {
			console.log(Separator.light(60));
		}
	}

	/**
	 * Reset the display state
	 */
	reset(): void {
		this.isFirstChunk = true;
		this.contentBuffer = "";
	}
}
