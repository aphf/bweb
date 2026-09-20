import { Calendar, FileText, Maximize2, User } from "lucide-react";
import { Link } from "react-router";
import type { Note } from "../../../utils/notesApi";

interface NoteCardProps {
	note: Note;
	onOpen: (note: Note) => void;
}

export const NoteCard = ({ note, onOpen }: NoteCardProps) => (
	<Link
		to={`/notes?note=${encodeURIComponent(note.filename)}`}
		onClick={() => onOpen(note)}
		className="group bg-elegant-card border border-elegant-border rounded-lg p-5 hover:border-elegant-accent transition duration-300 cursor-pointer hover:shadow-lg flex flex-col h-full relative overflow-hidden text-left"
	>
		<div className="absolute top-0 right-0 p-3 opacity-0 group-hover:opacity-100 transition-opacity">
			<Maximize2 size={16} className="text-elegant-accent" />
		</div>

		<div className="flex items-center gap-3 mb-4">
			<div className="p-2 bg-elegant-bg rounded-md text-elegant-accent group-hover:bg-elegant-accent/10 group-hover:text-elegant-accent transition-colors">
				<FileText size={20} />
			</div>
			<h3
				className="font-bold text-elegant-text-primary truncate flex-1"
				title={note.filename}
			>
				{note.filename}
			</h3>
		</div>

		<div className="mt-auto space-y-2 text-xs text-elegant-text-muted">
			<div className="flex items-center gap-2">
				<User size={12} />
				<span className="truncate">{note.author || "Anonymous"}</span>
			</div>
			<div className="flex items-center gap-2">
				<Calendar size={12} />
				<span>{new Date(note.updated_at).toLocaleDateString()}</span>
			</div>
		</div>
	</Link>
);
