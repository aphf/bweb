import { IconPaperPlane2Fill18 } from "nucleo-ui-essential-fill-18";
import type React from "react";
import { CharacterProgressRing } from "./CharacterProgressRing";

interface AlaskaInputBarProps {
	input: string;
	setInput: (val: string) => void;
	inputRef: React.RefObject<HTMLTextAreaElement | null>;
	isGenerating: boolean;
	onSend: () => void;
	onKeyDown: (e: React.KeyboardEvent<HTMLTextAreaElement>) => void;
}

export function AlaskaInputBar({
	input,
	setInput,
	inputRef,
	isGenerating,
	onSend,
	onKeyDown,
}: AlaskaInputBarProps) {
	return (
		<div className="p-2.5 bg-elegant-bg/90 border-t border-elegant-border shrink-0">
			<div className="relative flex items-center gap-2 bg-elegant-bg border border-elegant-border focus-within:border-elegant-text-primary rounded-xl px-2.5 py-1.5 transition-colors">
				<textarea
					ref={inputRef}
					rows={1}
					value={input}
					onChange={(e) => {
						setInput(e.target.value);
						e.target.style.height = "auto";
						e.target.style.height = `${Math.min(e.target.scrollHeight, 100)}px`;
					}}
					onKeyDown={onKeyDown}
					placeholder="Ask Alaska a question…"
					aria-label="Ask Alaska a question"
					disabled={isGenerating}
					className="w-full bg-transparent text-xs font-sans text-elegant-text-primary placeholder:text-elegant-text-muted outline-none resize-none max-h-24 py-1"
				/>
				<div className="flex items-center gap-1.5 shrink-0">
					<CharacterProgressRing length={input.length} />
					<button
						type="button"
						onClick={onSend}
						aria-label="Send message to Alaska"
						disabled={!input.trim() || isGenerating}
						className="flex size-7 items-center justify-center rounded-lg bg-elegant-text-primary text-elegant-bg disabled:opacity-30 disabled:cursor-not-allowed hover:opacity-90 active:scale-95 transition-[opacity,transform] cursor-pointer shrink-0"
					>
						<IconPaperPlane2Fill18 size={13} />
					</button>
				</div>
			</div>
		</div>
	);
}
