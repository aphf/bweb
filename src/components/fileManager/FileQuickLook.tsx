import { Check, Copy, Download, ExternalLink, X } from "lucide-react";
import { IconFileContentFill18 } from "nucleo-ui-essential-fill-18";
import { useState } from "react";
import { useNavigate } from "react-router";
import type { FileSystemNode } from "../../utils/fileSystem";

interface FileQuickLookProps {
	filename: string;
	node: FileSystemNode;
	onClose: () => void;
}

export const FileQuickLook = ({
	filename,
	node,
	onClose,
}: FileQuickLookProps) => {
	const [copied, setCopied] = useState(false);
	const navigate = useNavigate();

	const handleCopy = () => {
		if (node.content) {
			navigator.clipboard.writeText(node.content);
			setCopied(true);
			setTimeout(() => setCopied(false), 2000);
		}
	};

	const handleDownload = () => {
		if (!node.content) return;
		const blob = new Blob([node.content], { type: "text/plain;charset=utf-8" });
		const url = URL.createObjectURL(blob);
		const a = document.createElement("a");
		a.href = url;
		a.download = filename;
		a.click();
		URL.revokeObjectURL(url);
	};

	const formattedDate = node.lastModified
		? new Date(node.lastModified).toLocaleString(undefined, {
				dateStyle: "medium",
				timeStyle: "short",
			})
		: "Unknown date";

	const renderContentWithLinks = (text: string) => {
		const pattern =
			/(https?:\/\/[^\s]+|mailto:[^\s]+|\/(?:gallery|projects|about|contact|notes|terminal)\b|[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,})/g;
		const rawParts = text.split(pattern);
		let offset = 0;
		const tokens = rawParts.map((part) => {
			const start = offset;
			offset += part.length;
			return {
				id: `token-${start}-${part.slice(0, 10)}`,
				part,
			};
		});

		return tokens.map(({ id, part }) => {
			if (/^https?:\/\//.test(part)) {
				return (
					<a
						key={id}
						href={part}
						target="_blank"
						rel="noopener noreferrer"
						className="text-elegant-accent underline underline-offset-2 hover:text-elegant-accent/80 transition-colors inline-flex items-center gap-0.5"
					>
						<span>{part}</span>
						<ExternalLink size={11} className="shrink-0" />
					</a>
				);
			}
			if (/^\/(gallery|projects|about|contact|notes|terminal)/.test(part)) {
				return (
					<button
						key={id}
						type="button"
						onClick={() => {
							onClose();
							navigate(part);
						}}
						className="text-elegant-accent underline underline-offset-2 hover:text-elegant-accent/80 transition-colors cursor-pointer font-mono font-semibold"
					>
						{part}
					</button>
				);
			}
			if (/^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/.test(part)) {
				return (
					<a
						key={id}
						href={`mailto:${part}`}
						className="text-elegant-accent underline underline-offset-2 hover:text-elegant-accent/80 transition-colors"
					>
						{part}
					</a>
				);
			}
			return part;
		});
	};

	return (
		<dialog
			open
			aria-modal="true"
			aria-labelledby="quicklook-title"
			className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs border-0 w-full h-full max-w-none max-h-none m-0"
			onKeyDown={(e) => {
				if (e.key === "Escape") onClose();
			}}
		>
			<div className="w-full max-w-2xl max-h-[85vh] flex flex-col rounded-lg border border-elegant-border bg-elegant-card text-elegant-text-primary shadow-2xl overflow-hidden font-mono text-xs">
				{/* Header */}
				<div className="flex items-center justify-between px-4 py-2.5 bg-elegant-card border-b border-elegant-border select-none">
					<div className="flex items-center gap-2 truncate">
						<IconFileContentFill18
							className="text-elegant-accent size-4 shrink-0"
							aria-hidden="true"
						/>
						<span
							id="quicklook-title"
							className="font-semibold text-sm truncate text-elegant-text-primary"
						>
							{filename}
						</span>
						<span className="text-[11px] text-elegant-text-muted">
							(
							{node.size
								? `${node.size} bytes`
								: `${(node.content || "").length} bytes`}
							)
						</span>
					</div>

					<div className="flex items-center gap-1.5">
						<button
							type="button"
							onClick={handleCopy}
							aria-label="Copy file content"
							className="p-1.5 rounded hover:bg-elegant-bg text-elegant-text-muted hover:text-elegant-text-primary transition-colors cursor-pointer"
							title={copied ? "Copied!" : "Copy to clipboard"}
						>
							{copied ? (
								<Check
									size={14}
									className="text-emerald-400"
									aria-hidden="true"
								/>
							) : (
								<Copy size={14} aria-hidden="true" />
							)}
						</button>
						<button
							type="button"
							onClick={handleDownload}
							aria-label="Download file"
							className="p-1.5 rounded hover:bg-elegant-bg text-elegant-text-muted hover:text-elegant-text-primary transition-colors cursor-pointer"
							title="Download file"
						>
							<Download size={14} aria-hidden="true" />
						</button>
						<button
							type="button"
							onClick={onClose}
							aria-label="Close preview"
							className="p-1.5 rounded hover:bg-red-500/20 text-elegant-text-muted hover:text-red-400 transition-colors cursor-pointer ml-1"
						>
							<X size={15} aria-hidden="true" />
						</button>
					</div>
				</div>

				{/* Content Body */}
				<div className="flex-1 overflow-y-auto p-4 bg-elegant-bg whitespace-pre-wrap font-mono text-sm leading-relaxed text-elegant-text-primary">
					{node.content ? (
						renderContentWithLinks(node.content)
					) : (
						<span className="text-elegant-text-muted italic">
							(Empty file or binary preview unavailable)
						</span>
					)}
				</div>

				{/* Footer Meta */}
				<div className="px-4 py-2 bg-elegant-card border-t border-elegant-border flex items-center justify-between text-[11px] text-elegant-text-muted select-none">
					<span>Author: {node.author || "neo"}</span>
					<span>Modified: {formattedDate}</span>
				</div>
			</div>
		</dialog>
	);
};
