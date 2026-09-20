import { ChevronLeft, ChevronRight, Hand, X } from "lucide-react";
import {
	IconCircleCompose2Fill18,
	IconTrashFill18,
} from "nucleo-ui-essential-fill-18";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { optimizeImage } from "../../utils/imageOptimizer";
import type { Photo } from "./types";

const Tooltip: React.FC<{ text: string; children: React.ReactNode }> = ({
	text,
	children,
}) => (
	<div className="relative group/tip">
		{children}
		<div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 px-2.5 py-1 bg-elegant-card border border-elegant-border rounded text-[11px] text-elegant-text-secondary font-mono whitespace-nowrap opacity-0 scale-95 group-hover/tip:opacity-100 group-hover/tip:scale-100 transition-[opacity,transform] duration-200 pointer-events-none z-100 shadow-lg">
			{text}
			<div className="absolute top-full left-1/2 -translate-x-1/2 border-t-elegant-border border-l-transparent border-r-transparent border-b-transparent border-4" />
		</div>
	</div>
);

interface LightboxProps {
	activePhoto: Photo;
	onClose: () => void;
	onNext: () => void;
	onPrev: () => void;
	isAdmin: boolean;
	onDelete: (key: string) => void;
	onRename: (key: string) => void;
	onUpdateCaption: () => void;
}

export const Lightbox = ({
	activePhoto,
	onClose,
	onNext,
	onPrev,
	isAdmin,
	onDelete,
	onRename,
	onUpdateCaption,
}: LightboxProps) => {
	const touchStart = useRef<number | null>(null);
	const touchEnd = useRef<number | null>(null);
	const minSwipeDistance = 50;
	const [showSwipeHint, setShowSwipeHint] = useState(false);

	const onTouchStart = (e: React.TouchEvent) => {
		touchEnd.current = null;
		touchStart.current = e.targetTouches[0].clientX;
	};
	const onTouchMove = (e: React.TouchEvent) => {
		touchEnd.current = e.targetTouches[0].clientX;
	};
	const onTouchEnd = () => {
		if (!touchStart.current || !touchEnd.current) return;
		const distance = touchStart.current - touchEnd.current;
		if (distance > minSwipeDistance) onNext();
		if (distance < -minSwipeDistance) onPrev();
	};

	useEffect(() => {
		const t1 = setTimeout(() => setShowSwipeHint(true), 500);
		const t2 = setTimeout(() => setShowSwipeHint(false), 3500);
		return () => {
			clearTimeout(t1);
			clearTimeout(t2);
		};
	}, []);

	return (
		<dialog
			open
			aria-modal="true"
			aria-label="Photo viewer"
			tabIndex={-1}
			className="fixed inset-x-0 top-8 bottom-0 z-40 w-full h-[calc(100dvh-2rem)] max-w-none max-h-none border-0 m-0 bg-black/95 backdrop-blur-md flex flex-col overflow-hidden select-none outline-none"
			onTouchStart={onTouchStart}
			onTouchMove={onTouchMove}
			onTouchEnd={onTouchEnd}
		>
			<div className="w-full h-12 px-4 flex items-center justify-between shrink-0 z-30 border-b border-white/10 bg-black/40">
				<button
					type="button"
					className={`text-left bg-transparent border-0 p-0 text-white font-mono text-xs sm:text-sm font-medium truncate max-w-[70%] outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent rounded ${
						isAdmin
							? "cursor-pointer hover:text-elegant-accent hover:underline decoration-dashed underline-offset-4"
							: "cursor-default"
					}`}
					onClick={() => {
						if (isAdmin) onRename(activePhoto.key);
					}}
				>
					{decodeURIComponent(activePhoto.key.split("/").pop() || "")}
				</button>
				<button
					type="button"
					aria-label="Close photo viewer"
					onClick={onClose}
					className="p-1.5 sm:p-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-full text-white outline-none focus-visible:ring-2 focus-visible:ring-white transition-colors cursor-pointer"
				>
					<X size={18} aria-hidden="true" />
				</button>
			</div>

			<div className="flex-1 min-h-0 w-full flex items-center justify-center p-2 sm:p-4 md:p-6 overflow-hidden relative">
				<button
					type="button"
					aria-label="Previous photo"
					className="absolute inset-y-0 left-0 w-1/5 z-10 cursor-pointer bg-transparent border-0 p-0"
					onClick={onPrev}
				/>
				<button
					type="button"
					aria-label="Next photo"
					className="absolute inset-y-0 right-0 w-1/5 z-10 cursor-pointer bg-transparent border-0 p-0"
					onClick={onNext}
				/>

				<button
					type="button"
					aria-label="Previous photo"
					onClick={onPrev}
					className="absolute left-2 sm:left-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-black/60 hover:bg-black/80 active:scale-95 text-white rounded-full transition-[transform,opacity,background-color] duration-150 opacity-80 hover:opacity-100 hover:scale-110 z-20 outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer shadow-xl backdrop-blur-xs flex items-center justify-center border border-white/10"
				>
					<ChevronLeft size={24} className="sm:size-7" aria-hidden="true" />
				</button>

				<img
					key={activePhoto.key}
					src={optimizeImage(activePhoto.url, { width: 1920, quality: 90 })}
					alt={activePhoto.caption || "Full view"}
					className="max-w-full max-h-full w-auto h-auto object-contain relative z-0 select-none drop-shadow-2xl"
					decoding="async"
					draggable={false}
				/>

				{activePhoto.caption && (
					<div className="absolute bottom-4 sm:bottom-6 left-0 right-0 flex justify-center pointer-events-none z-20 px-4">
						<div className="bg-black/60 backdrop-blur-md border border-white/15 rounded-full px-5 py-2 max-w-[85vw] shadow-lg">
							<p className="text-white/90 font-medium text-xs sm:text-sm drop-shadow-md text-center truncate">
								{activePhoto.caption}
							</p>
						</div>
					</div>
				)}

				<button
					type="button"
					aria-label="Next photo"
					onClick={onNext}
					className="absolute right-2 sm:right-4 top-1/2 -translate-y-1/2 p-2 sm:p-3 bg-black/60 hover:bg-black/80 active:scale-95 text-white rounded-full transition-[transform,opacity,background-color] duration-150 opacity-80 hover:opacity-100 hover:scale-110 z-20 outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer shadow-xl backdrop-blur-xs flex items-center justify-center border border-white/10"
				>
					<ChevronRight size={24} className="sm:size-7" aria-hidden="true" />
				</button>

				{showSwipeHint && (
					<div className="absolute inset-0 flex items-center justify-center pointer-events-none md:hidden z-30">
						<div className="bg-black/70 text-white px-4 py-2.5 rounded-full flex items-center gap-2.5 backdrop-blur-md animate-fade-out border border-white/10 shadow-lg">
							<Hand
								size={20}
								className="animate-swipe-hint"
								aria-hidden="true"
							/>
							<span className="text-xs font-medium">Swipe to navigate</span>
						</div>
					</div>
				)}
			</div>

			{isAdmin && (
				<div className="absolute bottom-4 right-4 z-40 flex gap-2 sm:gap-3">
					<Tooltip text="Delete Photo">
						<button
							type="button"
							aria-label="Delete photo"
							onClick={() => onDelete(activePhoto.key)}
							className="p-2.5 sm:p-3 bg-elegant-card/90 border border-elegant-border backdrop-blur-md text-red-400 rounded-full hover:bg-red-500/20 hover:border-red-500/50 outline-none focus-visible:ring-2 focus-visible:ring-red-400 transition-colors shadow-lg cursor-pointer"
						>
							<IconTrashFill18 size={18} aria-hidden="true" />
						</button>
					</Tooltip>
					<Tooltip text="Edit Caption">
						<button
							type="button"
							aria-label="Edit caption"
							onClick={onUpdateCaption}
							className="p-2.5 sm:p-3 bg-elegant-card/90 border border-elegant-border backdrop-blur-md text-elegant-text-primary rounded-full hover:bg-elegant-accent hover:text-elegant-bg hover:border-elegant-accent outline-none focus-visible:ring-2 focus-visible:ring-elegant-accent transition-colors shadow-lg cursor-pointer"
						>
							<IconCircleCompose2Fill18 size={18} aria-hidden="true" />
						</button>
					</Tooltip>
				</div>
			)}
		</dialog>
	);
};
