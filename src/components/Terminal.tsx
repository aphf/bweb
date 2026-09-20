import { AnimatePresence, m } from "motion/react";
import { useEffect, useRef, useState } from "react";
import { Rnd } from "react-rnd";
import { useLocation } from "react-router";
import type { TerminalMode } from "../App";
import { useTerminal } from "../hooks/useTerminal";
import type { CommandInputHandle } from "./CommandInput";
import { CommandInput } from "./CommandInput";
import { OutputDisplay } from "./OutputDisplay";
import { TerminalTopBar } from "./terminal/TerminalTopBar";

interface TerminalProps {
	terminalMode: TerminalMode;
	onMinimize: () => void;
	onMaximize: () => void;
	onRestore: () => void;
	onClose: () => void;
	zIndex?: number;
	onFocus?: () => void;
	isFocused?: boolean;
}

export const Terminal = ({
	terminalMode,
	onMinimize,
	onMaximize,
	onRestore,
	onClose,
	zIndex = 30,
	onFocus,
	isFocused = false,
}: TerminalProps) => {
	const {
		history,
		getPromptPath,
		execute,
		inputHistory,
		activeComponent,
		isInputVisible,
		handleTabCompletion,
		user,
	} = useTerminal({ onClose });

	const inputRef = useRef<CommandInputHandle>(null);
	const scrollContainerRef = useRef<HTMLDivElement>(null);
	const onCloseRef = useRef(onClose);
	useEffect(() => {
		onCloseRef.current = onClose;
	});

	const location = useLocation();
	const isHome =
		location.pathname === "/" || location.pathname === "/index.html";

	const isWindowed = terminalMode === "windowed";
	const isVisible = terminalMode !== "hidden" && !activeComponent && isHome;

	const [rndState, setRndState] = useState(() => {
		if (typeof window === "undefined") {
			return { x: 0, y: 0, width: 800, height: 600 };
		}
		if (window.innerWidth < 640) {
			const m = 8;
			const pw = window.innerWidth;
			const ph = window.innerHeight - 32;
			return {
				x: m,
				y: m,
				width: pw - m * 2,
				height: ph - m * 2,
			};
		}
		return {
			x: window.innerWidth * 0.1,
			y: window.innerHeight * 0.1,
			width: window.innerWidth * 0.8,
			height: window.innerHeight * 0.8,
		};
	});

	useEffect(() => {
		const handleResize = () => {
			if (window.innerWidth < 640) {
				const m = 8;
				const pw = window.innerWidth;
				const ph = window.innerHeight - 32;
				setRndState({
					x: m,
					y: m,
					width: pw - m * 2,
					height: ph - m * 2,
				});
			} else {
				setRndState({
					x: window.innerWidth * 0.1,
					y: window.innerHeight * 0.1,
					width: window.innerWidth * 0.8,
					height: window.innerHeight * 0.8,
				});
			}
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	useEffect(() => {
		if (!activeComponent) {
			document.title = "Bahauddin Alam - Full Stack Developer";
			const metaDesc = document.querySelector('meta[name="description"]');
			if (metaDesc)
				metaDesc.setAttribute(
					"content",
					"Bahauddin Alam is a Full Stack Developer specializing in React, JavaScript, TypeScript, Tailwind CSS, and Python. Explore his portfolio and projects.",
				);

			const canonical = document.querySelector('link[rel="canonical"]');
			if (canonical) canonical.setAttribute("href", "https://bahauddin.org");
		}
	}, [activeComponent]);

	useEffect(() => {
		const container = scrollContainerRef.current;
		if (!container) return;

		let isScrolling = false;
		const scrollToBottom = () => {
			if (isScrolling) return;
			isScrolling = true;
			requestAnimationFrame(() => {
				if (container) {
					container.scrollTop = container.scrollHeight;
				}
				isScrolling = false;
			});
		};

		const observer = new MutationObserver(scrollToBottom);
		observer.observe(container, {
			childList: true,
			subtree: true,
			characterData: true,
		});

		scrollToBottom();

		return () => observer.disconnect();
	}, []);

	useEffect(() => {
		if (!isVisible || !isInputVisible || !isFocused) return;

		const timer = setTimeout(() => {
			inputRef.current?.focus();
		}, 50);

		return () => clearTimeout(timer);
	}, [isVisible, isInputVisible, isFocused]);

	useEffect(() => {
		if (!isVisible || !isFocused) return;

		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				onCloseRef.current();
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isVisible, isFocused]);

	const handleContainerClick = () => {
		onFocus?.();
		const selection = window.getSelection();
		if (selection && selection.toString().length > 0) return;
		inputRef.current?.focus();
	};

	return (
		<>
			{activeComponent && (
				<dialog
					open
					aria-modal="true"
					aria-label="Terminal Application"
					className="fixed top-8 inset-x-0 bottom-0 z-50 bg-elegant-bg text-elegant-text-primary font-mono text-base p-4 overflow-hidden border-0 w-full h-[calc(100vh-2rem)] max-w-none max-h-none m-0"
				>
					{activeComponent}
				</dialog>
			)}

			<AnimatePresence>
				{isVisible && (
					<div
						className="fixed top-8 inset-x-0 bottom-0 pointer-events-none"
						style={{ zIndex }}
					>
						{isWindowed ? (
							<Rnd
								size={{ width: rndState.width, height: rndState.height }}
								position={{ x: rndState.x, y: rndState.y }}
								onDragStop={(_e: unknown, d: { x: number; y: number }) =>
									setRndState((prev: { width: number; height: number }) => ({
										...prev,
										x: d.x,
										y: d.y,
									}))
								}
								onResizeStop={(
									_e: unknown,
									_direction: unknown,
									ref: HTMLElement,
									_delta: unknown,
									position: { x: number; y: number },
								) => {
									setRndState({
										width: Number.parseFloat(ref.style.width),
										height: Number.parseFloat(ref.style.height),
										...position,
									});
								}}
								minWidth={320}
								minHeight={240}
								bounds="parent"
								dragHandleClassName="terminal-drag-handle"
								cancel=".no-drag"
								className="rounded-lg shadow-2xl shadow-black/60 border border-elegant-border bg-elegant-bg pointer-events-auto"
								onMouseDown={onFocus}
							>
								<div className="w-full h-full flex flex-col overflow-hidden rounded-lg">
									<TerminalTopBar
										user={user}
										dragHandle
										onMinimize={onMinimize}
										onMaximize={onMaximize}
										onClose={onClose}
									/>

									<div
										ref={scrollContainerRef}
										className="flex-1 min-h-0 p-4 overflow-y-auto font-mono text-lg font-medium cursor-auto bg-elegant-bg text-elegant-text-primary"
										onPointerDown={handleContainerClick}
									>
										<div className="max-w-5xl mx-auto">
											<OutputDisplay history={history} />
											{isInputVisible && (
												<CommandInput
													ref={inputRef}
													promptPath={getPromptPath()}
													user={user}
													onSubmit={execute}
													inputHistory={inputHistory}
													onTabComplete={handleTabCompletion}
												/>
											)}
										</div>
									</div>
								</div>
							</Rnd>
						) : (
							<m.div
								layoutId="terminal-maximized"
								className="pointer-events-auto fixed top-8 inset-x-0 bottom-0 w-full h-[calc(100vh-2rem)] bg-elegant-bg flex flex-col overflow-hidden"
								style={{ zIndex }}
							>
								<TerminalTopBar
									user={user}
									isMaximized
									onMinimize={onMinimize}
									onRestore={onRestore}
									onClose={onClose}
								/>

								<div
									ref={scrollContainerRef}
									className="flex-1 min-h-0 p-4 overflow-y-auto font-mono text-lg font-medium bg-elegant-bg text-elegant-text-primary"
									onPointerDown={handleContainerClick}
								>
									<div className="max-w-5xl mx-auto">
										<OutputDisplay history={history} />
										{isInputVisible && (
											<CommandInput
												ref={inputRef}
												promptPath={getPromptPath()}
												user={user}
												onSubmit={execute}
												inputHistory={inputHistory}
												onTabComplete={handleTabCompletion}
											/>
										)}
									</div>
								</div>
							</m.div>
						)}
					</div>
				)}
			</AnimatePresence>
		</>
	);
};
