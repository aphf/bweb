import { Trash2 } from "lucide-react";
import { IconFolderOpen } from "nucleo-micro-bold-essential";
import type React from "react";
import { useRef } from "react";
import type { FileSystemNode } from "../../utils/fileSystem";
import { getFileIconComponent, getFolderColor } from "./fileManagerUtils";

export interface FileListItemProps {
	item: {
		name: string;
		node: FileSystemNode;
		isDirectory: boolean;
	};
	isSelected: boolean;
	currentPath: string[];
	inPublic: boolean;
	setSelectedItems: React.Dispatch<React.SetStateAction<string[]>>;
	handleOpenItem: (item: {
		name: string;
		node: FileSystemNode;
		isDirectory: boolean;
	}) => void;
	handleItemSelectToggle: (itemName: string, e: React.MouseEvent) => void;
	handleDeleteItem: (itemName: string) => void;
}

export function FileListItem({
	item,
	isSelected,
	currentPath,
	inPublic,
	setSelectedItems,
	handleOpenItem,
	handleItemSelectToggle,
	handleDeleteItem,
}: FileListItemProps) {
	const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
	const startPosRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });
	const longPressTriggeredRef = useRef(false);
	const isMovedRef = useRef(false);

	const clearTimer = () => {
		if (timerRef.current) {
			clearTimeout(timerRef.current);
			timerRef.current = null;
		}
	};

	const onPointerDown = (e: React.PointerEvent) => {
		if (e.button !== 0) return;
		clearTimer();
		longPressTriggeredRef.current = false;
		isMovedRef.current = false;
		startPosRef.current = { x: e.clientX, y: e.clientY };

		const currentTarget = e.currentTarget as HTMLElement;
		const clientX = e.clientX;
		const clientY = e.clientY;

		timerRef.current = setTimeout(() => {
			longPressTriggeredRef.current = true;
			setSelectedItems((prev) =>
				prev.includes(item.name) ? prev : [item.name],
			);
			try {
				if (typeof navigator !== "undefined" && navigator.vibrate) {
					navigator.vibrate(30);
				}
			} catch {}
			if (currentTarget) {
				const cmEvent = new MouseEvent("contextmenu", {
					bubbles: true,
					cancelable: true,
					view: window,
					clientX,
					clientY,
					button: 2,
					buttons: 2,
				});
				currentTarget.dispatchEvent(cmEvent);
			}
		}, 450);
	};

	const onPointerMove = (e: React.PointerEvent) => {
		if (!timerRef.current) return;
		const dx = e.clientX - startPosRef.current.x;
		const dy = e.clientY - startPosRef.current.y;
		if (Math.hypot(dx, dy) > 10) {
			clearTimer();
			isMovedRef.current = true;
		}
	};

	const onPointerUp = () => clearTimer();
	const onPointerCancel = () => {
		clearTimer();
		isMovedRef.current = false;
		longPressTriggeredRef.current = false;
	};

	const onClick = (e: React.MouseEvent) => {
		clearTimer();
		if (longPressTriggeredRef.current) {
			e.preventDefault();
			e.stopPropagation();
			longPressTriggeredRef.current = false;
			return;
		}
		if (isMovedRef.current) {
			isMovedRef.current = false;
			return;
		}

		if (e.ctrlKey || e.metaKey || e.shiftKey) {
			handleItemSelectToggle(item.name, e);
			return;
		}

		e.stopPropagation();
		handleOpenItem(item);
	};

	const onContextMenu = () => {
		clearTimer();
		setSelectedItems((prev) => (prev.includes(item.name) ? prev : [item.name]));
	};

	const onDoubleClick = (e: React.MouseEvent) => {
		e.stopPropagation();
		handleOpenItem(item);
	};

	const onKeyDown = (e: React.KeyboardEvent) => {
		if (e.key === "Enter" || e.key === " ") {
			e.preventDefault();
			handleOpenItem(item);
		}
	};

	return (
		<tr
			key={item.name}
			data-file-item="true"
			tabIndex={0}
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerCancel}
			onClick={onClick}
			onContextMenu={onContextMenu}
			onDoubleClick={onDoubleClick}
			onKeyDown={onKeyDown}
			className={`border-b border-elegant-border/50 cursor-pointer transition-colors outline-none select-none touch-manipulation ${
				isSelected
					? "bg-elegant-card text-elegant-text-primary"
					: "hover:bg-elegant-card/60 text-elegant-text-secondary"
			}`}
		>
			<td className="py-2 px-3 flex items-center gap-2 font-medium text-elegant-text-primary pointer-events-none">
				{item.isDirectory ? (
					<IconFolderOpen
						className="size-4 shrink-0"
						style={{
							color:
								getFolderColor(
									item.name,
									item.node.color,
									[...currentPath, item.name].join("/"),
								) || undefined,
						}}
					/>
				) : (
					getFileIconComponent(item.name, "shrink-0", false)
				)}
				<span className="truncate">{item.name}</span>
			</td>
			<td className="py-2 px-3 text-elegant-text-muted text-[11px] pointer-events-none">
				{item.isDirectory
					? "--"
					: `${item.node.size || (item.node.content || "").length} B`}
			</td>
			<td className="py-2 px-3 text-elegant-text-muted text-[11px] pointer-events-none">
				{item.isDirectory ? "Directory" : "File"}
			</td>
			<td className="py-2 px-3 text-elegant-text-muted text-[11px] pointer-events-none">
				{item.node.lastModified
					? new Date(item.node.lastModified).toLocaleDateString()
					: "System"}
			</td>
			{inPublic && (
				<td className="py-2 px-3 text-right">
					<button
						type="button"
						onClick={(e) => {
							e.stopPropagation();
							handleDeleteItem(item.name);
						}}
						onPointerDown={(e) => e.stopPropagation()}
						className="p-1 rounded text-elegant-text-muted hover:text-red-500 hover:bg-red-500/10 cursor-pointer pointer-events-auto"
						title="Delete"
						aria-label="Delete item"
					>
						<Trash2 size={13} />
					</button>
				</td>
			)}
		</tr>
	);
}
