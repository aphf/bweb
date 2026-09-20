import { IconFolderOpen } from "nucleo-micro-bold-essential";
import type React from "react";
import { useRef } from "react";
import type { FileSystemNode } from "../../utils/fileSystem";
import { getFileIconComponent, getFolderColor } from "./fileManagerUtils";

export interface FileGridItemProps {
	item: {
		name: string;
		node: FileSystemNode;
		isDirectory: boolean;
	};
	isSelected: boolean;
	currentPath: string[];
	setSelectedItems: React.Dispatch<React.SetStateAction<string[]>>;
	handleOpenItem: (item: {
		name: string;
		node: FileSystemNode;
		isDirectory: boolean;
	}) => void;
	handleItemSelectToggle: (itemName: string, e: React.MouseEvent) => void;
}

export function FileGridItem({
	item,
	isSelected,
	currentPath,
	setSelectedItems,
	handleOpenItem,
	handleItemSelectToggle,
}: FileGridItemProps) {
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
		<button
			key={item.name}
			type="button"
			data-file-item="true"
			onPointerDown={onPointerDown}
			onPointerMove={onPointerMove}
			onPointerUp={onPointerUp}
			onPointerCancel={onPointerCancel}
			onClick={onClick}
			onContextMenu={onContextMenu}
			onDoubleClick={onDoubleClick}
			onKeyDown={onKeyDown}
			className={`group relative flex flex-col items-center justify-center p-3 rounded-lg text-center cursor-pointer transition-[background-color,border-color,box-shadow] border outline-none select-none touch-manipulation ${
				isSelected
					? "bg-elegant-card border-elegant-accent shadow-sm"
					: "border-transparent hover:bg-elegant-card hover:border-elegant-border"
			}`}
		>
			{item.isDirectory ? (
				<IconFolderOpen
					className="size-10 group-hover:scale-105 transition-transform pointer-events-none"
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
				getFileIconComponent(
					item.name,
					"group-hover:scale-105 transition-transform pointer-events-none",
					true,
				)
			)}
			<span className="mt-2 text-xs font-medium text-elegant-text-primary truncate max-w-full pointer-events-none">
				{item.name}
			</span>
		</button>
	);
}
