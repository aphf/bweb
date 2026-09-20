import { AlertCircle, FileText, Loader2, Share2, X } from "lucide-react";
import {
	IconCircleCompose2Fill18,
	IconTrashFill18,
} from "nucleo-ui-essential-fill-18";
import ReactMarkdown from "react-markdown";
import rehypeHighlight from "rehype-highlight";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import { formatBytes } from "../../../utils/format";
import type { Note } from "../../../utils/notesApi";

interface NoteDetailModalProps {
	selectedNote: Note;
	noteContent: string | null;
	contentLoading: boolean;
	isAdmin: boolean;
	onShare: () => void;
	onEdit: () => void;
	onDelete: () => void;
	onClose: () => void;
}

export const NoteDetailModal = ({
	selectedNote,
	noteContent,
	contentLoading,
	isAdmin,
	onShare,
	onEdit,
	onDelete,
	onClose,
}: NoteDetailModalProps) => (
	<dialog
		open
		className="fixed inset-0 z-50 m-0 h-full w-full max-h-none max-w-none border-0 bg-black/80 p-4 sm:p-6 backdrop-blur-sm flex items-center justify-center"
		aria-label={`Note: ${selectedNote.filename}`}
		onKeyDown={(e) => {
			if (e.key === "Escape") onClose();
		}}
	>
		<div className="bg-elegant-card w-full max-w-4xl max-h-[90vh] rounded-lg shadow-2xl flex flex-col border border-elegant-border">
			<div className="flex items-center justify-between p-4 border-b border-elegant-border bg-elegant-bg/50 rounded-t-lg">
				<div className="flex items-center gap-3 overflow-hidden">
					<FileText
						className="text-elegant-accent shrink-0"
						size={20}
						aria-hidden="true"
					/>
					<h2 className="text-lg font-bold text-elegant-text-primary truncate">
						{selectedNote.filename}
					</h2>
				</div>
				<div className="flex items-center gap-2">
					<button
						type="button"
						onClick={onShare}
						className="p-2 hover:bg-elegant-accent/10 rounded-md text-elegant-text-muted hover:text-elegant-accent outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent transition-colors flex items-center gap-1"
						title="Share Note"
						aria-label="Share note"
					>
						<Share2 size={18} aria-hidden="true" />
					</button>

					<button
						type="button"
						onClick={onEdit}
						className="p-2 hover:bg-elegant-accent/10 rounded-md text-elegant-text-muted hover:text-elegant-accent outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent transition-colors flex items-center gap-1"
						title="Edit Note"
						aria-label="Edit note"
					>
						<IconCircleCompose2Fill18 size={18} aria-hidden="true" />
					</button>

					{isAdmin && (
						<button
							type="button"
							onClick={onDelete}
							className="p-2 hover:bg-red-500/10 rounded-md text-elegant-text-muted hover:text-red-500 outline-none focus-visible:ring-1 focus-visible:ring-red-500 transition-colors flex items-center gap-1"
							title="Delete Note"
							aria-label="Delete note"
						>
							<IconTrashFill18 size={18} aria-hidden="true" />
						</button>
					)}

					<div className="w-px h-6 bg-elegant-border mx-1" aria-hidden="true" />

					<button
						type="button"
						onClick={onClose}
						className="p-2 hover:bg-elegant-accent/10 rounded-full text-elegant-text-muted hover:text-elegant-text-primary outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent transition-colors"
						aria-label="Close note"
					>
						<X size={20} aria-hidden="true" />
					</button>
				</div>
			</div>

			<div className="flex-1 overflow-y-auto p-6 md:p-8 bg-elegant-bg">
				{contentLoading ? (
					<div
						className="flex flex-col items-center justify-center py-20 text-elegant-text-muted"
						aria-live="polite"
					>
						<Loader2
							size={32}
							className="animate-spin mb-4"
							aria-hidden="true"
						/>
						<p>Loading content…</p>
					</div>
				) : noteContent ? (
					<div className="prose prose-sm md:prose-base max-w-none text-elegant-text-primary prose-headings:text-elegant-text-primary prose-p:text-elegant-text-primary prose-li:text-elegant-text-primary prose-strong:text-elegant-text-primary prose-a:text-elegant-accent prose-code:text-elegant-accent prose-code:bg-elegant-card prose-code:px-1.5 prose-code:py-0.5 prose-code:rounded prose-pre:bg-elegant-card prose-pre:border prose-pre:border-elegant-border">
						<ReactMarkdown
							remarkPlugins={[remarkGfm, remarkMath]}
							rehypePlugins={[rehypeKatex, rehypeHighlight]}
						>
							{noteContent || ""}
						</ReactMarkdown>
					</div>
				) : (
					<div
						className="flex flex-col items-center justify-center py-10 text-elegant-text-muted gap-2"
						role="alert"
					>
						<AlertCircle size={32} opacity={0.5} aria-hidden="true" />
						<p>Failed to load content</p>
					</div>
				)}
			</div>

			<div className="p-4 border-t border-elegant-border bg-elegant-bg/50 rounded-b-lg text-xs text-elegant-text-muted flex justify-between items-center">
				<div>
					Last updated: {new Date(selectedNote.updated_at).toLocaleString()}
				</div>
				<div className="flex items-center gap-2">
					<span>{formatBytes(selectedNote.size)}</span>
					<span>•</span>
					<span>Author: {selectedNote.author || "Anonymous"}</span>
				</div>
			</div>
		</div>
	</dialog>
);
