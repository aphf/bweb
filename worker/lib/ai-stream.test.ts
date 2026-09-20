import { describe, expect, it } from "vitest";
import {
	blockToText,
	chunkToSse,
	emptyStreamFallback,
	parseChatChunk,
} from "./ai-stream";

describe("blockToText", () => {
	it("passes strings through", () => {
		expect(blockToText("hi")).toBe("hi");
	});

	it("joins content-block arrays", () => {
		expect(
			blockToText([
				{ type: "text", text: "hi" },
				{ type: "text", text: " there" },
			]),
		).toBe("hi there");
	});

	it("reads .content on blocks and bare strings in arrays", () => {
		expect(blockToText(["a", { content: "b" }])).toBe("ab");
	});

	it("returns empty for numbers, null, and textless objects", () => {
		expect(blockToText(42)).toBe("");
		expect(blockToText(null)).toBe("");
		expect(blockToText(undefined)).toBe("");
		expect(blockToText([{ type: "image" }])).toBe("");
	});
});

describe("parseChatChunk", () => {
	it("extracts delta.content", () => {
		expect(
			parseChatChunk('{"choices":[{"delta":{"content":"Hello"}}]}'),
		).toMatchObject({ content: "Hello", reasoning: "", finishReason: null });
	});

	it("captures finish_reason alongside trailing content", () => {
		expect(
			parseChatChunk(
				'{"choices":[{"delta":{"content":"!"},"finish_reason":"stop"}]}',
			),
		).toMatchObject({ content: "!", finishReason: "stop" });
	});

	it("extracts reasoning deltas without content", () => {
		expect(
			parseChatChunk('{"choices":[{"delta":{"reasoning":"thinking"}}]}'),
		).toMatchObject({ content: "", reasoning: "thinking" });
	});

	it("extracts reasoning_content and array-shaped reasoning", () => {
		expect(
			parseChatChunk('{"choices":[{"delta":{"reasoning_content":"hmm"}}]}')
				?.reasoning,
		).toBe("hmm");
		expect(
			parseChatChunk(
				'{"choices":[{"delta":{"reasoning":[{"text":"a"},{"text":"b"}]}}]}',
			)?.reasoning,
		).toBe("ab");
	});

	it("handles message-shaped chunks", () => {
		expect(
			parseChatChunk('{"choices":[{"message":{"content":"Hi"}}]}')?.content,
		).toBe("Hi");
	});

	it("handles array-shaped content", () => {
		expect(
			parseChatChunk(
				'{"choices":[{"delta":{"content":[{"text":"x"},{"text":"y"}]}}]}',
			)?.content,
		).toBe("xy");
	});

	it("captures upstream error payloads sent with HTTP 200", () => {
		expect(
			parseChatChunk('{"error":{"message":"No provider available","code":502}}')
				?.upstreamError,
		).toBe("No provider available");
	});

	it("captures usage-only chunks", () => {
		expect(
			parseChatChunk(
				'{"choices":[],"usage":{"prompt_tokens":10,"completion_tokens":400,"cost":0.001}}',
			),
		).toMatchObject({
			content: "",
			promptTokens: 10,
			completionTokens: 400,
			cost: 0.001,
		});
	});

	it("returns null for [DONE], blank, garbage, and contentless chunks", () => {
		expect(parseChatChunk("[DONE]")).toBeNull();
		expect(parseChatChunk("")).toBeNull();
		expect(parseChatChunk("not json")).toBeNull();
		expect(parseChatChunk('{"foo":1}')).toBeNull();
		expect(parseChatChunk('{"choices":[{"delta":{}}]}')).toBeNull();
	});
});

describe("chunkToSse", () => {
	it("round-trips through parseChatChunk", () => {
		const sse = chunkToSse("héllo");
		expect(sse.startsWith("data: ")).toBe(true);
		expect(parseChatChunk(sse.slice("data: ".length).trim())?.content).toBe(
			"héllo",
		);
	});
});

describe("emptyStreamFallback", () => {
	it("prefers upstream errors", () => {
		expect(
			emptyStreamFallback({
				upstreamError: "boom",
				finishReason: "length",
				sawReasoning: true,
			}),
		).toContain("boom");
	});

	it("explains length cutoffs", () => {
		expect(
			emptyStreamFallback({
				upstreamError: "",
				finishReason: "length",
				sawReasoning: false,
			}),
		).toContain("cut off");
	});

	it("mentions reasoning when thinking was seen", () => {
		expect(
			emptyStreamFallback({
				upstreamError: "",
				finishReason: "stop",
				sawReasoning: true,
			}),
		).toContain("no answer text");
	});

	it("defaults to the empty-response message", () => {
		expect(
			emptyStreamFallback({
				upstreamError: "",
				finishReason: null,
				sawReasoning: false,
			}),
		).toContain("empty response");
	});
});
