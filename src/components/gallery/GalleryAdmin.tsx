import { ChevronDown, ImagePlus, Loader2, Plus, X } from "lucide-react";
import { IconFolderFill18 } from "nucleo-ui-essential-fill-18";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import type { Album } from "./types";

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({
	text,
	children,
}) => (
	<div className="relative group/tip">
		{children}
		<div className="absolute right-full top-1/2 -translate-y-1/2 mr-2 px-2.5 py-1 bg-elegant-card border border-elegant-border rounded text-[11px] text-elegant-text-secondary font-mono whitespace-nowrap opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-[opacity,transform] duration-200 pointer-events-none z-100 shadow-lg">
			{text}
			<div className="absolute top-1/2 left-full -translate-y-1/2 border-l-elegant-border border-t-transparent border-b-transparent border-r-transparent border-4" />
		</div>
	</div>
);

interface GalleryAdminProps {
	isAdmin: boolean;
	activeAlbumTitle: string | null;
	showUploadModal: boolean;
	setShowUploadModal: (show: boolean) => void;
	uploadFiles: File[];
	setUploadFiles: (files: File[]) => void;
	uploadCaption: string;
	setUploadCaption: (caption: string) => void;
	uploadAlbumName: string;
	setUploadAlbumName: (name: string) => void;
	uploadProgress: {
		current: number;
		total: number;
		stage: "stripping" | "uploading";
		percent: number;
		fileName: string;
	} | null;
	isProcessing: boolean;

	handleUpload: (e: React.FormEvent) => void;
	resetUploadForm: () => void;

	albums: Album[];

	onNewAlbumClick: () => void;
}

export const GalleryAdmin = ({
	isAdmin,
	activeAlbumTitle,
	showUploadModal,
	setShowUploadModal,
	uploadFiles,
	setUploadFiles,
	uploadCaption,
	setUploadCaption,
	uploadAlbumName,
	setUploadAlbumName,
	uploadProgress,
	isProcessing,
	handleUpload,
	resetUploadForm,
	albums,
	onNewAlbumClick,
}: GalleryAdminProps) => {
	const [isAlbumDropdownOpen, setIsAlbumDropdownOpen] = useState(false);
	const albumDropdownRef = useRef<HTMLDivElement>(null);

	useEffect(() => {
		const handleClickOutside = (event: MouseEvent) => {
			if (
				albumDropdownRef.current &&
				!albumDropdownRef.current.contains(event.target as Node)
			) {
				setIsAlbumDropdownOpen(false);
			}
		};
		document.addEventListener("mousedown", handleClickOutside);
		return () => document.removeEventListener("mousedown", handleClickOutside);
	}, []);

	if (isAdmin && !showUploadModal) {
		return (
			<div className="fixed bottom-24 right-8 hidden md:flex flex-col gap-4 z-40">
				<Tooltip text="New Album">
					<button
						type="button"
						aria-label="New album"
						onClick={onNewAlbumClick}
						className="p-4 bg-elegant-card border border-elegant-border text-elegant-text-primary rounded-full shadow-lg transition duration-300 hover:bg-elegant-accent hover:text-elegant-bg hover:border-elegant-accent hover:scale-110 hover:shadow-lg active:scale-95"
					>
						<IconFolderFill18 size={24} />
					</button>
				</Tooltip>
				<Tooltip text="Upload Photos">
					<button
						type="button"
						aria-label="Upload photos"
						onClick={() => {
							if (activeAlbumTitle) setUploadAlbumName(activeAlbumTitle);
							setShowUploadModal(true);
						}}
						className="p-4 bg-elegant-card border border-elegant-border text-elegant-text-primary rounded-full shadow-lg transition duration-300 hover:bg-elegant-accent hover:text-elegant-bg hover:border-elegant-accent hover:scale-110 hover:rotate-90 hover:shadow-lg active:scale-95"
					>
						<Plus size={24} />
					</button>
				</Tooltip>
			</div>
		);
	}

	if (showUploadModal) {
		const query = uploadAlbumName.toLowerCase();
		const matchingAlbums: Album[] = [];
		for (const album of albums) {
			if (!uploadAlbumName || album.title.toLowerCase().includes(query)) {
				matchingAlbums.push(album);
			}
		}
		return (
			<div className="fixed inset-0 z-60 bg-black/90 flex items-center justify-center p-4 backdrop-blur-sm">
				<div className="bg-elegant-card border border-elegant-border rounded-lg max-w-lg w-full p-4 shadow-2xl relative">
					<button
						type="button"
						aria-label="Close upload modal"
						onClick={() => {
							setShowUploadModal(false);
							resetUploadForm();
						}}
						className="absolute top-4 right-4 text-elegant-text-muted hover:text-white"
					>
						<X size={20} />
					</button>

					<h2 className="text-xl font-bold text-elegant-text-primary mb-6 flex items-center gap-2">
						<ImagePlus className="text-elegant-accent" size={22} /> Upload
						Photos
					</h2>

					<form onSubmit={handleUpload} className="space-y-5">
						<div className="space-y-2">
							<label
								htmlFor="upload-album-name"
								className="text-sm text-elegant-text-muted"
							>
								Album Name
							</label>
							<div className="relative" ref={albumDropdownRef}>
								<div className="relative">
									<input
										id="upload-album-name"
										value={uploadAlbumName}
										onChange={(e) => {
											setUploadAlbumName(e.target.value);
											setIsAlbumDropdownOpen(true);
										}}
										onFocus={() => setIsAlbumDropdownOpen(true)}
										className="w-full bg-elegant-bg border border-elegant-border rounded p-3 pr-10 text-elegant-text-primary focus:border-elegant-accent outline-none appearance-none"
										placeholder="e.g. Summer 2024"
										required
										disabled={isProcessing}
									/>
									<button
										type="button"
										aria-label="Toggle album list"
										onClick={() => setIsAlbumDropdownOpen(!isAlbumDropdownOpen)}
										className="absolute right-3 top-1/2 -translate-y-1/2 text-elegant-text-muted hover:text-elegant-text-primary transition-colors"
										disabled={isProcessing}
									>
										<ChevronDown
											size={16}
											className={`transition-transform duration-200 ${isAlbumDropdownOpen ? "rotate-180" : ""}`}
										/>
									</button>
								</div>

								{isAlbumDropdownOpen && albums.length > 0 && (
									<div className="absolute left-0 right-0 top-full mt-1 bg-elegant-card border border-elegant-border rounded-sm shadow-xl z-50 max-h-48 overflow-y-auto">
										{matchingAlbums.map((a) => (
											<button
												key={a.title}
												type="button"
												onClick={() => {
													setUploadAlbumName(a.title);
													setIsAlbumDropdownOpen(false);
												}}
												className="w-full text-left px-4 py-2 hover:bg-white/10 transition-colors text-elegant-text-secondary hover:text-elegant-text-primary text-sm"
											>
												{a.title}
											</button>
										))}
										{uploadAlbumName &&
											!albums.some(
												(a) =>
													a.title.toLowerCase() ===
													uploadAlbumName.toLowerCase(),
											) && (
												<div className="px-4 py-2 text-elegant-text-muted text-xs italic border-t border-elegant-border">
													Create new album "{uploadAlbumName}"
												</div>
											)}
									</div>
								)}
							</div>
						</div>

						<div className="space-y-2">
							<label
								htmlFor="upload-caption"
								className="text-sm text-elegant-text-muted"
							>
								Caption (Optional, applies to all)
							</label>
							<textarea
								id="upload-caption"
								value={uploadCaption}
								onChange={(e) => setUploadCaption(e.target.value)}
								className="w-full bg-elegant-bg border border-elegant-border rounded p-3 text-elegant-text-primary focus:border-elegant-accent outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent resize-none h-20 placeholder-elegant-text-muted"
								placeholder="Add a description…"
								disabled={isProcessing}
							/>
						</div>

						<div className="relative group">
							<input
								type="file"
								multiple
								aria-label="Select photos"
								onChange={(e) => {
									if (e.target.files && e.target.files.length > 0) {
										setUploadFiles(Array.from(e.target.files));
									}
								}}
								accept="image/png, image/jpeg, image/webp"
								className="absolute inset-0 opacity-0 cursor-pointer z-10"
								required
								disabled={isProcessing}
							/>
							<div
								className={`border-2 border-dashed rounded-lg p-6 text-center transition-colors ${isProcessing ? "opacity-50" : "group-hover:border-elegant-text-muted"} ${uploadFiles.length > 0 ? "bg-elegant-accent/5 border-elegant-accent/40" : "bg-elegant-bg border-elegant-border"}`}
							>
								{uploadFiles.length > 0 ? (
									<div>
										<p className="text-elegant-accent font-medium">
											{uploadFiles.length} file
											{uploadFiles.length > 1 ? "s" : ""} selected
										</p>
										<p className="text-xs text-elegant-text-muted mt-1 truncate">
											{uploadFiles.map((f) => f.name).join(", ")}
										</p>
									</div>
								) : (
									<div className="text-elegant-text-muted">
										<p className="font-medium">Click to select photos</p>
										<p className="text-xs mt-1">
											JPG, PNG, WebP &middot; Multiple files supported
										</p>
									</div>
								)}
							</div>
						</div>

						{uploadProgress && (
							<div className="space-y-2 text-sm font-mono" aria-live="polite">
								<div className="flex justify-between text-elegant-text-muted">
									<span>
										{uploadProgress.stage === "stripping"
											? "Removing metadata"
											: "Uploading"}{" "}
										({uploadProgress.current}/{uploadProgress.total})
									</span>
									<span>
										{uploadProgress.stage === "uploading"
											? `${uploadProgress.percent}%`
											: ""}
									</span>
								</div>
								<div className="w-full h-1.5 bg-elegant-bg rounded-full overflow-hidden">
									<div
										className={`h-full rounded-full transition-[width] duration-300 ${uploadProgress.stage === "stripping" ? "bg-elegant-text-muted animate-pulse w-full" : "bg-elegant-accent"}`}
										style={
											uploadProgress.stage === "uploading"
												? { width: `${uploadProgress.percent}%` }
												: undefined
										}
									/>
								</div>
								<p className="text-elegant-text-muted text-xs truncate">
									{uploadProgress.fileName}
								</p>
							</div>
						)}

						<button
							type="submit"
							disabled={isProcessing}
							className="w-full bg-elegant-accent hover:bg-elegant-accent-hover text-elegant-bg font-bold py-3 rounded transition disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2 outline-none focus-visible:ring-2 focus-visible:ring-elegant-accent"
						>
							{isProcessing ? (
								<>
									<Loader2
										size={18}
										className="animate-spin"
										aria-hidden="true"
									/>{" "}
									Processing…
								</>
							) : (
								`Upload ${uploadFiles.length > 0 ? uploadFiles.length : ""} Photo${uploadFiles.length !== 1 ? "s" : ""}`
							)}
						</button>
					</form>
				</div>
			</div>
		);
	}

	return null;
};
