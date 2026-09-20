import { Music2 } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import {
	type CSSProperties,
	memo,
	useCallback,
	useEffect,
	useMemo,
	useRef,
	useState,
} from "react";
import { SiSpotify } from "react-icons/si";
import {
	Popover,
	PopoverClose,
	PopoverContent,
	PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover";
import { AudioLines } from "@/components/animate-ui/icons/audio-lines";
import { Clock } from "@/components/animate-ui/icons/clock";
import { Volume2 } from "@/components/animate-ui/icons/volume-2";
import { useSpotifyPlayer } from "../../hooks/useSpotifyPlayer";

interface WidgetSize {
	width: number;
	height: number;
}

interface SharedViewProps {
	accentColor: string;
	artistAndAlbum: string;
	cardStyle: CSSProperties;
	coverUrl?: string;
	onToggle: () => void;
	prefersReducedMotion: boolean;
	progressPercent: number;
	spotifyUrl?: string;
	title: string;
	red: number;
	green: number;
	blue: number;
	isHistorical?: boolean;
	relativeTime?: string;
}

const DESKTOP_COLLAPSED_SIZE: WidgetSize = { width: 256, height: 60 };
const DESKTOP_EXPANDED_SIZE: WidgetSize = { width: 320, height: 120 };
const MOBILE_DISC_SIZE: WidgetSize = { width: 56, height: 56 };
const MOBILE_CARD_SIZE: WidgetSize = { width: 204, height: 168 };
const MOBILE_HISTORY_CARD_SIZE: WidgetSize = { width: 204, height: 178 };

function formatRelativeTime(timestamp: number, now: number): string {
	const diffMs = Math.max(0, now - timestamp);
	const diffSec = Math.floor(diffMs / 1000);
	if (diffSec < 60) return "just now";
	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffHour = Math.floor(diffMin / 60);
	if (diffHour < 24) return `${diffHour}h ago`;
	const diffDay = Math.floor(diffHour / 24);
	return `${diffDay}d ago`;
}

function useRelativeTime(
	timestamp: number | undefined,
	enabled: boolean,
): string {
	const [now, setNow] = useState(() => Date.now());

	useEffect(() => {
		if (!enabled || !timestamp) return;
		const interval = window.setInterval(() => setNow(Date.now()), 60_000);
		return () => window.clearInterval(interval);
	}, [enabled, timestamp]);

	useEffect(() => {
		if (enabled && timestamp) setNow(Date.now());
	}, [enabled, timestamp]);

	if (!enabled || !timestamp) return "";
	return formatRelativeTime(timestamp, now);
}

function useIsMobile(): boolean {
	const [isMobile, setIsMobile] = useState(() =>
		typeof window === "undefined"
			? false
			: window.matchMedia("(max-width: 639px)").matches,
	);

	useEffect(() => {
		const query = window.matchMedia("(max-width: 639px)");
		const update = () => setIsMobile(query.matches);
		update();
		query.addEventListener("change", update);
		return () => query.removeEventListener("change", update);
	}, []);

	return isMobile;
}

function PlaybackProgress({
	accentColor,
	prefersReducedMotion,
	progressPercent,
}: {
	accentColor: string;
	prefersReducedMotion: boolean;
	progressPercent: number;
}) {
	const progress = Math.min(100, Math.max(0, progressPercent));

	return (
		<div
			role="progressbar"
			aria-label="Track progress"
			aria-valuemin={0}
			aria-valuemax={100}
			aria-valuenow={Math.round(progress)}
			className="pointer-events-none absolute inset-x-5 bottom-2 z-20 h-0.5 overflow-hidden rounded-full bg-white/14"
		>
			<m.span
				initial={false}
				animate={{ scaleX: progress / 100 }}
				transition={
					prefersReducedMotion
						? { duration: 0 }
						: { duration: 0.85, ease: "linear" }
				}
				className="block size-full origin-left"
				style={{
					backgroundColor: accentColor,
					boxShadow: `0 0 5px color-mix(in srgb, ${accentColor} 50%, transparent)`,
				}}
			/>
		</div>
	);
}

function SpotifyTitle({
	title,
	spotifyUrl,
	centered = false,
}: {
	title: string;
	spotifyUrl?: string;
	centered?: boolean;
}) {
	if (!spotifyUrl) {
		return (
			<p
				className={`truncate text-sm font-semibold leading-snug text-white ${centered ? "text-center" : ""}`}
			>
				{title}
			</p>
		);
	}

	return (
		<Popover>
			<PopoverTrigger
				type="button"
				className={`block max-w-full touch-manipulation truncate rounded-md text-sm font-semibold leading-snug text-white underline-offset-4 outline-none transition-colors hover:text-white/78 hover:underline focus-visible:ring-2 focus-visible:ring-white/70 ${centered ? "mx-auto text-center" : "text-left"}`}
			>
				{title}
			</PopoverTrigger>
			<PopoverContent
				side="bottom"
				align={centered ? "center" : "start"}
				sideOffset={10}
				className="w-[min(17rem,calc(100vw-1.5rem))] rounded-2xl border border-white/14 bg-zinc-950/90 p-3.5 font-sans text-white shadow-2xl backdrop-blur-2xl"
			>
				<p className="text-sm font-medium">Open in Spotify?</p>
				<p className="mt-1 line-clamp-2 text-xs leading-relaxed text-zinc-400">
					This opens “{title}” in a new tab.
				</p>
				<div className="mt-3 flex items-center justify-end gap-2">
					<PopoverClose
						type="button"
						className="touch-manipulation rounded-lg px-3 py-1.5 text-xs font-medium text-zinc-400 outline-none transition-colors hover:bg-white/8 hover:text-white focus-visible:ring-2 focus-visible:ring-white/70"
					>
						Cancel
					</PopoverClose>
					<a
						href={spotifyUrl}
						target="_blank"
						rel="noopener noreferrer"
						className="inline-flex touch-manipulation items-center gap-1.5 rounded-lg bg-[#1DB954] px-3 py-1.5 text-xs font-semibold text-white outline-none transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95"
					>
						<SiSpotify aria-hidden="true" className="size-3.5" />
						Open Spotify
					</a>
				</div>
			</PopoverContent>
		</Popover>
	);
}

function LoadingView({
	isMobile,
	prefersReducedMotion,
}: {
	isMobile: boolean;
	prefersReducedMotion: boolean;
}) {
	const shimmer = prefersReducedMotion
		? "bg-white/7"
		: "animate-skeleton-shimmer bg-linear-to-r from-transparent via-white/18 to-transparent";
	return (
		<div
			role="status"
			aria-label="Loading current playback"
			className={`relative size-full overflow-hidden border border-white/14 bg-zinc-950/66 backdrop-blur-3xl backdrop-saturate-150 ${isMobile ? "rounded-full" : "rounded-2xl"}`}
		>
			{isMobile ? (
				<span className="absolute inset-2 rounded-full bg-white/8" />
			) : (
				<div className="flex size-full items-center gap-2.5 px-2.5">
					<span className="size-10 shrink-0 rounded-xl bg-white/8" />
					<span className="min-w-0 flex-1 space-y-1.5">
						<span className="block h-2.5 w-3/4 rounded-full bg-white/9" />
						<span className="block h-2 w-1/2 rounded-full bg-white/6" />
					</span>
					<span className="size-5 rounded-md bg-white/7" />
				</div>
			)}
			<span
				aria-hidden="true"
				className={`absolute inset-0 skew-x-12 ${shimmer}`}
			/>
		</div>
	);
}

function IdleView({
	cardStyle,
	isMobile,
	message,
}: {
	cardStyle: CSSProperties;
	isMobile: boolean;
	message: string;
}) {
	if (isMobile) {
		return (
			<div
				role="status"
				aria-label={message}
				className="flex size-full items-center justify-center rounded-full border backdrop-blur-3xl"
				style={cardStyle}
			>
				<Music2 aria-hidden="true" className="size-5 text-zinc-300" />
			</div>
		);
	}

	return (
		<div
			role="status"
			className="flex size-full items-center gap-2.5 rounded-2xl border px-2.5 backdrop-blur-3xl backdrop-saturate-150"
			style={cardStyle}
		>
			<span className="flex size-10 shrink-0 items-center justify-center rounded-xl border border-white/12 bg-white/6">
				<Music2 aria-hidden="true" className="size-4 text-zinc-300" />
			</span>
			<p className="min-w-0 truncate text-xs font-medium text-zinc-200">
				{message}
			</p>
		</div>
	);
}

function CardBackground({
	coverUrl,
	red,
	green,
	blue,
	prefersReducedMotion,
}: {
	coverUrl?: string;
	red: number;
	green: number;
	blue: number;
	prefersReducedMotion: boolean;
}) {
	const darkR = Math.round(red * 0.2 + 8);
	const darkG = Math.round(green * 0.2 + 8);
	const darkB = Math.round(blue * 0.2 + 10);

	return (
		<div
			aria-hidden="true"
			className="pointer-events-none absolute inset-0 -z-10 overflow-hidden rounded-[inherit]"
		>
			{coverUrl && (
				<m.img
					src={coverUrl}
					alt=""
					draggable={false}
					className="absolute -inset-12 size-[calc(100%+6rem)] max-w-none transform-gpu object-cover opacity-85 blur-xl saturate-200"
					animate={
						prefersReducedMotion
							? undefined
							: {
									scale: [1.12, 1.35, 1.18, 1.3, 1.12],
									rotate: [0, 14, -10, 12, 0],
									x: [-14, 20, -12, 16, -14],
									y: [-10, 14, -16, 10, -10],
								}
					}
					transition={{
						duration: 4.8,
						repeat: Infinity,
						ease: "easeInOut",
					}}
				/>
			)}
			<m.div
				className="absolute -left-10 -top-10 size-44 transform-gpu rounded-full opacity-75 blur-2xl"
				style={{
					background: `radial-gradient(circle, rgba(${red}, ${green}, ${blue}, 0.9) 0%, transparent 70%)`,
				}}
				animate={
					prefersReducedMotion
						? undefined
						: {
								x: [0, 52, 16, 0],
								y: [0, 26, -20, 0],
								scale: [1, 1.38, 0.92, 1],
							}
				}
				transition={{
					duration: 3.6,
					repeat: Infinity,
					ease: "easeInOut",
				}}
			/>
			<m.div
				className="absolute -bottom-10 -right-10 size-44 transform-gpu rounded-full opacity-65 blur-2xl"
				style={{
					background: `radial-gradient(circle, rgba(${Math.min(255, red + 45)}, ${Math.min(255, green + 45)}, ${Math.min(255, blue + 45)}, 0.8) 0%, transparent 70%)`,
				}}
				animate={
					prefersReducedMotion
						? undefined
						: {
								x: [0, -48, -14, 0],
								y: [0, -28, 20, 0],
								scale: [1, 1.32, 1.05, 1],
							}
				}
				transition={{
					duration: 4.2,
					repeat: Infinity,
					ease: "easeInOut",
				}}
			/>
			<div
				className="absolute inset-0"
				style={{
					background: `radial-gradient(110% 120% at 0% 0%, rgba(${red}, ${green}, ${blue}, 0.55) 0%, rgba(${red}, ${green}, ${blue}, 0.20) 55%, transparent 85%), linear-gradient(180deg, rgba(${darkR}, ${darkG}, ${darkB}, 0.48) 0%, rgba(${darkR}, ${darkG}, ${darkB}, 0.78) 100%)`,
				}}
			/>
			<div className="absolute inset-0 bg-linear-to-b from-white/22 via-white/6 to-transparent" />
		</div>
	);
}

function DesktopCollapsedView(props: SharedViewProps) {
	const isHistorical = Boolean(props.isHistorical);
	return (
		<button
			type="button"
			onClick={props.onToggle}
			aria-expanded="false"
			aria-label={`Expand music player. ${props.title}${isHistorical && props.relativeTime ? ` — Was listening to ${props.relativeTime}` : ""}`}
			className="group relative isolate flex size-full touch-manipulation items-center gap-2.5 overflow-hidden rounded-2xl border px-2.5 text-left backdrop-blur-2xl outline-none focus-visible:ring-2 focus-visible:ring-white/70"
			style={props.cardStyle}
		>
			<CardBackground
				coverUrl={props.coverUrl}
				red={props.red}
				green={props.green}
				blue={props.blue}
				prefersReducedMotion={props.prefersReducedMotion}
			/>
			<span className="relative z-10 size-10 shrink-0 overflow-hidden rounded-xl border border-white/25 bg-zinc-900/80 shadow-lg">
				{props.coverUrl ? (
					<img
						src={props.coverUrl}
						alt=""
						width={80}
						height={80}
						fetchPriority="high"
						decoding="async"
						draggable={false}
						className="size-full object-cover transition-transform duration-500 group-hover:scale-105"
					/>
				) : (
					<span className="flex size-full items-center justify-center">
						<Music2 aria-hidden="true" className="size-5 text-zinc-500" />
					</span>
				)}
			</span>
			<span className="relative z-10 min-w-0 flex-1">
				<span className="block truncate text-xs font-semibold text-white drop-shadow-xs">
					{props.title}
				</span>
				<span className="block truncate text-[10px] text-white/80">
					{props.artistAndAlbum}
				</span>
			</span>
			{!isHistorical && (
				<span
					key={props.accentColor}
					className="relative z-10 shrink-0 inline-flex items-center"
					style={{ color: props.accentColor }}
				>
					<AudioLines animate={!props.prefersReducedMotion} size={20} />
				</span>
			)}
		</button>
	);
}

function DesktopExpandedView(props: SharedViewProps) {
	const isHistorical = Boolean(props.isHistorical);
	return (
		<div
			className="relative isolate size-full overflow-hidden rounded-2xl border px-3.5 pt-2.5 pb-2.5 backdrop-blur-2xl"
			style={props.cardStyle}
		>
			<CardBackground
				coverUrl={props.coverUrl}
				red={props.red}
				green={props.green}
				blue={props.blue}
				prefersReducedMotion={props.prefersReducedMotion}
			/>
			{!isHistorical && (
				<PlaybackProgress
					accentColor={props.accentColor}
					prefersReducedMotion={props.prefersReducedMotion}
					progressPercent={props.progressPercent}
				/>
			)}
			<div className="relative z-10 flex h-full flex-col justify-between pb-1">
				<div className="flex items-center gap-2 text-xs font-semibold text-white drop-shadow-xs">
					{isHistorical ? (
						<>
							<Clock
								animate={!props.prefersReducedMotion}
								size={15}
								className="text-white shrink-0"
								aria-hidden="true"
							/>
							<span>Was listening to · {props.relativeTime || "recently"}</span>
						</>
					) : (
						<>
							<Volume2
								animate={!props.prefersReducedMotion}
								size={15}
								className="text-white"
							/>
							<span>Currently listening to</span>
						</>
					)}
				</div>
				<div className="flex min-w-0 items-center gap-3">
					<button
						type="button"
						onClick={props.onToggle}
						aria-expanded="true"
						aria-label="Collapse music player"
						className="relative size-14 shrink-0 touch-manipulation overflow-hidden rounded-xl border border-white/25 bg-zinc-900/80 shadow-xl outline-none transition-transform hover:scale-[1.02] focus-visible:ring-2 focus-visible:ring-white/70 active:scale-95"
					>
						{props.coverUrl ? (
							<img
								src={props.coverUrl}
								alt=""
								width={112}
								height={112}
								fetchPriority="high"
								decoding="async"
								draggable={false}
								className="size-full object-cover"
							/>
						) : (
							<span className="flex size-full items-center justify-center">
								<Music2 aria-hidden="true" className="size-6 text-zinc-500" />
							</span>
						)}
					</button>
					<div className="min-w-0 flex-1">
						<SpotifyTitle title={props.title} spotifyUrl={props.spotifyUrl} />
						<p className="mt-0.5 truncate text-xs text-white/80">
							{props.artistAndAlbum}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

function MobileDiscView(props: SharedViewProps) {
	const isHistorical = Boolean(props.isHistorical);
	const shouldRotate = !isHistorical && !props.prefersReducedMotion;
	return (
		<button
			type="button"
			onClick={props.onToggle}
			aria-expanded="false"
			aria-label={`Expand music player. ${props.title}${isHistorical && props.relativeTime ? ` — Was listening to ${props.relativeTime}` : ""}`}
			className="group relative size-full touch-manipulation overflow-hidden rounded-full border p-0.5 backdrop-blur-2xl outline-none focus-visible:ring-2 focus-visible:ring-white/80"
			style={{
				borderColor: `rgba(${props.red}, ${props.green}, ${props.blue}, 0.4)`,
				boxShadow:
					"0 8px 20px -4px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.2)",
			}}
		>
			<span className="block size-full overflow-hidden rounded-full bg-zinc-900">
				{props.coverUrl ? (
					<m.img
						src={props.coverUrl}
						alt=""
						width={88}
						height={88}
						fetchPriority="high"
						decoding="async"
						draggable={false}
						className="size-full object-cover"
						animate={shouldRotate ? { rotate: 360 } : undefined}
						transition={
							shouldRotate
								? { duration: 12, ease: "linear", repeat: Infinity }
								: undefined
						}
					/>
				) : (
					<span className="flex size-full items-center justify-center">
						<Music2 aria-hidden="true" className="size-5 text-zinc-400" />
					</span>
				)}
			</span>
			<span className="pointer-events-none absolute left-1/2 top-1/2 size-1.5 -translate-x-1/2 -translate-y-1/2 rounded-full border border-white/25 bg-zinc-950/90" />
		</button>
	);
}

function MobileExpandedView(props: SharedViewProps) {
	const isHistorical = Boolean(props.isHistorical);
	const shouldRotate = !isHistorical && !props.prefersReducedMotion;
	return (
		<div
			className="relative isolate size-full overflow-hidden rounded-2xl border px-3.5 pt-2.5 pb-2.5 backdrop-blur-2xl"
			style={props.cardStyle}
		>
			<CardBackground
				coverUrl={props.coverUrl}
				red={props.red}
				green={props.green}
				blue={props.blue}
				prefersReducedMotion={props.prefersReducedMotion}
			/>
			{!isHistorical && (
				<PlaybackProgress
					accentColor={props.accentColor}
					prefersReducedMotion={props.prefersReducedMotion}
					progressPercent={props.progressPercent}
				/>
			)}
			<div className="relative z-10 flex h-full flex-col justify-between pb-1">
				{isHistorical ? (
					<div className="flex w-full flex-col items-center justify-center gap-1 text-center">
						<div className="flex items-center justify-center gap-1.5 text-xs font-semibold text-white drop-shadow-xs">
							<Clock
								animate={!props.prefersReducedMotion}
								size={14}
								className="text-white shrink-0"
								aria-hidden="true"
							/>
							<span>Was listening to</span>
						</div>
						<span className="text-[11px] font-medium leading-none text-white/85">
							{props.relativeTime || "just now"}
						</span>
					</div>
				) : (
					<div className="flex w-full items-center justify-start gap-2 text-xs font-semibold text-white drop-shadow-xs">
						<Volume2
							animate={!props.prefersReducedMotion}
							size={15}
							className="text-white"
						/>
						<span>Currently listening to</span>
					</div>
				)}
				<div className="flex flex-col items-center">
					<button
						type="button"
						onClick={props.onToggle}
						aria-expanded="true"
						aria-label="Collapse music player"
						className="relative size-14 shrink-0 touch-manipulation overflow-hidden rounded-full border border-white/25 bg-zinc-900/80 p-0.5 outline-none transition-transform hover:scale-[1.03] focus-visible:ring-2 focus-visible:ring-white/80 active:scale-95"
					>
						<span className="block size-full overflow-hidden rounded-full">
							{props.coverUrl ? (
								<m.img
									src={props.coverUrl}
									alt=""
									width={112}
									height={112}
									fetchPriority="high"
									decoding="async"
									draggable={false}
									className="size-full transform-gpu object-cover"
									animate={shouldRotate ? { rotate: 360 } : undefined}
									transition={
										shouldRotate
											? { duration: 18, ease: "linear", repeat: Infinity }
											: undefined
									}
								/>
							) : (
								<span className="flex size-full items-center justify-center">
									<Music2 aria-hidden="true" className="size-5 text-zinc-500" />
								</span>
							)}
						</span>
					</button>
					<div className="mt-1.5 w-full min-w-0 px-1 text-center">
						<SpotifyTitle
							title={props.title}
							spotifyUrl={props.spotifyUrl}
							centered
						/>
						<p className="mt-0.5 truncate text-[10px] text-white/80">
							{props.artistAndAlbum}
						</p>
					</div>
				</div>
			</div>
		</div>
	);
}

export const MusicWidget = memo(function MusicWidget() {
	const { track, colors, progressPercent, status } = useSpotifyPlayer();
	const [isMinimized, setIsMinimized] = useState(true);
	const isMobile = useIsMobile();
	const prefersReducedMotion = Boolean(useReducedMotion());
	const widgetRef = useRef<HTMLDivElement>(null);

	const isPlaying = track.is_playing;
	const isHistorical = !isPlaying && !!track.title;
	const isDisplayable = isPlaying || isHistorical;
	const isExpanded = isDisplayable && !isMinimized;
	const relativeTime = useRelativeTime(track.timestamp, isHistorical);
	const size = isMobile
		? isExpanded
			? isHistorical
				? MOBILE_HISTORY_CARD_SIZE
				: MOBILE_CARD_SIZE
			: MOBILE_DISC_SIZE
		: isExpanded
			? DESKTOP_EXPANDED_SIZE
			: DESKTOP_COLLAPSED_SIZE;

	const coverUrl = track.cover_url || track.cover_url_small;
	const red = colors?.rgb[0] ?? 161;
	const green = colors?.rgb[1] ?? 161;
	const blue = colors?.rgb[2] ?? 170;
	const accentColor = colors?.accentColor ?? "rgb(212, 212, 216)";
	const cardStyle = useMemo<CSSProperties>(() => {
		if (!isDisplayable) {
			return {
				background:
					"linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(10, 11, 16, 0.85) 100%)",
				borderColor: "rgba(255, 255, 255, 0.14)",
				boxShadow:
					"0 12px 28px -12px rgba(0, 0, 0, 0.8), inset 0 1px 0 rgba(255, 255, 255, 0.12), inset 0 -1px 0 rgba(255, 255, 255, 0.04)",
				backgroundClip: "padding-box",
			};
		}
		return {
			borderColor: `rgba(${red}, ${green}, ${blue}, 0.4)`,
			boxShadow: `0 16px 36px -10px rgba(0, 0, 0, 0.85), inset 0 1px 0 rgba(255, 255, 255, 0.25), inset 0 0 16px rgba(${red}, ${green}, ${blue}, 0.16)`,
		};
	}, [isDisplayable, red, green, blue]);
	const title = track.title || "Unknown track";
	const artistAndAlbum =
		[track.artist, track.album].filter(Boolean).join(" • ") || "Unknown artist";

	const togglePlayer = useCallback(() => {
		setIsMinimized((current) => !current);
	}, []);

	useEffect(() => {
		if (!isDisplayable) setIsMinimized(true);
	}, [isDisplayable]);

	useEffect(() => {
		if (isMinimized) return;
		const closeOnOutsidePointer = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (widgetRef.current?.contains(target)) return;
			if (
				target instanceof Element &&
				target.closest('[data-slot="popover-content"]')
			) {
				return;
			}
			setIsMinimized(true);
		};
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsMinimized(true);
		};
		document.addEventListener("pointerdown", closeOnOutsidePointer, true);
		window.addEventListener("keydown", closeOnEscape);
		return () => {
			document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
			window.removeEventListener("keydown", closeOnEscape);
		};
	}, [isMinimized]);

	const sharedProps: SharedViewProps = {
		accentColor,
		artistAndAlbum,
		cardStyle,
		coverUrl,
		onToggle: togglePlayer,
		prefersReducedMotion,
		progressPercent,
		spotifyUrl: track.spotify_url,
		title,
		red,
		green,
		blue,
		isHistorical,
		relativeTime,
	};
	const viewKey =
		status === "loading"
			? "loading"
			: !isDisplayable
				? "idle"
				: isHistorical
					? `${isMobile ? "mobile" : "desktop"}-history-${isExpanded ? "expanded" : "collapsed"}`
					: `${isMobile ? "mobile" : "desktop"}-${isExpanded ? "expanded" : "collapsed"}`;

	return (
		<div className="fixed right-[calc(1rem+env(safe-area-inset-right))] top-[calc(3.5rem+env(safe-area-inset-top))] z-30 select-none font-sans">
			<m.div
				ref={widgetRef}
				initial={false}
				animate={{ width: size.width, height: size.height }}
				transition={
					prefersReducedMotion
						? { duration: 0 }
						: { type: "spring", stiffness: 420, damping: 36 }
				}
				className="origin-top-right"
			>
				<span className="sr-only" aria-live="polite">
					{isPlaying
						? `Now playing ${title} by ${track.artist || "Unknown artist"}`
						: isHistorical
							? `Was listening to ${title} by ${track.artist || "Unknown artist"} · ${relativeTime}`
							: status === "loading"
								? "Loading current playback"
								: "Nothing playing"}
				</span>
				<AnimatePresence initial={false} mode="wait">
					<m.div
						key={viewKey}
						initial={
							prefersReducedMotion ? false : { opacity: 0, scale: 0.985 }
						}
						animate={{ opacity: 1, scale: 1 }}
						exit={
							prefersReducedMotion ? undefined : { opacity: 0, scale: 0.985 }
						}
						transition={{ duration: prefersReducedMotion ? 0 : 0.16 }}
						className="size-full origin-top-right"
					>
						{status === "loading" ? (
							<LoadingView
								isMobile={isMobile}
								prefersReducedMotion={prefersReducedMotion}
							/>
						) : !isDisplayable ? (
							<IdleView
								cardStyle={cardStyle}
								isMobile={isMobile}
								message={
									status === "error" ? "Music unavailable" : "Nothing playing"
								}
							/>
						) : isMobile ? (
							isExpanded ? (
								<MobileExpandedView {...sharedProps} />
							) : (
								<MobileDiscView {...sharedProps} />
							)
						) : isExpanded ? (
							<DesktopExpandedView {...sharedProps} />
						) : (
							<DesktopCollapsedView {...sharedProps} />
						)}
					</m.div>
				</AnimatePresence>
			</m.div>
		</div>
	);
});
