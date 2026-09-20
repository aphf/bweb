import { Minus, X } from "lucide-react";
import {
	IconImageMountainFill18,
	IconTrashFill18,
} from "nucleo-ui-essential-fill-18";

interface AlaskaHeaderProps {
	onClearChat: () => void;
	onMinimize?: () => void;
	onClose: () => void;
}

export function AlaskaHeader({
	onClearChat,
	onMinimize,
	onClose,
}: AlaskaHeaderProps) {
	return (
		<div className="alaska-drag-handle flex items-center justify-between px-3.5 py-2.5 bg-elegant-bg/80 border-b border-elegant-border select-none shrink-0 cursor-grab active:cursor-grabbing">
			<div className="flex items-center gap-2 pointer-events-none">
				<div className="flex items-center justify-center size-7 rounded-full bg-elegant-border/60 text-elegant-text-primary">
					<IconImageMountainFill18 size={16} />
				</div>
				<div className="flex items-center gap-1.5 leading-none">
					<span className="text-xs font-bold text-elegant-text-primary tracking-wide">
						Alaska
					</span>
					<span className="flex size-2 rounded-full bg-emerald-500 animate-pulse" />
				</div>
			</div>

			{/* Top Bar Actions */}
			<div className="flex items-center gap-1 no-drag">
				<button
					type="button"
					onClick={onClearChat}
					aria-label="Clear chat history"
					className="group relative flex size-7 items-center justify-center rounded-lg hover:bg-elegant-border/50 text-elegant-text-muted hover:text-elegant-text-primary transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent"
				>
					<IconTrashFill18 size={14} />
					<span
						role="tooltip"
						className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 rounded-md bg-elegant-card/95 border border-elegant-border px-2 py-0.5 text-[11px] font-mono font-medium text-elegant-text-primary shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-[transform,opacity] duration-150 -translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0 whitespace-nowrap z-50 select-none"
					>
						Clear Chat
					</span>
				</button>
				{onMinimize && (
					<button
						type="button"
						onClick={onMinimize}
						aria-label="Minimize Alaska window"
						className="group relative flex size-7 items-center justify-center rounded-lg hover:bg-elegant-border/50 text-elegant-text-muted hover:text-elegant-text-primary transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent"
					>
						<Minus size={14} />
						<span
							role="tooltip"
							className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 rounded-md bg-elegant-card/95 border border-elegant-border px-2 py-0.5 text-[11px] font-mono font-medium text-elegant-text-primary shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-[transform,opacity] duration-150 -translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0 whitespace-nowrap z-50 select-none"
						>
							Minimize
						</span>
					</button>
				)}
				<button
					type="button"
					onClick={onClose}
					aria-label="Close Alaska window"
					className="group relative flex size-7 items-center justify-center rounded-lg hover:bg-red-500/20 text-elegant-text-muted hover:text-red-500 transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-red-400"
				>
					<X size={14} />
					<span
						role="tooltip"
						className="pointer-events-none absolute top-8 right-0 rounded-md bg-elegant-card/95 border border-elegant-border px-2 py-0.5 text-[11px] font-mono font-medium text-elegant-text-primary shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-[transform,opacity] duration-150 -translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0 whitespace-nowrap z-50 select-none"
					>
						Close
					</span>
				</button>
			</div>
		</div>
	);
}
