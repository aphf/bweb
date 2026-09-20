import { FileEdit } from "lucide-react";
import { IconTrashFill18 } from "nucleo-ui-essential-fill-18";
import type React from "react";
import { optimizeImage } from "../../utils/imageOptimizer";
import type { Album } from "./types";

const POSITION_CLASSES: Record<
	"top" | "bottom" | "left" | "top-right",
	string
> = {
	top: "bottom-full left-1/2 -translate-x-1/2 mb-2",
	bottom: "top-full left-1/2 -translate-x-1/2 mt-2",
	left: "right-full top-1/2 -translate-y-1/2 mr-2",
	"top-right": "bottom-full right-0 mb-2",
};

const Tooltip: React.FC<{
	text: string;
	children: React.ReactNode;
	position?: "top" | "bottom" | "left" | "top-right";
}> = ({ text, children, position = "top" }) => {
	return (
		<div className="relative group/tip">
			{children}
			<div
				className={`absolute ${POSITION_CLASSES[position]} px-2.5 py-1 bg-elegant-card border border-elegant-border rounded text-[11px] text-elegant-text-secondary font-mono whitespace-nowrap opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-[opacity,transform] duration-200 pointer-events-none z-[100] shadow-lg`}
			>
				{text}
				<div
					className={`absolute ${
						position === "top"
							? "top-full left-1/2 -translate-x-1/2 border-t-elegant-border border-l-transparent border-r-transparent border-b-transparent border-4"
							: position === "bottom"
								? "bottom-full left-1/2 -translate-x-1/2 border-b-elegant-border border-l-transparent border-r-transparent border-t-transparent border-4"
								: position === "top-right"
									? "top-full right-3 border-t-elegant-border border-l-transparent border-r-transparent border-b-transparent border-4"
									: ""
					}`}
				/>
			</div>
		</div>
	);
};

interface AlbumCardProps {
	album: Album;
	displayTitle: string;
	isAdmin: boolean;
	onOpen: (album: Album) => void;
	onEditAlbum: (album: Album) => void;
	onDelete: (title: string, isAlbum?: boolean) => void;
}

export const AlbumCard = ({
	album,
	displayTitle,
	isAdmin,
	onOpen,
	onEditAlbum,
	onDelete,
}: AlbumCardProps) => (
	<div className="group relative bg-elegant-card border border-elegant-border rounded-sm hover:border-elegant-text-muted transition-colors duration-300 cursor-pointer hover:z-20">
		<button
			type="button"
			aria-label={`Open album ${displayTitle}`}
			onClick={() => onOpen(album)}
			className="absolute inset-0 z-0 outline-none focus-visible:ring-2 focus-visible:ring-elegant-accent"
		/>
		<div className="relative z-10 pointer-events-none aspect-video bg-black overflow-hidden grid grid-cols-2 grid-rows-2 rounded-t-sm">
			{[0, 1, 2, 3].map((slot) => (
				<div
					key={`${album.title}-cover-slot-${slot}`}
					className="relative w-full h-full overflow-hidden border-r border-b border-black/10 last:border-0"
				>
					{album.cover[slot] ? (
						<img
							src={optimizeImage(album.cover[slot], {
								width: 400,
								height: 400,
								fit: "cover",
								quality: 80,
							})}
							alt={`${album.title} cover ${slot + 1}`}
							width={400}
							height={400}
							loading="lazy"
							decoding="async"
							className="w-full h-full object-cover opacity-80 group-hover:opacity-100 group-hover:scale-105 transition-[opacity,transform,filter] duration-100 grayscale group-hover:grayscale-0"
							onError={(e) => {
								e.currentTarget.style.opacity = "0";
							}}
						/>
					) : (
						<div className="w-full h-full bg-elegant-bg/50" />
					)}
				</div>
			))}
			<div className="absolute inset-0 bg-black/20 group-hover:bg-transparent transition-colors duration-300 pointer-events-none" />
			<div className="absolute top-3 right-3 pointer-events-none">
				<span className="px-3 py-1 bg-black/80 border border-elegant-border rounded text-xs text-elegant-text-secondary backdrop-blur-sm tabular-nums">
					{album.count} items
				</span>
			</div>
		</div>
		<div className="relative z-10 pointer-events-none p-5 flex justify-between items-start">
			<div className="min-w-0 flex-1">
				<h3 className="text-lg font-bold text-elegant-text-primary mb-1 group-hover:text-elegant-accent transition-colors truncate">
					{displayTitle}
				</h3>
				<p className="text-sm text-elegant-text-muted truncate">
					{album.category}
				</p>
			</div>
			{isAdmin && (
				<div className="flex gap-1 ml-2 flex-shrink-0 pointer-events-auto">
					<Tooltip text="Edit Album">
						<button
							type="button"
							aria-label="Edit album"
							onClick={(e) => {
								e.stopPropagation();
								onEditAlbum(album);
							}}
							className="text-elegant-text-muted hover:text-elegant-accent p-1.5 rounded outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent hover:bg-white/5 transition-colors"
						>
							<FileEdit size={15} aria-hidden="true" />
						</button>
					</Tooltip>
					<Tooltip text="Delete Album" position="top-right">
						<button
							type="button"
							aria-label="Delete album"
							onClick={(e) => {
								e.stopPropagation();
								onDelete(album.title, true);
							}}
							className="text-elegant-text-muted hover:text-red-400 p-1.5 rounded outline-none focus-visible:ring-1 focus-visible:ring-red-400 hover:bg-white/5 transition-colors"
						>
							<IconTrashFill18 size={15} aria-hidden="true" />
						</button>
					</Tooltip>
				</div>
			)}
		</div>
	</div>
);
