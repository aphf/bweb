import { useCallback, useEffect, useState } from "react";
import {
	type FileSystem,
	type FileSystemNode,
	initialFileSystem,
} from "../../utils/fileSystem";
import { listNotes } from "../../utils/notesApi";

type NoteMetadata = {
	filename: string;
	size?: number;
	updated_at?: number;
	author?: string | null;
};

interface PublicItem {
	path: string;
	type: "file" | "directory";
	content: string | null;
	size: number;
	author: string | null;
	updated_at: number;
}

const addPreloadedNotes = (
	fileSystem: FileSystem,
	notes: NoteMetadata[],
): FileSystem => {
	const home = fileSystem.home?.children;
	const neo = home?.neo?.children;
	const visitorsDir = neo?.visitors_notes;
	if (!home || !neo || !visitorsDir) return fileSystem;

	const children: Record<string, FileSystemNode> = {};
	for (const note of notes) {
		children[note.filename] = {
			type: "file",
			content: "",
			size: note.size || 0,
			lastModified: note.updated_at,
			author: note.author ?? undefined,
		};
	}

	return {
		...fileSystem,
		home: {
			...fileSystem.home,
			children: {
				...home,
				neo: {
					...home.neo,
					children: {
						...neo,
						visitors_notes: { ...visitorsDir, children },
					},
				},
			},
		},
	};
};

const buildPublicTree = (
	items: PublicItem[],
	fallbackPublic: FileSystemNode,
	timestamp: number,
): FileSystemNode => {
	if (!items || items.length === 0) return fallbackPublic;

	const root: FileSystemNode = {
		type: "directory",
		children: {},
		lastModified: timestamp,
		author: "neo",
	};

	for (const item of items) {
		const parts = item.path.split("/").filter(Boolean);
		if (parts.length === 0) continue;

		let current = root;
		for (let i = 0; i < parts.length; i++) {
			const part = parts[i];
			const isLast = i === parts.length - 1;

			if (!current.children) {
				current.children = {};
			}

			if (isLast) {
				current.children[part] = {
					type: item.type,
					content: item.content || "",
					size: item.size || (item.content ? item.content.length : 0),
					lastModified: item.updated_at || timestamp,
					author: item.author || "neo",
					children: item.type === "directory" ? {} : undefined,
				};
			} else {
				if (!current.children[part]) {
					current.children[part] = {
						type: "directory",
						children: {},
						lastModified: timestamp,
						author: "neo",
					};
				}
				current = current.children[part];
			}
		}
	}

	return root;
};

let globalFs: FileSystem = initialFileSystem;
const listeners = new Set<(fs: FileSystem) => void>();
let preloadPromise: Promise<void> | null = null;

const updateGlobalFs = (
	updater: FileSystem | ((prev: FileSystem) => FileSystem),
) => {
	if (typeof updater === "function") {
		globalFs = updater(globalFs);
	} else {
		globalFs = updater;
	}
	for (const listener of listeners) {
		listener(globalFs);
	}
};

const preloadFileSystemOnce = () => {
	if (preloadPromise) return preloadPromise;

	preloadPromise = (async () => {
		try {
			const [notes, publicFiles] = await Promise.all([
				listNotes().catch(() => []),
				fetch("/api/public_fs")
					.then((res) => (res.ok ? res.json() : null))
					.catch(() => null),
			]);

			updateGlobalFs((prev) => {
				let updated = prev;
				if (Array.isArray(notes) && notes.length > 0) {
					updated = addPreloadedNotes(updated, notes);
				}
				if (Array.isArray(publicFiles) && publicFiles.length > 0) {
					const now = Date.now();
					const publicDir = buildPublicTree(
						publicFiles as PublicItem[],
						{ type: "directory", children: {} },
						now,
					);
					const home = updated.home?.children;
					const neoNode = home?.neo;
					if (home && neoNode?.children) {
						updated = {
							...updated,
							home: {
								...updated.home,
								children: {
									...home,
									neo: {
										...neoNode,
										children: {
											...neoNode.children,
											public: publicDir,
										},
									},
								},
							},
						};
					}
				}
				return updated;
			});
		} catch {}
	})();

	return preloadPromise;
};

export const useFileSystem = () => {
	const [fileSystem, setFileSystemState] = useState<FileSystem>(() => globalFs);
	const [currentPath, setCurrentPath] = useState<string[]>(["home", "neo"]);

	useEffect(() => {
		listeners.add(setFileSystemState);
		preloadFileSystemOnce();

		return () => {
			listeners.delete(setFileSystemState);
		};
	}, []);

	const setFileSystem = useCallback(
		(updater: React.SetStateAction<FileSystem>) => {
			updateGlobalFs(updater);
		},
		[],
	);

	const getPromptPath = useCallback(() => {
		const pathStr = `/${currentPath.join("/")}`;
		if (pathStr === "/home/neo") return "~";
		if (pathStr.startsWith("/home/neo/")) {
			return `~${pathStr.substring("/home/neo".length)}`;
		}
		return pathStr;
	}, [currentPath]);

	return {
		fileSystem,
		setFileSystem,
		currentPath,
		setCurrentPath,
		getPromptPath,
	};
};
