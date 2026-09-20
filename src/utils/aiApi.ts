export async function streamAiResponse(
	prompt: string,
	signal: AbortSignal,
	onChunk: (text: string) => void,
	onComplete: (text: string) => void,
	onError: (error: string) => void,
) {
	try {
		const res = await fetch("/api/ai", {
			method: "POST",
			headers: { "Content-Type": "application/json" },
			body: JSON.stringify({ prompt }),
			signal,
		});

		if (signal.aborted) return;

		if (!res.ok) {
			let errMsg = `HTTP error ${res.status}`;
			try {
				const errJson = (await res.json()) as { error?: string };
				if (errJson.error) errMsg = errJson.error;
			} catch {}
			onError(errMsg);
			return;
		}

		if (!res.body) {
			onError("No response stream received");
			return;
		}

		const reader = res.body.getReader();
		const decoder = new TextDecoder();
		let accumulatedText = "";
		let buffer = "";

		while (true) {
			if (signal.aborted) break;
			const { done, value } = await reader.read();
			if (done || signal.aborted) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split("\n");
			buffer = lines.pop() || "";

			for (const line of lines) {
				if (signal.aborted) break;
				const trimmedLine = line.trim();
				if (trimmedLine.startsWith("data: ")) {
					const rawData = trimmedLine.slice(6).trim();
					if (rawData === "[DONE]") continue;

					try {
						const parsed = JSON.parse(rawData);
						const delta = parsed.choices?.[0]?.delta?.content || "";
						if (delta) {
							accumulatedText += delta;
							onChunk(accumulatedText);
						}
					} catch {}
				}
			}
		}

		if (signal.aborted) return;

		if (buffer.trim().startsWith("data: ")) {
			const rawData = buffer.trim().slice(6).trim();
			if (rawData !== "[DONE]") {
				try {
					const parsed = JSON.parse(rawData);
					const delta = parsed.choices?.[0]?.delta?.content || "";
					if (delta) accumulatedText += delta;
				} catch {}
			}
		}

		onComplete(accumulatedText || "No response received from Alaska.");
	} catch (e: unknown) {
		if (
			!signal.aborted &&
			!(e instanceof DOMException && e.name === "AbortError")
		) {
			const errMsg =
				e instanceof Error ? e.message : "Failed to contact Alaska service";
			onError(errMsg);
		}
	}
}
