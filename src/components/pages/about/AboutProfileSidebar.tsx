import { AnimatePresence, m } from "motion/react";
import { useState } from "react";
import { FaLinkedin } from "react-icons/fa";
import { SiGithub, SiTelegram, SiX } from "react-icons/si";
import { useNavigate } from "react-router";
import { useServerStatus } from "../../../hooks/useServerStatus";
import { trackEvent } from "../../../lib/analytics";

interface AboutProfileSidebarProps {
	roleDisplayed: string;
	prefersReducedMotion: boolean;
	onShowProfile: () => void;
}

// Longest phrase from ROLES in About.tsx — reserves layout width to prevent CLS
const GHOST_ROLE = "Software Engineering Student";

export function AboutProfileSidebar({
	roleDisplayed,
	prefersReducedMotion,
	onShowProfile,
}: AboutProfileSidebarProps) {
	const navigate = useNavigate();
	const [hasImageError, setHasImageError] = useState(false);
	const [showStatusTooltip, setShowStatusTooltip] = useState(false);
	const { isOnline, lastPing, formattedTime, relativeTime, isLoading } =
		useServerStatus();

	return (
		<aside
			className="lg:col-span-1 lg:sticky lg:top-10 lg:self-start"
			aria-label="User Profile"
		>
			<div className="bg-elegant-card border border-elegant-border rounded-lg p-6 shadow-xl">
				<div className="flex flex-col items-center text-center">
					<button
						type="button"
						className="w-24 h-24 lg:w-32 lg:h-32 rounded-full bg-elegant-bg border border-elegant-border p-1 mb-4 lg:mb-6 cursor-pointer hover:border-elegant-accent outline-none focus-visible:ring-2 focus-visible:ring-elegant-accent transition-colors block text-left"
						onClick={onShowProfile}
						aria-label="View profile picture"
					>
						<div className="w-full h-full rounded-full bg-elegant-bg flex items-center justify-center overflow-hidden">
							{!hasImageError ? (
								<img
									src="/assets/me.jpg"
									alt="Bahauddin Alam, Full Stack Developer"
									width={128}
									height={128}
									className="w-full h-full object-cover"
									onError={() => setHasImageError(true)}
									loading="eager"
								/>
							) : (
								<span className="text-4xl font-bold text-elegant-text-muted">
									B
								</span>
							)}
						</div>
					</button>

					<h1 className="text-xl font-bold text-elegant-text-primary mb-2 text-balance">
						Bahauddin Alam
					</h1>
					<div className="inline-flex items-center justify-center gap-1.5 mb-1">
						<p className="text-elegant-text-muted text-sm">@bahauddinalam</p>
						<span
							className="inline-flex items-center shrink-0"
							title="Verified"
							role="img"
							aria-label="Verified"
						>
							<svg
								viewBox="0 0 22 22"
								xmlns="http://www.w3.org/2000/svg"
								className="w-4 h-4 shrink-0"
								aria-hidden="true"
							>
								<path
									d="M20.396 11c-.018-.646-.215-1.275-.57-1.816-.354-.54-.852-.972-1.438-1.246.223-.607.27-1.264.14-1.897-.131-.634-.437-1.218-.882-1.687-.47-.445-1.053-.75-1.687-.882-.633-.13-1.29-.083-1.897.14-.273-.587-.704-1.086-1.245-1.44S11.647 1.62 11 1.604c-.646.017-1.273.213-1.813.568s-.969.854-1.24 1.44c-.608-.223-1.267-.272-1.902-.14-.635.13-1.22.436-1.69.882-.445.47-.749 1.055-.878 1.688-.13.633-.08 1.29.144 1.896-.587.274-1.087.705-1.443 1.245-.356.54-.555 1.17-.574 1.817.02.647.218 1.276.574 1.817.356.54.856.972 1.443 1.245-.224.606-.274 1.263-.144 1.896.13.634.433 1.218.877 1.688.47.443 1.054.747 1.687.878.633.132 1.29.084 1.897-.136.274.586.705 1.084 1.246 1.439.54.354 1.17.551 1.816.569.647-.016 1.276-.213 1.817-.567s.972-.854 1.245-1.44c.604.239 1.266.296 1.903.164.636-.132 1.22-.447 1.68-.907.46-.46.776-1.044.908-1.681s.075-1.299-.165-1.903c.586-.274 1.084-.705 1.439-1.246.354-.54.551-1.17.569-1.816zM9.662 14.85l-3.429-3.428 1.293-1.302 2.072 2.072 4.4-4.794 1.347 1.246z"
									fill="#1d9bf0"
								/>
							</svg>
						</span>
					</div>

					<div className="relative inline-flex items-center justify-center min-h-5 mb-3.5 w-full">
						<span
							className="invisible pointer-events-none select-none text-sm px-1 whitespace-nowrap"
							aria-hidden="true"
						>
							{GHOST_ROLE}
						</span>
						{prefersReducedMotion ? (
							<p
								className="absolute inset-0 flex items-center justify-center text-elegant-text-secondary text-sm"
								aria-live="polite"
								aria-atomic="true"
							>
								{roleDisplayed}
							</p>
						) : (
							<AnimatePresence mode="wait">
								<m.p
									key={roleDisplayed}
									initial={{ opacity: 0, y: 6, filter: "blur(6px)" }}
									animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
									exit={{ opacity: 0, y: -6, filter: "blur(6px)" }}
									transition={{
										duration: 0.85,
										ease: [0.33, 1, 0.68, 1],
									}}
									className="absolute inset-0 flex items-center justify-center text-elegant-text-secondary text-sm whitespace-nowrap"
									aria-live="polite"
									aria-atomic="true"
								>
									{roleDisplayed}
								</m.p>
							</AnimatePresence>
						)}
					</div>

					<div className="flex gap-3 mb-5 justify-center">
						<a
							href="https://github.com/bahauddin-alam"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Github Profile"
							onClick={() =>
								trackEvent("social-click", {
									network: "github",
									location: "about-sidebar",
								})
							}
							className="p-2 bg-elegant-bg hover:bg-elegant-card rounded outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent transition-colors border border-elegant-border text-elegant-text-muted hover:text-elegant-text-primary"
						>
							<SiGithub size={18} aria-hidden="true" />
						</a>
						<a
							href="https://x.com/bahauddinalam"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="X (Twitter) Profile"
							onClick={() =>
								trackEvent("social-click", {
									network: "x",
									location: "about-sidebar",
								})
							}
							className="p-2 bg-elegant-bg hover:bg-elegant-card rounded outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent transition-colors border border-elegant-border text-elegant-text-muted hover:text-elegant-text-primary"
						>
							<SiX size={18} aria-hidden="true" />
						</a>
						<a
							href="https://www.linkedin.com/in/bahauddinalam"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="LinkedIn Profile"
							onClick={() =>
								trackEvent("social-click", {
									network: "linkedin",
									location: "about-sidebar",
								})
							}
							className="p-2 bg-elegant-bg hover:bg-elegant-card rounded outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent transition-colors border border-elegant-border text-elegant-text-muted hover:text-elegant-text-primary"
						>
							<FaLinkedin size={18} aria-hidden="true" />
						</a>
						<a
							href="https://t.me/bahauddinalam"
							target="_blank"
							rel="noopener noreferrer"
							aria-label="Telegram Profile"
							onClick={() =>
								trackEvent("social-click", {
									network: "telegram",
									location: "about-sidebar",
								})
							}
							className="p-2 bg-elegant-bg hover:bg-elegant-card rounded outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent transition-colors border border-elegant-border text-elegant-text-muted hover:text-elegant-text-primary"
						>
							<SiTelegram size={18} aria-hidden="true" />
						</a>
					</div>

					<div className="w-full space-y-1 text-xs text-left">
						<div className="flex justify-between py-2 border-t border-elegant-border items-center min-h-9">
							<span className="text-elegant-text-secondary leading-none">
								Status
							</span>
							{isLoading ? (
								<div
									role="status"
									aria-label="Loading status"
									className="h-6 inline-flex items-center gap-1.5 py-0.5 select-none"
								>
									<span className="relative flex w-1.5 h-1.5 rounded-full bg-elegant-border overflow-hidden shrink-0">
										<span
											className={`absolute inset-0 ${
												prefersReducedMotion
													? "animate-pulse bg-elegant-text-muted/30"
													: "animate-skeleton-shimmer bg-linear-to-r from-transparent via-elegant-text-muted/40 to-transparent"
											}`}
											aria-hidden="true"
										/>
									</span>
									<span className="relative h-3.5 w-12 rounded bg-elegant-border overflow-hidden shrink-0">
										<span
											className={`absolute inset-0 ${
												prefersReducedMotion
													? "animate-pulse bg-elegant-text-muted/30"
													: "animate-skeleton-shimmer bg-linear-to-r from-transparent via-elegant-text-muted/40 to-transparent"
											}`}
											aria-hidden="true"
										/>
									</span>
								</div>
							) : isOnline ? (
								<div className="h-6 inline-flex items-center gap-1.5 py-0.5 select-none">
									<span className="relative flex w-1.5 h-1.5">
										<span
											className={`${prefersReducedMotion ? "" : "animate-ping"} absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75`}
											aria-hidden="true"
										/>
										<span
											className="relative inline-flex w-1.5 h-1.5 rounded-full bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]"
											aria-hidden="true"
										/>
									</span>
									<span className="text-xs font-medium text-emerald-400 leading-none">
										Active
									</span>
								</div>
							) : (
								<div className="h-6 group relative inline-flex items-center">
									<button
										type="button"
										onClick={() => setShowStatusTooltip((prev) => !prev)}
										onMouseEnter={() => setShowStatusTooltip(true)}
										onMouseLeave={() => setShowStatusTooltip(false)}
										onFocus={() => setShowStatusTooltip(true)}
										onBlur={() => setShowStatusTooltip(false)}
										aria-label="Toggle status tooltip"
										aria-expanded={showStatusTooltip}
										className="cursor-help h-6 inline-flex items-center gap-1.5 px-1.5 -mr-1.5 rounded hover:bg-elegant-bg/80 transition-colors select-none outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent"
									>
										<span className="relative flex w-1.5 h-1.5">
											<span
												className="relative inline-flex w-1.5 h-1.5 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(251,191,36,0.4)]"
												aria-hidden="true"
											/>
										</span>
										<span className="text-xs font-medium border-b border-dotted pb-0.5 text-amber-400 border-amber-400/60 hover:border-amber-400 leading-none">
											AFK
										</span>
									</button>

									{/* Tooltip on Hover / Focus / Mobile Touch (only for AFK) */}
									<div
										role="tooltip"
										className={`pointer-events-none absolute bottom-full right-0 mb-2 w-max max-w-xs rounded-md bg-elegant-card/95 border border-elegant-border px-2.5 py-1 text-[11px] font-mono shadow-2xl backdrop-blur-md transition-opacity duration-150 z-50 select-none text-left ${
											showStatusTooltip
												? "opacity-100"
												: "opacity-0 group-hover:opacity-100"
										}`}
									>
										<span className="text-elegant-text-muted">
											{lastPing ? (
												<>
													Last Seen:{" "}
													<span className="text-elegant-text-secondary">
														{relativeTime || "just now"}
														{formattedTime ? ` / ${formattedTime}` : ""}
													</span>
												</>
											) : (
												"Polling live status (1m)"
											)}
										</span>
									</div>
								</div>
							)}
						</div>
						<div className="flex justify-between py-2 border-t border-elegant-border items-center min-h-9">
							<span className="text-elegant-text-secondary leading-none">
								Location
							</span>
							<span className="text-elegant-text-muted leading-none">
								Patna, India
							</span>
						</div>
						<div className="flex justify-between py-2 border-t border-elegant-border items-center min-h-9">
							<span className="text-elegant-text-secondary leading-none">
								Joined
							</span>
							<span className="text-elegant-text-muted leading-none">2022</span>
						</div>
						<div className="flex justify-between py-2 border-t border-elegant-border items-center min-h-9">
							<span className="text-elegant-text-secondary leading-none">
								Available
							</span>
							<span className="text-elegant-accent font-semibold leading-none">
								Open to work
							</span>
						</div>
					</div>

					<button
						type="button"
						onClick={() => {
							trackEvent("cta-get-in-touch", { location: "about-sidebar" });
							navigate("/contact");
						}}
						className="mt-5 w-full py-2 border border-elegant-accent/40 text-elegant-accent hover:bg-elegant-accent/10 rounded text-sm font-semibold outline-none focus-visible:ring-2 focus-visible:ring-elegant-accent transition-colors"
					>
						Get in touch →
					</button>
				</div>
			</div>
		</aside>
	);
}
