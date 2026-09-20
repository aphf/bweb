import type React from "react";
import { useEffect, useRef, useState } from "react";

interface NanoProps {
	filename?: string;
	initialContent: string;
	onSaveAs: (
		filename: string,
		content: string,
		commitMsg?: string,
		authorName?: string,
	) => Promise<void> | void;
	onExit: () => void;
}

export const Nano = ({
	filename: initialFilename,
	initialContent,
	onSaveAs,
	onExit,
}: NanoProps) => {
	const [content, setContent] = useState(initialContent);
	const [filename, setFilename] = useState(initialFilename);
	const [message, setMessage] = useState("");
	const [isPromptingSave, setIsPromptingSave] = useState(false);
	const [savePromptValue, setSavePromptValue] = useState("");
	const [exitAttempt, setExitAttempt] = useState(false);
	const [isModified, setIsModified] = useState(false);
	const textareaRef = useRef<HTMLTextAreaElement>(null);
	const promptInputRef = useRef<HTMLInputElement>(null);
	const commitMsgRef = useRef<string>("");

	useEffect(() => {
		if (exitAttempt) {
			const timer = setTimeout(() => setExitAttempt(false), 3000);
			return () => clearTimeout(timer);
		}
	}, [exitAttempt]);

	useEffect(() => {
		if (textareaRef.current && !isPromptingSave) {
			textareaRef.current.focus();
		}
	}, [isPromptingSave]);

	useEffect(() => {
		if (isPromptingSave && promptInputRef.current) {
			promptInputRef.current.focus();
		}
	}, [isPromptingSave]);

	const handleExitRequest = () => {
		if (!isModified || exitAttempt) {
			onExit();
		} else {
			setExitAttempt(true);
			setMessage("[ Buffer modified? Press ^X again to discard and exit ]");
			setTimeout(() => {
				if (!isPromptingSave) setMessage("");
			}, 3000);
		}
	};

	const handleSave = async () => {
		setIsPromptingSave(true);
		setSavePromptValue(filename || "");
		setMessage("File Name to Write: ");
	};

	const handleKeyDown = (e: React.KeyboardEvent) => {
		if (isPromptingSave) return;

		if (e.ctrlKey) {
			if (e.key === "o") {
				e.preventDefault();
				handleSave();
			} else if (e.key === "x") {
				e.preventDefault();
				handleExitRequest();
			}
		} else {
			if (exitAttempt) setExitAttempt(false);
		}
	};

	const handlePromptKeyDown = async (e: React.KeyboardEvent) => {
		if (e.ctrlKey && e.key === "x") {
			e.preventDefault();
			if (exitAttempt) {
				onExit();
			} else {
				setExitAttempt(true);
				const prevMessage = message;
				setMessage("[ Press ^X again to force exit ]");
				setTimeout(() => {
					setMessage(prevMessage);
				}, 2000);
			}
			return;
		}

		if (exitAttempt) setExitAttempt(false);

		if (e.key === "Enter") {
			e.preventDefault();
			if (message.startsWith("File Name to Write:")) {
				if (savePromptValue.trim()) {
					setFilename(savePromptValue);
					setMessage("Commit Message (Optional): ");
					setSavePromptValue("");
				} else {
					setMessage("[ Cancelled ]");
					setIsPromptingSave(false);
					setTimeout(() => setMessage(""), 2000);
				}
			} else if (message.startsWith("Commit Message (Optional):")) {
				const commitMsg = savePromptValue.trim();
				commitMsgRef.current = commitMsg;
				setMessage("Author Name (Optional): ");
				setSavePromptValue("");
			} else if (message.startsWith("Author Name (Optional):")) {
				const authorName = savePromptValue.trim();
				const commitMsg = commitMsgRef.current;

				if (!filename) {
					setMessage("[ Error: No filename specified ]");
					setTimeout(() => setMessage(""), 2000);
					return;
				}

				try {
					await onSaveAs(filename, content, commitMsg, authorName);
					setIsPromptingSave(false);
					setIsModified(false);
					setMessage(`[ Wrote ${content.split("\n").length} lines ]`);
				} catch (e: unknown) {
					setMessage(
						`[ Error: ${e instanceof Error ? e.message : "Unknown error"} ]`,
					);
				}
				setTimeout(() => setMessage(""), 2000);
			}
		} else if (e.key === "Escape" || (e.ctrlKey && e.key === "c")) {
			e.preventDefault();
			setIsPromptingSave(false);
			setMessage("[ Cancelled ]");
			setTimeout(() => setMessage(""), 2000);
		}
	};

	return (
		<div className="flex flex-col h-full bg-elegant-bg text-elegant-text-primary font-mono text-sm absolute inset-0 z-50">
			<div className="bg-elegant-accent text-elegant-bg px-2 py-1 relative flex items-center justify-center font-bold">
				<span className="absolute left-2">GNU nano 5.4</span>
				<span>{filename || "New Buffer"}</span>
				<span className="absolute right-2">{isModified ? "Modified" : ""}</span>
			</div>

			<textarea
				ref={textareaRef}
				aria-label="Nano editor content"
				value={content}
				onChange={(e) => {
					setContent(e.target.value);
					if (!isModified) setIsModified(true);
				}}
				onKeyDown={handleKeyDown}
				className="grow bg-elegant-bg text-elegant-text-primary p-2 outline-none resize-none border-none font-inherit"
				spellCheck={false}
				disabled={isPromptingSave}
			/>

			<div className="px-2 py-1 min-h-[1.5em] bg-elegant-bg text-elegant-text-primary flex items-center">
				{isPromptingSave ? (
					<div className="flex w-full">
						<span className="whitespace-nowrap mr-2">{message}</span>
						<input
							ref={promptInputRef}
							type="text"
							aria-label="File name to write"
							value={savePromptValue}
							onChange={(e) => setSavePromptValue(e.target.value)}
							onKeyDown={handlePromptKeyDown}
							className="bg-elegant-card text-elegant-text-primary grow outline-none px-1"
						/>
					</div>
				) : (
					message
				)}
			</div>

			<div className="grid grid-cols-2 sm:grid-cols-4 gap-2 px-2 py-1 bg-elegant-bg text-elegant-text-primary select-none">
				<button
					type="button"
					className="text-left hover:bg-elegant-card transition-colors cursor-pointer rounded px-1"
				>
					<span className="bg-elegant-accent text-elegant-bg px-1 font-bold mr-1">
						^G
					</span>{" "}
					Get Help
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						handleSave();
					}}
					className="text-left hover:bg-elegant-card transition-colors cursor-pointer rounded px-1"
				>
					<span className="bg-elegant-accent text-elegant-bg px-1 font-bold mr-1">
						^O
					</span>{" "}
					Write Out
				</button>
				<button
					type="button"
					className="text-left hover:bg-elegant-card transition-colors cursor-pointer rounded px-1"
				>
					<span className="bg-elegant-accent text-elegant-bg px-1 font-bold mr-1">
						^W
					</span>{" "}
					Where Is
				</button>
				<button
					type="button"
					className="text-left hover:bg-elegant-card transition-colors cursor-pointer rounded px-1"
				>
					<span className="bg-elegant-accent text-elegant-bg px-1 font-bold mr-1">
						^K
					</span>{" "}
					Cut Text
				</button>
				<button
					type="button"
					onClick={(e) => {
						e.preventDefault();
						handleExitRequest();
					}}
					className="text-left hover:bg-elegant-card transition-colors cursor-pointer rounded px-1"
				>
					<span className="bg-elegant-accent text-elegant-bg px-1 font-bold mr-1">
						^X
					</span>{" "}
					Exit
				</button>
				<button
					type="button"
					className="text-left hover:bg-elegant-card transition-colors cursor-pointer rounded px-1"
				>
					<span className="bg-elegant-accent text-elegant-bg px-1 font-bold mr-1">
						^R
					</span>{" "}
					Read File
				</button>
				<button
					type="button"
					className="text-left hover:bg-elegant-card transition-colors cursor-pointer rounded px-1"
				>
					<span className="bg-elegant-accent text-elegant-bg px-1 font-bold mr-1">
						^\
					</span>{" "}
					Replace
				</button>
				<button
					type="button"
					className="text-left hover:bg-elegant-card transition-colors cursor-pointer rounded px-1"
				>
					<span className="bg-elegant-accent text-elegant-bg px-1 font-bold mr-1">
						^U
					</span>{" "}
					Uncut Text
				</button>
			</div>
		</div>
	);
};
