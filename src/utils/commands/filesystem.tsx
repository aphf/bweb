import type { FileSystemNode } from "../fileSystem";
import {
	copyNodeTree,
	generateTreeOutput,
	getDirectoryContents,
	getPublicRelativePath,
	isPathInPublic,
	isVisitorsNotesDir,
	mkdirPath,
	moveNodeTree,
	removeNodePath,
	resolvePath,
	resolvePathArray,
	touchFilePath,
} from "../fileSystemUtils";
import type { Command } from "./types";

export const filesystemCommands: Record<string, Command> = {
	pwd: {
		description: "Print working directory",
		execute: (_args, { currentPath }) => `/${currentPath.join("/")}`,
	},
	ls: {
		description: "List directory contents",
		execute: async (args, { currentPath, fileSystem }) => {
			const flags = args.filter((arg) => arg.startsWith("-"));
			const targets = args.filter((arg) => !arg.startsWith("-"));

			const showHidden = flags.some((f) => f.includes("a"));
			const longFormat = flags.some((f) => f.includes("l"));
			const humanReadable = flags.some((f) => f.includes("h"));

			const targetPath = targets[0] || ".";
			const targetNode = resolvePath(fileSystem, currentPath, targetPath);

			if (!targetNode) {
				return `ls: cannot access '${targetPath}': No such file or directory`;
			}

			if (targetNode.type === "file") {
				return targetNode.content || "";
			}

			if (targetNode.type === "directory") {
				const contents = getDirectoryContents(targetNode);
				const filtered = showHidden
					? contents
					: contents.filter((c) => !c.startsWith(".") || c === ".bashrc");

				if (longFormat) {
					return (
						<div className="flex flex-col font-mono text-sm">
							{filtered.map((item) => {
								const node = targetNode.children?.[item];
								const isDir = node?.type === "directory";
								const permissions = isDir ? "drwxr-xr-x" : "-rw-r--r--";
								const author = node?.author || "neo";
								const owner = `${author} neo`;

								let size = node?.size || node?.content?.length || 0;
								if (isDir) size = 4096;

								let sizeStr = size.toString();
								if (humanReadable) {
									if (size < 1024) sizeStr = `${size}B`;
									else if (size < 1024 * 1024)
										sizeStr = `${(size / 1024).toFixed(1)}K`;
									else sizeStr = `${(size / (1024 * 1024)).toFixed(1)}M`;
								}

								const date = node?.lastModified
									? new Date(node.lastModified)
									: new Date();
								const dateStr = date.toLocaleDateString("en-US", {
									month: "short",
									day: "numeric",
									hour: "numeric",
									minute: "numeric",
									hour12: false,
								});

								return (
									<div
										key={item}
										className="grid grid-cols-[100px_150px_80px_120px_1fr] gap-2 hover:bg-white/5 p-0.5 rounded items-center"
									>
										<span className="text-elegant-text-muted">
											{permissions}
										</span>
										<span
											className="text-elegant-text-secondary font-bold text-base truncate"
											title={owner}
										>
											{owner}
										</span>
										<span className="text-elegant-text-secondary text-right">
											{sizeStr}
										</span>
										<span className="text-elegant-text-muted text-right">
											{dateStr}
										</span>
										<span
											className={`${isDir ? "text-elegant-accent font-bold" : "text-elegant-text-primary"} ml-2`}
										>
											{item}
											{isDir ? "/" : ""}
										</span>
									</div>
								);
							})}
						</div>
					);
				}

				return (
					<div className="flex flex-wrap gap-4">
						{filtered.map((item) => {
							const isDir = targetNode.children?.[item]?.type === "directory";
							return (
								<span
									key={item}
									className={
										isDir
											? "text-elegant-accent font-bold"
											: "text-elegant-text-primary"
									}
								>
									{item}
									{isDir ? "/" : ""}
								</span>
							);
						})}
					</div>
				);
			}

			return "";
		},
	},
	cat: {
		description: "Concatenate and print files",
		execute: async (args, { currentPath, fileSystem }) => {
			if (args.length === 0) return "cat: missing operand";

			const pathParts = args[0].split("/");
			const isInVisitorsNotes =
				isVisitorsNotesDir(currentPath) || pathParts.includes("visitors_notes");

			if (isInVisitorsNotes) {
				const filename = pathParts[pathParts.length - 1];
				try {
					const response = await fetch(`/api/notes/${filename}`);
					if (response.status === 404)
						return `cat: ${filename}: No such file or directory`;
					if (!response.ok) {
						const err = await response.json();
						throw new Error(err.error || "Failed to fetch note");
					}
					const note = await response.json();
					return note.content;
				} catch (e: unknown) {
					return `Error: ${e instanceof Error ? e.message : "Unknown error"}`;
				}
			}

			const targetNode = resolvePath(fileSystem, currentPath, args[0]);

			if (!targetNode) {
				return `cat: ${args[0]}: No such file or directory`;
			}

			if (targetNode.type === "directory") {
				return `cat: ${args[0]}: Is a directory`;
			}

			return targetNode.content || "";
		},
	},
	mkdir: {
		description: "Create a directory in ~/public (persistent in D1)",
		usage: "mkdir [-p] <directory>",
		execute: async (args, { currentPath, fileSystem, setFileSystem }) => {
			if (args.length === 0) return "mkdir: missing operand";

			const parents = args.includes("-p");
			const targets = args.filter((a) => a !== "-p");
			if (targets.length === 0) return "mkdir: missing operand";

			const targetDir = targets[0];
			const { newFileSystem, error } = mkdirPath(
				fileSystem,
				currentPath,
				targetDir,
				parents,
			);

			if (error) return error;

			if (setFileSystem) {
				setFileSystem(newFileSystem);
			}

			const targetPathArray = resolvePathArray(currentPath, targetDir);
			const relPath = getPublicRelativePath(targetPathArray);
			if (relPath) {
				try {
					await fetch("/api/public_fs", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							path: relPath,
							type: "directory",
							author: "neo",
						}),
					});
				} catch (e) {
					console.warn("D1 sync warning:", e);
				}
			}

			return "";
		},
	},
	touch: {
		description: "Create an empty file in ~/public (persistent in D1)",
		usage: "touch <file>",
		execute: async (args, { currentPath, fileSystem, setFileSystem }) => {
			if (args.length === 0) return "touch: missing file operand";

			const filePath = args[0];
			const { newFileSystem, error } = touchFilePath(
				fileSystem,
				currentPath,
				filePath,
			);

			if (error) return error;

			if (setFileSystem) {
				setFileSystem(newFileSystem);
			}

			const targetPathArray = resolvePathArray(currentPath, filePath);
			const relPath = getPublicRelativePath(targetPathArray);
			if (relPath) {
				try {
					await fetch("/api/public_fs", {
						method: "POST",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							path: relPath,
							type: "file",
							content: "",
							author: "neo",
						}),
					});
				} catch (e) {
					console.warn("D1 sync warning:", e);
				}
			}

			return "";
		},
	},
	cp: {
		description: "Copy files or directories within ~/public",
		usage: "cp [-r] <source> <destination>",
		execute: async (args, { currentPath, fileSystem, setFileSystem }) => {
			const recursive = args.includes("-r") || args.includes("-R");
			const targets = args.filter((a) => !a.startsWith("-"));

			if (targets.length < 2) {
				return "cp: missing destination file operand after source";
			}

			const [src, dest] = targets;
			const { newFileSystem, error } = copyNodeTree(
				fileSystem,
				currentPath,
				src,
				dest,
				recursive,
			);

			if (error) return error;

			if (setFileSystem) {
				setFileSystem(newFileSystem);
			}

			const srcArray = resolvePathArray(currentPath, src);
			const destArray = resolvePathArray(currentPath, dest);
			const srcRel = getPublicRelativePath(srcArray);
			const destRel = getPublicRelativePath(destArray);

			if (srcRel && destRel) {
				try {
					await fetch("/api/public_fs", {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							action: "cp",
							source: srcRel,
							destination: destRel,
						}),
					});
				} catch (e) {
					console.warn("D1 sync warning:", e);
				}
			}

			return "";
		},
	},
	mv: {
		description: "Move or rename files or directories within ~/public",
		usage: "mv <source> <destination>",
		execute: async (args, { currentPath, fileSystem, setFileSystem }) => {
			if (args.length < 2) {
				return "mv: missing destination file operand after source";
			}

			const [src, dest] = args;
			const { newFileSystem, error } = moveNodeTree(
				fileSystem,
				currentPath,
				src,
				dest,
			);

			if (error) return error;

			if (setFileSystem) {
				setFileSystem(newFileSystem);
			}

			const srcArray = resolvePathArray(currentPath, src);
			const destArray = resolvePathArray(currentPath, dest);
			const srcRel = getPublicRelativePath(srcArray);
			const destRel = getPublicRelativePath(destArray);

			if (srcRel && destRel) {
				try {
					await fetch("/api/public_fs", {
						method: "PUT",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify({
							action: "mv",
							source: srcRel,
							destination: destRel,
						}),
					});
				} catch (e) {
					console.warn("D1 sync warning:", e);
				}
			}

			return "";
		},
	},
	rm: {
		description:
			"Remove a file or directory (in ~/public or visitor notes for Admin)",
		usage: "rm [-r] <filename|path>",
		execute: async (args, { currentPath, user, fileSystem, setFileSystem }) => {
			const recursive = args.includes("-r") || args.includes("-R");
			const targets = args.filter((a) => !a.startsWith("-"));

			if (targets.length === 0) return "rm: missing operand";
			const target = targets[0];

			const targetPathArray = resolvePathArray(currentPath, target);

			const isVisitorNote =
				isVisitorsNotesDir(currentPath) || target.includes("visitors_notes/");

			if (isVisitorNote) {
				if (user !== "root") {
					return 'rm: permission denied. Admin login required for visitor notes. Use "login <password>" first.';
				}

				const filename = target.includes("visitors_notes/")
					? target.split("visitors_notes/")[1]
					: target;

				try {
					const res = await fetch(`/api/notes/${filename}`, {
						method: "DELETE",
					});

					if (res.status === 401) {
						return "rm: permission denied. Session expired, please login again.";
					}
					if (res.status === 404) {
						return `rm: cannot remove '${filename}': No such file`;
					}
					if (!res.ok) {
						const data = await res.json();
						throw new Error(data.error || "Failed to delete");
					}

					if (setFileSystem) {
						setFileSystem((prev: Record<string, FileSystemNode>) => {
							const updated = structuredClone(prev);
							const visitorsDir =
								updated.home?.children?.neo?.children?.visitors_notes;
							if (visitorsDir?.children?.[filename]) {
								delete visitorsDir.children[filename];
							}
							return updated;
						});
					}

					return `removed '${filename}'`;
				} catch (e: unknown) {
					return `rm: error: ${e instanceof Error ? e.message : "Unknown error"}`;
				}
			}

			if (!isPathInPublic(targetPathArray)) {
				return `rm: cannot remove '${target}': Permission denied (Write operations only allowed in ~/public/)`;
			}

			const { newFileSystem, error } = removeNodePath(
				fileSystem,
				currentPath,
				target,
				recursive,
			);

			if (error) return error;

			if (setFileSystem) {
				setFileSystem(newFileSystem);
			}

			const relPath = getPublicRelativePath(targetPathArray);
			if (relPath) {
				try {
					await fetch(
						`/api/public_fs?path=${encodeURIComponent(relPath)}&recursive=${recursive}`,
						{ method: "DELETE" },
					);
				} catch (e) {
					console.warn("D1 delete sync warning:", e);
				}
			}

			return `removed '${target}'`;
		},
	},
	tree: {
		description: "List directory contents in a tree-like ASCII structure",
		usage: "tree [path] [-d] [-L level]",
		execute: (args, { currentPath, fileSystem }) => {
			const dirsOnly = args.includes("-d");
			let maxDepth = 10;
			const lIdx = args.indexOf("-L");
			if (lIdx !== -1 && args[lIdx + 1]) {
				maxDepth = parseInt(args[lIdx + 1], 10) || 10;
			}

			const targets = args.filter(
				(a, i) => !a.startsWith("-") && (i === 0 || args[i - 1] !== "-L"),
			);
			const targetPath = targets[0] || ".";

			const targetNode = resolvePath(fileSystem, currentPath, targetPath);
			if (!targetNode) {
				return `tree: '${targetPath}': No such file or directory`;
			}

			const rootLabel =
				targetPath === "." ? `/${currentPath.join("/")}` : targetPath;
			return (
				<pre className="font-mono text-sm leading-tight text-elegant-text-primary whitespace-pre">
					{generateTreeOutput(targetNode, rootLabel, dirsOnly, maxDepth)}
				</pre>
			);
		},
	},
	head: {
		description: "Output the first part of files",
		usage: "head [-n lines] <file>",
		execute: async (args, { currentPath, fileSystem }) => {
			let linesCount = 10;
			const nIdx = args.indexOf("-n");
			if (nIdx !== -1 && args[nIdx + 1]) {
				linesCount = parseInt(args[nIdx + 1], 10) || 10;
			}

			const targets = args.filter(
				(a, i) => !a.startsWith("-") && (i === 0 || args[i - 1] !== "-n"),
			);
			if (targets.length === 0) return "head: missing file operand";

			const targetFile = targets[0];
			const pathParts = targetFile.split("/");
			const isInVisitorsNotes =
				isVisitorsNotesDir(currentPath) || pathParts.includes("visitors_notes");

			let content = "";

			if (isInVisitorsNotes) {
				const filename = pathParts[pathParts.length - 1];
				try {
					const response = await fetch(`/api/notes/${filename}`);
					if (response.status === 404)
						return `head: cannot open '${filename}' for reading: No such file`;
					if (!response.ok) throw new Error("Failed to read file");
					const note = await response.json();
					content = note.content || "";
				} catch (e: unknown) {
					return `head: error: ${e instanceof Error ? e.message : "Unknown error"}`;
				}
			} else {
				const node = resolvePath(fileSystem, currentPath, targetFile);
				if (!node)
					return `head: cannot open '${targetFile}': No such file or directory`;
				if (node.type === "directory")
					return `head: error reading '${targetFile}': Is a directory`;
				content = node.content || "";
			}

			const lines = content.split("\n").slice(0, linesCount);
			return lines.join("\n");
		},
	},
	tail: {
		description: "Output the last part of files",
		usage: "tail [-n lines] <file>",
		execute: async (args, { currentPath, fileSystem }) => {
			let linesCount = 10;
			const nIdx = args.indexOf("-n");
			if (nIdx !== -1 && args[nIdx + 1]) {
				linesCount = parseInt(args[nIdx + 1], 10) || 10;
			}

			const targets = args.filter(
				(a, i) => !a.startsWith("-") && (i === 0 || args[i - 1] !== "-n"),
			);
			if (targets.length === 0) return "tail: missing file operand";

			const targetFile = targets[0];
			const pathParts = targetFile.split("/");
			const isInVisitorsNotes =
				isVisitorsNotesDir(currentPath) || pathParts.includes("visitors_notes");

			let content = "";

			if (isInVisitorsNotes) {
				const filename = pathParts[pathParts.length - 1];
				try {
					const response = await fetch(`/api/notes/${filename}`);
					if (response.status === 404)
						return `tail: cannot open '${filename}' for reading: No such file`;
					if (!response.ok) throw new Error("Failed to read file");
					const note = await response.json();
					content = note.content || "";
				} catch (e: unknown) {
					return `tail: error: ${e instanceof Error ? e.message : "Unknown error"}`;
				}
			} else {
				const node = resolvePath(fileSystem, currentPath, targetFile);
				if (!node)
					return `tail: cannot open '${targetFile}': No such file or directory`;
				if (node.type === "directory")
					return `tail: error reading '${targetFile}': Is a directory`;
				content = node.content || "";
			}

			const lines = content.split("\n");
			const tailLines = lines.slice(Math.max(0, lines.length - linesCount));
			return tailLines.join("\n");
		},
	},
	share: {
		description: "share a visitor note via public link",
		usage: "share <filename>",
		execute: async (args, { currentPath }) => {
			if (!args[0]) return "share: missing file operand";

			let filename = args[0];
			let isVisitorNote = false;

			if (isVisitorsNotesDir(currentPath)) {
				isVisitorNote = true;
			} else if (filename.includes("visitors_notes/")) {
				isVisitorNote = true;
				filename = filename.split("visitors_notes/")[1];
			}

			if (!isVisitorNote) {
				return "share: can only share files from visitors_notes directory";
			}

			const url = `${window.location.origin}/shared/notes/${encodeURIComponent(filename)}`;

			return (
				<div className="text-elegant-text-primary">
					<div className="mb-2">Shareable Link generated:</div>
					<a
						href={url}
						target="_blank"
						rel="noopener noreferrer"
						className="text-elegant-accent hover:underline break-all"
					>
						{url}
					</a>
				</div>
			);
		},
	},
	grep: {
		description: "Search for notes by filename pattern",
		usage: "grep <pattern>",
		execute: async (args) => {
			if (args.length === 0) {
				return "Usage: grep <pattern>\nSearches all visitor notes by filename.";
			}
			const pattern = args[0];
			try {
				const response = await fetch(
					`/api/notes?search=${encodeURIComponent(pattern)}`,
				);
				if (!response.ok) {
					const err = await response.json();
					return `grep: error fetching notes: ${err.error || response.statusText}`;
				}
				const results = await response.json();
				if (results.length === 0) {
					return (
						<span className="text-elegant-text-muted">
							No notes matching "{pattern}"
						</span>
					);
				}
				return (
					<div>
						<div className="text-elegant-text-muted mb-2">
							Found {results.length} note{results.length !== 1 ? "s" : ""}{" "}
							matching "{pattern}":
						</div>
						<div className="grid grid-cols-2 gap-2">
							{results.map((note: { filename: string; updated_at: number }) => (
								<div key={note.filename} className="flex justify-between">
									<span className="text-elegant-text-primary">
										{note.filename}
									</span>
									<span className="text-elegant-text-muted text-xs">
										{new Date(note.updated_at).toLocaleDateString()}
									</span>
								</div>
							))}
						</div>
					</div>
				);
			} catch (e: unknown) {
				const msg = e instanceof Error ? e.message : String(e);
				return `grep: error: ${msg}`;
			}
		},
	},
	dolphin: {
		description: "Launch Dolphin File Manager GUI",
		execute: () => {
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("open-filemanager"));
			}
			return "Launching Dolphin File Manager...";
		},
	},
	files: {
		description: "Open File Manager GUI",
		execute: () => {
			if (typeof window !== "undefined") {
				window.dispatchEvent(new CustomEvent("open-filemanager"));
			}
			return "Launching File Manager...";
		},
	},
};
