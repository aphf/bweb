import { FileText, Loader2, Plus } from "lucide-react";
import type { Note } from "../../../utils/notesApi";
import { NoteCard } from "./NoteCard";

interface NotesGridProps {
	loading: boolean;
	filteredNotes: Note[];
	searchTerm: string;
	onCreate: () => void;
	onNoteClick: (note: Note) => void;
}

export function NotesGrid({
	loading,
	filteredNotes,
	searchTerm,
	onCreate,
	onNoteClick,
}: NotesGridProps) {
	if (loading) {
		return (
			<div
				className="flex flex-col items-center justify-center py-20 text-elegant-text-muted animate-pulse"
				aria-live="polite"
			>
				<Loader2 size={32} className="animate-spin mb-4" aria-hidden="true" />
				<p>Loading notes…</p>
			</div>
		);
	}

	if (filteredNotes.length === 0) {
		return (
			<div className="text-center py-20 text-elegant-text-muted border border-dashed border-elegant-border rounded-lg">
				<FileText size={48} className="mx-auto mb-4 opacity-50" />
				<p className="text-lg mb-2">No notes found</p>
				<p className="text-sm mb-6">
					{searchTerm
						? `No results for "${searchTerm}"`
						: "The archive is empty."}
				</p>
				{!searchTerm && (
					<button
						type="button"
						onClick={onCreate}
						className="text-elegant-accent hover:underline flex items-center justify-center gap-1 mx-auto"
					>
						<Plus size={14} /> Create your first note
					</button>
				)}
			</div>
		);
	}

	return (
		<div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
			{filteredNotes.map((note) => (
				<NoteCard key={note.filename} note={note} onOpen={onNoteClick} />
			))}
		</div>
	);
}
