import { Maximize2, Minus, Square, X } from "lucide-react";

interface TerminalTopBarProps {
	user: string;
	isMaximized?: boolean;
	onMinimize: () => void;
	onMaximize?: () => void;
	onRestore?: () => void;
	onClose: () => void;
	dragHandle?: boolean;
}

export function TerminalTopBar({
	user,
	isMaximized = false,
	onMinimize,
	onMaximize,
	onRestore,
	onClose,
	dragHandle = false,
}: TerminalTopBarProps) {
	return (
		<div
			className={`${
				dragHandle
					? "terminal-drag-handle cursor-grab active:cursor-grabbing"
					: ""
			} w-full h-10 bg-elegant-card flex items-center px-4 justify-between border-b border-elegant-border shrink-0 select-none relative z-20`}
		>
			<div className="text-elegant-text-secondary text-sm md:text-base font-medium font-mono truncate max-w-[60%] pointer-events-none">
				{user}@neosphere:~
			</div>
			<div className="flex gap-2 relative z-10 cursor-auto no-drag">
				<button
					type="button"
					onClick={onMinimize}
					className="group relative flex items-center justify-center p-1.5 bg-transparent border-0 hover:bg-elegant-bg rounded-full transition-colors cursor-pointer text-elegant-text-muted hover:text-elegant-text-primary outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent"
					aria-label="Minimize terminal"
				>
					<Minus size={14} aria-hidden="true" />
					<span
						role="tooltip"
						className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 rounded-md bg-elegant-card/95 border border-elegant-border px-2 py-0.5 text-[11px] font-mono font-medium text-elegant-text-primary shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-[transform,opacity] duration-150 -translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0 whitespace-nowrap z-50 select-none"
					>
						Minimize
					</span>
				</button>
				{isMaximized ? (
					<button
						type="button"
						onClick={onRestore}
						className="group relative flex items-center justify-center p-1.5 bg-transparent border-0 hover:bg-elegant-bg rounded-full transition-colors cursor-pointer text-elegant-text-muted hover:text-elegant-text-primary outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent"
						aria-label="Restore terminal window"
					>
						<Maximize2 size={12} aria-hidden="true" />
						<span
							role="tooltip"
							className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 rounded-md bg-elegant-card/95 border border-elegant-border px-2 py-0.5 text-[11px] font-mono font-medium text-elegant-text-primary shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-[transform,opacity] duration-150 -translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0 whitespace-nowrap z-50 select-none"
						>
							Restore
						</span>
					</button>
				) : (
					<button
						type="button"
						onClick={onMaximize}
						className="group relative flex items-center justify-center p-1.5 bg-transparent border-0 hover:bg-elegant-bg rounded-full transition-colors cursor-pointer text-elegant-text-muted hover:text-elegant-text-primary outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent"
						aria-label="Maximize terminal"
					>
						<Square size={12} aria-hidden="true" />
						<span
							role="tooltip"
							className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 rounded-md bg-elegant-card/95 border border-elegant-border px-2 py-0.5 text-[11px] font-mono font-medium text-elegant-text-primary shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-[transform,opacity] duration-150 -translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0 whitespace-nowrap z-50 select-none"
						>
							Maximize
						</span>
					</button>
				)}
				<button
					type="button"
					onClick={onClose}
					className="group relative flex items-center justify-center p-1.5 bg-transparent border-0 hover:bg-red-500 hover:text-white rounded-full transition-colors cursor-pointer text-elegant-text-muted outline-none focus-visible:ring-1 focus-visible:ring-red-400"
					aria-label="Close terminal"
				>
					<X size={14} aria-hidden="true" />
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
