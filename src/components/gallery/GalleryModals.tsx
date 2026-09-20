import type React from "react";
import { useState } from "react";
import {
	ActionModals,
	type AlertConfig,
	type ConfirmConfig,
	type PromptConfig,
} from "../shared/ActionModals";
import type { Album } from "./types";

export type { AlertConfig, ConfirmConfig, PromptConfig };

export interface EditAlbumConfig {
	album: Album;
	onConfirm: (newName: string, newCategory: string) => void;
}

interface GalleryModalsProps {
	promptConfig: PromptConfig | null;
	setPromptConfig: (config: PromptConfig | null) => void;

	alertConfig: AlertConfig | null;
	setAlertConfig: (config: AlertConfig | null) => void;

	editAlbumConfig: EditAlbumConfig | null;
	setEditAlbumConfig: (config: EditAlbumConfig | null) => void;

	confirmConfig: ConfirmConfig | null;
	setConfirmConfig: (config: ConfirmConfig | null) => void;
}

export const GalleryModals = ({
	promptConfig,
	setPromptConfig,
	alertConfig,
	setAlertConfig,
	editAlbumConfig,
	setEditAlbumConfig,
	confirmConfig,
	setConfirmConfig,
}: GalleryModalsProps) => {
	return (
		<>
			<ActionModals
				promptConfig={promptConfig}
				setPromptConfig={setPromptConfig}
				alertConfig={alertConfig}
				setAlertConfig={setAlertConfig}
				confirmConfig={confirmConfig}
				setConfirmConfig={setConfirmConfig}
			/>

			{editAlbumConfig && (
				<EditAlbumModal
					config={editAlbumConfig}
					onClose={() => setEditAlbumConfig(null)}
				/>
			)}
		</>
	);
};

const EditAlbumModal: React.FC<{
	config: EditAlbumConfig;
	onClose: () => void;
}> = ({ config, onClose }) => {
	const [name, setName] = useState(
		() => config.album.title.split("/").pop() || "",
	);
	const [category, setCategory] = useState(() => config.album.category || "");

	return (
		<div className="fixed inset-0 z-60 bg-black/80 flex items-center justify-center p-4 backdrop-blur-sm animate-fade-in">
			<div className="bg-elegant-card border border-elegant-border p-4 rounded-lg max-w-sm w-full shadow-2xl">
				<h3 className="text-lg font-bold text-elegant-text-primary mb-4">
					Edit Album
				</h3>
				<div className="space-y-4">
					<div>
						<label
							htmlFor="edit-album-name"
							className="block text-xs font-medium text-elegant-text-muted mb-1"
						>
							Album Name
						</label>
						<input
							id="edit-album-name"
							value={name}
							onChange={(e) => setName(e.target.value)}
							className="w-full bg-elegant-bg border border-elegant-border rounded p-2 text-elegant-text-primary focus:border-elegant-accent outline-none"
							ref={(input) => {
								if (input) setTimeout(() => input.focus(), 10);
							}}
						/>
					</div>
					<div>
						<label
							htmlFor="edit-album-category"
							className="block text-xs font-medium text-elegant-text-muted mb-1"
						>
							Category / Subtitle
						</label>
						<input
							id="edit-album-category"
							value={category}
							onChange={(e) => setCategory(e.target.value)}
							className="w-full bg-elegant-bg border border-elegant-border rounded p-2 text-elegant-text-primary focus:border-elegant-accent outline-none"
						/>
					</div>
				</div>
				<div className="flex justify-end gap-2 mt-6">
					<button
						type="button"
						onClick={onClose}
						className="px-4 py-2 text-elegant-text-muted hover:text-elegant-text-primary text-sm font-medium"
					>
						Cancel
					</button>
					<button
						type="button"
						onClick={() => {
							config.onConfirm(name, category);
							onClose();
						}}
						className="px-4 py-2 bg-elegant-accent text-elegant-bg font-semibold rounded hover:bg-elegant-accent-hover text-sm transition-colors"
					>
						Save Changes
					</button>
				</div>
			</div>
		</div>
	);
};
