import { FileText, FolderPlus, Grid, List, Trash2 } from "lucide-react";
import { IconCircleInfoFill18 } from "nucleo-ui-essential-fill-18";
import type { FileSystem, FileSystemNode } from "../../utils/fileSystem";
import { resolvePath } from "../../utils/fileSystemUtils";
import {
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
} from "../ui/context-menu";
import { FOLDER_COLORS } from "./fileManagerUtils";

interface FileManagerContextMenuProps {
	inPublic: boolean;
	selectedItems: string[];
	currentPath: string[];
	fileSystem: FileSystem;
	currentChildren: {
		name: string;
		node: FileSystemNode;
		isDirectory: boolean;
	}[];
	setIsCreatingFile: (v: boolean) => void;
	setIsCreatingFolder: (v: boolean) => void;
	setNewItemName: (v: string) => void;
	handleOpenItem: (item: {
		name: string;
		node: FileSystemNode;
		isDirectory: boolean;
	}) => void;
	setPropertiesItem: (
		item: {
			name: string;
			path: string[];
			node: FileSystemNode;
			isDirectory: boolean;
		} | null,
	) => void;
	handleSetFolderColor: (folderName: string, color: string) => void;
	handleDeleteItem: (name: string) => void;
	setViewMode: (mode: "grid" | "list") => void;
}

export function FileManagerContextMenu({
	inPublic,
	selectedItems,
	currentPath,
	fileSystem,
	currentChildren,
	setIsCreatingFile,
	setIsCreatingFolder,
	setNewItemName,
	handleOpenItem,
	setPropertiesItem,
	handleSetFolderColor,
	handleDeleteItem,
	setViewMode,
}: FileManagerContextMenuProps) {
	return (
		<ContextMenuContent>
			{inPublic && (
				<>
					<ContextMenuItem
						onClick={() => {
							setIsCreatingFile(true);
							setIsCreatingFolder(false);
							setNewItemName("");
						}}
					>
						<FileText size={14} className="text-elegant-accent" />
						<span>New File</span>
					</ContextMenuItem>
					<ContextMenuItem
						onClick={() => {
							setIsCreatingFolder(true);
							setIsCreatingFile(false);
							setNewItemName("");
						}}
					>
						<FolderPlus size={14} className="text-elegant-accent" />
						<span>New Folder</span>
					</ContextMenuItem>
					<ContextMenuSeparator />
				</>
			)}
			{selectedItems.length > 0 && (
				<>
					<ContextMenuItem
						onClick={() => {
							const item = currentChildren.find(
								(c) => c.name === selectedItems[0],
							);
							if (item) handleOpenItem(item);
						}}
					>
						<span>Open</span>
					</ContextMenuItem>

					<ContextMenuItem
						onClick={() => {
							const item = currentChildren.find(
								(c) => c.name === selectedItems[0],
							);
							if (item) {
								setPropertiesItem({
									name: item.name,
									path: currentPath,
									node: item.node,
									isDirectory: item.isDirectory,
								});
							}
						}}
					>
						<IconCircleInfoFill18 size={14} className="text-elegant-accent" />
						<span>Properties</span>
					</ContextMenuItem>

					{/* Folder Color Palette Picker */}
					{selectedItems.length === 1 &&
						currentChildren.find((c) => c.name === selectedItems[0])
							?.isDirectory && (
							<div className="px-2 py-1.5 text-xs text-elegant-text-secondary select-none">
								<div className="text-[10px] font-semibold text-elegant-text-muted uppercase tracking-wider mb-1">
									Folder Color
								</div>
								<div className="flex items-center gap-1.5 pt-0.5">
									{FOLDER_COLORS.map((c) => (
										<button
											key={c.name}
											type="button"
											title={c.name}
											aria-label={`Set folder color ${c.name}`}
											onClick={(e) => {
												e.stopPropagation();
												handleSetFolderColor(selectedItems[0], c.value);
											}}
											className={`size-4 rounded-full border border-elegant-border/80 hover:scale-125 transition-transform cursor-pointer shadow-xs ${
												c.value === "none" ? "bg-elegant-text-primary" : ""
											}`}
											style={{
												backgroundColor:
													c.value === "none" ? undefined : c.value,
											}}
										/>
									))}
								</div>
							</div>
						)}

					{inPublic && (
						<ContextMenuItem
							variant="destructive"
							onClick={() => {
								for (const name of selectedItems) {
									handleDeleteItem(name);
								}
							}}
						>
							<Trash2 size={14} />
							<span>Delete Selected</span>
						</ContextMenuItem>
					)}
					<ContextMenuSeparator />
				</>
			)}

			{selectedItems.length === 0 && (
				<>
					<ContextMenuItem
						onClick={() => {
							const currentDirName =
								currentPath[currentPath.length - 1] || "home";
							const parentPath = currentPath.slice(0, -1);
							const currentDirNode = resolvePath(fileSystem, currentPath, ".");
							setPropertiesItem({
								name: currentDirName,
								path: parentPath,
								node: currentDirNode || {
									type: "directory",
									children: {},
								},
								isDirectory: true,
							});
						}}
					>
						<IconCircleInfoFill18 size={14} className="text-elegant-accent" />
						<span>Folder Properties</span>
					</ContextMenuItem>
					<ContextMenuSeparator />
				</>
			)}
			<ContextMenuItem onClick={() => setViewMode("grid")}>
				<Grid size={14} />
				<span>View as Icons</span>
			</ContextMenuItem>
			<ContextMenuItem onClick={() => setViewMode("list")}>
				<List size={14} />
				<span>View as List</span>
			</ContextMenuItem>
		</ContextMenuContent>
	);
}
