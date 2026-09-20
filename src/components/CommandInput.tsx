import type React from "react";
import {
	forwardRef,
	useEffect,
	useImperativeHandle,
	useRef,
	useState,
} from "react";

interface CommandInputProps {
	promptPath: string;
	user: string;
	onSubmit: (command: string) => void;
	inputHistory: string[];
	onTabComplete?: (input: string) => string;
}

export interface CommandInputHandle {
	focus: () => void;
}

export const CommandInput = forwardRef<CommandInputHandle, CommandInputProps>(
	({ promptPath, user, onSubmit, inputHistory, onTabComplete }, ref) => {
		const [input, setInput] = useState("");
		const [historyIndex, setHistoryIndex] = useState(-1);
		const inputRef = useRef<HTMLInputElement>(null);

		useImperativeHandle(ref, () => ({
			focus: () => {
				inputRef.current?.focus();
			},
		}));

		useEffect(() => {
			const timer = setTimeout(() => {
				inputRef.current?.focus();
			}, 10);
			return () => clearTimeout(timer);
		}, []);

		const handleBlur = (e: React.FocusEvent<HTMLInputElement>) => {
			const related = e.relatedTarget as HTMLElement | null;
			if (
				related &&
				(related.tagName === "INPUT" ||
					related.tagName === "TEXTAREA" ||
					related.tagName === "BUTTON")
			) {
				return;
			}

			setTimeout(() => {
				const selection = window.getSelection();
				if (selection && selection.toString().length > 0) return;

				const active = document.activeElement as HTMLElement | null;
				if (
					active &&
					active !== document.body &&
					(active.tagName === "INPUT" || active.tagName === "TEXTAREA")
				) {
					return;
				}

				inputRef.current?.focus();
			}, 10);
		};

		const handleKeyDown = (e: React.KeyboardEvent) => {
			if (e.key === "Tab") {
				e.preventDefault();
				if (onTabComplete) {
					const completed = onTabComplete(input);
					if (completed !== input) {
						setInput(completed);
					}
				}
			} else if (e.key === "Enter") {
				onSubmit(input);
				setInput("");
				setHistoryIndex(-1);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				if (historyIndex < inputHistory.length - 1) {
					const newIndex = historyIndex + 1;
					setHistoryIndex(newIndex);
					setInput(inputHistory[inputHistory.length - 1 - newIndex] || "");
				}
			} else if (e.key === "ArrowDown") {
				e.preventDefault();
				if (historyIndex > 0) {
					const newIndex = historyIndex - 1;
					setHistoryIndex(newIndex);
					setInput(inputHistory[inputHistory.length - 1 - newIndex] || "");
				} else if (historyIndex === 0) {
					setHistoryIndex(-1);
					setInput("");
				}
			} else if (e.key === "c" && e.ctrlKey) {
				e.preventDefault();
				const ctrlCCmd = `${input}^C`;
				onSubmit(ctrlCCmd);
				setInput("");
			}
		};

		return (
			<div className="flex flex-wrap items-center w-full relative">
				<span className="text-elegant-accent mr-2 whitespace-nowrap shrink-0">
					{user}@neosphere:{promptPath}$
				</span>
				<div className="relative grow min-w-30">
					<div
						className="absolute inset-0 pointer-events-none whitespace-pre font-inherit"
						aria-hidden="true"
					>
						{(() => {
							const firstSpaceIndex = input.indexOf(" ");
							if (firstSpaceIndex === -1) {
								return (
									<span className="text-elegant-text-primary">{input}</span>
								);
							}

							const commandPart = input.substring(0, firstSpaceIndex);
							const argsPart = input.substring(firstSpaceIndex);

							if (commandPart === "login") {
								return (
									<>
										<span className="text-elegant-text-primary">
											{commandPart}
										</span>
										<span className="text-elegant-text-secondary" />
									</>
								);
							}

							return (
								<>
									<span className="text-elegant-text-primary">
										{commandPart}
									</span>
									<span className="text-elegant-text-secondary">
										{argsPart}
									</span>
								</>
							);
						})()}
					</div>

					{/* Input Layer */}
					<input
						ref={inputRef}
						type="text"
						name="command"
						aria-label={`Terminal input, ${user}@neosphere:${promptPath}`}
						className="w-full bg-transparent border-none outline-none font-inherit text-transparent caret-elegant-accent"
						value={input}
						onChange={(e) => setInput(e.target.value)}
						onKeyDown={handleKeyDown}
						onBlur={handleBlur}
						spellCheck={false}
						autoComplete="off"
					/>
				</div>
			</div>
		);
	},
);

CommandInput.displayName = "CommandInput";
