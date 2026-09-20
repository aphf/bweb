import { m } from "motion/react";
import { IconWindowCode2 } from "nucleo-micro-bold-essential";
import {
	IconEnvelopeFill18,
	IconFileContentFill18,
	IconFolderOpenFill18,
	IconHouse2Fill18,
	IconImageMountainFill18,
	IconImages2Fill18,
	IconUserFill18,
} from "nucleo-ui-essential-fill-18";
import type React from "react";
import { useCallback, useMemo } from "react";
import {
	prefetchAlaska,
	prefetchFileManager,
	prefetchPage,
	prefetchTerminal,
} from "../utils/prefetch";

interface DockProps {
	onNavigate: (dest: string) => void;
	currentPage?: string;
	className?: string;
	isFileManagerOpen?: boolean;
	isAlaskaOpen?: boolean;
}

interface DockItem {
	label: string;
	icon: React.ComponentType<{
		className?: string;
		size?: number | string;
		"aria-hidden"?: boolean | "true" | "false";
	}>;
	accent?: boolean;
}

const DolphinIcon = ({ className = "" }: { className?: string }) => (
	<img
		src="/assets/dolphin.svg"
		alt="Dolphin"
		className={`size-4.5 sm:size-5 select-none ${className}`}
		draggable={false}
	/>
);

export const Dock = ({
	onNavigate,
	currentPage,
	className = "",
	isFileManagerOpen = false,
	isAlaskaOpen = false,
}: DockProps) => {
	const dockItems = useMemo(() => {
		const base: DockItem[] = [
			{ label: "Home", icon: IconHouse2Fill18, accent: true },
			...(isFileManagerOpen
				? [{ label: "Files", icon: DolphinIcon, accent: true }]
				: []),
			...(isAlaskaOpen
				? [{ label: "Alaska", icon: IconImageMountainFill18, accent: true }]
				: []),
			{ label: "About", icon: IconUserFill18 },
			{ label: "Projects", icon: IconFolderOpenFill18 },
			{ label: "Gallery", icon: IconImages2Fill18 },
			{ label: "Notes", icon: IconFileContentFill18 },
			{ label: "Contact", icon: IconEnvelopeFill18 },
			{ label: "Terminal", icon: IconWindowCode2, accent: true },
		];
		return base;
	}, [isFileManagerOpen, isAlaskaOpen]);

	const handlePrefetch = useCallback((label: string) => {
		if (label === "Files") prefetchFileManager();
		else if (label === "Alaska") prefetchAlaska();
		else if (label === "Terminal") prefetchTerminal();
		else prefetchPage(label);
	}, []);

	return (
		<div
			className={`fixed inset-x-0 bottom-4 z-40 px-3 pointer-events-none ${className}`}
		>
			<div className="mx-auto flex w-fit max-w-full flex-col gap-2 pointer-events-auto">
				<nav
					aria-label="Navigation"
					className="relative flex items-center justify-center gap-1 sm:gap-1.5 rounded-full bg-elegant-bg/85 px-2.5 sm:px-3 py-1.5 shadow-2xl backdrop-blur-md border border-elegant-border"
				>
					<div
						aria-hidden={true}
						className="pointer-events-none absolute inset-0 rounded-full shadow-[inset_0_1px_0_rgba(255,255,255,0.1)] dark:shadow-[inset_0_1px_0_rgba(255,255,255,0.2)]"
					/>

					<div className="flex items-center gap-1 sm:gap-1.5">
						{dockItems.map((item) => {
							const isActive = currentPage === item.label;
							const Icon = item.icon;

							return (
								<button
									key={item.label}
									type="button"
									aria-label={`Open ${item.label}`}
									onClick={() => onNavigate(item.label)}
									onMouseEnter={() => handlePrefetch(item.label)}
									onFocus={() => handlePrefetch(item.label)}
									onTouchStart={() => handlePrefetch(item.label)}
									className="group relative flex size-9 sm:size-10 shrink-0 cursor-pointer items-center justify-center rounded-full outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent transition-transform duration-150 active:scale-95"
								>
									<span
										role="tooltip"
										className="pointer-events-none absolute -top-8.5 left-1/2 -translate-x-1/2 rounded-md bg-elegant-card/95 border border-elegant-border px-2 py-0.5 text-[11px] sm:text-xs font-mono font-medium text-elegant-text-primary shadow-lg backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-[transform,opacity] duration-150 -translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0 whitespace-nowrap z-50 select-none"
									>
										{item.label}
									</span>

									<Icon
										className={`size-4.5 sm:size-5 transition-[transform,color] duration-200 group-hover:scale-110 ${
											isActive
												? "text-elegant-accent"
												: item.accent
													? "text-elegant-accent/75 group-hover:text-elegant-accent"
													: "text-elegant-text-secondary group-hover:text-elegant-text-primary"
										}`}
										aria-hidden="true"
									/>

									{isActive && (
										<m.span
											layoutId="dock-active-pill"
											transition={{
												type: "spring",
												stiffness: 500,
												damping: 35,
											}}
											className="pointer-events-none absolute bottom-1 h-1 w-2.5 rounded-full bg-elegant-accent shadow-none"
											style={{ boxShadow: "var(--dock-pill-shadow)" }}
											aria-hidden="true"
										/>
									)}
								</button>
							);
						})}
					</div>
				</nav>
			</div>
		</div>
	);
};
