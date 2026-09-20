import React, {
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import type { Command } from "./types";

const CODE_SNIPPETS = [
	'const neosphere = await launchOS({ mode: "future", stealth: true });',
	"function optimizeKernel(system: OS): SystemState { return system.tune(); }",
	'git commit -m "feat: add Alaska openrouter agent stream & desktop icon"',
	'import { useState, useEffect } from "react"; export default function App() {}',
	'const response = await fetch("/api/ai", { method: "POST", body });',
];

function TypingTestComponent() {
	const [snippetIndex, setSnippetIndex] = useState(0);
	const targetText = CODE_SNIPPETS[snippetIndex];
	const [userInput, setUserInput] = useState("");
	const [startTime, setStartTime] = useState<number | null>(null);
	const [endTime, setEndTime] = useState<number | null>(null);
	const inputRef = useRef<HTMLInputElement>(null);

	useEffect(() => {
		inputRef.current?.focus();
	}, []);

	const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
		const val = e.target.value;
		if (startTime === null && val.length > 0) {
			setStartTime(Date.now());
		}

		setUserInput(val);

		if (val.length >= targetText.length) {
			setEndTime(Date.now());
		}
	};

	const isCompleted = userInput.length >= targetText.length;
	const durationSeconds =
		startTime && (endTime || Date.now())
			? Math.max(1, (endTime || Date.now()) - startTime) / 1000
			: 0;

	const wordsCount = targetText.length / 5;
	const wpm =
		durationSeconds > 0 ? Math.round((wordsCount / durationSeconds) * 60) : 0;

	let correctChars = 0;
	for (let i = 0; i < userInput.length; i++) {
		if (userInput[i] === targetText[i]) correctChars++;
	}
	const accuracy =
		userInput.length > 0
			? Math.round((correctChars / userInput.length) * 100)
			: 100;

	const handleNextSnippet = () => {
		setSnippetIndex((prev) => (prev + 1) % CODE_SNIPPETS.length);
		setUserInput("");
		setStartTime(null);
		setEndTime(null);
		setTimeout(() => inputRef.current?.focus(), 50);
	};

	const charItems = useMemo(
		() =>
			targetText.split("").map((char, index) => ({
				id: `snippet-${snippetIndex}-pos-${index}`,
				char,
				index,
			})),
		[targetText, snippetIndex],
	);

	return (
		<div className="flex flex-col gap-3 font-mono text-sm max-w-xl py-2 bg-elegant-card p-3.5 rounded-lg border border-elegant-border shadow-xs">
			<div className="flex items-center justify-between text-xs text-elegant-text-secondary border-b border-elegant-border pb-2">
				<span className="font-bold text-emerald-600 dark:text-emerald-400">
					Terminal Typing Test
				</span>

				<div className="flex items-center gap-3 font-mono">
					<span>
						WPM: <strong className="text-elegant-text-primary">{wpm}</strong>
					</span>
					<span>
						Acc:{" "}
						<strong className="text-elegant-text-primary">{accuracy}%</strong>
					</span>
					<span>
						Time:{" "}
						<strong className="text-elegant-text-primary">
							{durationSeconds.toFixed(1)}s
						</strong>
					</span>
				</div>
			</div>

			{/* Target Snippet */}
			<div className="p-3 rounded bg-elegant-bg/60 border border-elegant-border font-mono text-base leading-relaxed tracking-wide select-none">
				{charItems.map((item) => {
					let charColor = "text-elegant-text-muted";
					if (item.index < userInput.length) {
						charColor =
							userInput[item.index] === item.char
								? "text-emerald-600 dark:text-emerald-400 bg-emerald-500/10 font-semibold"
								: "text-red-500 dark:text-red-400 bg-red-500/15 underline";
					} else if (item.index === userInput.length) {
						charColor =
							"text-elegant-text-primary underline decoration-emerald-500 animate-pulse font-bold";
					}
					return (
						<span key={item.id} className={charColor}>
							{item.char}
						</span>
					);
				})}
			</div>

			{/* Interactive Input */}
			{!isCompleted ? (
				<input
					ref={inputRef}
					type="text"
					value={userInput}
					onChange={handleChange}
					aria-label="Typing test input"
					placeholder="Type the snippet above here..."
					className="w-full px-3 py-2 rounded bg-elegant-card border border-elegant-border text-elegant-text-primary placeholder:text-elegant-text-muted font-mono text-sm outline-none focus:border-emerald-500 transition-colors"
					autoCapitalize="none"
					autoComplete="off"
					spellCheck={false}
				/>
			) : (
				<div className="flex items-center justify-between bg-emerald-500/10 border border-emerald-500/30 p-2.5 rounded text-xs">
					<span className="text-emerald-600 dark:text-emerald-400 font-semibold">
						🎉 Challenge Completed! Speed: {wpm} WPM | Accuracy: {accuracy}%
					</span>
					<button
						type="button"
						onClick={handleNextSnippet}
						className="px-3 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-bold transition-colors cursor-pointer"
					>
						Next Snippet →
					</button>
				</div>
			)}
		</div>
	);
}

function HistoryViewerComponent({ inputHistory }: { inputHistory?: string[] }) {
	const historyList = useMemo(
		() => (inputHistory && inputHistory.length > 0 ? inputHistory : ["help"]),
		[inputHistory],
	);

	const [limit, setLimit] = useState(10);
	const hasMore = limit < historyList.length;

	const handleLoadMore = useCallback(() => {
		setLimit((prev) => Math.min(prev + 10, historyList.length));
	}, [historyList.length]);

	useEffect(() => {
		if (!hasMore) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Enter" || e.key === " ") {
				e.preventDefault();
				setLimit((prev) => Math.min(prev + 10, historyList.length));
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [hasMore, historyList.length]);

	const historyItems = useMemo(
		() =>
			historyList.map((cmd, i) => ({
				id: `hist-item-${i}-${cmd}`,
				cmd,
				num: String(i + 1).padStart(4, " "),
			})),
		[historyList],
	);

	return (
		<div className="flex flex-col gap-1 font-mono text-sm py-1 max-w-xl text-elegant-text-primary">
			{historyItems.slice(0, limit).map((item) => (
				<div key={item.id} className="flex items-center gap-3 py-0.5">
					<span className="text-elegant-text-muted w-10 text-right font-mono select-none">
						{item.num}
					</span>
					<span className="font-mono text-emerald-600 dark:text-emerald-400 font-medium">
						{item.cmd}
					</span>
				</div>
			))}

			{hasMore && (
				<button
					type="button"
					onClick={handleLoadMore}
					className="mt-2 py-1 px-3 rounded bg-elegant-card border border-elegant-border text-xs text-elegant-text-secondary hover:text-emerald-500 font-mono transition-colors text-left flex items-center justify-between cursor-pointer"
				>
					<span>
						-- More ({limit}/{historyList.length}) [Press Enter or Space for
						more] --
					</span>
					<span className="text-emerald-600 dark:text-emerald-400 font-semibold">
						Press Enter ↵
					</span>
				</button>
			)}
		</div>
	);
}

export const interactiveCommands: Record<string, Command> = {
	"typing-test": {
		description: "Start an interactive terminal typing speed test",
		usage: "typing-test",
		execute: () => <TypingTestComponent />,
	},
	history: {
		description: "Display command history line by line (paginated)",
		usage: "history",
		execute: (_args, { inputHistory }) => (
			<HistoryViewerComponent inputHistory={inputHistory} />
		),
	},
	stats: {
		description: "Alias for history",
		usage: "stats",
		execute: (args, context) =>
			interactiveCommands.history.execute(args, context),
	},
};
