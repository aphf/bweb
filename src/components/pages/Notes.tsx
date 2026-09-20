import { Plus, Search } from "lucide-react";
import { useEffect, useRef } from "react";
import { useNavigate } from "react-router";
import { Dock } from "../Dock";
import { PageHeader } from "../PageHeader";
import "katex/dist/katex.min.css";
import "highlight.js/styles/github-dark.min.css";

import { useSEO } from "../../hooks/useSEO";
import { trackEvent } from "../../lib/analytics";
import { Nano } from "../Nano";
import { ActionModals } from "../shared/ActionModals";
import { NoteDetailModal } from "./notes/NoteDetailModal";
import { NotesGrid } from "./notes/NotesGrid";
import { useNotesManager } from "./notes/useNotesManager";

export function Notes() {
	const navigate = useNavigate();
	const onExit = () => navigate("/");

	const handleNavigate = (dest: string) => {
		if (dest === "Terminal") {
			onExit();
			window.dispatchEvent(new CustomEvent("open-terminal"));
		} else if (dest === "Files") {
			onExit();
			window.dispatchEvent(new CustomEvent("open-filemanager"));
		} else if (dest === "Home") {
			onExit();
		} else {
			navigate(`/${dest.toLowerCase()}`);
		}
	};

	const {
		selectedNote,
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
	} = useNotesManager();

	useSEO({
		title: selectedNote
			? `${selectedNote.filename} | Notes`
			: "Notes | Bahauddin Alam",
		description: selectedNote
			? `Read ${selectedNote.filename} on my personal digital garden.`
			: "My personal digital garden. A collection of notes, thoughts, and learnings on software development and technology.",
		url: selectedNote
			? `https://bahauddin.org/notes?note=${encodeURIComponent(selectedNote.filename)}`
			: "https://bahauddin.org/notes",
	});

	// Debounced notes-search (no raw query text, avoids noisy per-keystroke events)
	const searchTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
	useEffect(() => {
		const q = searchTerm.trim();
		if (q.length < 2) return;
		if (searchTimer.current) clearTimeout(searchTimer.current);
		searchTimer.current = setTimeout(() => trackEvent("notes-search"), 1200);
		return () => {
			if (searchTimer.current) clearTimeout(searchTimer.current);
		};
	}, [searchTerm]);

	if (isEditing) {
		return (
			<div className="fixed inset-0 z-50 bg-elegant-bg">
				<Nano
					filename={editFilename}
					initialContent={editContent}
					onSaveAs={handleNanoSave}
					onExit={() => setIsEditing(false)}
				/>
			</div>
		);
	}

	return (
		<div className="h-full w-full bg-elegant-bg text-elegant-text-secondary font-mono overflow-hidden">
			<div className="h-full flex flex-col">
				<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
					<PageHeader
						currentPath="notes"
						onNavigate={handleNavigate}
						maxWidth="max-w-7xl"
					/>

					<main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-28 lg:pt-8 lg:pb-32 flex flex-col min-h-0">
						<div className="mb-8 flex flex-col md:flex-row md:items-center justify-between gap-4">
							<div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-4 w-full md:w-auto">
								<button
									type="button"
									onClick={handleCreate}
									className="flex items-center justify-center gap-2 bg-elegant-accent text-elegant-bg px-4 py-2 rounded-md font-bold hover:bg-elegant-accent/90 transition-colors"
								>
									<Plus size={16} />
									<span>New Note</span>
								</button>

								<div className="relative flex-1 sm:w-64">
									<div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
										<Search
											size={16}
											className="text-elegant-text-muted"
											aria-hidden="true"
										/>
									</div>
									<input
										type="text"
										aria-label="Search notes"
										placeholder="Search notes…"
										value={searchTerm}
										onChange={(e) => setSearchTerm(e.target.value)}
										className="w-full bg-elegant-card border border-elegant-border rounded-md pl-10 pr-4 py-2 text-sm text-elegant-text-primary placeholder-elegant-text-muted outline-none focus-visible:border-elegant-accent focus-visible:ring-1 focus-visible:ring-elegant-accent transition-colors"
									/>
								</div>
							</div>
						</div>

						<NotesGrid
							loading={loading}
							filteredNotes={filteredNotes}
							searchTerm={searchTerm}
							onCreate={handleCreate}
							onNoteClick={handleNoteClick}
						/>
					</main>
				</div>

				<Dock
					onNavigate={handleNavigate}
					currentPage="Notes"
					className="py-3"
				/>

				{selectedNote && (
					<NoteDetailModal
						selectedNote={selectedNote}
						noteContent={noteContent}
						contentLoading={contentLoading}
						isAdmin={isAdmin}
						onShare={handleShare}
						onEdit={handleEdit}
						onDelete={handleDelete}
						onClose={closeNote}
					/>
				)}
				<ActionModals
					promptConfig={promptConfig}
					setPromptConfig={setPromptConfig}
					alertConfig={alertConfig}
					setAlertConfig={setAlertConfig}
					confirmConfig={confirmConfig}
					setConfirmConfig={setConfirmConfig}
				/>
			</div>
		</div>
	);
}
