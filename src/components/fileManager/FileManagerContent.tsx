import { ArrowDown, ArrowUp, FileText, Folder, X } from "lucide-react";
import { IconFolderOpen } from "nucleo-micro-bold-essential";
import type React from "react";
import type { FileSystemNode } from "../../utils/fileSystem";
import { FileGridItem } from "./FileGridItem";
import { FileListItem } from "./FileListItem";

interface FileManagerContentProps {
	isCreatingFile: boolean;
	isCreatingFolder: boolean;
	newItemName: string;
	setNewItemName: (name: string) => void;
	setIsCreatingFile: (v: boolean) => void;
	setIsCreatingFolder: (v: boolean) => void;
	handleCreateFile: () => void;
	handleCreateFolder: () => void;
	currentChildren: {
		name: string;
		node: FileSystemNode;
		isDirectory: boolean;
	}[];
	inPublic: boolean;
	viewMode: "grid" | "list";
	selectedSet: Set<string>;
	currentPath: string[];
	sortField: "name" | "size" | "type" | "modified";
	sortOrder: "asc" | "desc";
	handleSort: (field: "name" | "size" | "type" | "modified") => void;
	setSelectedItems: React.Dispatch<React.SetStateAction<string[]>>;
	handleOpenItem: (item: {
		name: string;
		node: FileSystemNode;
		isDirectory: boolean;
	}) => void;
	handleItemSelectToggle: (itemName: string, e: React.MouseEvent) => void;
	handleDeleteItem: (itemName: string) => void;
}

export function FileManagerContent({
	isCreatingFile,
	isCreatingFolder,
	newItemName,
	setNewItemName,
	setIsCreatingFile,
	setIsCreatingFolder,
	handleCreateFile,
	handleCreateFolder,
	currentChildren,
	inPublic,
	viewMode,
	selectedSet,
	currentPath,
	sortField,
	sortOrder,
	handleSort,
	setSelectedItems,
	handleOpenItem,
	handleItemSelectToggle,
	handleDeleteItem,
}: FileManagerContentProps) {
	return (
		<>
			{/* New Item Prompt Overlay */}
			{(isCreatingFile || isCreatingFolder) && (
				<div className="mb-4 p-3 rounded-lg bg-elegant-card border border-elegant-border flex items-center gap-2 animate-in fade-in shadow-md">
					{isCreatingFile ? (
						<FileText size={16} className="text-elegant-accent" />
					) : (
						<Folder size={16} className="text-elegant-accent" />
					)}
					<input
						type="text"
						aria-label="New item name"
						placeholder={isCreatingFile ? "filename.txt" : "Folder Name"}
						value={newItemName}
						onChange={(e) => setNewItemName(e.target.value)}
						onKeyDown={(e) => {
							if (e.key === "Enter") {
								isCreatingFile ? handleCreateFile() : handleCreateFolder();
							} else if (e.key === "Escape") {
								setIsCreatingFile(false);
								setIsCreatingFolder(false);
							}
						}}
						className="flex-1 px-2 py-1 rounded bg-elegant-bg border border-elegant-border text-xs text-elegant-text-primary outline-none focus:border-elegant-accent"
					/>
					<button
						type="button"
						onClick={isCreatingFile ? handleCreateFile : handleCreateFolder}
						className="px-2.5 py-1 text-xs rounded bg-elegant-accent text-elegant-bg font-semibold hover:bg-elegant-accent-hover cursor-pointer"
					>
						Create
					</button>
					<button
						type="button"
						aria-label="Cancel new item"
						onClick={() => {
							setIsCreatingFile(false);
							setIsCreatingFolder(false);
						}}
						className="p-1 rounded text-elegant-text-muted hover:text-elegant-text-primary cursor-pointer"
					>
						<X size={14} />
					</button>
				</div>
			)}

			{/* Directory Content List or Empty State */}
			{currentChildren.length === 0 ? (
				<div className="h-full flex flex-col items-center justify-center text-center text-elegant-text-muted py-12">
					<IconFolderOpen className="size-12 opacity-30 mb-2" />
					<p className="text-sm">Folder is empty</p>
					{inPublic && (
						<p className="text-xs text-elegant-text-muted mt-1">
							Right-click to create new files and folders
						</p>
					)}
				</div>
			) : viewMode === "grid" ? (
				<div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
					{currentChildren.map((item) => (
						<FileGridItem
							key={item.name}
							item={item}
							isSelected={selectedSet.has(item.name)}
							currentPath={currentPath}
							setSelectedItems={setSelectedItems}
							handleOpenItem={handleOpenItem}
							handleItemSelectToggle={handleItemSelectToggle}
						/>
					))}
				</div>
			) : (
				<div className="w-full overflow-x-auto">
					<table className="w-full text-left text-xs border-collapse">
						<thead>
							<tr className="border-b border-elegant-border text-elegant-text-muted text-[11px]">
								<th className="py-1.5 px-3 font-normal select-none">
									<button
										type="button"
										aria-label="Sort by name"
										className="flex items-center gap-1 cursor-pointer hover:text-elegant-text-primary transition-colors text-inherit font-inherit"
										onClick={() => handleSort("name")}
									>
										<span>Name</span>
										{sortField === "name" &&
											(sortOrder === "asc" ? (
												<ArrowUp size={11} />
											) : (
												<ArrowDown size={11} />
											))}
									</button>
								</th>
								<th className="py-1.5 px-3 font-normal select-none">
									<button
										type="button"
										aria-label="Sort by size"
										className="flex items-center gap-1 cursor-pointer hover:text-elegant-text-primary transition-colors text-inherit font-inherit"
										onClick={() => handleSort("size")}
									>
										<span>Size</span>
										{sortField === "size" &&
											(sortOrder === "asc" ? (
												<ArrowUp size={11} />
											) : (
												<ArrowDown size={11} />
											))}
									</button>
								</th>
								<th className="py-1.5 px-3 font-normal select-none">
									<button
										type="button"
										aria-label="Sort by type"
										className="flex items-center gap-1 cursor-pointer hover:text-elegant-text-primary transition-colors text-inherit font-inherit"
										onClick={() => handleSort("type")}
									>
										<span>Type</span>
										{sortField === "type" &&
											(sortOrder === "asc" ? (
												<ArrowUp size={11} />
											) : (
												<ArrowDown size={11} />
											))}
									</button>
								</th>
								<th className="py-1.5 px-3 font-normal select-none">
									<button
										type="button"
										aria-label="Sort by modification time"
										className="flex items-center gap-1 cursor-pointer hover:text-elegant-text-primary transition-colors text-inherit font-inherit"
										onClick={() => handleSort("modified")}
									>
										<span>Modified</span>
										{sortField === "modified" &&
											(sortOrder === "asc" ? (
												<ArrowUp size={11} />
											) : (
												<ArrowDown size={11} />
											))}
									</button>
								</th>
								{inPublic && (
									<th className="py-1.5 px-3 font-normal text-right">Action</th>
								)}
							</tr>
						</thead>
						<tbody>
							{currentChildren.map((item) => (
								<FileListItem
									key={item.name}
									item={item}
									isSelected={selectedSet.has(item.name)}
									currentPath={currentPath}
									inPublic={inPublic}
									setSelectedItems={setSelectedItems}
									handleOpenItem={handleOpenItem}
									handleItemSelectToggle={handleItemSelectToggle}
									handleDeleteItem={handleDeleteItem}
								/>
							))}
						</tbody>
					</table>
				</div>
			)}
		</>
	);
}
