import type React from "react";
import { useCallback, useEffect, useRef, useState } from "react";
import type { ChatMessage } from "./AlaskaChatMessageItem";

export const INITIAL_WELCOME_MSG: ChatMessage = {
	id: "welcome-1",
	role: "assistant",
	content:
		"Hello! I am **Alaska**, Bahauddin's AI assistant. Ask me anything about Bahauddin's skills, experience, portfolio projects, or technical stack!",
	timestamp: Date.now(),
};

export function useAlaskaChat(isOpen: boolean) {
	const [messages, setMessages] = useState<ChatMessage[]>([
		INITIAL_WELCOME_MSG,
	]);
	const [input, setInput] = useState("");
	const [isGenerating, setIsGenerating] = useState(false);
	const [autoScroll, setAutoScroll] = useState(true);
	const [showScrollButton, setShowScrollButton] = useState(false);

	const viewportRef = useRef<HTMLDivElement>(null);
	const inputRef = useRef<HTMLTextAreaElement>(null);
	const abortControllerRef = useRef<AbortController | null>(null);

	const checkIfAtBottom = useCallback(() => {
		const el = viewportRef.current;
		if (!el) return true;
		const threshold = 50;
		return el.scrollHeight - el.scrollTop - el.clientHeight <= threshold;
	}, []);

	const handleScroll = useCallback(() => {
		const isAtBottom = checkIfAtBottom();
		if (!isAtBottom) {
			setAutoScroll(false);
			setShowScrollButton(true);
		} else {
			setAutoScroll(true);
			setShowScrollButton(false);
		}
	}, [checkIfAtBottom]);

	const scrollToEnd = useCallback((behavior: ScrollBehavior = "smooth") => {
		const el = viewportRef.current;
		if (el) {
			el.scrollTo({
				top: el.scrollHeight,
				behavior,
			});
		}
	}, []);

	useEffect(() => {
		if (autoScroll && messages.length > 0) {
			scrollToEnd(isGenerating ? "auto" : "smooth");
		}
	}, [messages, autoScroll, isGenerating, scrollToEnd]);

	useEffect(() => {
		if (isOpen) {
			const timer = setTimeout(() => {
				inputRef.current?.focus();
			}, 100);
			return () => clearTimeout(timer);
		}
	}, [isOpen]);

	const handleJumpToLatest = () => {
		setAutoScroll(true);
		setShowScrollButton(false);
		scrollToEnd("smooth");
	};

	const handleClearChat = () => {
		if (isGenerating && abortControllerRef.current) {
			abortControllerRef.current.abort();
		}
		setIsGenerating(false);
		setMessages([INITIAL_WELCOME_MSG]);
		setAutoScroll(true);
		setShowScrollButton(false);
	};

	const handleSend = async (overridePrompt?: string) => {
		const promptToSend = (overridePrompt || input).trim();
		if (!promptToSend || isGenerating) return;

		setInput("");
		if (inputRef.current) {
			inputRef.current.style.height = "auto";
		}

		const userMsg: ChatMessage = {
			id: `user-${Date.now()}`,
			role: "user",
			content: promptToSend,
			timestamp: Date.now(),
		};

		const assistantMsgId = `assistant-${Date.now()}`;
		const placeholderAssistantMsg: ChatMessage = {
			id: assistantMsgId,
			role: "assistant",
			content: "",
			timestamp: Date.now(),
			isStreaming: true,
		};

		const updatedHistory = [...messages, userMsg];
		setMessages([...updatedHistory, placeholderAssistantMsg]);
		setAutoScroll(true);
		setIsGenerating(true);

		const controller = new AbortController();
		abortControllerRef.current = controller;

		try {
			const res = await fetch("/api/ai", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					prompt: promptToSend,
					messages: updatedHistory.map((m) => ({
						role: m.role,
						content: m.content,
					})),
				}),
				signal: controller.signal,
			});

			if (!res.ok) {
				let errMsg = `Error ${res.status}: Failed to reach Alaska service`;
				try {
					const errJson = (await res.json()) as { error?: string };
					if (errJson.error) errMsg = errJson.error;
				} catch {}
				throw new Error(errMsg);
			}

			if (!res.body) {
				throw new Error("No response stream received");
			}

			const reader = res.body.getReader();
			const decoder = new TextDecoder();
			let accumulatedText = "";
			let buffer = "";

			while (true) {
				const { done, value } = await reader.read();
				if (done) break;

				buffer += decoder.decode(value, { stream: true });
				const lines = buffer.split("\n");
				buffer = lines.pop() || "";

				for (const line of lines) {
					const trimmed = line.trim();
					if (trimmed.startsWith("data: ")) {
						const rawData = trimmed.slice(6).trim();
						if (rawData === "[DONE]") continue;

						try {
							const parsed = JSON.parse(rawData);
							const delta = parsed.choices?.[0]?.delta?.content || "";
							if (delta) {
								accumulatedText += delta;
								const currentText = accumulatedText;

								setMessages((prev) =>
									prev.map((msg) =>
										msg.id === assistantMsgId
											? { ...msg, content: currentText, isStreaming: true }
											: msg,
									),
								);
							}
						} catch {}
					}
				}
			}

			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === assistantMsgId
						? {
								...msg,
								content: accumulatedText || "No response received.",
								isStreaming: false,
							}
						: msg,
				),
			);
		} catch (err: unknown) {
			if (err instanceof DOMException && err.name === "AbortError") {
				return;
			}
			const errorMsg =
				err instanceof Error ? err.message : "Failed to contact Alaska service";
			setMessages((prev) =>
				prev.map((msg) =>
					msg.id === assistantMsgId
						? {
								...msg,
								content: errorMsg,
								isStreaming: false,
							}
						: msg,
				),
			);
		} finally {
			setIsGenerating(false);
			abortControllerRef.current = null;
		}
	};

	const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
		if (e.key === "Enter" && !e.shiftKey) {
			e.preventDefault();
			handleSend();
		}
	};

	return {
		messages,
		input,
		setInput,
		isGenerating,
		showScrollButton,
		viewportRef,
		inputRef,
		handleScroll,
		handleJumpToLatest,
		handleClearChat,
		handleSend,
		handleKeyDown,
	};
}
