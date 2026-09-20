import { X } from "lucide-react";
import { useEffect } from "react";

export const ProfileLightbox = ({ onClose }: { onClose: () => void }) => {
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if (e.key === "Escape") onClose();
		};
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [onClose]);

	return (
		<dialog
			open
			aria-modal="true"
			aria-label="Profile picture modal"
			tabIndex={-1}
			className="fixed inset-x-0 top-8 bottom-0 z-40 w-full h-[calc(100dvh-2rem)] max-w-none max-h-none border-0 m-0 bg-black/90 backdrop-blur-sm p-4 flex items-center justify-center select-none outline-none"
		>
			<button
				type="button"
				aria-label="Close modal background"
				className="absolute inset-0 h-full w-full cursor-default bg-transparent border-0 p-0"
				onClick={onClose}
			/>
			<button
				type="button"
				className="absolute top-4 right-4 p-2 bg-white/10 hover:bg-white/20 active:bg-white/30 rounded-full text-white transition-colors z-10 outline-none focus-visible:ring-2 focus-visible:ring-white cursor-pointer"
				onClick={onClose}
				aria-label="Close profile picture"
			>
				<X size={20} aria-hidden="true" />
			</button>

			<div className="relative max-w-2xl w-full aspect-square md:aspect-auto md:h-[80vh] flex items-center justify-center p-2 pointer-events-none z-10">
				<img
					src="/assets/me.jpg"
					alt="Bahauddin Alam"
					width={600}
					height={600}
					className="w-full h-full object-contain rounded-full md:rounded-lg shadow-2xl ring-4 ring-elegant-border/20"
				/>
			</div>
		</dialog>
	);
};
