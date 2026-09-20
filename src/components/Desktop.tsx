import {
	IconAlign3LeftFill18,
	IconCircleInfoFill18,
	IconDarkLightFill18,
	IconImageMountainFill18,
} from "nucleo-ui-essential-fill-18";
import { useCallback, useMemo } from "react";
import { useNavigate } from "react-router";
import { useTheme } from "../hooks/useTheme";
import { trackEvent } from "../lib/analytics";
import { prefetchAlaska, prefetchFileManager } from "../utils/prefetch";
import { Dock } from "./Dock";
import { MusicWidget } from "./music/MusicWidget";
import {
	ContextMenu,
	ContextMenuContent,
	ContextMenuItem,
	ContextMenuSeparator,
	ContextMenuShortcut,
	ContextMenuTrigger,
} from "./ui/context-menu";
import {
	Popover,
	PopoverContent,
	PopoverHeader,
	PopoverTitle,
	PopoverTrigger,
} from "./ui/popover";

interface DesktopProps {
	onOpenTerminal: () => void;
	onOpenAlaska: () => void;
	isAlaskaOpen?: boolean;
	onOpenFileManager: () => void;
	isFileManagerOpen?: boolean;
}

export const Desktop = ({
	onOpenTerminal,
	onOpenAlaska,
	isAlaskaOpen = false,
	onOpenFileManager,
	isFileManagerOpen = false,
}: DesktopProps) => {
	const navigate = useNavigate();
	const { theme, toggleTheme } = useTheme();

	const modifierKey = useMemo(() => {
		if (typeof window === "undefined" || typeof navigator === "undefined") {
			return "ctrl";
		}
		const userAgent = navigator.userAgent || "";
		const platform =
			(
				navigator as {
					userAgentData?: { platform?: string };
					platform?: string;
				}
			).platform || "";
		const isMac =
			/Mac|iPod|iPhone|iPad/.test(userAgent) ||
			platform.toUpperCase().includes("MAC");
		return isMac ? "cmd" : "ctrl";
	}, []);

	const handleDockNavigate = useCallback(
		(dest: string) => {
			trackEvent("dock-click", { dest: dest.toLowerCase().slice(0, 50) });
			if (dest === "Terminal") {
				onOpenTerminal();
			} else if (dest === "Files") {
				onOpenFileManager();
			} else if (dest === "Alaska") {
				onOpenAlaska();
			} else if (dest === "Home") {
			} else {
				navigate(`/${dest.toLowerCase()}`);
			}
		},
		[onOpenTerminal, onOpenFileManager, onOpenAlaska, navigate],
	);

	const activeDockPage = isAlaskaOpen
		? "Alaska"
		: isFileManagerOpen
			? "Files"
			: "Home";

	return (
		<div className="fixed inset-0 w-full h-dvh overflow-hidden select-none font-mono">
			<div className="fixed inset-0 pointer-events-none -z-10 overflow-hidden">
				<img
					src="/assets/wallpaper.webp"
					alt="Neosphere Desktop Wallpaper (Dark)"
					fetchPriority="high"
					decoding="async"
					className={`w-full h-full object-cover object-center absolute inset-0 transition-opacity duration-700 ease-in-out ${
						theme === "dark" ? "opacity-100" : "opacity-0"
					}`}
				/>
				<img
					src="/assets/wallpaper-light.webp"
					alt="Neosphere Desktop Wallpaper (Light)"
					fetchPriority="high"
					decoding="async"
					className={`w-full h-full object-cover object-center absolute inset-0 transition-opacity duration-700 ease-in-out ${
						theme === "light" ? "opacity-100" : "opacity-0"
					}`}
				/>
				<div className="absolute inset-0 bg-elegant-bg/20 dark:bg-black/40 backdrop-blur-xs transition-colors duration-700" />
			</div>

			<ContextMenu>
				<ContextMenuTrigger asChild>
					<section
						aria-label="Desktop"
						tabIndex={-1}
						className="relative w-full h-full pt-8 pb-16 flex flex-col justify-between outline-none"
					>
						<div className="absolute top-12 left-6 z-10 flex flex-col items-center gap-4">
							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									trackEvent("desktop-icon-click", { icon: "file-manager" });
									onOpenFileManager();
								}}
								onMouseEnter={prefetchFileManager}
								onFocus={prefetchFileManager}
								onTouchStart={prefetchFileManager}
								className="group relative w-24 flex flex-col items-center justify-center p-2 transition-transform duration-150 cursor-pointer outline-none active:scale-95 bg-transparent"
							>
								<div className="flex items-center justify-center size-12 group-hover:scale-105 transition-transform">
									<img
										src="/assets/dolphin.svg"
										alt="Dolphin File Manager"
										fetchPriority="high"
										decoding="async"
										className="size-11 sm:size-12 drop-shadow-md select-none"
										draggable={false}
									/>
								</div>

								<span className="mt-1 text-[11px] font-medium text-white tracking-tight px-1.5 py-0.5 rounded drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-center whitespace-nowrap">
									File Manager
								</span>
							</button>

							<button
								type="button"
								onClick={(e) => {
									e.stopPropagation();
									trackEvent("desktop-icon-click", { icon: "alaska" });
									onOpenAlaska();
								}}
								onMouseEnter={prefetchAlaska}
								onFocus={prefetchAlaska}
								onTouchStart={prefetchAlaska}
								className="group relative w-24 flex flex-col items-center justify-center p-2 transition-transform duration-150 cursor-pointer outline-none active:scale-95 bg-transparent"
							>
								<div className="flex items-center justify-center size-12 group-hover:scale-105 transition-transform">
									<IconImageMountainFill18
										size={40}
										className="size-10 sm:size-11 text-white drop-shadow-md select-none"
									/>
								</div>
								<span className="mt-1 text-[11px] font-medium text-white tracking-tight px-1.5 py-0.5 rounded drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] text-center whitespace-nowrap">
									Alaska
								</span>
							</button>
						</div>

						<MusicWidget />

						<div className="flex-1" />

						<Dock
							onNavigate={handleDockNavigate}
							currentPage={activeDockPage}
							isFileManagerOpen={isFileManagerOpen}
							isAlaskaOpen={isAlaskaOpen}
							className="py-3"
						/>
					</section>
				</ContextMenuTrigger>

				<ContextMenuContent className="w-56">
					<ContextMenuItem onClick={onOpenFileManager}>
						<img
							src="/assets/dolphin.svg"
							alt="Dolphin"
							className="size-4 shrink-0"
							draggable={false}
						/>
						<span>Open File Manager</span>
					</ContextMenuItem>
					<ContextMenuItem
						onClick={() => {
							onOpenTerminal();
						}}
					>
						<span>Open Terminal</span>
					</ContextMenuItem>
					<ContextMenuItem
						onClick={() => {
							onOpenAlaska();
						}}
					>
						<IconImageMountainFill18
							size={16}
							className="text-white shrink-0"
						/>
						<span>Ask Alaska</span>
					</ContextMenuItem>

					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={() => {
							window.dispatchEvent(
								new KeyboardEvent("keydown", {
									key: "k",
									ctrlKey: true,
									metaKey: true,
								}),
							);
						}}
					>
						<IconAlign3LeftFill18 className="size-3.5 text-elegant-text-muted" />
						<span>Spotlight Search</span>
						<ContextMenuShortcut>
							{modifierKey.toUpperCase()}+K
						</ContextMenuShortcut>
					</ContextMenuItem>
					<ContextMenuItem onClick={toggleTheme}>
						<IconDarkLightFill18 className="size-3.5 text-elegant-text-muted" />
						<span>Toggle Theme ({theme === "dark" ? "Light" : "Dark"})</span>
					</ContextMenuItem>
					<ContextMenuSeparator />
					<ContextMenuItem
						onClick={() => {
							navigate("/about");
						}}
					>
						<IconCircleInfoFill18 className="size-3.5 text-elegant-text-muted" />
						<span>About Neosphere OS</span>
					</ContextMenuItem>
				</ContextMenuContent>
			</ContextMenu>

			<div className="fixed bottom-4 right-4 z-40 hidden md:flex items-center gap-1">
				<Popover>
					<PopoverTrigger asChild>
						<button
							type="button"
							aria-label="Keyboard shortcuts"
							className="group relative flex size-7 items-center justify-center bg-transparent text-white/70 hover:text-white drop-shadow-[0_1px_2px_rgba(0,0,0,0.8)] outline-none transition-[transform,color] duration-150 hover:scale-110 active:scale-95 cursor-pointer"
						>
							<IconCircleInfoFill18 size={18} aria-hidden="true" />
							<span
								role="tooltip"
								className="pointer-events-none absolute -top-8.5 right-0 rounded-md bg-elegant-card border border-elegant-border px-2 py-0.5 text-[11px] font-mono font-medium text-elegant-text-primary shadow-lg backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-[transform,opacity] duration-150 -translate-y-1 group-hover:translate-y-0 group-focus-visible:translate-y-0 whitespace-nowrap z-50 select-none"
							>
								Shortcuts
							</span>
						</button>
					</PopoverTrigger>
					<PopoverContent
						align="end"
						side="top"
						sideOffset={12}
						className="w-64"
					>
						<PopoverHeader className="mb-2.5 pb-2 border-b border-elegant-border">
							<PopoverTitle>Keyboard Shortcuts</PopoverTitle>
						</PopoverHeader>
						<div className="space-y-2.5 text-xs text-elegant-text-secondary">
							<div className="flex items-center justify-between gap-3">
								<div className="flex items-center gap-2">
									<IconAlign3LeftFill18
										className="text-elegant-accent size-4 shrink-0"
										aria-hidden="true"
									/>
									<span>Spotlight</span>
								</div>
								<kbd className="px-2 py-0.5 rounded bg-elegant-bg border border-elegant-border text-[11px] font-mono text-elegant-text-primary">
									{modifierKey} / K
								</kbd>
							</div>
							<div className="flex items-center justify-between gap-3">
								<div className="flex items-center gap-2">
									<span
										className="text-elegant-accent text-sm leading-none font-sans shrink-0"
										aria-hidden="true"
									>
										↔
									</span>
									<span>Navigate pages</span>
								</div>
								<div className="flex items-center gap-1">
									<kbd className="px-1.5 py-0.5 rounded bg-elegant-bg border border-elegant-border text-[11px] font-mono text-elegant-text-primary">
										←
									</kbd>
									<kbd className="px-1.5 py-0.5 rounded bg-elegant-bg border border-elegant-border text-[11px] font-mono text-elegant-text-primary">
										→
									</kbd>
								</div>
							</div>
						</div>
					</PopoverContent>
				</Popover>
			</div>
		</div>
	);
};
