import {
	IconAlign3LeftFill18,
	IconDarkLightFill18,
} from "nucleo-ui-essential-fill-18";
import { useEffect, useState } from "react";
import { useTheme } from "../hooks/useTheme";
import { prefetchSpotlight } from "../utils/prefetch";

interface TopBarProps {
	activeApp?: string;
	onOpenSpotlight?: () => void;
}

const getFormattedTime = () => {
	if (typeof window === "undefined") return { date: "", time: "" };
	const now = new Date();
	const time = now.toLocaleTimeString(undefined, {
		hour: "numeric",
		minute: "2-digit",
		hour12: true,
	});
	const date = now.toLocaleDateString(undefined, {
		weekday: "short",
		month: "short",
		day: "numeric",
	});
	return { date, time };
};

export const TopBar = ({
	activeApp = "desktop",
	onOpenSpotlight,
}: TopBarProps) => {
	const { theme, toggleTheme } = useTheme();
	const [timeData, setTimeData] = useState<{ date: string; time: string }>(
		getFormattedTime,
	);

	useEffect(() => {
		const updateTime = () => {
			setTimeData(getFormattedTime());
		};

		updateTime();
		const interval = setInterval(updateTime, 1000);
		return () => clearInterval(interval);
	}, []);

	const handleSpotlightClick = () => {
		if (onOpenSpotlight) {
			onOpenSpotlight();
		} else {
			window.dispatchEvent(
				new KeyboardEvent("keydown", {
					key: "k",
					ctrlKey: true,
					metaKey: true,
				}),
			);
		}
	};

	return (
		<header className="fixed top-0 inset-x-0 h-8 z-50 bg-elegant-card/90 backdrop-blur-xl border-b border-elegant-border px-3 flex items-center justify-between text-xs font-mono text-elegant-text-primary select-none shadow-xs">
			<div className="flex items-center gap-2 sm:gap-3 truncate mr-2">
				<div className="flex items-center gap-1.5 font-bold tracking-wider text-elegant-text-primary shrink-0">
					<span
						className="inline-block size-2 rounded-full bg-elegant-accent shadow-xs shrink-0"
						aria-hidden="true"
					/>
					<span className="text-[11px] uppercase text-elegant-accent font-semibold">
						Neosphere
					</span>
				</div>
				<span
					className="text-elegant-text-muted text-[10px] shrink-0"
					aria-hidden="true"
				>
					/
				</span>
				<span className="text-elegant-text-secondary font-medium text-[11px] truncate">
					{activeApp}
				</span>
			</div>

			<div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
				<button
					type="button"
					onClick={handleSpotlightClick}
					onMouseEnter={prefetchSpotlight}
					onFocus={prefetchSpotlight}
					onTouchStart={prefetchSpotlight}
					aria-label="Open Spotlight Search"
					className="group relative flex items-center justify-center size-6 rounded text-elegant-text-secondary hover:text-elegant-text-primary hover:bg-elegant-bg transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent"
				>
					<IconAlign3LeftFill18 size={14} aria-hidden="true" />
					<span
						role="tooltip"
						className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 rounded-md bg-elegant-card/95 border border-elegant-border px-2 py-1 text-[11px] font-mono font-medium text-elegant-text-primary shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50 select-none"
					>
						Spotlight
					</span>
				</button>

				<button
					type="button"
					onClick={toggleTheme}
					aria-label={`Switch to ${theme === "dark" ? "light" : "dark"} mode`}
					className="group relative flex items-center justify-center size-6 rounded text-elegant-text-secondary hover:text-elegant-text-primary hover:bg-elegant-bg transition-colors cursor-pointer outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent"
				>
					<IconDarkLightFill18 size={14} aria-hidden="true" />
					<span
						role="tooltip"
						className="pointer-events-none absolute top-8 left-1/2 -translate-x-1/2 rounded-md bg-elegant-card/95 border border-elegant-border px-2 py-1 text-[11px] font-mono font-medium text-elegant-text-primary shadow-xl backdrop-blur-md opacity-0 group-hover:opacity-100 group-focus-visible:opacity-100 transition-opacity duration-150 whitespace-nowrap z-50 select-none"
					>
						Toggle Theme ({theme === "dark" ? "Light" : "Dark"})
					</span>
				</button>

				<div className="flex items-center text-elegant-text-primary font-medium tracking-tight text-[11px] pl-1.5 border-l border-elegant-border whitespace-nowrap shrink-0">
					<span className="hidden sm:inline">{timeData.date}&nbsp;&nbsp;</span>
					<span className="whitespace-nowrap">{timeData.time}</span>
				</div>
			</div>
		</header>
	);
};
