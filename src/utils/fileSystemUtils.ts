import type { FileSystemNode } from "./fileSystem";

export const resolvePath = (
	fileSystem: Record<string, FileSystemNode>,
	currentPath: string[],
	targetPath: string,
): FileSystemNode | null => {
	if (targetPath === "~") targetPath = "/home/neo";
	if (targetPath.startsWith("~/"))
		targetPath = `/home/neo${targetPath.substring(1)}`;

	let parts: string[] = [];
	if (targetPath.startsWith("/")) {
		parts = targetPath.split("/").filter(Boolean);
	} else {
		parts = [...currentPath, ...targetPath.split("/")].filter(Boolean);
	}

	const resolvedParts: string[] = [];
	for (const part of parts) {
		if (part === ".") continue;
		if (part === "..") {
			resolvedParts.pop();
		} else {
			resolvedParts.push(part);
		}
	}

	let current: FileSystemNode = { type: "directory", children: fileSystem };

	for (const part of resolvedParts) {
		if (current.type !== "directory" || !current.children) return null;
		current = current.children[part];
		if (!current) return null;
	}

	return current;
};

export const resolvePathArray = (
	currentPath: string[],
	targetPath: string,
): string[] => {
	if (targetPath === "~") return ["home", "neo"];
	if (targetPath.startsWith("~/")) {
		const remaining = targetPath.substring(2);
		return ["home", "neo", ...remaining.split("/").filter(Boolean)];
	}

	let parts: string[] = [];
	if (targetPath.startsWith("/")) {
		parts = targetPath.split("/").filter(Boolean);
	} else {
		parts = [...currentPath, ...targetPath.split("/")].filter(Boolean);
	}

	const resolvedParts: string[] = [];
	for (const part of parts) {
		if (part === ".") continue;
		if (part === "..") {
			resolvedParts.pop();
		} else {
			resolvedParts.push(part);
		}
	}

	return resolvedParts;
};

export const isPathInPublic = (pathArray: string[]): boolean => {
	return (
		pathArray.length >= 3 &&
		pathArray[0] === "home" &&
		pathArray[1] === "neo" &&
		pathArray[2] === "public"
	);
};

export const getPublicRelativePath = (pathArray: string[]): string => {
	if (!isPathInPublic(pathArray)) return "";
	return pathArray.slice(3).join("/");
};

export const writeFile = (
	fileSystem: Record<string, FileSystemNode>,
	currentPath: string[],
	targetFile: string,
	content: string,
	author = "neo",
): Record<string, FileSystemNode> => {
	const fs = structuredClone(fileSystem);
	const targetPathArray = resolvePathArray(currentPath, targetFile);
	if (targetPathArray.length === 0) return fs;

	const filename = targetPathArray[targetPathArray.length - 1];
	const parentPathArray = targetPathArray.slice(0, -1);

	let current: FileSystemNode = { type: "directory", children: fs };
	for (const part of parentPathArray) {
		if (!current.children) return fs;
		if (!current.children[part]) {
			current.children[part] = { type: "directory", children: {} };
		}
		current = current.children[part];
	}

	if (current && current.type === "directory" && current.children) {
		current.children[filename] = {
			type: "file",
			content,
			size: content.length,
			lastModified: Date.now(),
			author,
		};
	}

	return fs;
};

export const mkdirPath = (
	fileSystem: Record<string, FileSystemNode>,
	currentPath: string[],
	dirPath: string,
	parents = false,
): { newFileSystem: Record<string, FileSystemNode>; error?: string } => {
	const targetPathArray = resolvePathArray(currentPath, dirPath);

	if (!isPathInPublic(targetPathArray)) {
		return {
			newFileSystem: fileSystem,
			error: `mkdir: cannot create directory '${dirPath}': Permission denied (Write operations only allowed in ~/public/)`,
		};
	}

	const fs = structuredClone(fileSystem);
	let current: FileSystemNode = { type: "directory", children: fs };

	for (let i = 0; i < targetPathArray.length; i++) {
		const part = targetPathArray[i];
		if (!current.children) {
			return {
				newFileSystem: fileSystem,
				error: `mkdir: cannot create directory '${dirPath}': Not a directory`,
			};
		}

		const isLast = i === targetPathArray.length - 1;
		if (current.children[part]) {
			if (isLast && !parents) {
				return {
					newFileSystem: fileSystem,
					error: `mkdir: cannot create directory '${dirPath}': File exists`,
				};
			}
			if (current.children[part].type !== "directory") {
				return {
					newFileSystem: fileSystem,
					error: `mkdir: cannot create directory '${dirPath}': '${part}' is not a directory`,
				};
			}
		} else {
			if (!isLast && !parents) {
				return {
					newFileSystem: fileSystem,
					error: `mkdir: cannot create directory '${dirPath}': No such file or directory (use -p to create parent directories)`,
				};
			}
			current.children[part] = {
				type: "directory",
				children: {},
				lastModified: Date.now(),
				author: "neo",
			};
		}
		current = current.children[part];
	}

	return { newFileSystem: fs };
};

export const touchFilePath = (
	fileSystem: Record<string, FileSystemNode>,
	currentPath: string[],
	filePath: string,
	author = "neo",
): { newFileSystem: Record<string, FileSystemNode>; error?: string } => {
	const targetPathArray = resolvePathArray(currentPath, filePath);

	if (!isPathInPublic(targetPathArray)) {
		return {
			newFileSystem: fileSystem,
			error: `touch: cannot touch '${filePath}': Permission denied (Write operations only allowed in ~/public/)`,
		};
	}

	const filename = targetPathArray[targetPathArray.length - 1];
	const parentPathArray = targetPathArray.slice(0, -1);

	const fs = structuredClone(fileSystem);
	let current: FileSystemNode = { type: "directory", children: fs };

	for (const part of parentPathArray) {
		if (!current.children?.[part]) {
			return {
				newFileSystem: fileSystem,
				error: `touch: cannot touch '${filePath}': No such file or directory`,
			};
		}
		current = current.children[part];
		if (current.type !== "directory") {
			return {
				newFileSystem: fileSystem,
				error: `touch: cannot touch '${filePath}': Not a directory`,
			};
		}
	}

	if (!current.children) {
		return {
			newFileSystem: fileSystem,
			error: `touch: cannot touch '${filePath}': Internal error`,
		};
	}

	if (current.children[filename]) {
		current.children[filename].lastModified = Date.now();
	} else {
		current.children[filename] = {
			type: "file",
			content: "",
			size: 0,
			lastModified: Date.now(),
			author,
		};
	}

	return { newFileSystem: fs };
};

export const copyNodeTree = (
	fileSystem: Record<string, FileSystemNode>,
	currentPath: string[],
	srcPath: string,
	destPath: string,
	recursive = false,
): { newFileSystem: Record<string, FileSystemNode>; error?: string } => {
	const srcPathArray = resolvePathArray(currentPath, srcPath);
	const destPathArray = resolvePathArray(currentPath, destPath);

	if (!isPathInPublic(srcPathArray) || !isPathInPublic(destPathArray)) {
		return {
			newFileSystem: fileSystem,
			error: `cp: operation restricted to ~/public/ directory`,
		};
	}

	const srcNode = resolvePath(fileSystem, currentPath, srcPath);
	if (!srcNode) {
		return {
			newFileSystem: fileSystem,
			error: `cp: cannot stat '${srcPath}': No such file or directory`,
		};
	}

	if (srcNode.type === "directory" && !recursive) {
		return {
			newFileSystem: fileSystem,
			error: `cp: -r not specified; omitting directory '${srcPath}'`,
		};
	}

	const fs = structuredClone(fileSystem);
	const destTargetArray = [...destPathArray];

	const existingDest = resolvePath(fs, currentPath, destPath);
	if (existingDest && existingDest.type === "directory") {
		const srcName = srcPathArray[srcPathArray.length - 1];
		destTargetArray.push(srcName);
	}

	const destName = destTargetArray[destTargetArray.length - 1];
	const destParentArray = destTargetArray.slice(0, -1);

	let current: FileSystemNode = { type: "directory", children: fs };
	for (const part of destParentArray) {
		if (!current.children?.[part]) {
			return {
				newFileSystem: fileSystem,
				error: `cp: cannot create destination '${destPath}': No such file or directory`,
			};
		}
		current = current.children[part];
	}

	if (!current.children) {
		return {
			newFileSystem: fileSystem,
			error: `cp: target directory invalid`,
		};
	}

	current.children[destName] = structuredClone(srcNode);
	return { newFileSystem: fs };
};

export const moveNodeTree = (
	fileSystem: Record<string, FileSystemNode>,
	currentPath: string[],
	srcPath: string,
	destPath: string,
): { newFileSystem: Record<string, FileSystemNode>; error?: string } => {
	const srcPathArray = resolvePathArray(currentPath, srcPath);
	const destPathArray = resolvePathArray(currentPath, destPath);

	if (!isPathInPublic(srcPathArray) || !isPathInPublic(destPathArray)) {
		return {
			newFileSystem: fileSystem,
			error: `mv: operation restricted to ~/public/ directory`,
		};
	}

	const srcNode = resolvePath(fileSystem, currentPath, srcPath);
	if (!srcNode) {
		return {
			newFileSystem: fileSystem,
			error: `mv: cannot stat '${srcPath}': No such file or directory`,
		};
	}

	const fs = structuredClone(fileSystem);
	const destTargetArray = [...destPathArray];

	const existingDest = resolvePath(fs, currentPath, destPath);
	if (existingDest && existingDest.type === "directory") {
		const srcName = srcPathArray[srcPathArray.length - 1];
		destTargetArray.push(srcName);
	}

	const destName = destTargetArray[destTargetArray.length - 1];
	const destParentArray = destTargetArray.slice(0, -1);

	const srcName = srcPathArray[srcPathArray.length - 1];
	const srcParentArray = srcPathArray.slice(0, -1);
	let srcParent: FileSystemNode = { type: "directory", children: fs };
	for (const part of srcParentArray) {
		if (!srcParent.children?.[part]) break;
		srcParent = srcParent.children[part];
	}

	if (srcParent.children?.[srcName]) {
		delete srcParent.children[srcName];
	}

	let destParent: FileSystemNode = { type: "directory", children: fs };
	for (const part of destParentArray) {
		if (!destParent.children?.[part]) {
			return {
				newFileSystem: fileSystem,
				error: `mv: cannot move to '${destPath}': No such file or directory`,
			};
		}
		destParent = destParent.children[part];
	}

	if (!destParent.children) {
		return {
			newFileSystem: fileSystem,
			error: `mv: target directory invalid`,
		};
	}

	destParent.children[destName] = structuredClone(srcNode);
	return { newFileSystem: fs };
};

export const removeNodePath = (
	fileSystem: Record<string, FileSystemNode>,
	currentPath: string[],
	targetPath: string,
	recursive = false,
): { newFileSystem: Record<string, FileSystemNode>; error?: string } => {
	const targetPathArray = resolvePathArray(currentPath, targetPath);

	if (!isPathInPublic(targetPathArray)) {
		return {
			newFileSystem: fileSystem,
			error: `rm: cannot remove '${targetPath}': Permission denied (Write operations only allowed in ~/public/)`,
		};
	}

	const node = resolvePath(fileSystem, currentPath, targetPath);
	if (!node) {
		return {
			newFileSystem: fileSystem,
			error: `rm: cannot remove '${targetPath}': No such file or directory`,
		};
	}

	if (node.type === "directory" && !recursive) {
		return {
			newFileSystem: fileSystem,
			error: `rm: cannot remove '${targetPath}': Is a directory (use -r to remove directories)`,
		};
	}

	const fs = structuredClone(fileSystem);
	const targetName = targetPathArray[targetPathArray.length - 1];
	const parentPathArray = targetPathArray.slice(0, -1);

	let current: FileSystemNode = { type: "directory", children: fs };
	for (const part of parentPathArray) {
		if (!current.children?.[part]) {
			return {
				newFileSystem: fileSystem,
				error: `rm: cannot remove '${targetPath}': No such file or directory`,
			};
		}
		current = current.children[part];
	}

	if (current.children?.[targetName]) {
		delete current.children[targetName];
	}

	return { newFileSystem: fs };
};

export const generateTreeOutput = (
	rootNode: FileSystemNode,
	rootLabel: string,
	dirsOnly = false,
	maxDepth = 10,
): string => {
	let dirCount = 0;
	let fileCount = 0;
	const lines: string[] = [rootLabel];

	const traverse = (node: FileSystemNode, prefix: string, depth: number) => {
		if (depth >= maxDepth || !node.children) return;

		let entries = Object.keys(node.children);
		if (dirsOnly) {
			entries = entries.filter((k) => node.children?.[k]?.type === "directory");
		}
		entries.sort();

		for (let i = 0; i < entries.length; i++) {
			const name = entries[i];
			const child = node.children[name];
			const isLast = i === entries.length - 1;
			const branch = isLast ? "└── " : "├── ";
			const nextPrefix = prefix + (isLast ? "    " : "│   ");

			if (child.type === "directory") {
				dirCount++;
				lines.push(`${prefix}${branch}${name}`);
				traverse(child, nextPrefix, depth + 1);
			} else {
				fileCount++;
				lines.push(`${prefix}${branch}${name}`);
			}
		}
	};

	if (rootNode.type === "directory") {
		traverse(rootNode, "", 0);
	}

	lines.push("");
	const summary = dirsOnly
		? `${dirCount} directories`
		: `${dirCount} directories, ${fileCount} files`;
	lines.push(summary);

	return lines.join("\n");
};

export const getDirectoryContents = (node: FileSystemNode): string[] => {
	if (node.type !== "directory" || !node.children) return [];
	return Object.keys(node.children);
};

export const isVisitorsNotesDir = (path: string[]): boolean => {
	return path[path.length - 1] === "visitors_notes";
};
