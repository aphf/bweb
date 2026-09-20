import {
	Archive,
	Database,
	File,
	FileCode,
	FileImage,
	FileJson,
	FileText,
	Music,
	Video,
} from "lucide-react";
import React from "react";
import type { FileSystemNode } from "../../utils/fileSystem";

export const FOLDER_COLORS_STORAGE_KEY = "neo_folder_colors:v1";

export const getStoredFolderColors = (): Record<string, string> => {
	if (typeof window === "undefined") return {};
	try {
		const raw = localStorage.getItem(FOLDER_COLORS_STORAGE_KEY);
		return raw ? JSON.parse(raw) : {};
	} catch {
		return {};
	}
};

export const saveStoredFolderColor = (folderPath: string, color: string) => {
	if (typeof window === "undefined") return;
	try {
		const colors = getStoredFolderColors();
		if (!color || color === "none") {
			delete colors[folderPath];
		} else {
			colors[folderPath] = color;
		}
		localStorage.setItem(FOLDER_COLORS_STORAGE_KEY, JSON.stringify(colors));
	} catch {}
};

export const FOLDER_COLORS = [
	{ name: "Default Theme", value: "none" },
	{ name: "Blue", value: "#3b82f6" },
	{ name: "Purple", value: "#a855f7" },
	{ name: "Emerald", value: "#10b981" },
	{ name: "Amber", value: "#f59e0b" },
	{ name: "Rose", value: "#f43f5e" },
	{ name: "Cyan", value: "#06b6d4" },
];

export const getFolderColor = (
	folderName: string,
	customColor?: string,
	folderPath?: string,
) => {
	if (customColor === "none") return "";
	if (customColor) return customColor;

	if (folderPath) {
		const storedColors = getStoredFolderColors();
		const stored = storedColors[folderPath];
		if (stored === "none") return "";
		if (stored) return stored;
	}

	const name = folderName.toLowerCase();
	if (name === "gallery") return "#a855f7";
	if (name === "about") return "#f59e0b";
	if (name === "contact") return "#f43f5e";
	if (name === "public") return "#06b6d4";
	if (name === "visitors_notes" || name.includes("note")) return "#10b981";
	if (name === "projects") return "#3b82f6";
	return "";
};

export const getFileIconComponent = (
	filename: string,
	className?: string,
	isLarge = false,
) => {
	const ext = filename.split(".").pop()?.toLowerCase() || "";
	const iconSizeClass = isLarge ? "size-10" : "size-4";

	if (["db", "sqlite", "sqlite3", "sql", "db3", "mdb", "accdb"].includes(ext)) {
		return React.createElement(Database, {
			className: `${iconSizeClass} text-cyan-400 ${className || ""}`,
		});
	}
	if (
		[
			"png",
			"jpg",
			"jpeg",
			"webp",
			"svg",
			"gif",
			"ico",
			"bmp",
			"avif",
			"tiff",
		].includes(ext)
	) {
		return React.createElement(FileImage, {
			className: `${iconSizeClass} text-purple-400 ${className || ""}`,
		});
	}
	if (
		[
			"js",
			"ts",
			"tsx",
			"jsx",
			"html",
			"css",
			"scss",
			"less",
			"py",
			"sh",
			"bash",
			"cpp",
			"c",
			"h",
			"go",
			"rs",
			"java",
			"php",
			"rb",
			"vue",
			"svelte",
		].includes(ext)
	) {
		return React.createElement(FileCode, {
			className: `${iconSizeClass} text-sky-400 ${className || ""}`,
		});
	}
	if (
		["json", "yaml", "yml", "toml", "env", "xml", "config", "ini"].includes(ext)
	) {
		return React.createElement(FileJson, {
			className: `${iconSizeClass} text-amber-400 ${className || ""}`,
		});
	}
	if (["mp3", "wav", "ogg", "flac", "aac", "m4a"].includes(ext)) {
		return React.createElement(Music, {
			className: `${iconSizeClass} text-emerald-400 ${className || ""}`,
		});
	}
	if (["mp4", "webm", "mkv", "avi", "mov"].includes(ext)) {
		return React.createElement(Video, {
			className: `${iconSizeClass} text-rose-400 ${className || ""}`,
		});
	}
	if (["zip", "tar", "gz", "7z", "rar", "bz2"].includes(ext)) {
		return React.createElement(Archive, {
			className: `${iconSizeClass} text-amber-500 ${className || ""}`,
		});
	}
	if (["md", "txt", "doc", "docx", "pdf", "rtf", "log"].includes(ext)) {
		return React.createElement(FileText, {
			className: `${iconSizeClass} text-indigo-400 ${className || ""}`,
		});
	}
	return React.createElement(File, {
		className: `${iconSizeClass} text-elegant-text-secondary ${className || ""}`,
	});
};

export interface FileItemData {
	name: string;
	node: FileSystemNode;
	isDirectory: boolean;
}
