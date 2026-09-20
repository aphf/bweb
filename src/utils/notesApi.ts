export interface Note {
	filename: string;
	created_at: number;
	updated_at: number;
	size: number;
	author: string | null;
}

export async function listNotes(signal?: AbortSignal): Promise<Note[]> {
	const res = await fetch("/api/notes", { signal });
	if (!res.ok) throw new Error("Failed to load notes");
	return res.json();
}

export async function getNoteContent(
	filename: string,
	signal?: AbortSignal,
): Promise<string> {
	const res = await fetch(`/api/notes/${filename}`, { signal });
	if (!res.ok) throw new Error("Failed to load note content");
	const data = (await res.json()) as { content: string };
	return data.content;
}

export async function saveNote(
	filename: string,
	content: string,
	commitMsg?: string,
	authorName?: string,
): Promise<void> {
	const checkRes = await fetch(`/api/notes/${filename}`);
	const exists = checkRes.status === 200;

	const res = exists
		? await fetch(`/api/notes/${filename}`, {
				method: "PUT",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					content,
					commit_msg: commitMsg,
					author_name: authorName,
				}),
			})
		: await fetch("/api/notes", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify({
					filename,
					content,
					commit_msg: commitMsg,
					author_name: authorName,
				}),
			});

	if (!res.ok) {
		const err = await res.json();
		throw new Error(err.error || res.statusText);
	}
}

export async function deleteNote(filename: string): Promise<void> {
	const res = await fetch(`/api/notes/${filename}`, { method: "DELETE" });
	if (!res.ok) throw new Error("Failed to delete note");
}
