import { ChevronLeft, ChevronRight, ChevronUp, Search } from "lucide-react";
import { IconFolderOpenFill18 } from "nucleo-ui-essential-fill-18";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { trackEvent } from "../../lib/analytics";

interface FileManagerToolbarProps {
	currentPath: string[];
	history: string[][];
	historyIndex: number;
	searchQuery: string;
	setSearchQuery: (query: string) => void;
	handleBack: () => void;
	handleForward: () => void;
	handleUp: () => void;
	navigateTo: (path: string[]) => void;
	setShowMobileSidebar: React.Dispatch<React.SetStateAction<boolean>>;
}

export const FileManagerToolbar = ({
	currentPath,
	history,
	historyIndex,
	searchQuery,
	setSearchQuery,
	handleBack,
	handleForward,
	handleUp,
	navigateTo,
	setShowMobileSidebar,
}: FileManagerToolbarProps) => {
	const [isEditingPath, setIsEditingPath] = useState(false);
	const [pathInputText, setPathInputText] = useState("");

	// Debounced search tracking (no raw query text)
	const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		if (searchQuery.trim().length < 2) return;
		if (searchTimer.current) clearTimeout(searchTimer.current);
		searchTimer.current = setTimeout(
			() => trackEvent("filemanager-search"),
			1500,
		);
		return () => {
			if (searchTimer.current) clearTimeout(searchTimer.current);
		};
	}, [searchQuery]);

	const handleCustomPathSubmit = () => {
		setIsEditingPath(false);
		const clean = pathInputText.trim();
		if (!clean) return;
		const parts = clean.split("/").filter(Boolean);
		if (parts.length > 0) {
			navigateTo(parts);
		}
	};

	return (
		<div className="flex items-center justify-between gap-2 px-3 py-1.5 bg-elegant-card/50 border-b border-elegant-border text-xs">
			{/* History Buttons & Mobile Places Toggle */}
			<div className="flex items-center gap-1">
				<button
					type="button"
					onClick={() => setShowMobileSidebar((prev) => !prev)}
					className="sm:hidden p-1 rounded hover:bg-elegant-bg text-elegant-text-secondary hover:text-elegant-text-primary transition-colors cursor-pointer mr-0.5"
					title="Toggle Places Sidebar"
					aria-label="Toggle Places Sidebar"
				>
					<IconFolderOpenFill18 size={14} />
				</button>
				<button
					type="button"
					onClick={handleBack}
					disabled={historyIndex <= 0}
					aria-label="Go Back"
					className="p-1 rounded hover:bg-elegant-bg disabled:opacity-30 disabled:hover:bg-transparent text-elegant-text-secondary hover:text-elegant-text-primary transition-colors cursor-pointer"
				>
					<ChevronLeft size={14} />
				</button>
				<button
					type="button"
					onClick={handleForward}
					disabled={historyIndex >= history.length - 1}
					aria-label="Go Forward"
					className="p-1 rounded hover:bg-elegant-bg disabled:opacity-30 disabled:hover:bg-transparent text-elegant-text-secondary hover:text-elegant-text-primary transition-colors cursor-pointer"
				>
					<ChevronRight size={14} />
				</button>
				<button
					type="button"
					onClick={handleUp}
					disabled={currentPath.length <= 1}
					aria-label="Go Up"
					className="p-1 rounded hover:bg-elegant-bg disabled:opacity-30 disabled:hover:bg-transparent text-elegant-text-secondary hover:text-elegant-text-primary transition-colors cursor-pointer"
				>
					<ChevronUp size={14} />
				</button>
			</div>

			{/* Breadcrumbs Path (Interactive & Editable) */}
			<nav
				className="flex-1 flex items-center gap-1 overflow-x-auto px-2.5 py-1 bg-elegant-bg rounded border border-elegant-border text-[11px] text-elegant-text-secondary"
				aria-label="Folder Path Navigation"
				onDoubleClick={() => {
					if (!isEditingPath) {
						setIsEditingPath(true);
						setPathInputText(`/${currentPath.join("/")}`);
					}
				}}
			>
				{isEditingPath ? (
					<input
						type="text"
						aria-label="Folder path"
						value={pathInputText}
						onChange={(e) => setPathInputText(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") handleCustomPathSubmit();
							else if (e.key === "Escape") setIsEditingPath(false);
						}}
						onBlur={handleCustomPathSubmit}
						ref={(el) => el?.focus()}
						className="w-full bg-transparent text-elegant-text-primary outline-none font-mono text-[11px]"
					/>
				) : (
					<>
						<button
							type="button"
							aria-label="Home directory"
							onClick={(e) => {
								e.stopPropagation();
								navigateTo(["home", "neo"]);
							}}
							className="hover:text-elegant-text-primary cursor-pointer font-bold"
						>
							~
						</button>
						{currentPath.map((seg, i) => {
							const segPath = currentPath.slice(0, i + 1);
							return (
								<div
									key={segPath.join("/")}
									className="flex items-center gap-1"
								>
									<span className="text-elegant-text-muted">/</span>
									<button
										type="button"
										aria-label={`Go to ${seg}`}
										onClick={(e) => {
											e.stopPropagation();
											navigateTo(segPath);
										}}
										className="hover:text-elegant-text-primary cursor-pointer truncate max-w-30"
									>
										{seg}
									</button>
								</div>
							);
						})}
					</>
				)}
			</nav>

			{/* Search Input */}
			<div className="relative flex items-center w-28 sm:w-44">
				<Search
					size={12}
					className="absolute left-2 text-elegant-text-muted pointer-events-none"
					aria-hidden="true"
				/>
				<input
					type="text"
					aria-label="Search files"
					placeholder="Search files…"
					value={searchQuery}
					onChange={(e) => setSearchQuery(e.target.value)}
					className="w-full pl-6 pr-2 py-1 rounded bg-elegant-bg border border-elegant-border text-elegant-text-primary text-[11px] placeholder:text-elegant-text-muted outline-none focus:border-elegant-accent transition-colors"
				/>
			</div>
		</div>
	);
};
