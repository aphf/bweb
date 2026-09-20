import { ArrowDown } from "lucide-react";
import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { Rnd } from "react-rnd";
import {
	AlaskaChatMessageItem,
	type ChatMessage,
} from "./alaska/AlaskaChatMessageItem";
import { AlaskaHeader } from "./alaska/AlaskaHeader";
import { AlaskaInputBar } from "./alaska/AlaskaInputBar";
import { AlaskaSuggestedPrompts } from "./alaska/AlaskaSuggestedPrompts";
import { useAlaskaChat } from "./alaska/useAlaskaChat";

export type { ChatMessage };

interface AlaskaWindowProps {
	isOpen: boolean;
	onClose: () => void;
	onMinimize?: () => void;
	zIndex?: number;
	onFocus?: () => void;
}

export function AlaskaWindow({
	isOpen,
	onClose,
	onMinimize,
	zIndex = 30,
	onFocus,
}: AlaskaWindowProps) {
	const isMobile = typeof window !== "undefined" && window.innerWidth < 640;

	const {
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
	} = useAlaskaChat(isOpen);

	const [rndState, setRndState] = useState(() => {
		const w = typeof window !== "undefined" ? window.innerWidth : 1200;
		const h = typeof window !== "undefined" ? window.innerHeight : 800;
		const mobile = w < 640;
		const initW = mobile ? Math.max(280, Math.min(w - 24, 420)) : 420;
		const initH = mobile ? Math.max(340, Math.min(h - 130, 540)) : 540;
		return {
			x: mobile ? Math.max(12, (w - initW) / 2) : Math.max(20, w - initW - 28),
			y: mobile ? 50 : Math.max(45, (h - initH) / 2),
			width: initW,
			height: initH,
		};
	});

	if (!isOpen) return null;

	return (
		<AnimatePresence>
			{isOpen && (
				<Rnd
					size={{ width: rndState.width, height: rndState.height }}
					position={{ x: rndState.x, y: rndState.y }}
					onResizeStop={(_e, _dir, ref, _delta, pos) => {
						setRndState((prev) => ({
							...prev,
							width: Number.parseInt(ref.style.width, 10),
							height: Number.parseInt(ref.style.height, 10),
							...pos,
						}));
					}}
					onDragStop={(_e, d) => {
						setRndState((prev) => ({
							...prev,
							x: d.x,
							y: d.y,
						}));
					}}
					dragHandleClassName="alaska-drag-handle"
					cancel=".no-drag"
					minWidth={isMobile ? 280 : 320}
					minHeight={isMobile ? 260 : 340}
					bounds="window"
					style={{ zIndex }}
					onMouseDown={onFocus}
				>
					<m.div
						initial={{ opacity: 0, scale: 0.95, y: 15 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.95, y: 15 }}
						transition={{ duration: 0.18, ease: "easeOut" }}
						className="w-full h-full flex flex-col rounded-2xl bg-elegant-card/95 border border-elegant-border shadow-2xl backdrop-blur-xl overflow-hidden font-mono text-elegant-text-primary pointer-events-auto"
						aria-label="Alaska Chat Window"
						onMouseDown={onFocus}
					>
						<AlaskaHeader
							onClearChat={handleClearChat}
							onMinimize={onMinimize}
							onClose={onClose}
						/>

						{/* Chat Message Scroller Viewport */}
						<div
							ref={viewportRef}
							onScroll={handleScroll}
							className="relative flex-1 overflow-y-auto p-3.5 space-y-3.5 scroll-smooth mask-[linear-gradient(to_bottom,transparent_0,black_14px,black_calc(100%-14px),transparent_100%)] [-webkit-mask-image:linear-gradient(to_bottom,transparent_0,black_14px,black_calc(100%-14px),transparent_100%)]"
						>
							{messages.map((msg) => (
								<AlaskaChatMessageItem key={msg.id} msg={msg} />
							))}

							{messages.length === 1 && (
								<AlaskaSuggestedPrompts onSelect={(p) => handleSend(p)} />
							)}
						</div>

						{/* Following Live Edge Floating Action Button */}
						<AnimatePresence>
							{showScrollButton && (
								<m.div
									initial={{ opacity: 0, y: 10, scale: 0.9 }}
									animate={{ opacity: 1, y: 0, scale: 1 }}
									exit={{ opacity: 0, y: 10, scale: 0.9 }}
									className="absolute bottom-16 right-4 z-10"
								>
									<button
										type="button"
										onClick={handleJumpToLatest}
										className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-elegant-text-primary text-elegant-bg text-[11px] font-bold shadow-lg hover:scale-105 active:scale-95 transition-[transform,box-shadow] cursor-pointer"
									>
										<ArrowDown size={13} />
										<span>Jump to latest</span>
									</button>
								</m.div>
							)}
						</AnimatePresence>

						<AlaskaInputBar
							input={input}
							setInput={setInput}
							inputRef={inputRef}
							isGenerating={isGenerating}
							onSend={() => handleSend()}
							onKeyDown={handleKeyDown}
						/>
					</m.div>
				</Rnd>
			)}
		</AnimatePresence>
	);
}
