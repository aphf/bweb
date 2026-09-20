import { FolderPlus, Plus } from "lucide-react";
import {
	IconFileContentFill18,
	IconFolderFill18,
	IconFolderOpenFill18,
	IconHouse2Fill18,
	IconImages2Fill18,
	IconUserFill18,
} from "nucleo-ui-essential-fill-18";

const QUICK_LOCATIONS = [
	{ label: "Home (~)", path: ["home", "neo"], icon: IconHouse2Fill18 },
	{
		label: "Projects",
		path: ["home", "neo", "projects"],
		icon: IconFolderFill18,
	},
	{
		label: "Public (Shared)",
		path: ["home", "neo", "public"],
		icon: IconFolderOpenFill18,
	},
	{
		label: "Visitor Notes",
		path: ["home", "neo", "visitors_notes"],
		icon: IconFileContentFill18,
	},
	{
		label: "Gallery",
		path: ["home", "neo", "gallery"],
		icon: IconImages2Fill18,
	},
	{ label: "About", path: ["home", "neo", "about"], icon: IconUserFill18 },
];

interface FileManagerSidebarProps {
	isMobile: boolean;
	sidebarWidth: number;
	showMobileSidebar: boolean;
	currentPath: string[];
	inPublic: boolean;
	navigateTo: (path: string[]) => void;
	setIsCreatingFile: (val: boolean) => void;
	setIsCreatingFolder: (val: boolean) => void;
	setNewItemName: (val: string) => void;
	setIsDraggingSidebar: (val: boolean) => void;
	setSidebarWidth: (val: number) => void;
}

export const FileManagerSidebar = ({
	isMobile,
	sidebarWidth,
	showMobileSidebar,
	currentPath,
	inPublic,
	navigateTo,
	setIsCreatingFile,
	setIsCreatingFolder,
	setNewItemName,
	setIsDraggingSidebar,
	setSidebarWidth,
}: FileManagerSidebarProps) => {
	return (
		<>
			<aside
				aria-label="Places"
				style={{ width: isMobile ? undefined : sidebarWidth }}
				className={`${
					showMobileSidebar
						? "flex absolute inset-y-0 left-0 z-30 w-48 shadow-2xl bg-elegant-card border-r border-elegant-border"
						: "hidden sm:flex bg-elegant-card/60"
				} p-2 flex-col justify-between shrink-0 select-none overflow-y-auto`}
			>
				<div className="space-y-1">
					<div className="px-2 py-1 text-[10px] font-semibold text-elegant-text-muted uppercase tracking-wider">
						Places
					</div>
					{QUICK_LOCATIONS.map((loc) => {
						const isCurrent = currentPath.join("/") === loc.path.join("/");
						const IconComp = loc.icon;
						return (
							<button
								key={loc.label}
								type="button"
								onClick={() => navigateTo(loc.path)}
								className={`w-full flex items-center gap-2 px-2 py-1.5 rounded text-xs transition-colors cursor-pointer ${
									isCurrent
										? "bg-elegant-bg text-elegant-text-primary font-semibold border border-elegant-border shadow-xs"
										: "text-elegant-text-secondary hover:bg-elegant-bg/60 hover:text-elegant-text-primary"
								}`}
							>
								<IconComp size={13} className="shrink-0" />
								<span className="truncate">{loc.label}</span>
							</button>
						);
					})}
				</div>

				{/* Public Folder Action Quick Buttons */}
				{inPublic && (
					<div className="pt-2 border-t border-elegant-border space-y-1">
						<button
							type="button"
							onClick={() => {
								setIsCreatingFile(true);
								setIsCreatingFolder(false);
								setNewItemName("");
							}}
							className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] rounded bg-elegant-bg hover:bg-elegant-card border border-elegant-border text-elegant-text-secondary hover:text-elegant-text-primary transition-colors cursor-pointer"
						>
							<Plus size={12} />
							<span>New File</span>
						</button>
						<button
							type="button"
							onClick={() => {
								setIsCreatingFolder(true);
								setIsCreatingFile(false);
								setNewItemName("");
							}}
							className="w-full flex items-center gap-1.5 px-2 py-1 text-[11px] rounded bg-elegant-bg hover:bg-elegant-card border border-elegant-border text-elegant-text-secondary hover:text-elegant-text-primary transition-colors cursor-pointer"
						>
							<FolderPlus size={12} />
							<span>New Folder</span>
						</button>
					</div>
				)}
			</aside>

			{/* Resizable Handle Divider */}
			{/* biome-ignore lint/a11y/useSemanticElements: interactive resizable handle requires div separator */}
			<div
				role="separator"
				aria-orientation="vertical"
				aria-valuenow={sidebarWidth}
				aria-valuemin={120}
				aria-valuemax={320}
				tabIndex={0}
				aria-label="Resize Places sidebar"
				className="group relative w-1 -mr-1 cursor-col-resize select-none shrink-0 z-30 flex items-center justify-center focus:outline-none focus:ring-1 focus:ring-elegant-accent"
				onMouseDown={(e) => {
					e.preventDefault();
					setIsDraggingSidebar(true);
				}}
				onKeyDown={(e) => {
					if (e.key === "Enter" || e.key === " ") {
						setSidebarWidth(176);
					}
				}}
			>
				<div className="w-0.5 h-full bg-elegant-border group-hover:bg-elegant-accent/60 transition-colors" />
			</div>
		</>
	);
};
