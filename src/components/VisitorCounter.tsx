import { X } from "lucide-react";
import { AnimatePresence, m, useReducedMotion } from "motion/react";
import { memo, useCallback, useEffect, useRef, useState } from "react";
import { annotate } from "rough-notation";
import { useLiveCount } from "../hooks/useLiveCount";
import { useTheme } from "../hooks/useTheme";
import { useVisitors } from "../hooks/useVisitors";
import { trackEvent } from "../lib/analytics";

const numberFormat = new Intl.NumberFormat("en-US");
const compactFormat = new Intl.NumberFormat("en-US", { notation: "compact" });

function LiveDot() {
	return (
		<span className="relative flex size-1.5" aria-hidden="true">
			<span className="absolute inline-flex size-full animate-ping rounded-full bg-emerald-400 opacity-75" />
			<span className="relative inline-flex size-1.5 rounded-full bg-emerald-400" />
		</span>
	);
}

function JustYou({ start }: { start: boolean }) {
	const { theme } = useTheme();
	const reduceMotion = Boolean(useReducedMotion());
	const ref = useRef<HTMLSpanElement>(null);

	useEffect(() => {
		if (!start) return;
		const el = ref.current;
		if (!el) return;
		const annotation = annotate(el, {
			type: "underline",
			color: theme === "light" ? "#ec4899" : "#60a5fa",
			strokeWidth: 2,
			padding: 3,
			animate: !reduceMotion,
			animationDuration: 600,
		});
		annotation.show();
		return () => annotation.remove();
	}, [theme, reduceMotion, start]);

	return (
		<span ref={ref} className="font-medium">
			just you
		</span>
	);
}

function ExpandedCard({
	compact,
	fullTotal,
	live,
	justYou,
	entered,
	onCollapse,
}: {
	compact: boolean;
	fullTotal: string | null;
	live: number;
	justYou: boolean;
	entered: boolean;
	onCollapse: () => void;
}) {
	const titleClass =
		"font-sans text-[11px] font-semibold text-elegant-text-primary";
	const labelClass = "font-sans text-[11px] text-elegant-text-secondary";
	const valueClass = "text-xs font-semibold text-elegant-text-primary";
	const cardClass = compact
		? "w-52 rounded-2xl border border-elegant-border bg-elegant-card/70 p-3 shadow-2xl backdrop-blur-xl backdrop-saturate-150"
		: "w-60 rounded-2xl border border-elegant-border bg-elegant-card/70 p-3 shadow-2xl backdrop-blur-xl backdrop-saturate-150";

	return (
		<div className={cardClass} role="status">
			<div className="flex items-center justify-between">
				<p className={titleClass}>Visitor Stats</p>
				<button
					type="button"
					onClick={onCollapse}
					aria-label="Collapse visitor details"
					className="flex size-5 -mr-1 cursor-pointer items-center justify-center rounded-md text-elegant-text-secondary outline-none transition-colors hover:bg-elegant-bg hover:text-elegant-text-primary focus-visible:ring-1 focus-visible:ring-elegant-accent"
				>
					<X size={12} aria-hidden="true" />
				</button>
			</div>
			<div className="mt-2 space-y-1.5">
				<div className="flex items-baseline justify-between gap-2">
					<span className={labelClass}>All time</span>
					<span className={valueClass}>{fullTotal ?? "—"}</span>
				</div>
				{live > 0 && (
					<div className="flex items-baseline justify-between gap-2">
						<span className={`flex items-center gap-1.5 ${labelClass}`}>
							Currently here
							<LiveDot />
						</span>
						<span className="whitespace-nowrap text-xs font-semibold text-elegant-text-primary">
							{justYou ? <JustYou start={entered} /> : live}
						</span>
					</div>
				)}
			</div>
		</div>
	);
}

export const VisitorCounter = memo(function VisitorCounter() {
	const { total } = useVisitors();
	const { live, connected } = useLiveCount();
	const justYou = live === 1 && connected;
	const [entered, setEntered] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const prefersReducedMotion = Boolean(useReducedMotion());
	const mobileRef = useRef<HTMLDivElement>(null);
	const desktopRef = useRef<HTMLDivElement>(null);

	const toggle = useCallback(() => {
		setEntered(false);
		setIsExpanded((current) => {
			const next = !current;
			trackEvent("visitors-toggle", { expanded: next });
			return next;
		});
	}, []);

	const collapse = useCallback(() => {
		setEntered(false);
		setIsExpanded(false);
	}, []);

	useEffect(() => {
		if (!isExpanded) return;
		const closeOnOutsidePointer = (event: PointerEvent) => {
			const target = event.target;
			if (!(target instanceof Node)) return;
			if (mobileRef.current?.contains(target)) return;
			if (desktopRef.current?.contains(target)) return;
			setIsExpanded(false);
		};
		const closeOnEscape = (event: KeyboardEvent) => {
			if (event.key === "Escape") setIsExpanded(false);
		};
		document.addEventListener("pointerdown", closeOnOutsidePointer, true);
		window.addEventListener("keydown", closeOnEscape);
		return () => {
			document.removeEventListener("pointerdown", closeOnOutsidePointer, true);
			window.removeEventListener("keydown", closeOnEscape);
		};
	}, [isExpanded]);

	useEffect(() => {
		if (total === null && live === 0) setIsExpanded(false);
	}, [total, live]);

	if (total === null && live === 0) return null;

	const fullTotal = total !== null ? numberFormat.format(total) : null;
	const compactTotal = total !== null ? compactFormat.format(total) : null;
	const summary =
		fullTotal !== null
			? `${fullTotal} total visits${live > 0 ? `, ${justYou ? "only you here now" : `${live} here now`}` : ""}`
			: justYou
				? "only you here now"
				: `${live} here now`;
	const viewKey = isExpanded ? "expanded" : "collapsed";
	const motionProps = {
		initial: prefersReducedMotion ? false : { opacity: 0, scale: 0.96 },
		animate: { opacity: 1, scale: 1 },
		exit: prefersReducedMotion ? undefined : { opacity: 0, scale: 0.96 },
		transition: { duration: prefersReducedMotion ? 0 : 0.15 },
	};

	return (
		<>
			<div
				ref={mobileRef}
				aria-live="polite"
				className="font-mono select-none sm:hidden"
			>
				<AnimatePresence initial={false} mode="wait">
					<m.div
						key={`mobile-${viewKey}`}
						{...motionProps}
						onAnimationComplete={
							isExpanded ? () => setEntered(true) : undefined
						}
						className="origin-top-right"
					>
						{isExpanded ? (
							<ExpandedCard
								compact
								fullTotal={fullTotal}
								live={live}
								justYou={justYou}
								entered={entered}
								onCollapse={collapse}
							/>
						) : (
							<button
								type="button"
								onClick={toggle}
								aria-expanded="false"
								aria-label={`${summary}. Tap to expand visitor details.`}
								className="flex cursor-pointer touch-manipulation items-center gap-1 rounded-full border border-elegant-border bg-elegant-card/70 px-2 py-0.5 text-[10px] shadow-2xl backdrop-blur-xl backdrop-saturate-150 outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent"
							>
								{compactTotal !== null && (
									<span className="flex items-center gap-1 font-medium text-elegant-text-secondary">
										<svg
											aria-hidden="true"
											width="12"
											height="12"
											viewBox="0 0 20 20"
											className="size-3 shrink-0"
										>
											<path
												d="m17.511,8.196c-.877-1.562-3.365-5.196-7.511-5.196s-6.634,3.634-7.496,5.17c-.663,1.103-.668,2.525-.016,3.633.663,1.251,3.107,5.196,7.512,5.196,4.146,0,6.634-3.634,7.496-5.17.668-1.111.668-2.548.015-3.634Zm-7.511,4.804c-1.657,0-3-1.343-3-3s1.343-3,3-3,3,1.343,3,3-1.343,3-3,3Z"
												fill="currentColor"
											/>
										</svg>
										{compactTotal}
									</span>
								)}
								{live > 0 && (
									<>
										{compactTotal !== null && (
											<span
												aria-hidden="true"
												className="text-elegant-text-muted"
											>
												·
											</span>
										)}
										<span className="flex items-center gap-1 font-medium text-elegant-text-primary">
											<LiveDot />
											{live}
										</span>
									</>
								)}
							</button>
						)}
					</m.div>
				</AnimatePresence>
			</div>

			<div
				ref={desktopRef}
				aria-live="polite"
				className="fixed bottom-4 left-4 z-40 hidden font-mono select-none sm:block"
			>
				<AnimatePresence initial={false} mode="wait">
					<m.div
						key={`desktop-${viewKey}`}
						{...motionProps}
						onAnimationComplete={
							isExpanded ? () => setEntered(true) : undefined
						}
						className="origin-bottom-left"
					>
						{isExpanded ? (
							<ExpandedCard
								compact={false}
								fullTotal={fullTotal}
								live={live}
								justYou={justYou}
								entered={entered}
								onCollapse={collapse}
							/>
						) : (
							<button
								type="button"
								onClick={toggle}
								aria-expanded="false"
								aria-label={`${summary}. Click to expand visitor details.`}
								className="flex cursor-pointer items-center gap-1.5 rounded-full border border-elegant-border bg-elegant-card/70 px-2.5 py-1 text-[11px] shadow-2xl backdrop-blur-xl backdrop-saturate-150 outline-none transition-colors hover:border-elegant-accent/50 focus-visible:ring-1 focus-visible:ring-elegant-accent"
							>
								{fullTotal !== null && (
									<span className="font-medium text-elegant-text-secondary">
										{fullTotal} visits
									</span>
								)}
								{live > 0 && (
									<>
										{fullTotal !== null && (
											<span
												aria-hidden="true"
												className="text-elegant-text-muted"
											>
												·
											</span>
										)}
										<span className="flex items-center gap-1 font-medium text-elegant-text-primary">
											<LiveDot />
											{live} here
										</span>
									</>
								)}
							</button>
						)}
					</m.div>
				</AnimatePresence>
			</div>
		</>
	);
});
