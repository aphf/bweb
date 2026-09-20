import { useCallback, useEffect, useState } from "react";
import { trackEvent } from "../../lib/analytics";
import type { Album, Photo } from "./types";

const PHOTO_EXT = /\.(jpg|jpeg|png|webp|gif)$/i;

export const resolveNestedPath = (
	parts: string[],
	albums: Album[],
): { album: Album | null; photoFilename: string | null } => {
	for (let i = parts.length; i >= 1; i--) {
		const candidate = parts
			.slice(0, i)
			.map((p) => decodeURIComponent(p))
			.join("/");
		const album = albums.find(
			(a) => a.title.toLowerCase() === candidate.toLowerCase(),
		);
		if (album) {
			const remainder = parts.slice(i);
			const photoFilename =
				remainder.length > 0
					? remainder.map((p) => decodeURIComponent(p)).join("/")
					: null;
			return { album, photoFilename };
		}
	}
	return { album: null, photoFilename: null };
};

export function useGalleryNavigation(albums: Album[]) {
	const [activeAlbumTitle, setActiveAlbumTitle] = useState<string | null>(null);
	const [activePhotoKey, setActivePhotoKey] = useState<string | null>(null);

	const encodeAlbumPath = useCallback((title: string) => {
		return title
			.split("/")
			.map((s) => encodeURIComponent(s))
			.join("/");
	}, []);

	const buildPhotoUrl = useCallback((photo: Photo) => {
		const parts = photo.key.split("/");
		const encoded = parts.map((p, i) =>
			i === parts.length - 1
				? encodeURIComponent(p.replace(PHOTO_EXT, ""))
				: encodeURIComponent(p),
		);
		return `/gallery/${encoded.join("/")}`;
	}, []);

	const openAlbum = useCallback(
		(album: Album) => {
			trackEvent("gallery-album-open");
			setActiveAlbumTitle(album.title);
			setActivePhotoKey(null);
			window.history.pushState(
				{},
				"",
				`/gallery/${encodeAlbumPath(album.title)}`,
			);
		},
		[encodeAlbumPath],
	);

	const closeAlbum = useCallback(() => {
		setActiveAlbumTitle(null);
		setActivePhotoKey(null);
		window.history.pushState({}, "", "/gallery");
	}, []);

	const openPhoto = useCallback(
		(photo: Photo, replace = false) => {
			trackEvent("gallery-photo-open");
			setActivePhotoKey(photo.key);
			const url = buildPhotoUrl(photo);
			if (replace) {
				window.history.replaceState({}, "", url);
			} else {
				window.history.pushState({}, "", url);
			}
		},
		[buildPhotoUrl],
	);

	const closePhoto = useCallback(() => {
		setActivePhotoKey(null);
		if (activeAlbumTitle) {
			window.history.pushState(
				{},
				"",
				`/gallery/${encodeAlbumPath(activeAlbumTitle)}`,
			);
		}
	}, [activeAlbumTitle, encodeAlbumPath]);

	useEffect(() => {
		const handlePopState = () => {
			const path = window.location.pathname;
			if (path === "/gallery") {
				setActiveAlbumTitle(null);
				setActivePhotoKey(null);
			} else if (path.startsWith("/gallery/")) {
				const parts = path.split("/").slice(2).filter(Boolean);
				const { album, photoFilename } = resolveNestedPath(parts, albums);
				if (album) {
					setActiveAlbumTitle(album.title);
					if (photoFilename) {
						const foundPhoto = album.photos.find((p) => {
							const basename = (p.key.split("/").pop() || "").replace(
								PHOTO_EXT,
								"",
							);
							return basename.toLowerCase() === photoFilename.toLowerCase();
						});
						setActivePhotoKey(foundPhoto ? foundPhoto.key : null);
					} else {
						setActivePhotoKey(null);
					}
				} else {
					setActiveAlbumTitle(null);
					setActivePhotoKey(null);
				}
			}
		};
		window.addEventListener("popstate", handlePopState);
		return () => window.removeEventListener("popstate", handlePopState);
	}, [albums]);

	return {
		activeAlbumTitle,
		setActiveAlbumTitle,
		activePhotoKey,
		setActivePhotoKey,
		encodeAlbumPath,
		openAlbum,
		closeAlbum,
		openPhoto,
		closePhoto,
	};
}
