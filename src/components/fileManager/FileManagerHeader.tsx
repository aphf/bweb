import { Grid, List, Minus, Square, X } from "lucide-react";

interface FileManagerHeaderProps {
	currentPath: string[];
	viewMode: "grid" | "list";
	setViewMode: (mode: "grid" | "list") => void;
	mode: "windowed" | "maximized" | "minimized" | "hidden";
	onMinimize?: () => void;
	onMaximize?: () => void;
	onRestore?: () => void;
	onClose?: () => void;
}

export const FileManagerHeader = ({
	currentPath,
	viewMode,
	setViewMode,
	mode,
	onMinimize,
	onMaximize,
	onRestore,
	onClose,
}: FileManagerHeaderProps) => {
	return (
		<div className="fm-drag-handle w-full h-10 bg-elegant-card flex items-center px-4 justify-between border-b border-elegant-border shrink-0 select-none relative z-20 cursor-grab active:cursor-grabbing">
			{/* Left: App icon & Title */}
			<div className="flex items-center gap-2 text-elegant-text-secondary text-sm font-medium font-mono truncate max-w-[70%] pointer-events-none">
				<img
					src="/assets/dolphin.svg"
					alt="Dolphin"
					className="size-4 shrink-0"
					draggable={false}
				/>
				<span className="truncate">dolphin: /{currentPath.join("/")}</span>
			</div>

			{/* Right: KDE Window Controls */}
			<div className="flex items-center gap-2 relative z-10 cursor-auto no-drag">
				{/* View Toggle */}
				<div className="flex items-center gap-0.5 mr-2 bg-elegant-bg rounded border border-elegant-border p-0.5">
					<button
						type="button"
						onClick={() => setViewMode("grid")}
						aria-label="Grid View"
						className={`group relative p-1 rounded transition-colors cursor-pointer flex items-center justify-center ${
							viewMode === "grid"
								? "bg-elegant-card text-elegant-text-primary shadow-xs"
								: "text-elegant-text-muted hover:text-elegant-text-primary"
						}`}
					>
						<Grid size={13} aria-hidden="true" />
						<span
							role="tooltip"
							className="pointer-events-none absolute top-7 left-1/2 -translate-x-1/2 rounded-md bg-elegant-card/95 border border-elegant-border px-2 py-0.5 text-[11px] font-mono font-medium text-elegant-text-primary shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-[transform,opacity] duration-150 -translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0 whitespace-nowrap z-50 select-none"
						>
							Icons
						</span>
					</button>
					<button
						type="button"
						onClick={() => setViewMode("list")}
						aria-label="List View"
						className={`group relative p-1 rounded transition-colors cursor-pointer flex items-center justify-center ${
							viewMode === "list"
								? "bg-elegant-card text-elegant-text-primary shadow-xs"
								: "text-elegant-text-muted hover:text-elegant-text-primary"
						}`}
					>
						<List size={13} aria-hidden="true" />
						<span
							role="tooltip"
							className="pointer-events-none absolute top-7 left-1/2 -translate-x-1/2 rounded-md bg-elegant-card/95 border border-elegant-border px-2 py-0.5 text-[11px] font-mono font-medium text-elegant-text-primary shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-[transform,opacity] duration-150 -translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0 whitespace-nowrap z-50 select-none"
						>
							List
						</span>
					</button>
				</div>

				<button
					type="button"
					onClick={onMinimize}
					className="group relative flex items-center justify-center p-1.5 bg-transparent border-0 hover:bg-elegant-bg rounded-full transition-colors cursor-pointer text-elegant-text-muted hover:text-elegant-text-primary outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent"
					aria-label="Minimize file manager"
				>
					<Minus size={14} aria-hidden="true" />
					<span
						role="tooltip"
						className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 rounded-md bg-elegant-card/95 border border-elegant-border px-2 py-0.5 text-[11px] font-mono font-medium text-elegant-text-primary shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-[transform,opacity] duration-150 -translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0 whitespace-nowrap z-50 select-none"
					>
						Minimize
					</span>
				</button>
				<button
					type="button"
					onClick={mode === "maximized" ? onRestore : onMaximize}
					className="group relative flex items-center justify-center p-1.5 bg-transparent border-0 hover:bg-elegant-bg rounded-full transition-colors cursor-pointer text-elegant-text-muted hover:text-elegant-text-primary outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent"
					aria-label="Maximize file manager"
				>
					<Square size={12} aria-hidden="true" />
					<span
						role="tooltip"
						className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 rounded-md bg-elegant-card/95 border border-elegant-border px-2 py-0.5 text-[11px] font-mono font-medium text-elegant-text-primary shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-[transform,opacity] duration-150 -translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0 whitespace-nowrap z-50 select-none"
					>
						{mode === "maximized" ? "Restore" : "Maximize"}
					</span>
				</button>
				<button
					type="button"
					onClick={onClose}
					className="group relative flex items-center justify-center p-1.5 bg-transparent border-0 hover:bg-red-500 hover:text-white rounded-full transition-colors cursor-pointer text-elegant-text-muted outline-none focus-visible:ring-1 focus-visible:ring-red-400"
					aria-label="Close file manager"
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
};
