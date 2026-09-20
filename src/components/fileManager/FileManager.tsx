import { AnimatePresence, m } from "motion/react";
import type React from "react";
import { Rnd } from "react-rnd";
import type { TerminalMode } from "../../App";
import type { FileSystem } from "../../utils/fileSystem";
import { ContextMenu, ContextMenuTrigger } from "../ui/context-menu";
import { FileManagerContent } from "./FileManagerContent";
import { FileManagerContextMenu } from "./FileManagerContextMenu";
import { FileManagerHeader } from "./FileManagerHeader";
import { FileManagerSidebar } from "./FileManagerSidebar";
import { FileManagerToolbar } from "./FileManagerToolbar";
import { FilePropertiesModal } from "./FilePropertiesModal";
import { FileQuickLook } from "./FileQuickLook";
import { getFileIconComponent, getFolderColor } from "./fileManagerUtils";
import { useFileManager } from "./useFileManager";

interface FileManagerProps {
	mode: TerminalMode;
	onClose: () => void;
	onMinimize: () => void;
	onMaximize: () => void;
	onRestore: () => void;
	fileSystem: FileSystem;
	setFileSystem: React.Dispatch<React.SetStateAction<FileSystem>>;
	zIndex?: number;
	onFocus?: () => void;
}

export function FileManager({
	mode,
	onClose,
	onMinimize,
	onMaximize,
	onRestore,
	fileSystem,
	setFileSystem,
	zIndex = 30,
	onFocus,
}: FileManagerProps) {
	const fm = useFileManager(mode, fileSystem, setFileSystem);

	if (!fm.isVisible) return null;

	const content = (
		<section
			aria-label="Dolphin File Manager"
			className="h-full w-full flex flex-col bg-elegant-bg text-elegant-text-primary rounded-lg border border-elegant-border shadow-2xl shadow-black/60 overflow-hidden font-mono select-none outline-none"
			onPointerDownCapture={onFocus}
		>
			<FileManagerHeader
				currentPath={fm.currentPath}
				viewMode={fm.viewMode}
				setViewMode={fm.setViewMode}
				mode={mode}
				onMinimize={onMinimize}
				onMaximize={onMaximize}
				onRestore={onRestore}
				onClose={onClose}
			/>

			<FileManagerToolbar
				currentPath={fm.currentPath}
				history={fm.history}
				historyIndex={fm.historyIndex}
				searchQuery={fm.searchQuery}
				setSearchQuery={fm.setSearchQuery}
				handleBack={fm.handleBack}
				handleForward={fm.handleForward}
				handleUp={fm.handleUp}
				navigateTo={fm.navigateTo}
				setShowMobileSidebar={fm.setShowMobileSidebar}
			/>

			<div ref={fm.containerRef} className="flex-1 flex min-h-0 relative">
				<FileManagerSidebar
					isMobile={fm.isMobile}
					sidebarWidth={fm.sidebarWidth}
					showMobileSidebar={fm.showMobileSidebar}
					currentPath={fm.currentPath}
					inPublic={fm.inPublic}
					navigateTo={fm.navigateTo}
					setIsCreatingFile={fm.setIsCreatingFile}
					setIsCreatingFolder={fm.setIsCreatingFolder}
					setNewItemName={fm.setNewItemName}
					setIsDraggingSidebar={fm.setIsDraggingSidebar}
					setSidebarWidth={fm.setSidebarWidth}
				/>

				<ContextMenu>
					<ContextMenuTrigger asChild>
						<div className="flex-1 overflow-y-auto p-4 bg-elegant-bg focus:outline-none min-h-full">
							<FileManagerContent
								isCreatingFile={fm.isCreatingFile}
								isCreatingFolder={fm.isCreatingFolder}
								newItemName={fm.newItemName}
								setNewItemName={fm.setNewItemName}
								setIsCreatingFile={fm.setIsCreatingFile}
								setIsCreatingFolder={fm.setIsCreatingFolder}
								handleCreateFile={fm.handleCreateFile}
								handleCreateFolder={fm.handleCreateFolder}
								currentChildren={fm.currentChildren}
								inPublic={fm.inPublic}
								viewMode={fm.viewMode}
								selectedSet={fm.selectedSet}
								currentPath={fm.currentPath}
								sortField={fm.sortField}
								sortOrder={fm.sortOrder}
								handleSort={fm.handleSort}
								setSelectedItems={fm.setSelectedItems}
								handleOpenItem={fm.handleOpenItem}
								handleItemSelectToggle={fm.handleItemSelectToggle}
								handleDeleteItem={fm.handleDeleteItem}
							/>
						</div>
					</ContextMenuTrigger>

					<FileManagerContextMenu
						inPublic={fm.inPublic}
						selectedItems={fm.selectedItems}
						currentPath={fm.currentPath}
						fileSystem={fileSystem}
						currentChildren={fm.currentChildren}
						setIsCreatingFile={fm.setIsCreatingFile}
						setIsCreatingFolder={fm.setIsCreatingFolder}
						setNewItemName={fm.setNewItemName}
						handleOpenItem={fm.handleOpenItem}
						setPropertiesItem={fm.setPropertiesItem}
						handleSetFolderColor={fm.handleSetFolderColor}
						handleDeleteItem={fm.handleDeleteItem}
						setViewMode={fm.setViewMode}
					/>
				</ContextMenu>
			</div>

			<div className="px-3 py-1 bg-elegant-card border-t border-elegant-border flex items-center justify-between text-[11px] text-elegant-text-muted select-none">
				<span>
					{fm.currentChildren.length}{" "}
					{fm.currentChildren.length === 1 ? "item" : "items"}
					{fm.selectedItems.length > 0 && (
						<span className="ml-2 text-elegant-accent font-medium">
							({fm.selectedItems.length} selected)
						</span>
					)}
				</span>
				<span>{fm.inPublic ? "Writable (~/public)" : "Read-Only"}</span>
			</div>

			{fm.previewFile && (
				<FileQuickLook
					filename={fm.previewFile.name}
					node={fm.previewFile.node}
					onClose={() => fm.setPreviewFile(null)}
				/>
			)}

			{fm.propertiesItem && (
				<FilePropertiesModal
					name={fm.propertiesItem.name}
					path={fm.propertiesItem.path}
					node={fm.propertiesItem.node}
					isDirectory={fm.propertiesItem.isDirectory}
					onClose={() => fm.setPropertiesItem(null)}
					getFolderColor={getFolderColor}
					getFileIconComponent={getFileIconComponent}
				/>
			)}
		</section>
	);

	if (mode === "maximized") {
		return (
			<div
				className="fixed inset-x-0 top-8 bottom-16 z-30 p-2 sm:p-4 transition-[opacity,transform] duration-150"
				style={{ zIndex }}
			>
				{content}
			</div>
		);
	}

	return (
		<AnimatePresence>
			{fm.isWindowed && (
				<m.div
					initial={{ opacity: 0, scale: 0.95, y: 15 }}
					animate={{ opacity: 1, scale: 1, y: 0 }}
					exit={{ opacity: 0, scale: 0.95, y: 15 }}
					transition={{ duration: 0.18, ease: "easeOut" }}
					style={{ zIndex }}
				>
					<Rnd
						size={{ width: fm.rndState.width, height: fm.rndState.height }}
						position={{ x: fm.rndState.x, y: fm.rndState.y }}
						onResizeStop={(_e, _dir, ref, _delta, pos) => {
							fm.setRndState((prev) => ({
								...prev,
								width: Number.parseInt(ref.style.width, 10),
								height: Number.parseInt(ref.style.height, 10),
								...pos,
							}));
						}}
						onDragStop={(_e, d) => {
							fm.setRndState((prev) => ({
								...prev,
								x: d.x,
								y: d.y,
							}));
						}}
						dragHandleClassName="fm-drag-handle"
						cancel=".no-drag"
						minWidth={fm.isMobile ? 280 : 360}
						minHeight={fm.isMobile ? 260 : 300}
						bounds="window"
						className="fixed"
						style={{ zIndex }}
					>
						{content}
					</Rnd>
				</m.div>
			)}
		</AnimatePresence>
	);
}
