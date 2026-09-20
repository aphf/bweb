import type React from "react";
import { useEffect, useMemo, useRef, useState } from "react";
import type { TerminalMode } from "../../App";
import type { FileSystem, FileSystemNode } from "../../utils/fileSystem";
import {
	isPathInPublic,
	mkdirPath,
	removeNodePath,
	resolvePath,
	touchFilePath,
} from "../../utils/fileSystemUtils";
import { saveStoredFolderColor } from "./fileManagerUtils";
import { useFileManagerState } from "./useFileManagerState";

export function useFileManager(
	mode: TerminalMode,
	fileSystem: FileSystem,
	setFileSystem: React.Dispatch<React.SetStateAction<FileSystem>>,
) {
	const [state, dispatch] = useFileManagerState();
	const { currentPath, history, historyIndex, searchQuery, selectedItems } =
		state;

	const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
	const [previewFile, setPreviewFile] = useState<{
		name: string;
		node: FileSystemNode;
	} | null>(null);
	const [propertiesItem, setPropertiesItem] = useState<{
		name: string;
		path: string[];
		node: FileSystemNode;
		isDirectory: boolean;
	} | null>(null);

	const [sidebarWidth, setSidebarWidth] = useState(176);
	const [isDraggingSidebar, setIsDraggingSidebar] = useState(false);
	const containerRef = useRef<HTMLDivElement>(null);

	const [sortField, setSortField] = useState<
		"name" | "size" | "type" | "modified"
	>("name");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");

	const [isCreatingFile, setIsCreatingFile] = useState(false);
	const [isCreatingFolder, setIsCreatingFolder] = useState(false);
	const [newItemName, setNewItemName] = useState("");

	const isWindowed = mode === "windowed";
	const isVisible = mode !== "hidden";
	const inPublic = isPathInPublic(currentPath);

	const [showMobileSidebar, setShowMobileSidebar] = useState(false);

	const isMobile = typeof window !== "undefined" && window.innerWidth < 640;
	const initialWidth = isMobile
		? Math.max(280, Math.min(window.innerWidth - 24, 420))
		: Math.min(1040, Math.max(760, window.innerWidth * 0.85));
	const initialHeight = isMobile
		? Math.max(320, Math.min(window.innerHeight - 120, 520))
		: Math.min(680, Math.max(500, window.innerHeight * 0.78));

	const [rndState, setRndState] = useState({
		x: Math.max(12, (window.innerWidth - initialWidth) / 2),
		y: isMobile ? 44 : Math.max(45, (window.innerHeight - initialHeight) / 2),
		width: initialWidth,
		height: initialHeight,
	});

	useEffect(() => {
		if (!isDraggingSidebar) return;

		const handleMouseMove = (e: MouseEvent) => {
			if (containerRef.current) {
				const rect = containerRef.current.getBoundingClientRect();
				const newWidth = Math.max(120, Math.min(320, e.clientX - rect.left));
				setSidebarWidth(newWidth);
			}
		};

		const handleMouseUp = () => setIsDraggingSidebar(false);

		window.addEventListener("mousemove", handleMouseMove);
		window.addEventListener("mouseup", handleMouseUp);
		return () => {
			window.removeEventListener("mousemove", handleMouseMove);
			window.removeEventListener("mouseup", handleMouseUp);
		};
	}, [isDraggingSidebar]);

	useEffect(() => {
		const handleResize = () => {
			const w = Math.min(1040, Math.max(760, window.innerWidth * 0.85));
			const h = Math.min(680, Math.max(500, window.innerHeight * 0.78));
			setRndState((prev) => ({
				...prev,
				width: w,
				height: h,
			}));
		};
		window.addEventListener("resize", handleResize);
		return () => window.removeEventListener("resize", handleResize);
	}, []);

	useEffect(() => {
		if (!isVisible) return;
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") {
				dispatch({ type: "CLEAR_SELECTED" });
			}
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [isVisible, dispatch]);

	const currentNode = useMemo(() => {
		return resolvePath(fileSystem, currentPath, ".");
	}, [fileSystem, currentPath]);

	const currentChildren = useMemo(() => {
		if (currentNode?.type !== "directory" || !currentNode.children) {
			return [];
		}
		const entries = Object.entries(currentNode.children).map(
			([name, node]) => ({
				name,
				node,
				isDirectory: node.type === "directory",
			}),
		);

		const filtered = searchQuery.trim()
			? entries.filter((e) =>
					e.name.toLowerCase().includes(searchQuery.toLowerCase().trim()),
				)
			: entries;

		return filtered.sort((a, b) => {
			if (a.isDirectory && !b.isDirectory) return -1;
			if (!a.isDirectory && b.isDirectory) return 1;

			let res = 0;
			if (sortField === "name") {
				res = a.name.localeCompare(b.name);
			} else if (sortField === "size") {
				const sizeA = a.isDirectory
					? 0
					: a.node.size || (a.node.content || "").length;
				const sizeB = b.isDirectory
					? 0
					: b.node.size || (b.node.content || "").length;
				res = sizeA - sizeB;
			} else if (sortField === "type") {
				const extA = a.name.split(".").pop() || "";
				const extB = b.name.split(".").pop() || "";
				res = extA.localeCompare(extB);
			} else if (sortField === "modified") {
				const timeA = a.node.lastModified || 0;
				const timeB = b.node.lastModified || 0;
				res = timeA - timeB;
			}
			return sortOrder === "asc" ? res : -res;
		});
	}, [currentNode, searchQuery, sortField, sortOrder]);

	const selectedSet = useMemo(() => new Set(selectedItems), [selectedItems]);

	const navigateTo = (newPath: string[]) => {
		const targetNode = resolvePath(fileSystem, newPath, ".");
		if (targetNode && targetNode.type === "directory") {
			dispatch({ type: "NAVIGATE", path: newPath });
		}
	};

	const handleBack = () => dispatch({ type: "BACK" });
	const handleForward = () => dispatch({ type: "FORWARD" });

	const handleUp = () => {
		if (currentPath.length > 0) {
			const parentPath = currentPath.slice(0, -1);
			if (parentPath.length === 0) return;
			navigateTo(parentPath);
		}
	};

	const handleItemSelectToggle = (itemName: string, e: React.MouseEvent) => {
		e.stopPropagation();
		if (e.ctrlKey || e.metaKey) {
			dispatch({
				type: "SET_SELECTED",
				items: selectedSet.has(itemName)
					? selectedItems.filter((i) => i !== itemName)
					: [...selectedItems, itemName],
			});
		} else if (e.shiftKey && selectedItems.length > 0) {
			const lastSelected = selectedItems[selectedItems.length - 1];
			const lastIdx = currentChildren.findIndex((c) => c.name === lastSelected);
			const currIdx = currentChildren.findIndex((c) => c.name === itemName);
			if (lastIdx !== -1 && currIdx !== -1) {
				const start = Math.min(lastIdx, currIdx);
				const end = Math.max(lastIdx, currIdx);
				const range = currentChildren.slice(start, end + 1).map((c) => c.name);
				dispatch({
					type: "SET_SELECTED",
					items: Array.from(new Set([...selectedItems, ...range])),
				});
			} else {
				dispatch({ type: "SET_SELECTED", items: [itemName] });
			}
		} else {
			dispatch({ type: "SET_SELECTED", items: [itemName] });
		}
	};

	const handleSort = (field: "name" | "size" | "type" | "modified") => {
		if (sortField === field) {
			setSortOrder((prev) => (prev === "asc" ? "desc" : "asc"));
		} else {
			setSortField(field);
			setSortOrder("asc");
		}
	};

	const handleSetFolderColor = (folderName: string, color: string) => {
		const fullFolderPath = [...currentPath, folderName].join("/");
		saveStoredFolderColor(fullFolderPath, color);

		setFileSystem((prev) => {
			const newFs = structuredClone(prev);
			const node = resolvePath(newFs, currentPath, ".");
			if (
				node?.children?.[folderName] &&
				node.children[folderName].type === "directory"
			) {
				node.children[folderName].color = color;
			}
			return newFs;
		});
	};

	const handleOpenItem = (item: {
		name: string;
		node: FileSystemNode;
		isDirectory: boolean;
	}) => {
		if (item.isDirectory) {
			navigateTo([...currentPath, item.name]);
		} else {
			setPreviewFile({ name: item.name, node: item.node });
		}
	};

	const handleCreateFile = () => {
		if (!newItemName.trim() || !inPublic) return;
		const name = newItemName.trim();
		const res = touchFilePath(fileSystem, currentPath, name);
		if (!res.error) {
			setFileSystem(res.newFileSystem);
		}
		setIsCreatingFile(false);
		setNewItemName("");
	};

	const handleCreateFolder = () => {
		if (!newItemName.trim() || !inPublic) return;
		const name = newItemName.trim();
		const res = mkdirPath(fileSystem, currentPath, name);
		if (!res.error) {
			setFileSystem(res.newFileSystem);
		}
		setIsCreatingFolder(false);
		setNewItemName("");
	};

	const handleDeleteItem = (itemName: string) => {
		if (!inPublic) return;
		const res = removeNodePath(fileSystem, currentPath, itemName, true);
		if (!res.error) {
			setFileSystem(res.newFileSystem);
			dispatch({ type: "REMOVE_SELECTED", item: itemName });
		}
	};

	const setSelectedItems = (action: React.SetStateAction<string[]>) => {
		if (typeof action === "function") {
			dispatch({ type: "SET_SELECTED", items: action(selectedItems) });
		} else {
			dispatch({ type: "SET_SELECTED", items: action });
		}
	};

	return {
		currentPath,
		history,
		historyIndex,
		searchQuery,
		selectedItems,
		viewMode,
		setViewMode,
		previewFile,
		setPreviewFile,
		propertiesItem,
		setPropertiesItem,
		sidebarWidth,
		setSidebarWidth,
		isDraggingSidebar,
		setIsDraggingSidebar,
		containerRef,
		sortField,
		sortOrder,
		isCreatingFile,
		setIsCreatingFile,
		isCreatingFolder,
		setIsCreatingFolder,
		newItemName,
		setNewItemName,
		isWindowed,
		isVisible,
		inPublic,
		showMobileSidebar,
		setShowMobileSidebar,
		isMobile,
		rndState,
		setRndState,
		currentChildren,
		selectedSet,
		navigateTo,
		handleBack,
		handleForward,
		handleUp,
		handleItemSelectToggle,
		handleSort,
		handleSetFolderColor,
		handleOpenItem,
		handleCreateFile,
		handleCreateFolder,
		handleDeleteItem,
		setSelectedItems,
		setSearchQuery: (q: string) => dispatch({ type: "SET_SEARCH", query: q }),
		clearSelected: () => dispatch({ type: "CLEAR_SELECTED" }),
	};
}
