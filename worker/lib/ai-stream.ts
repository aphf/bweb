export interface ParsedChatChunk {
	content: string;
	reasoning: string;
	finishReason: string | null;
	upstreamError: string;
	promptTokens: number;
	completionTokens: number;
	cost: number;
}

export function blockToText(value: unknown): string {
	if (typeof value === "string") return value;
	if (Array.isArray(value)) {
		let out = "";
		for (const block of value) {
			if (typeof block === "string") {
				out += block;
			} else if (block && typeof block === "object") {
				const b = block as Record<string, unknown>;
				if (typeof b.text === "string") out += b.text;
				else if (typeof b.content === "string") out += b.content;
			}
		}
		return out;
	}
	return "";
}

interface RawChoice {
	delta?: Record<string, unknown> | null;
	message?: Record<string, unknown> | null;
	finish_reason?: unknown;
}

interface RawUsage {
	prompt_tokens?: unknown;
	completion_tokens?: unknown;
	cost?: unknown;
}

interface RawChunk {
	choices?: unknown;
	usage?: unknown;
	error?: unknown;
}

function num(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

export function parseChatChunk(rawData: string): ParsedChatChunk | null {
	const trimmed = rawData.trim();
	if (!trimmed || trimmed === "[DONE]") return null;
	let parsed: RawChunk;
	try {
		parsed = JSON.parse(trimmed) as RawChunk;
	} catch {
		return null;
	}
	if (!parsed || typeof parsed !== "object") return null;

	let upstreamError = "";
	const err = parsed.error;
	if (typeof err === "string") {
		upstreamError = err;
	} else if (err && typeof err === "object") {
		const message = (err as { message?: unknown }).message;
		if (typeof message === "string") upstreamError = message;
	}

	let content = "";
	let reasoning = "";
	let finishReason: string | null = null;
	const choices = Array.isArray(parsed.choices) ? parsed.choices : [];
	const choice = (choices[0] ?? {}) as RawChoice;
	const part = choice.delta ?? choice.message;
	if (part && typeof part === "object") {
		content = blockToText(part.content ?? part.text);
		reasoning = blockToText(
			part.reasoning_content ?? part.reasoning ?? part.reasoning_details,
		);
	}
	if (typeof choice.finish_reason === "string") {
		finishReason = choice.finish_reason;
	}

	let promptTokens = 0;
	let completionTokens = 0;
	let cost = 0;
	let hasUsage = false;
	if (parsed.usage && typeof parsed.usage === "object") {
		const usage = parsed.usage as RawUsage;
		promptTokens = num(usage.prompt_tokens);
		completionTokens = num(usage.completion_tokens);
		cost = num(usage.cost);
		hasUsage =
			typeof usage.prompt_tokens === "number" ||
			typeof usage.completion_tokens === "number" ||
			typeof usage.cost === "number";
	}

	if (!content && !reasoning && !finishReason && !upstreamError && !hasUsage) {
		return null;
	}
	return {
		content,
		reasoning,
		finishReason,
		upstreamError,
		promptTokens,
		completionTokens,
		cost,
	};
}

export function chunkToSse(content: string): string {
	return `data: ${JSON.stringify({ choices: [{ delta: { content } }] })}\n\n`;
}

export function emptyStreamFallback(opts: {
	upstreamError: string;
	finishReason: string | null;
	sawReasoning: boolean;
}): string {
	if (opts.upstreamError) {
		return `Alaska hit an upstream error: ${opts.upstreamError.slice(0, 300)}`;
	}
	if (opts.finishReason === "length") {
		return "Alaska's answer was cut off by the token limit. Please ask a shorter question.";
	}
	if (opts.sawReasoning) {
		return `Alaska returned no answer text (finish: ${opts.finishReason ?? "unknown"}). Please try again.`;
	}
	return "Alaska returned an empty response. Please try again.";
}
