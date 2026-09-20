import { Check, Copy, HardDrive, Info, X } from "lucide-react";
import {
	IconFileContentFill18,
	IconFolderOpenFill18,
} from "nucleo-ui-essential-fill-18";
import { useState } from "react";
import type { FileSystemNode } from "../../utils/fileSystem";

interface FilePropertiesModalProps {
	name: string;
	path: string[];
	node: FileSystemNode;
	isDirectory: boolean;
	onClose: () => void;
	getFolderColor?: (
		name: string,
		customColor?: string,
		folderPath?: string,
	) => string;
	getFileIconComponent?: (
		filename: string,
		className?: string,
		isLarge?: boolean,
	) => React.ReactNode;
}

const formatBytes = (bytes: number): string => {
	if (bytes === 0) return "0 Bytes";
	const k = 1024;
	const sizes = ["Bytes", "KB", "MB", "GB"];
	const i = Math.floor(Math.log(bytes) / Math.log(k));
	return `${Number.parseFloat((bytes / k ** i).toFixed(2))} ${sizes[i]}`;
};

const getMimeType = (filename: string, isDirectory: boolean): string => {
	if (isDirectory) return "inode/directory (Folder)";
	const ext = filename.split(".").pop()?.toLowerCase() || "";
	const mimeMap: Record<string, string> = {
		txt: "text/plain (Plain Text)",
		md: "text/markdown (Markdown Document)",
		json: "application/json (JSON Document)",
		js: "application/javascript (JavaScript Source)",
		ts: "application/typescript (TypeScript Source)",
		tsx: "application/typescript-jsx (React TSX)",
		jsx: "application/javascript-jsx (React JSX)",
		html: "text/html (HTML Document)",
		css: "text/css (Stylesheet)",
		sh: "application/x-sh (Shell Script)",
		bash: "application/x-sh (Bash Script)",
		py: "text/x-python (Python Script)",
		db: "application/vnd.sqlite3 (Database File)",
		sqlite: "application/vnd.sqlite3 (Database File)",
		png: "image/png (PNG Image)",
		jpg: "image/jpeg (JPEG Image)",
		jpeg: "image/jpeg (JPEG Image)",
		svg: "image/svg+xml (Scalable Vector Graphics)",
		webp: "image/webp (WebP Image)",
		gif: "image/gif (GIF Image)",
		pdf: "application/pdf (PDF Document)",
		zip: "application/zip (Zip Archive)",
	};
	return (
		mimeMap[ext] ||
		`application/octet-stream (${ext ? `.${ext.toUpperCase()} file` : "File"})`
	);
};

const countFolderStats = (
	node: FileSystemNode,
): { totalSize: number; fileCount: number; dirCount: number } => {
	let totalSize = 0;
	let fileCount = 0;
	let dirCount = 0;

	const traverse = (n: FileSystemNode) => {
		if (n.children) {
			for (const child of Object.values(n.children)) {
				if (child.type === "directory") {
					dirCount++;
					traverse(child);
				} else {
					fileCount++;
					totalSize += child.size || (child.content || "").length;
				}
			}
		}
	};

	traverse(node);
	return { totalSize, fileCount, dirCount };
};

export const FilePropertiesModal = ({
	name,
	path,
	node,
	isDirectory,
	onClose,
	getFolderColor,
	getFileIconComponent,
}: FilePropertiesModalProps) => {
	const [copied, setCopied] = useState(false);

	const fullPath = `/${[...path, name].join("/")}`;

	const handleCopyPath = () => {
		navigator.clipboard.writeText(fullPath);
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	const folderStats = isDirectory ? countFolderStats(node) : null;
	const sizeBytes = isDirectory
		? folderStats?.totalSize || 0
		: node.size || (node.content || "").length;

	const lineCount =
		!isDirectory && node.content ? node.content.split("\n").length : null;
	const charCount = !isDirectory && node.content ? node.content.length : null;

	const formattedDate = node.lastModified
		? new Date(node.lastModified).toLocaleString(undefined, {
				dateStyle: "medium",
				timeStyle: "medium",
			})
		: "System (Permanent)";

	const isPublic = path.includes("public") || name === "public";
	const isRoot = node.author === "root";

	return (
		<dialog
			open
			aria-modal="true"
			aria-labelledby="properties-title"
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs border-0 w-full h-full max-w-none max-h-none m-0"
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<div className="w-full max-w-md flex flex-col rounded-xl border border-elegant-border bg-elegant-card text-elegant-text-primary shadow-2xl overflow-hidden font-mono text-xs select-none">
				{/* Top Header */}
				<div className="flex items-center justify-between px-4 py-3 bg-elegant-card border-b border-elegant-border">
					<div className="flex items-center gap-2">
						<Info className="size-4 text-elegant-accent" />
						<span
							id="properties-title"
							className="font-bold text-sm text-elegant-text-primary"
						>
							Properties
						</span>
					</div>
					<button
						type="button"
						onClick={onClose}
						className="p-1 rounded hover:bg-elegant-bg text-elegant-text-muted hover:text-elegant-text-primary transition-colors cursor-pointer"
						aria-label="Close properties dialog"
					>
						<X size={15} />
					</button>
				</div>

				{/* Identity Banner */}
				<div className="flex items-center gap-3.5 p-4 bg-elegant-bg border-b border-elegant-border">
					<div className="flex items-center justify-center size-14 rounded-xl bg-elegant-card border border-elegant-border/80 shadow-xs shrink-0">
						{isDirectory ? (
							<IconFolderOpenFill18
								size={32}
								style={{
									color:
										getFolderColor?.(
											name,
											node.color,
											[...path, name].join("/"),
										) || undefined,
								}}
							/>
						) : getFileIconComponent ? (
							getFileIconComponent(name, "size-8", true)
						) : (
							<IconFileContentFill18
								size={28}
								className="text-elegant-accent"
							/>
						)}
					</div>
					<div className="min-w-0 flex-1">
						<div className="font-bold text-sm text-elegant-text-primary truncate">
							{name}
						</div>
						<div className="text-[11px] text-elegant-text-secondary truncate mt-0.5">
							{getMimeType(name, isDirectory)}
						</div>
					</div>
				</div>

				{/* Metadata Grid */}
				<div className="p-4 space-y-3 bg-elegant-card overflow-y-auto max-h-[60vh]">
					{/* Location */}
					<div className="flex flex-col gap-1">
						<span className="text-[10px] font-semibold uppercase tracking-wider text-elegant-text-muted">
							Location
						</span>
						<div className="flex items-center justify-between gap-2 px-2.5 py-1.5 rounded bg-elegant-bg border border-elegant-border text-[11px] text-elegant-text-primary">
							<span className="truncate font-mono">{fullPath}</span>
							<button
								type="button"
								onClick={handleCopyPath}
								className="p-1 rounded hover:bg-elegant-card text-elegant-text-muted hover:text-elegant-text-primary transition-colors cursor-pointer shrink-0"
								title="Copy Path"
								aria-label="Copy Path"
							>
								{copied ? (
									<Check size={12} className="text-emerald-400" />
								) : (
									<Copy size={12} />
								)}
							</button>
						</div>
					</div>

					{/* Size / Content Details */}
					<div className="grid grid-cols-2 gap-3 pt-1">
						<div className="flex flex-col gap-0.5">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-elegant-text-muted">
								Size
							</span>
							<span className="text-xs font-semibold text-elegant-text-primary">
								{formatBytes(sizeBytes)}
							</span>
							<span className="text-[10px] text-elegant-text-muted">
								({sizeBytes.toLocaleString()} bytes)
							</span>
						</div>

						{isDirectory ? (
							<div className="flex flex-col gap-0.5">
								<span className="text-[10px] font-semibold uppercase tracking-wider text-elegant-text-muted">
									Contents
								</span>
								<span className="text-xs font-medium text-elegant-text-primary">
									{folderStats?.fileCount || 0} files
								</span>
								<span className="text-[10px] text-elegant-text-muted">
									{folderStats?.dirCount || 0} subfolders
								</span>
							</div>
						) : (
							<div className="flex flex-col gap-0.5">
								<span className="text-[10px] font-semibold uppercase tracking-wider text-elegant-text-muted">
									Structure
								</span>
								<span className="text-xs font-medium text-elegant-text-primary">
									{lineCount !== null ? `${lineCount} lines` : "Binary / Raw"}
								</span>
								<span className="text-[10px] text-elegant-text-muted">
									{charCount !== null ? `${charCount} characters` : ""}
								</span>
							</div>
						)}
					</div>

					<div className="h-px bg-elegant-border/60 my-2" />

					{/* Timestamps & Author */}
					<div className="grid grid-cols-2 gap-3">
						<div className="flex flex-col gap-0.5">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-elegant-text-muted">
								Modified
							</span>
							<span className="text-[11px] text-elegant-text-secondary leading-snug">
								{formattedDate}
							</span>
						</div>

						<div className="flex flex-col gap-0.5">
							<span className="text-[10px] font-semibold uppercase tracking-wider text-elegant-text-muted">
								Owner / Author
							</span>
							<span className="text-[11px] font-semibold text-elegant-text-primary">
								{node.author || (isRoot ? "root" : "neo")}
							</span>
						</div>
					</div>

					<div className="h-px bg-elegant-border/60 my-2" />

					{/* Permissions & Security */}
					<div className="flex items-center justify-between p-2.5 rounded bg-elegant-bg border border-elegant-border text-xs">
						<div className="flex items-center gap-2">
							<HardDrive className="size-4 text-elegant-text-muted shrink-0" />
							<div className="flex flex-col">
								<span className="text-[11px] font-medium text-elegant-text-primary">
									{isPublic
										? "Read & Write"
										: isRoot
											? "Protected System"
											: "Read-Only"}
								</span>
								<span className="text-[10px] text-elegant-text-muted font-mono">
									{isDirectory
										? isPublic
											? "drwxrwxr-x"
											: "dr-xr-xr-x"
										: isPublic
											? "-rw-rw-r--"
											: "-r--r--r--"}
								</span>
							</div>
						</div>
						<span
							className={`text-[10px] font-bold px-2 py-0.5 rounded ${
								isPublic
									? "bg-emerald-500/15 text-emerald-400 border border-emerald-500/30"
									: "bg-elegant-card text-elegant-text-muted border border-elegant-border"
							}`}
						>
							{isPublic ? "Writable" : "Protected"}
						</span>
					</div>
				</div>

				{/* Footer Button */}
				<div className="p-3 bg-elegant-card border-t border-elegant-border flex justify-end">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-1.5 rounded-lg bg-elegant-accent text-elegant-bg font-semibold text-xs hover:bg-elegant-accent-hover active:scale-95 transition-[background-color,transform] cursor-pointer shadow-xs"
					>
						Close
					</button>
				</div>
			</div>
		</dialog>
	);
};
