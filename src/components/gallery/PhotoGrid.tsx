import { Maximize2 } from "lucide-react";
import { IconTrashFill18 } from "nucleo-ui-essential-fill-18";
import type React from "react";
import { useState } from "react";
import { optimizeImage } from "../../utils/imageOptimizer";
import type { Photo } from "./types";

interface PhotoItemProps {
	photo: Photo;
	index: number;
	isAdmin: boolean;
	onOpenPhoto: (photo: Photo) => void;
	onDeletePhoto: (key: string) => void;
}

const PhotoItem: React.FC<PhotoItemProps> = ({
	photo,
	index,
	isAdmin,
	onOpenPhoto,
	onDeletePhoto,
}) => {
	const [hasError, setHasError] = useState(false);

	return (
		<div className="group bg-elegant-card border border-elegant-border rounded-sm overflow-hidden hover:border-elegant-text-muted transition-colors relative cursor-pointer break-inside-avoid">
			<button
				type="button"
				aria-label={`Open ${photo.caption || `photo ${index + 1}`}`}
				onClick={() => onOpenPhoto(photo)}
				className="absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-elegant-accent"
			/>
			{hasError ? (
				<div className="relative z-10 pointer-events-none w-full aspect-video flex items-center justify-center bg-elegant-card">
					<span className="text-xs text-elegant-text-muted font-mono">
						IMG_{index + 1}.RAW
					</span>
				</div>
			) : (
				<img
					src={optimizeImage(photo.url, { width: 600, quality: 80 })}
					alt={photo.caption || `Photo ${index + 1}`}
					width={600}
					height={400}
					loading="lazy"
					decoding="async"
					className="relative z-10 pointer-events-none w-full h-auto object-contain group-hover:scale-[1.02] transition-transform duration-300"
					onError={() => setHasError(true)}
				/>
			)}

			<div className="absolute inset-0 z-20 pointer-events-none bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity hidden md:flex items-center justify-center gap-4">
				<Maximize2
					size={20}
					className="text-elegant-text-primary"
					aria-hidden="true"
				/>
				{isAdmin && (
					<button
						type="button"
						aria-label="Delete photo"
						onClick={(e) => {
							e.stopPropagation();
							onDeletePhoto(photo.key);
						}}
						className="pointer-events-auto p-2 bg-red-500/80 rounded-full hover:bg-red-500 text-white outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
					>
						<IconTrashFill18 size={16} aria-hidden="true" />
					</button>
				)}
			</div>

			{isAdmin && (
				<div className="absolute top-2 right-2 md:hidden z-20 pointer-events-none">
					<button
						type="button"
						aria-label="Delete photo"
						onClick={(e) => {
							e.stopPropagation();
							onDeletePhoto(photo.key);
						}}
						className="pointer-events-auto p-1.5 bg-black/70 backdrop-blur-sm rounded-full text-red-400 active:bg-red-500/30 outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors"
					>
						<IconTrashFill18 size={13} aria-hidden="true" />
					</button>
				</div>
			)}
		</div>
	);
};

interface PhotoGridProps {
	photos: Photo[];
	isAdmin: boolean;
	onOpenPhoto: (photo: Photo) => void;
	onDeletePhoto: (key: string) => void;
}

export const PhotoGrid = ({
	photos,
	isAdmin,
	onOpenPhoto,
	onDeletePhoto,
}: PhotoGridProps) => {
	return (
		<div className="columns-1 sm:columns-2 md:columns-3 lg:columns-4 gap-4 space-y-4">
			{photos.map((photo, i) => (
				<PhotoItem
					key={photo.key}
					photo={photo}
					index={i}
					isAdmin={isAdmin}
					onOpenPhoto={onOpenPhoto}
					onDeletePhoto={onDeletePhoto}
				/>
			))}
		</div>
	);
};
