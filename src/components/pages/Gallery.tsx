import { ArrowLeft } from "lucide-react";
import { IconFolderFill18 } from "nucleo-ui-essential-fill-18";
import type React from "react";
import {
	useCallback,
	useEffect,
	useEffectEvent,
	useMemo,
	useRef,
	useState,
} from "react";
import { useNavigate } from "react-router";
import { useSEO } from "../../hooks/useSEO";
import { checkAdmin } from "../../utils/authApi";
import { optimizeImage } from "../../utils/imageOptimizer";
import { Dock } from "../Dock";
import { AlbumGrid } from "../gallery/AlbumGrid";
import { GalleryAdmin } from "../gallery/GalleryAdmin";
import type {
	AlertConfig,
	ConfirmConfig,
	EditAlbumConfig,
	PromptConfig,
} from "../gallery/GalleryModals";
import { GalleryModals } from "../gallery/GalleryModals";
import { Lightbox } from "../gallery/Lightbox";
import { PhotoGrid } from "../gallery/PhotoGrid";
import type { Album, Photo } from "../gallery/types";
import {
	resolveNestedPath,
	useGalleryNavigation,
} from "../gallery/useGalleryNavigation";
import { PageHeader } from "../PageHeader";

const PHOTO_EXT = /\.(jpg|jpeg|png|webp|gif)$/i;

const uploadWithProgress = (
	formData: FormData,
	onProgress: (percent: number) => void,
): Promise<{ success: boolean; key: string }> => {
	return new Promise((resolve, reject) => {
		const xhr = new XMLHttpRequest();
		xhr.open("POST", "/api/gallery");
		xhr.upload.onprogress = (e) => {
			if (e.lengthComputable) {
				onProgress(Math.round((e.loaded / e.total) * 100));
			}
		};
		xhr.onload = () => {
			try {
				const data = JSON.parse(xhr.responseText);
				if (xhr.status >= 200 && xhr.status < 300) resolve(data);
				else reject(new Error(data.error || "Upload failed"));
			} catch {
				reject(new Error("Upload failed"));
			}
		};
		xhr.onerror = () => reject(new Error("Network error"));
		xhr.send(formData);
	});
};

const processImage = async (file: File): Promise<Blob> => {
	const objectUrl = URL.createObjectURL(file);
	let blob: Blob | null = null;
	let error: unknown = null;
	try {
		const img = new Image();
		img.src = objectUrl;
		await new Promise((resolve, reject) => {
			img.onload = resolve;
			img.onerror = reject;
		});
		const canvas = document.createElement("canvas");
		canvas.width = img.width;
		canvas.height = img.height;
		const ctx = canvas.getContext("2d");
		if (ctx) ctx.drawImage(img, 0, 0);
		blob = await new Promise<Blob | null>((resolve) =>
			canvas.toBlob(resolve, "image/jpeg", 0.9),
		);
	} catch (e) {
		error = e;
	}
	URL.revokeObjectURL(objectUrl);
	if (error) throw error;
	if (!blob) throw new Error("Image processing failed");
	return blob;
};

interface UseGalleryAdminActionsArgs {
	setAlbums: React.Dispatch<React.SetStateAction<Album[]>>;
	activeAlbumTitle: string | null;
	activePhotoKey: string | null;
	setActivePhotoKey: React.Dispatch<React.SetStateAction<string | null>>;
	activePhoto: Photo | null;
	closeAlbum: () => void;
	closePhoto: () => void;
	openAlbum: (album: Album) => void;
	encodeAlbumPath: (title: string) => string;
}

const useGalleryAdminActions = ({
	setAlbums,
	activeAlbumTitle,
	activePhotoKey,
	setActivePhotoKey,
	activePhoto,
	closeAlbum,
	closePhoto,
	openAlbum,
	encodeAlbumPath,
}: UseGalleryAdminActionsArgs) => {
	const [isAdmin, setIsAdmin] = useState(false);
	const [showUploadModal, setShowUploadModal] = useState(false);
	const [uploadFiles, setUploadFiles] = useState<File[]>([]);
	const [uploadCaption, setUploadCaption] = useState("");
	const [uploadAlbumName, setUploadAlbumName] = useState("");
	const [isProcessing, setIsProcessing] = useState(false);
	const [uploadProgress, setUploadProgress] = useState<{
		current: number;
		total: number;
		stage: "stripping" | "uploading";
		percent: number;
		fileName: string;
	} | null>(null);

	const [promptConfig, setPromptConfig] = useState<PromptConfig | null>(null);
	const [alertConfig, setAlertConfig] = useState<AlertConfig | null>(null);
	const [editAlbumConfig, setEditAlbumConfig] =
		useState<EditAlbumConfig | null>(null);
	const [confirmConfig, setConfirmConfig] = useState<ConfirmConfig | null>(
		null,
	);

	useEffect(() => {
		checkAdmin().then(setIsAdmin);
	}, []);

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

	const showPrompt = (
		title: string,
		defaultValue: string,
		onConfirm: (val: string) => void,
	) => {
		setPromptConfig({ isOpen: true, title, defaultValue, onConfirm });
	};

	const resetUploadForm = () => {
		setUploadFiles([]);
		setUploadCaption("");
		setUploadAlbumName("");
		setUploadProgress(null);
	};

	const handleUpload = async (e: React.FormEvent) => {
		e.preventDefault();
		if (uploadFiles.length === 0) return;
		if (!uploadAlbumName) {
			showAlert("Please select or enter an album name", "error");
			return;
		}

		setIsProcessing(true);
		const total = uploadFiles.length;
		const uploaded: (Photo | undefined)[] = new Array(total);
		const filePercents = new Array(total).fill(0);
		const CONCURRENCY = 3;
		let nextIndex = 0;
		let completed = 0;
		let failed = false;

		const uploadOne = async (index: number) => {
			const file = uploadFiles[index];

			setUploadProgress({
				current: completed + 1,
				total,
				stage: "stripping",
				percent: 0,
				fileName: file.name,
			});
			const blob = await processImage(file);

			setUploadProgress({
				current: completed + 1,
				total,
				stage: "uploading",
				percent: 0,
				fileName: file.name,
			});
			const formData = new FormData();
			formData.append("action", "upload");
			formData.append("file", blob, file.name);
			formData.append("album", uploadAlbumName);
			formData.append("caption", uploadCaption);

			const resBody = await uploadWithProgress(formData, (percent) => {
				filePercents[index] = percent;
				const aggregate = Math.round(
					filePercents.reduce((sum, p) => sum + p, 0) / total,
				);
				setUploadProgress((prev) =>
					prev ? { ...prev, percent: aggregate } : null,
				);
			});
			const { key } = resBody;

			uploaded[index] = {
				url: `/gallery/${key}`,
				caption: uploadCaption,
				key,
			};
			completed += 1;
		};

		const drain = async (): Promise<void> => {
			const index = nextIndex;
			nextIndex += 1;
			if (index >= total || failed) return;
			try {
				await uploadOne(index);
			} catch (err) {
				failed = true;
				throw err;
			}
			await drain();
		};

		try {
			await Promise.all(
				Array.from({ length: Math.min(CONCURRENCY, total) }, () => drain()),
			);
			const uploadedPhotos = uploaded.filter(
				(p): p is Photo => p !== undefined,
			);

			setAlbums((prev) => {
				const existing = prev.find((a) => a.title === uploadAlbumName);
				if (existing) {
					return prev.map((a) => {
						if (a.title === uploadAlbumName) {
							const updatedPhotos = [...a.photos, ...uploadedPhotos];
							return {
								...a,
								count: updatedPhotos.length,
								photos: updatedPhotos,
								cover: updatedPhotos.slice(0, 4).map((p) => p.url),
							};
						}
						return a;
					});
				} else {
					return [
						...prev,
						{
							title: uploadAlbumName,
							count: uploadedPhotos.length,
							cover: uploadedPhotos.slice(0, 4).map((p) => p.url),
							photos: uploadedPhotos,
							category: "Gallery",
						},
					];
				}
			});

			showAlert(`${total} photo${total > 1 ? "s" : ""} uploaded`, "success");
			resetUploadForm();
			setShowUploadModal(false);
		} catch (err: unknown) {
			showAlert(
				`Upload Error: ${err instanceof Error ? err.message : "Unknown error"}`,
				"error",
			);
		} finally {
			setIsProcessing(false);
			setUploadProgress(null);
		}
	};

	const handleDelete = async (key: string, isAlbum = false) => {
		showConfirm(
			isAlbum ? "Delete Album" : "Delete Photo",
			`Are you sure you want to delete this ${isAlbum ? "album" : "photo"}? This action cannot be undone.`,
			async () => {
				try {
					const res = await fetch("/api/gallery", {
						method: "DELETE",
						headers: { "Content-Type": "application/json" },
						body: JSON.stringify(isAlbum ? { album: key } : { key }),
					});
					if (!res.ok) {
						const err = await res.json();
						throw new Error(err.error || "Delete failed");
					}

					if (isAlbum) {
						setAlbums((prev) =>
							prev.filter(
								(a) => a.title !== key && !a.title.startsWith(`${key}/`),
							),
						);
						if (
							activeAlbumTitle === key ||
							activeAlbumTitle?.startsWith(`${key}/`)
						)
							closeAlbum();
					} else {
						setAlbums((prev) =>
							prev.map((a) => {
								if (a.title === activeAlbumTitle) {
									const updatedPhotos = a.photos.filter((p) => p.key !== key);
									return {
										...a,
										count: updatedPhotos.length,
										photos: updatedPhotos,
										cover: updatedPhotos.slice(0, 4).map((p) => p.url),
									};
								}
								return a;
							}),
						);
						if (activePhotoKey === key) closePhoto();
					}
				} catch (err: unknown) {
					showAlert(
						err instanceof Error ? err.message : "Unknown error",
						"error",
					);
				}
			},
			"Delete",
		);
	};

	const handleUpdateCaption = () => {
		if (!activePhoto) return;
		showPrompt("Update Caption", activePhoto.caption, async (newCaption) => {
			try {
				const res = await fetch("/api/gallery", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({
						action: "update-caption",
						key: activePhoto.key,
						caption: newCaption,
					}),
				});
				if (!res.ok) {
					const err = await res.json();
					throw new Error(err.error || "Update failed");
				}
				setAlbums((prev) =>
					prev.map((a) => {
						if (a.title === activeAlbumTitle) {
							return {
								...a,
								photos: a.photos.map((p) =>
									p.key === activePhoto.key ? { ...p, caption: newCaption } : p,
								),
							};
						}
						return a;
					}),
				);
			} catch (err: unknown) {
				showAlert(
					err instanceof Error ? err.message : "Unknown error",
					"error",
				);
			}
		});
	};

	const handleEditAlbum = (album: Album) => {
		setEditAlbumConfig({
			album,
			onConfirm: async (newName, newCategory) => {
				if (!newName) return;

				const oldName = album.title;
				const oldSimpleName = oldName.split("/").pop() || "";
				let currentName = oldName;

				if (newName !== oldSimpleName) {
					try {
						const parentPath = oldName.includes("/")
							? oldName.substring(0, oldName.lastIndexOf("/") + 1)
							: "";
						const fullNewName = parentPath + newName;

						const res = await fetch("/api/gallery", {
							method: "PUT",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								action: "rename-album",
								oldName,
								newName: fullNewName,
							}),
						});

						if (!res.ok) {
							const resBody = (await res.json()) as { error?: string };
							throw new Error(resBody.error || "Rename failed");
						}

						currentName = fullNewName;
					} catch (err: unknown) {
						showAlert(
							err instanceof Error ? err.message : "Unknown error",
							"error",
						);
						return;
					}
				}

				if (newCategory !== album.category) {
					try {
						const res = await fetch("/api/gallery", {
							method: "PUT",
							headers: { "Content-Type": "application/json" },
							body: JSON.stringify({
								action: "update-category",
								album: currentName,
								category: newCategory,
							}),
						});
						if (!res.ok) {
							const err = await res.json();
							throw new Error(err.error || "Update category failed");
						}
					} catch (err: unknown) {
						showAlert(
							err instanceof Error ? err.message : "Unknown error",
							"error",
						);
					}
				}

				fetch("/api/gallery")
					.then((res) => {
						if (!res.ok) throw new Error("Failed to refresh gallery");
						return res.json();
					})
					.then((data: Album[]) => {
						setAlbums(data);
						if (activeAlbumTitle === oldName && currentName !== oldName) {
							const newAlbum = data.find((a: Album) => a.title === currentName);
							if (newAlbum) openAlbum(newAlbum);
							else closeAlbum();
						}
					})
					.catch((err: unknown) => {
						showAlert(
							err instanceof Error ? err.message : "Failed to refresh gallery",
							"error",
						);
					});
			},
		});
	};

	const handleRenamePhoto = (key: string) => {
		const oldName = (key.split("/").pop() || "").replace(PHOTO_EXT, "");
		showPrompt("Rename Photo", oldName, async (newName) => {
			if (!newName || newName === oldName) return;
			try {
				const res = await fetch("/api/gallery", {
					method: "PUT",
					headers: { "Content-Type": "application/json" },
					body: JSON.stringify({ action: "rename-photo", key, newName }),
				});
				const resBody = (await res.json()) as {
					error?: string;
					newKey: string;
				};
				if (!res.ok) throw new Error(resBody.error || "Rename failed");
				const { newKey } = resBody;
				setAlbums((prev) =>
					prev.map((a) => {
						if (a.title === activeAlbumTitle) {
							return {
								...a,
								photos: a.photos.map((p) =>
									p.key === key
										? { ...p, key: newKey, url: `/gallery/${newKey}` }
										: p,
								),
							};
						}
						return a;
					}),
				);
				if (activePhotoKey === key) {
					setActivePhotoKey(newKey ?? null);
					if (activeAlbumTitle) {
						window.history.replaceState(
							{},
							"",
							`/gallery/${encodeAlbumPath(activeAlbumTitle)}/${encodeURIComponent(newName.replace(PHOTO_EXT, ""))}`,
						);
					}
				}
			} catch (err: unknown) {
				showAlert(
					err instanceof Error ? err.message : "Unknown error",
					"error",
				);
			}
		});
	};

	const handleNewAlbumClick = () => {
		showPrompt(
			activeAlbumTitle
				? `Create New Album in ${activeAlbumTitle.split("/").pop()}`
				: "Create New Album",
			"",
			(name) => {
				if (name) {
					const finalName = activeAlbumTitle
						? `${activeAlbumTitle}/${name}`
						: name;
					setUploadAlbumName(finalName);
					setShowUploadModal(true);
				}
			},
		);
	};

	return {
		isAdmin,
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
		handleDelete,
		handleUpdateCaption,
		handleEditAlbum,
		handleRenamePhoto,
		handleNewAlbumClick,
		promptConfig,
		setPromptConfig,
		alertConfig,
		setAlertConfig,
		editAlbumConfig,
		setEditAlbumConfig,
		confirmConfig,
		setConfirmConfig,
	};
};

interface AlbumDetailViewProps {
	activeAlbum: Album;
	subAlbums: Album[];
	isAdmin: boolean;
	onBack: () => void;
	onOpenAlbum: (album: Album) => void;
	onOpenPhoto: (photo: Photo) => void;
	onEditAlbum: (album: Album) => void;
	onDelete: (key: string, isAlbum?: boolean) => void;
}

const AlbumDetailView = ({
	activeAlbum,
	subAlbums,
	isAdmin,
	onBack,
	onOpenAlbum,
	onOpenPhoto,
	onEditAlbum,
	onDelete,
}: AlbumDetailViewProps) => (
	<>
		<div className="mb-6 flex items-center gap-4">
			<button
				type="button"
				onClick={onBack}
				className="text-elegant-text-muted hover:text-elegant-text-primary transition-colors flex items-center gap-2 text-sm"
			>
				<ArrowLeft size={16} /> Back
			</button>
			<span className="text-elegant-text-muted">|</span>
			<p className="text-elegant-text-muted text-sm">
				{activeAlbum.photos.length} photos
			</p>
		</div>

		{subAlbums.length > 0 && (
			<div className="mb-8">
				<h3 className="text-elegant-text-primary font-bold mb-4 flex items-center gap-2">
					<IconFolderFill18 size={18} /> Sub-Albums
				</h3>
				<AlbumGrid
					albums={subAlbums}
					isAdmin={isAdmin}
					onOpen={onOpenAlbum}
					onEditAlbum={onEditAlbum}
					onDelete={onDelete}
				/>
			</div>
		)}

		{activeAlbum.photos.length === 0 ? (
			<div className="text-center py-20 text-elegant-text-muted">
				<p className="text-lg mb-2">This album is empty</p>
				<p className="text-sm">Upload photos to get started.</p>
			</div>
		) : (
			<PhotoGrid
				photos={activeAlbum.photos}
				isAdmin={isAdmin}
				onOpenPhoto={(photo) => onOpenPhoto(photo)}
				onDeletePhoto={(key) => onDelete(key, false)}
			/>
		)}
	</>
);

interface GalleryScreenProps {
	albums: Album[];
	loading: boolean;
	activeAlbum: Album | null;
	activePhoto: Photo | null;
	subAlbums: Album[];
	isAdmin: boolean;
	onNavigate: (dest: string) => void;
	onOpenAlbum: (album: Album) => void;
	onCloseAlbum: () => void;
	onOpenPhoto: (photo: Photo) => void;
	onClosePhoto: () => void;
	onNextPhoto: () => void;
	onPreviousPhoto: () => void;
	onDelete: (key: string, isAlbum?: boolean) => void;
	onEditAlbum: (album: Album) => void;
	onRenamePhoto: (key: string) => void;
	onUpdateCaption: () => void;
	adminProps: React.ComponentProps<typeof GalleryAdmin>;
	modalProps: React.ComponentProps<typeof GalleryModals>;
}

const GalleryScreen = ({
	albums,
	loading,
	activeAlbum,
	activePhoto,
	subAlbums,
	isAdmin,
	onNavigate,
	onOpenAlbum,
	onCloseAlbum,
	onOpenPhoto,
	onClosePhoto,
	onNextPhoto,
	onPreviousPhoto,
	onDelete,
	onEditAlbum,
	onRenamePhoto,
	onUpdateCaption,
	adminProps,
	modalProps,
}: GalleryScreenProps) => (
	<div className="h-full w-full bg-elegant-bg text-elegant-text-secondary font-mono selection:bg-elegant-accent/20 overflow-hidden">
		<div className="h-full flex flex-col">
			<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
				<PageHeader
					currentPath="gallery"
					onNavigate={onNavigate}
					maxWidth="max-w-7xl"
				/>

				<main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-28 lg:pt-8 lg:pb-32 flex flex-col min-h-0">
					{loading ? (
						<div
							className="text-center py-20 text-elegant-text-muted animate-pulse font-mono text-sm"
							aria-live="polite"
						>
							Loading gallery…
						</div>
					) : !activeAlbum ? (
						albums.length === 0 ? (
							<div className="text-center py-20 text-elegant-text-muted">
								<p className="text-lg mb-2">No albums yet</p>
								<p className="text-sm">
									Photos will appear here once uploaded.
								</p>
							</div>
						) : (
							<AlbumGrid
								albums={albums.filter((a) => !a.title.includes("/"))}
								isAdmin={isAdmin}
								onOpen={onOpenAlbum}
								onEditAlbum={onEditAlbum}
								onDelete={onDelete}
							/>
						)
					) : (
						<AlbumDetailView
							activeAlbum={activeAlbum}
							subAlbums={subAlbums}
							isAdmin={isAdmin}
							onBack={() => {
								const parentPath = activeAlbum.title.includes("/")
									? activeAlbum.title.substring(
											0,
											activeAlbum.title.lastIndexOf("/"),
										)
									: null;
								const parentAlbum = parentPath
									? albums.find((a) => a.title === parentPath)
									: null;
								if (parentAlbum) onOpenAlbum(parentAlbum);
								else onCloseAlbum();
							}}
							onOpenAlbum={onOpenAlbum}
							onOpenPhoto={onOpenPhoto}
							onEditAlbum={onEditAlbum}
							onDelete={onDelete}
						/>
					)}
				</main>
			</div>

			<Dock onNavigate={onNavigate} currentPage="Gallery" className="py-3" />

			{activePhoto && (
				<Lightbox
					activePhoto={activePhoto}
					onClose={onClosePhoto}
					onNext={onNextPhoto}
					onPrev={onPreviousPhoto}
					isAdmin={isAdmin}
					onDelete={(key) => onDelete(key, false)}
					onRename={onRenamePhoto}
					onUpdateCaption={onUpdateCaption}
				/>
			)}

			<GalleryAdmin {...adminProps} />
			<GalleryModals {...modalProps} />
		</div>
	</div>
);

const useGalleryPreload = (
	activeAlbum: Album | null,
	activePhoto: Photo | null,
) => {
	const preloadedRef = useRef<Set<string>>(new Set());

	useEffect(() => {
		if (!activeAlbum || !activePhoto) return;
		const currentIndex = activeAlbum.photos.findIndex(
			(p) => p.key === activePhoto.key,
		);
		if (currentIndex === -1) return;
		const photos = activeAlbum.photos;
		const total = photos.length;
		const preload = (photo: Photo) => {
			const optimizedUrl = optimizeImage(photo.url, {
				width: 1920,
				quality: 90,
			});
			if (preloadedRef.current.has(optimizedUrl)) return;
			const img = new Image();
			img.src = optimizedUrl;
			preloadedRef.current.add(optimizedUrl);
		};
		for (let i = 1; i <= 3; i++) preload(photos[(currentIndex + i) % total]);
		preload(photos[(currentIndex - 1 + total) % total]);
	}, [activeAlbum, activePhoto]);
};

export const Gallery = () => {
	const navigate = useNavigate();
	const onExit = useCallback(() => navigate("/"), [navigate]);
	useSEO({
		title: "Gallery | Bahauddin Alam",
		description:
			"Explore my photography portfolio. A collection of moments captured from my travels and daily life.",
		url: "https://bahauddin.org/gallery",
	});

	const [albums, setAlbums] = useState<Album[]>([]);
	const [loading, setLoading] = useState(true);

	const {
		activeAlbumTitle,
		setActiveAlbumTitle,
		activePhotoKey,
		setActivePhotoKey,
		encodeAlbumPath,
		openAlbum,
		closeAlbum,
		openPhoto,
		closePhoto,
	} = useGalleryNavigation(albums);

	const activeAlbum = activeAlbumTitle
		? (albums.find((a) => a.title === activeAlbumTitle) ?? null)
		: null;
	const activePhoto =
		activeAlbum && activePhotoKey
			? (activeAlbum.photos.find((p) => p.key === activePhotoKey) ?? null)
			: null;

	useEffect(() => {
		const controller = new AbortController();
		const signal = controller.signal;

		fetch("/api/gallery", { signal })
			.then(async (res) => {
				if (!res.ok) {
					const err = await res.json();
					throw new Error(err.error || "Failed to load gallery");
				}
				return res.json();
			})
			.then((data: Album[]) => {
				if (signal.aborted) return;
				setAlbums(data);
				setLoading(false);

				const path = window.location.pathname;
				if (path.startsWith("/gallery/")) {
					const parts = path.split("/").slice(2).filter(Boolean);
					if (parts.length >= 1) {
						try {
							const { album, photoFilename } = resolveNestedPath(parts, data);
							if (album) {
								setActiveAlbumTitle(album.title);
								if (photoFilename) {
									const foundPhoto = album.photos.find((p) => {
										const basename = (p.key.split("/").pop() || "").replace(
											PHOTO_EXT,
											"",
										);
										return (
											basename.toLowerCase() === photoFilename.toLowerCase()
										);
									});
									if (foundPhoto) {
										setActivePhotoKey(foundPhoto.key);
									}
								}
							}
						} catch {}
					}
				}
			})
			.catch((err) => {
				if (err.name === "AbortError") return;
				setLoading(false);
			});

		return () => controller.abort();
	}, [setActiveAlbumTitle, setActivePhotoKey]);

	const handleNavigate = useCallback(
		(dest: string) => {
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
		},
		[navigate, onExit],
	);

	const handleNext = useCallback(
		(e?: React.MouseEvent) => {
			e?.stopPropagation();
			if (!activeAlbum || !activePhoto) return;
			const currentIndex = activeAlbum.photos.findIndex(
				(p) => p.key === activePhoto.key,
			);
			if (currentIndex === -1) return;
			const nextIndex = (currentIndex + 1) % activeAlbum.photos.length;
			openPhoto(activeAlbum.photos[nextIndex], true);
		},
		[activeAlbum, activePhoto, openPhoto],
	);

	const handlePrev = useCallback(
		(e?: React.MouseEvent) => {
			e?.stopPropagation();
			if (!activeAlbum || !activePhoto) return;
			const currentIndex = activeAlbum.photos.findIndex(
				(p) => p.key === activePhoto.key,
			);
			if (currentIndex === -1) return;
			const prevIndex =
				(currentIndex - 1 + activeAlbum.photos.length) %
				activeAlbum.photos.length;
			openPhoto(activeAlbum.photos[prevIndex], true);
		},
		[activeAlbum, activePhoto, openPhoto],
	);

	const {
		isAdmin,
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
		handleDelete,
		handleUpdateCaption,
		handleEditAlbum,
		handleRenamePhoto,
		handleNewAlbumClick,
		promptConfig,
		setPromptConfig,
		alertConfig,
		setAlertConfig,
		editAlbumConfig,
		setEditAlbumConfig,
		confirmConfig,
		setConfirmConfig,
	} = useGalleryAdminActions({
		setAlbums,
		activeAlbumTitle,
		activePhotoKey,
		setActivePhotoKey,
		activePhoto,
		closeAlbum,
		closePhoto,
		openAlbum,
		encodeAlbumPath,
	});

	const handleKeyDown = useEffectEvent((e: KeyboardEvent) => {
		if (e.key === "Escape") {
			if (activePhoto) closePhoto();
			else if (activeAlbum) closeAlbum();
			else onExit();
		}
		if (activePhoto) {
			if (e.key === "ArrowRight") handleNext();
			if (e.key === "ArrowLeft") handlePrev();
		}
	});

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	useGalleryPreload(activeAlbum, activePhoto);

	const subAlbums = useMemo(() => {
		if (!activeAlbum) return [];
		const prefix = `${activeAlbum.title}/`;
		const depth = activeAlbum.title.split("/").length + 1;
		return albums.filter(
			(a) => a.title.startsWith(prefix) && a.title.split("/").length === depth,
		);
	}, [albums, activeAlbum]);

	return (
		<GalleryScreen
			albums={albums}
			loading={loading}
			activeAlbum={activeAlbum}
			activePhoto={activePhoto}
			subAlbums={subAlbums}
			isAdmin={isAdmin}
			onNavigate={handleNavigate}
			onOpenAlbum={openAlbum}
			onCloseAlbum={closeAlbum}
			onOpenPhoto={openPhoto}
			onClosePhoto={closePhoto}
			onNextPhoto={handleNext}
			onPreviousPhoto={handlePrev}
			onDelete={handleDelete}
			onEditAlbum={handleEditAlbum}
			onRenamePhoto={handleRenamePhoto}
			onUpdateCaption={handleUpdateCaption}
			adminProps={{
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
				onNewAlbumClick: handleNewAlbumClick,
			}}
			modalProps={{
				promptConfig,
				setPromptConfig,
				alertConfig,
				setAlertConfig,
				editAlbumConfig,
				setEditAlbumConfig,
				confirmConfig,
				setConfirmConfig,
			}}
		/>
	);
};
