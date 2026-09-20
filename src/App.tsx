import { LazyMotion } from "motion/react";
import { lazy, Suspense, useCallback, useEffect, useState } from "react";
import {
	createBrowserRouter,
	Outlet,
	RouterProvider,
	useLocation,
	useNavigate,
} from "react-router";
import { Desktop } from "./components/Desktop";
import { ErrorBoundary } from "./components/ErrorBoundary";
import { RouteErrorBoundary } from "./components/RouteErrorBoundary";
import { TopBar } from "./components/TopBar";
import { useFileSystem } from "./hooks/terminal/useFileSystem";
import { applyTheme, getInitialTheme } from "./hooks/useTheme";
import { prefetchEverything } from "./utils/prefetch";

const loadMotionFeatures = () =>
	import("./motion-features").then((module) => module.default);

const Terminal = lazy(() =>
	import("./components/Terminal").then((m) => ({ default: m.Terminal })),
);
const FileManager = lazy(() =>
	import("./components/fileManager/FileManager").then((m) => ({
		default: m.FileManager,
	})),
);
const AlaskaWindow = lazy(() =>
	import("./components/AlaskaWindow").then((m) => ({
		default: m.AlaskaWindow,
	})),
);
const Spotlight = lazy(() =>
	import("./components/Spotlight").then((m) => ({ default: m.Spotlight })),
);

if (typeof window !== "undefined") {
	applyTheme(getInitialTheme());
}

const PAGE_ROUTES = [
	"/",
	"/about",
	"/projects",
	"/gallery",
	"/notes",
	"/contact",
];

const getPageIndex = (pathname: string) => {
	if (pathname === "/" || pathname === "/index.html") return 0;
	if (pathname.startsWith("/about")) return 1;
	if (pathname.startsWith("/projects")) return 2;
	if (pathname.startsWith("/gallery")) return 3;
	if (pathname.startsWith("/notes")) return 4;
	if (pathname.startsWith("/contact")) return 5;
	return -1;
};

const getActiveApp = (
	pathname: string,
	focusedWindow: "terminal" | "filemanager" | "alaska" | null,
	terminalMode: TerminalMode,
	fileManagerMode: TerminalMode,
	isAlaskaOpen: boolean,
) => {
	if (pathname === "/" || pathname === "/index.html") {
		if (focusedWindow === "alaska" && isAlaskaOpen) return "Alaska";
		if (focusedWindow === "filemanager" && fileManagerMode !== "hidden")
			return "Dolphin";
		if (focusedWindow === "terminal" && terminalMode !== "hidden")
			return "Terminal";
		if (isAlaskaOpen) return "Alaska";
		if (fileManagerMode !== "hidden") return "Dolphin";
		if (terminalMode !== "hidden") return "Terminal";
		return "desktop";
	}
	if (pathname.startsWith("/about")) return "about";
	if (pathname.startsWith("/projects")) return "projects";
	if (pathname.startsWith("/gallery")) return "gallery";
	if (pathname.startsWith("/notes")) return "notes";
	if (pathname.startsWith("/contact")) return "contact";
	return "404";
};

const PageFallback = () => (
	<div
		className="h-full w-full bg-elegant-bg flex items-center justify-center font-mono text-elegant-text-muted text-sm select-none"
		aria-live="polite"
	>
		<div className="flex items-center gap-2">
			<span
				className="inline-block w-2 h-2 rounded-full bg-elegant-accent animate-ping"
				aria-hidden="true"
			/>
			<span>Loading…</span>
		</div>
	</div>
);

export type TerminalMode = "hidden" | "windowed" | "maximized";

function RootLayout() {
	const [terminalMode, setTerminalMode] = useState<TerminalMode>("hidden");
	const [hasOpenedTerminal, setHasOpenedTerminal] = useState(false);

	const [fileManagerMode, setFileManagerMode] =
		useState<TerminalMode>("hidden");
	const [hasOpenedFileManager, setHasOpenedFileManager] = useState(false);

	const [isAlaskaOpen, setIsAlaskaOpen] = useState(false);
	const [hasOpenedAlaska, setHasOpenedAlaska] = useState(false);

	const [isSpotlightOpen, setIsSpotlightOpen] = useState(false);
	const [hasOpenedSpotlight, setHasOpenedSpotlight] = useState(false);

	const [focusedWindow, setFocusedWindow] = useState<
		"terminal" | "filemanager" | "alaska" | null
	>(null);

	const [zIndices, setZIndices] = useState<{
		terminal: number;
		filemanager: number;
		alaska: number;
	}>({
		terminal: 25,
		filemanager: 26,
		alaska: 27,
	});

	const { fileSystem, setFileSystem } = useFileSystem();
	const location = useLocation();
	const navigate = useNavigate();

	const bringToFront = useCallback(
		(windowName: "terminal" | "filemanager" | "alaska") => {
			setFocusedWindow(windowName);
			setZIndices((prev) => {
				const currentMax = Math.max(
					prev.terminal,
					prev.filemanager,
					prev.alaska,
					25,
				);
				const nextZ = currentMax >= 38 ? 26 : currentMax + 1;
				if (nextZ === 26) {
					return {
						terminal: windowName === "terminal" ? 28 : 25,
						filemanager: windowName === "filemanager" ? 28 : 25,
						alaska: windowName === "alaska" ? 28 : 25,
					};
				}
				return {
					...prev,
					[windowName]: nextZ,
				};
			});
		},
		[],
	);

	// Check if URL has ?dir= query parameter on initial load
	useEffect(() => {
		const params = new URLSearchParams(window.location.search);
		if (params.get("dir")) {
			setTerminalMode("windowed");
			setHasOpenedTerminal(true);
			bringToFront("terminal");
		}
	}, [bringToFront]);

	// Warm up all windows and pages in the background after initial desktop paint
	useEffect(() => {
		if (typeof window === "undefined") return;

		const schedulePrefetch = () => {
			prefetchEverything();
		};

		if ("requestIdleCallback" in window) {
			const id = (
				window as Window & {
					requestIdleCallback: (
						cb: () => void,
						opts?: { timeout: number },
					) => number;
				}
			).requestIdleCallback(schedulePrefetch, { timeout: 1200 });
			return () => {
				if ("cancelIdleCallback" in window) {
					(
						window as Window & {
							cancelIdleCallback: (id: number) => void;
						}
					).cancelIdleCallback(id);
				}
			};
		}

		const timer = setTimeout(schedulePrefetch, 500);
		return () => clearTimeout(timer);
	}, []);

	// Listen for custom events from anywhere (pages, dock, spotlight, terminal)
	useEffect(() => {
		const openTermHandler = () => {
			setTerminalMode("windowed");
			setHasOpenedTerminal(true);
			bringToFront("terminal");
		};
		const closeTermHandler = () => {
			setTerminalMode("hidden");
			setFocusedWindow((prev) => (prev === "terminal" ? null : prev));
		};
		const openFmHandler = () => {
			setFileManagerMode("windowed");
			setHasOpenedFileManager(true);
			bringToFront("filemanager");
		};
		const closeFmHandler = () => {
			setFileManagerMode("hidden");
			setFocusedWindow((prev) => (prev === "filemanager" ? null : prev));
		};
		const openAiHandler = () => {
			setIsAlaskaOpen(true);
			setHasOpenedAlaska(true);
			bringToFront("alaska");
		};
		const closeAiHandler = () => {
			setIsAlaskaOpen(false);
			setFocusedWindow((prev) => (prev === "alaska" ? null : prev));
		};
		const openSpotlightHandler = () => {
			setIsSpotlightOpen(true);
			setHasOpenedSpotlight(true);
		};
		const navigatePageHandler = (e: Event) => {
			const customEvent = e as CustomEvent<{ path: string }>;
			if (customEvent.detail?.path) {
				const targetPath = customEvent.detail.path.startsWith("/")
					? customEvent.detail.path
					: `/${customEvent.detail.path}`;
				navigate(targetPath.toLowerCase());
			}
		};

		window.addEventListener("open-terminal", openTermHandler);
		window.addEventListener("close-terminal", closeTermHandler);
		window.addEventListener("open-filemanager", openFmHandler);
		window.addEventListener("close-filemanager", closeFmHandler);
		window.addEventListener("open-alaska", openAiHandler);
		window.addEventListener("close-alaska", closeAiHandler);
		window.addEventListener("open-alamai", openAiHandler);
		window.addEventListener("close-alamai", closeAiHandler);
		window.addEventListener("open-spotlight", openSpotlightHandler);
		window.addEventListener("navigate-page", navigatePageHandler);

		return () => {
			window.removeEventListener("open-terminal", openTermHandler);
			window.removeEventListener("close-terminal", closeTermHandler);
			window.removeEventListener("open-filemanager", openFmHandler);
			window.removeEventListener("close-filemanager", closeFmHandler);
			window.removeEventListener("open-alaska", openAiHandler);
			window.removeEventListener("close-alaska", closeAiHandler);
			window.removeEventListener("open-alamai", openAiHandler);
			window.removeEventListener("close-alamai", closeAiHandler);
			window.removeEventListener("open-spotlight", openSpotlightHandler);
			window.removeEventListener("navigate-page", navigatePageHandler);
		};
	}, [navigate, bringToFront]);

	// Global ArrowLeft & ArrowRight navigation between pages, and Cmd+K for Spotlight
	useEffect(() => {
		const handleKeyDown = (e: KeyboardEvent) => {
			if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
				e.preventDefault();
				setIsSpotlightOpen((prev) => !prev);
				setHasOpenedSpotlight(true);
				return;
			}

			if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
			if (e.altKey || e.ctrlKey || e.metaKey || e.shiftKey) return;

			// Don't navigate if typing in an input, textarea, select or contenteditable
			const target = e.target as HTMLElement | null;
			if (
				target &&
				(target.tagName === "INPUT" ||
					target.tagName === "TEXTAREA" ||
					target.tagName === "SELECT" ||
					target.isContentEditable ||
					target.closest("input, textarea, select, [contenteditable='true']"))
			) {
				return;
			}

			// Don't navigate if any modal/dialog or popover is open
			if (
				document.querySelector("dialog[open]") ||
				document.querySelector("[aria-modal='true']") ||
				document.querySelector("[data-radix-popper-content-wrapper]")
			) {
				return;
			}

			const currentIndex = getPageIndex(location.pathname);
			if (currentIndex === -1) {
				if (e.key === "ArrowLeft" || e.key === "ArrowRight") {
					navigate("/");
				}
				return;
			}
			if (e.key === "ArrowRight") {
				const nextIndex = (currentIndex + 1) % PAGE_ROUTES.length;
				navigate(PAGE_ROUTES[nextIndex]);
			} else if (e.key === "ArrowLeft") {
				const prevIndex =
					(currentIndex - 1 + PAGE_ROUTES.length) % PAGE_ROUTES.length;
				navigate(PAGE_ROUTES[prevIndex]);
			}
		};

		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, [location.pathname, navigate]);

	const isHome =
		location.pathname === "/" || location.pathname === "/index.html";
	const activeAppName = getActiveApp(
		location.pathname,
		focusedWindow,
		terminalMode,
		fileManagerMode,
		isAlaskaOpen,
	);

	return (
		<div className="fixed inset-0 w-full h-dvh bg-elegant-bg overflow-hidden">
			{/* Global Persistent TopBar - Stays mounted forever, never jitters or flashes loading */}
			<TopBar
				activeApp={activeAppName}
				onOpenSpotlight={() => {
					setIsSpotlightOpen(true);
					setHasOpenedSpotlight(true);
				}}
			/>

			{terminalMode !== "maximized" && (
				<Desktop
					onOpenTerminal={() => {
						setTerminalMode("windowed");
						setHasOpenedTerminal(true);
						bringToFront("terminal");
					}}
					onOpenAlaska={() => {
						setIsAlaskaOpen(true);
						setHasOpenedAlaska(true);
						bringToFront("alaska");
					}}
					isAlaskaOpen={isAlaskaOpen}
					onOpenFileManager={() => {
						setFileManagerMode("windowed");
						setHasOpenedFileManager(true);
						bringToFront("filemanager");
					}}
					isFileManagerOpen={fileManagerMode !== "hidden"}
				/>
			)}

			{(fileManagerMode !== "hidden" || hasOpenedFileManager) && (
				<Suspense fallback={null}>
					<FileManager
						mode={fileManagerMode}
						onClose={() => {
							setFileManagerMode("hidden");
							setFocusedWindow((prev) =>
								prev === "filemanager" ? null : prev,
							);
						}}
						onMinimize={() => {
							setFileManagerMode("hidden");
							setFocusedWindow((prev) =>
								prev === "filemanager" ? null : prev,
							);
						}}
						onMaximize={() => setFileManagerMode("maximized")}
						onRestore={() => setFileManagerMode("windowed")}
						fileSystem={fileSystem}
						setFileSystem={setFileSystem}
						zIndex={zIndices.filemanager}
						onFocus={() => bringToFront("filemanager")}
					/>
				</Suspense>
			)}

			{(isAlaskaOpen || hasOpenedAlaska) && (
				<Suspense fallback={null}>
					<AlaskaWindow
						isOpen={isAlaskaOpen}
						onClose={() => {
							setIsAlaskaOpen(false);
							setFocusedWindow((prev) => (prev === "alaska" ? null : prev));
						}}
						onMinimize={() => {
							setIsAlaskaOpen(false);
							setFocusedWindow((prev) => (prev === "alaska" ? null : prev));
						}}
						zIndex={zIndices.alaska}
						onFocus={() => bringToFront("alaska")}
					/>
				</Suspense>
			)}

			{(terminalMode !== "hidden" || hasOpenedTerminal) && (
				<ErrorBoundary>
					<Suspense fallback={null}>
						<Terminal
							terminalMode={terminalMode}
							onMinimize={() => {
								setTerminalMode("hidden");
								setFocusedWindow((prev) => (prev === "terminal" ? null : prev));
							}}
							onMaximize={() => setTerminalMode("maximized")}
							onRestore={() => setTerminalMode("windowed")}
							onClose={() => {
								setTerminalMode("hidden");
								setFocusedWindow((prev) => (prev === "terminal" ? null : prev));
							}}
							zIndex={zIndices.terminal}
							onFocus={() => bringToFront("terminal")}
							isFocused={focusedWindow === "terminal"}
						/>
					</Suspense>
				</ErrorBoundary>
			)}

			{(isSpotlightOpen || hasOpenedSpotlight) && (
				<Suspense fallback={null}>
					<Spotlight
						isOpen={isSpotlightOpen}
						onClose={() => setIsSpotlightOpen(false)}
					/>
				</Suspense>
			)}

			{!isHome && (
				<div className="fixed inset-0 z-40 bg-elegant-bg text-elegant-text-primary font-mono text-base overflow-hidden">
					<Suspense fallback={<PageFallback />}>
						<Outlet />
					</Suspense>
				</div>
			)}
		</div>
	);
}

async function lazyRoute(
	importer: () => Promise<Record<string, unknown>>,
	exportName: string,
) {
	try {
		const module = await importer();
		return { Component: module[exportName] as React.ComponentType };
	} catch (error) {
		const errStr = String(error);
		if (
			/loading dynamically imported module|failed to fetch dynamically imported module|importing a module script failed/i.test(
				errStr,
			)
		) {
			const lastReload = sessionStorage.getItem("chunk_reload_retry");
			const now = Date.now();
			if (!lastReload || now - Number(lastReload) > 8_000) {
				sessionStorage.setItem("chunk_reload_retry", String(now));
				window.location.reload();
				return new Promise<{ Component: React.ComponentType }>(() => {});
			}
		}
		throw error;
	}
}

const router = createBrowserRouter([
	{
		path: "/",
		element: <RootLayout />,
		ErrorBoundary: RouteErrorBoundary,
		children: [
			{
				path: "gallery/*",
				lazy: () =>
					lazyRoute(() => import("./components/pages/Gallery"), "Gallery"),
			},
			{
				path: "about",
				lazy: () =>
					lazyRoute(() => import("./components/pages/About"), "About"),
			},
			{
				path: "contact",
				lazy: () =>
					lazyRoute(() => import("./components/pages/Contact"), "Contact"),
			},
			{
				path: "projects",
				lazy: () =>
					lazyRoute(() => import("./components/pages/Projects"), "Projects"),
			},
			{
				path: "notes/*",
				lazy: () =>
					lazyRoute(() => import("./components/pages/Notes"), "Notes"),
			},
			{
				path: "*",
				lazy: () =>
					lazyRoute(() => import("./components/pages/404"), "NotFound"),
			},
		],
	},
]);

export default function App() {
	return (
		<LazyMotion features={loadMotionFeatures}>
			<RouterProvider router={router} />
		</LazyMotion>
	);
}
