import { useCallback, useEffect, useState } from "react";
import { checkAdmin } from "../../../utils/authApi";
import type { Note } from "../../../utils/notesApi";
import {
	deleteNote,
	getNoteContent,
	listNotes,
	saveNote,
} from "../../../utils/notesApi";
import type {
	AlertConfig,
	ConfirmConfig,
	PromptConfig,
} from "../../shared/ActionModals";

export function useNotesManager() {
	const [selectedNote, setSelectedNote] = useState<Note | null>(null);
	const [notes, setNotes] = useState<Note[]>([]);
	const [loading, setLoading] = useState(true);
	const [searchTerm, setSearchTerm] = useState("");
	const [noteContent, setNoteContent] = useState<string | null>(null);
	const [contentLoading, setContentLoading] = useState(false);

	const [isEditing, setIsEditing] = useState(false);
	const [editFilename, setEditFilename] = useState<string | undefined>(
		undefined,
	);
	const [editContent, setEditContent] = useState("");

	const [isAdmin, setIsAdmin] = useState(false);

	const [promptConfig, setPromptConfig] = useState<PromptConfig | null>(null);
	const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
	const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(
		null,
	);

	const showConfirm = (
		title: string,
		message: string,
		onConfirm: () => void,
		confirmLabel = "Confirm",
	) => {
		setConfirmConfig({ isOpen: true, title, message, onConfirm, confirmLabel });
	};

	const showAlert = (
		message: string,
		type: "error" | "success" | "info" = "info",
	) => {
		setAlertConfig({ isOpen: true, message, type });
		if (type === "success") setTimeout(() => setAlertConfig(null), 2500);
	};

	const handleNoteClick = useCallback(async (note: Note) => {
		setSelectedNote(note);
		setContentLoading(true);
		setNoteContent(null);

		try {
			const content = await getNoteContent(note.filename);
			setNoteContent(content);
		} catch (error) {
			console.error("Failed to fetch note content:", error);
			setNoteContent("Error loading note.");
		} finally {
			setContentLoading(false);
		}
	}, []);

	const closeNote = () => {
		setSelectedNote(null);
		setNoteContent(null);
		const newUrl = window.location.pathname;
		window.history.pushState({ path: newUrl }, "", newUrl);
	};

	useEffect(() => {
		const controller = new AbortController();

		listNotes(controller.signal)
			.then(setNotes)
			.catch((error) => {
				if (!controller.signal.aborted)
					console.error("Failed to fetch notes:", error);
			})
			.finally(() => {
				if (!controller.signal.aborted) setLoading(false);
			});

		checkAdmin()
			.then(setIsAdmin)
			.catch(() => setIsAdmin(false));

		const params = new URLSearchParams(window.location.search);
		const noteParam = params.get("note");
		if (noteParam) {
			const placeholderNote: Note = {
				filename: noteParam,
				created_at: Date.now(),
				updated_at: Date.now(),
				size: 0,
				author: "Loading...",
			};
			handleNoteClick(placeholderNote);
		}

		return () => controller.abort();
	}, [handleNoteClick]);

	const handleCreate = () => {
		setEditFilename(undefined);
		setEditContent("");
		setIsEditing(true);
	};

	const handleEdit = () => {
		if (!selectedNote || noteContent === null) return;
		setEditFilename(selectedNote.filename);
		setEditContent(noteContent);
		setIsEditing(true);
	};

	const handleDelete = async () => {
		if (!selectedNote) return;

		if (!isAdmin) {
			showAlert("You are not authorized to delete notes.", "error");
			return;
		}

		showConfirm(
			"Delete Note",
			`Are you sure you want to delete ${selectedNote.filename}?`,
			async () => {
				try {
					await deleteNote(selectedNote.filename);
					closeNote();
					setNotes((prev) =>
						prev.filter((n) => n.filename !== selectedNote.filename),
					);
					showAlert("Note deleted successfully", "success");
				} catch (e) {
					console.error(e);
					showAlert("Error deleting note", "error");
				}
			},
			"Delete",
		);
	};

	const handleShare = () => {
		if (!selectedNote) return;
		const url = `${window.location.origin}/shared/notes/${encodeURIComponent(selectedNote.filename)}`;
		navigator.clipboard.writeText(url);
		showAlert("Share link copied to clipboard!", "success");
	};

	const handleNanoSave = async (
		filename: string,
		content: string,
		commitMsg?: string,
		authorName?: string,
	) => {
		try {
			await saveNote(filename, content, commitMsg, authorName);
			setIsEditing(false);
			if (selectedNote) {
				if (selectedNote.filename === filename) {
					setNoteContent(content);
				} else {
					closeNote();
				}
			}
			const updated = await listNotes();
			setNotes(updated);
		} catch (e: unknown) {
			const msg = e instanceof Error ? e.message : "Unknown error";
			showAlert(`Error saving note: ${msg}`, "error");
			throw e;
		}
	};

	const filteredNotes = notes.filter(
		(note) =>
			note.filename.toLowerCase().includes(searchTerm.toLowerCase()) ||
			note.author?.toLowerCase().includes(searchTerm.toLowerCase()),
	);

	return {
		selectedNote,
		notes,
		loading,
		searchTerm,
		setSearchTerm,
		noteContent,
		contentLoading,
		isEditing,
		setIsEditing,
		editFilename,
		editContent,
		isAdmin,
		promptConfig,
		setPromptConfig,
		alertConfig,
		setAlertConfig,
		confirmConfig,
		setConfirmConfig,
		handleNoteClick,
		closeNote,
		handleCreate,
		handleEdit,
		handleDelete,
		handleShare,
		handleNanoSave,
		filteredNotes,
	};
}
