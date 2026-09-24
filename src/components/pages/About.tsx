import { ChevronDown, ChevronUp } from "lucide-react";
import { m, useReducedMotion } from "motion/react";
import { IconUserFill18 } from "nucleo-ui-essential-fill-18";
import { useEffect, useMemo, useState } from "react";
import { FaAws } from "react-icons/fa";
import {
	SiCplusplus,
	SiGo,
	SiNodedotjs,
	SiPython,
	SiReact,
	SiRust,
	SiTailwindcss,
	SiTypescript,
} from "react-icons/si";
import { useNavigate } from "react-router";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover";
import { Clock5 } from "@/components/animate-ui/icons/clock-5";
import { Pickaxe } from "@/components/animate-ui/icons/pickaxe";
import { Route } from "@/components/animate-ui/icons/route";
import { useCanHover } from "../../hooks/useCanHover";
import { useSEO } from "../../hooks/useSEO";
import { trackEvent } from "../../lib/analytics";
import { Dock } from "../Dock";
import { PageHeader } from "../PageHeader";
import { AboutProfileSidebar } from "./about/AboutProfileSidebar";
import { ProfileLightbox } from "./about/ProfileLightbox";

const ROLES = [
	"Full Stack Developer",
	"Amateur Photographer",
	"Software Engineering Student",
	"Open Source Contributor",
	"Solopreneur",
];

// Bump this whenever you update anything on the About page
const ABOUT_LAST_UPDATED_ISO = "2026-02-15T12:00:00.000Z";

const CURRENTLY: Array<{
	label: string;
	value: string;
	icon: React.ComponentType<{
		size?: number;
		className?: string;
		animateOnHover?: boolean;
	}>;
}> = [
	{
		label: "Building",
		value: "",
		icon: Pickaxe,
	},
	{
		label: "Learning",
		value: "",
		icon: Route,
	},
];

const SKILL_GROUPS = [
	{
		category: "Frontend",
		skills: [
			{
				name: "React",
				icon: SiReact,
				hex: "#61DAFB",
				progress: 95,
				flatIdx: 0,
			},
			{
				name: "TypeScript",
				icon: SiTypescript,
				hex: "#3178C6",
				progress: 90,
				flatIdx: 1,
			},
			{
				name: "Tailwind",
				icon: SiTailwindcss,
				hex: "#06B6D4",
				progress: 98,
				flatIdx: 2,
			},
		],
	},
	{
		category: "Backend",
		skills: [
			{
				name: "Node.js",
				icon: SiNodedotjs,
				hex: "#339933",
				progress: 90,
				flatIdx: 3,
			},
			{
				name: "Python",
				icon: SiPython,
				hex: "#3776AB",
				progress: 85,
				flatIdx: 4,
			},
			{ name: "Go", icon: SiGo, hex: "#00ADD8", progress: 80, flatIdx: 5 },
		],
	},
	{
		category: "Systems & Cloud",
		skills: [
			{ name: "Rust", icon: SiRust, hex: "#CE422B", progress: 75, flatIdx: 6 },
			{
				name: "C++",
				icon: SiCplusplus,
				hex: "#00599C",
				progress: 70,
				flatIdx: 7,
			},
			{ name: "AWS", icon: FaAws, hex: "#FF9900", progress: 80, flatIdx: 8 },
		],
	},
];

type Skill = (typeof SKILL_GROUPS)[number]["skills"][number];

function useRoleCycle(roles: string[], prefersReducedMotion: boolean): string {
	const [idx, setIdx] = useState(0);

	useEffect(() => {
		if (roles.length <= 1) return;
		const interval = prefersReducedMotion ? 4000 : 2500;
		const t = setInterval(
			() => setIdx((prev) => (prev + 1) % roles.length),
			interval,
		);
		return () => clearInterval(t);
	}, [roles.length, prefersReducedMotion]);

	return roles[idx] ?? "";
}

interface CardAnimationProps {
	activeCard: "about" | "tech";
	prefersReducedMotion: boolean;
}

interface BioCardProps extends CardAnimationProps {
	isExpanded: boolean;
	hasGlowed: boolean;
	onExpand: () => void;
	onCollapse: () => void;
	onActivate: () => void;
}

const BioCard = ({
	activeCard,
	isExpanded,
	hasGlowed,
	onExpand,
	onCollapse,
	onActivate,
	prefersReducedMotion,
}: BioCardProps) => {
	const isActive = activeCard === "about";
	return (
		<m.section
			id="about-panel"
			role="tabpanel"
			aria-labelledby="tab-about"
			aria-hidden={isActive ? undefined : true}
			className={`${isActive ? "relative" : "absolute inset-0"} bg-elegant-card border border-elegant-border rounded-lg shadow-2xl p-6 origin-top w-full overflow-hidden will-change-transform ${isActive ? "pointer-events-auto" : "pointer-events-none"}`}
			initial={false}
			animate={
				prefersReducedMotion
					? { y: 0, x: 0, scale: 1, rotate: 0 }
					: {
							y: isActive ? 0 : -35,
							x: isActive ? 0 : 5,
							scale: isActive ? 1 : 0.94,
							rotate: isActive ? 0 : 2,
						}
			}
			style={{ zIndex: isActive ? 10 : 1 }}
			transition={
				prefersReducedMotion
					? { duration: 0.2 }
					: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
			}
		>
			<m.div
				animate={{ opacity: isActive ? 1 : 0.32 }}
				transition={
					prefersReducedMotion
						? { duration: 0.15 }
						: {
								duration: 0.42,
								ease: [0.16, 1, 0.3, 1],
								delay: isActive ? 0.08 : 0,
							}
				}
				className={isActive ? "pointer-events-auto" : "pointer-events-none"}
			>
				<div className="flex items-center gap-3 mb-4 lg:mb-6">
					<IconUserFill18
						className="text-elegant-text-muted"
						size={20}
						aria-hidden="true"
					/>
					<h2
						id="about-me-heading"
						className="text-lg font-bold text-elegant-text-primary"
					>
						About Me
					</h2>
				</div>
				<div className="space-y-4 text-elegant-text-secondary leading-relaxed text-sm">
					<p>
						I'm Bahauddin Alam, a Full Stack Developer based in Patna, India.
						Alongside continuing my academic studies, I focus on building
						performance driven web applications and developer oriented systems
						designed for reliability, scalability, and long-term
						maintainability.
					</p>

					<p>
						My primary stack includes React, TypeScript, Tailwind CSS, Python,
						and Node.js, and I deploy and scale applications using AWS and
						modern edge platforms. I work across the entire development
						lifecycle from frontend architecture and UI/UX implementation to
						backend logic, infrastructure setup, and deployment strategy.
					</p>

					{!isExpanded && (
						<button
							type="button"
							onClick={onExpand}
							className="flex items-center gap-2 text-elegant-accent hover:text-elegant-accent/80 transition-colors text-sm font-medium mt-4 group rounded outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent"
						>
							Read More
							<ChevronDown
								size={16}
								aria-hidden="true"
								className="group-hover:translate-y-0.5 transition-transform"
							/>
						</button>
					)}

					<div
						className={`grid transition-[grid-template-rows,opacity] duration-500 ease-in-out ${isExpanded ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0 overflow-hidden"}`}
					>
						<div className="overflow-hidden">
							<div className="pt-2">
								<h3 className="text-base font-bold text-elegant-text-primary mt-4 mb-2">
									Engineering Approach
								</h3>

								<p className="mb-4">
									My background in systems programming with C++ has shaped the
									way I think about software. Understanding memory management,
									performance constraints, and low-level optimization gives me a
									systems first perspective when designing web applications. I
									prioritize clean architecture, efficient execution, and
									simplicity over unnecessary complexity.
								</p>

								<p className="mb-4">
									Rather than separating frontend and backend concerns, I
									approach development holistically. Every layer — interface,
									API design, database interaction, deployment, and monitoring
									should work together cohesively. Good software is not just
									functional; it is structured, predictable, and maintainable.
								</p>

								<h3 className="text-base font-bold text-elegant-text-primary mt-6 mb-2">
									What I Build
								</h3>

								<p className="mb-4">
									I have built server uptime monitoring systems, real-time
									health tracking dashboards, and alert tools designed to
									improve system visibility and operational awareness. These
									tools focus on performance, reliability, and clarity —
									minimizing noise while maximizing actionable insight.
								</p>

								<p className="mb-4">
									I also designed and developed a custom terminal-themed web
									interface engineered for speed and responsiveness. This
									project reflects my interest in blending structured systems
									thinking with modern web technologies.
								</p>

								<h3 className="text-base font-bold text-elegant-text-primary mt-6 mb-2">
									Areas of Interest
								</h3>

								<p className="mb-4">
									I'm particularly interested in high performance computing,
									distributed systems, edge infrastructure, and developer
									tooling. My long term focus is on building software that is
									efficient, scalable, and thoughtfully engineered — whether for
									clients, open-source contributions, or independent projects.
								</p>

								<p className="mb-4">
									I believe strong engineering is about clarity, performance,
									and responsibility — building systems that not only work today
									but remain stable and maintainable tomorrow.
								</p>

								<button
									type="button"
									onClick={(e) => {
										e.stopPropagation();
										onCollapse();
									}}
									className="flex items-center gap-2 text-elegant-text-muted hover:text-elegant-text-primary transition-colors text-sm font-medium mt-6 group rounded outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent"
								>
									Read Less
									<ChevronUp
										size={16}
										aria-hidden="true"
										className="group-hover:-translate-y-0.5 transition-transform"
									/>
								</button>
							</div>
						</div>
					</div>
				</div>
			</m.div>

			{activeCard !== "about" && (
				<div className="absolute inset-0 z-10 flex items-start justify-center pt-2 pointer-events-none">
					<m.button
						type="button"
						className="bg-elegant-bg/80 text-elegant-text-primary px-3 py-1 rounded-full text-xs font-bold shadow-lg border uppercase tracking-wider backdrop-blur-sm relative overflow-hidden pointer-events-auto cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-elegant-accent"
						initial={
							!hasGlowed
								? {
										borderColor: "rgba(201, 166, 107, 0.8)",
										boxShadow: "0 0 15px rgba(201,166,107,0.4)",
									}
								: {
										borderColor: "rgba(201, 166, 107, 0.1)",
										boxShadow: "0 0 0px rgba(201,166,107,0)",
									}
						}
						animate={{
							borderColor: "rgba(201, 166, 107, 0.1)",
							boxShadow: "0 0 0px rgba(201,166,107,0)",
						}}
						transition={{ duration: 2, ease: "easeOut" }}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={(e: React.MouseEvent) => {
							e.stopPropagation();
							onActivate();
						}}
					>
						View About Me
					</m.button>
				</div>
			)}
		</m.section>
	);
};

interface SkillsCardProps extends CardAnimationProps {
	hasGlowed: boolean;
	onActivate: () => void;
}

const SkillsCard = ({
	activeCard,
	hasGlowed,
	prefersReducedMotion,
	onActivate,
}: SkillsCardProps) => {
	const isActive = activeCard === "tech";
	return (
		<m.section
			id="tech-panel"
			role="tabpanel"
			aria-labelledby="tab-tech"
			aria-hidden={isActive ? undefined : true}
			className={`${isActive ? "relative" : "absolute inset-0"} bg-elegant-card border border-elegant-border rounded-lg shadow-2xl p-6 origin-top w-full overflow-hidden will-change-transform ${isActive ? "pointer-events-auto" : "pointer-events-none"}`}
			initial={false}
			animate={
				prefersReducedMotion
					? { y: 0, x: 0, scale: 1, rotate: 0 }
					: {
							y: isActive ? 0 : -35,
							x: isActive ? 0 : -5,
							scale: isActive ? 1 : 0.94,
							rotate: isActive ? 0 : -2,
						}
			}
			style={{ zIndex: isActive ? 10 : 1 }}
			transition={
				prefersReducedMotion
					? { duration: 0.2 }
					: { duration: 0.6, ease: [0.16, 1, 0.3, 1] }
			}
		>
			<m.div
				animate={{ opacity: isActive ? 1 : 0.32 }}
				transition={
					prefersReducedMotion
						? { duration: 0.15 }
						: {
								duration: 0.42,
								ease: [0.16, 1, 0.3, 1],
								delay: isActive ? 0.08 : 0,
							}
				}
			>
				<h2
					id="tech-stack-heading"
					className="text-lg font-bold text-elegant-text-primary mb-4"
				>
					Tech Stack
				</h2>

				<div className="flex flex-col gap-4 w-full">
					{SKILL_GROUPS.map((group) => (
						<div key={group.category}>
							<p className="text-xs font-bold uppercase tracking-widest text-elegant-text-secondary mb-2 pl-1">
								{group.category}
							</p>
							<div className="flex flex-col gap-2">
								{group.skills.map((skill) => (
									<SkillRow
										key={skill.name}
										skill={skill}
										activeCard={activeCard}
										prefersReducedMotion={prefersReducedMotion}
									/>
								))}
							</div>
						</div>
					))}
				</div>
			</m.div>

			{activeCard !== "tech" && (
				<div className="absolute inset-0 z-10 flex items-start justify-center pt-2 pointer-events-none">
					<m.button
						type="button"
						className="bg-elegant-bg/80 text-elegant-text-primary px-3 py-1 rounded-full text-xs font-bold shadow-lg border uppercase tracking-wider backdrop-blur-sm relative overflow-hidden pointer-events-auto cursor-pointer outline-none focus-visible:ring-2 focus-visible:ring-elegant-accent"
						initial={
							!hasGlowed
								? {
										borderColor: "rgba(201, 166, 107, 0.8)",
										boxShadow: "0 0 15px rgba(201,166,107,0.4)",
									}
								: {
										borderColor: "rgba(201, 166, 107, 0.1)",
										boxShadow: "0 0 0px rgba(201,166,107,0)",
									}
						}
						animate={{
							borderColor: "rgba(201, 166, 107, 0.1)",
							boxShadow: "0 0 0px rgba(201,166,107,0)",
						}}
						transition={{ duration: 2, ease: "easeOut" }}
						whileHover={{ scale: 1.05 }}
						whileTap={{ scale: 0.95 }}
						onClick={(e: React.MouseEvent) => {
							e.stopPropagation();
							onActivate();
						}}
					>
						View Tech Stack
					</m.button>
				</div>
			)}
		</m.section>
	);
};

const SkillRow = ({
	skill,
	activeCard,
	prefersReducedMotion,
}: {
	skill: Skill;
	activeCard: "about" | "tech";
	prefersReducedMotion: boolean;
}) => (
	<article
		className="relative w-full bg-elegant-bg border border-elegant-border rounded-sm hover:border-elegant-text-muted transition-colors cursor-default group overflow-hidden"
		role="progressbar"
		aria-valuenow={skill.progress}
		aria-valuemin={0}
		aria-valuemax={100}
		aria-label={`Skill: ${skill.name}, Proficiency: ${skill.progress}%`}
	>
		<m.div
			className="absolute top-0 left-0 w-full h-full z-0 origin-left opacity-20 group-hover:opacity-30 transition-opacity"
			style={{ backgroundColor: skill.hex }}
			initial={{ scaleX: 0 }}
			animate={{ scaleX: activeCard === "tech" ? skill.progress / 100 : 0 }}
			transition={{
				duration: prefersReducedMotion ? 0 : 1,
				delay: prefersReducedMotion
					? 0
					: activeCard === "tech"
						? skill.flatIdx * 0.07
						: 0,
				ease: [0.16, 1, 0.3, 1],
			}}
		/>
		<div className="relative z-10 p-3 flex items-center justify-between">
			<div className="flex items-center gap-3">
				<div className="shrink-0 flex items-center justify-center w-7 h-7">
					<skill.icon
						size={24}
						style={{ color: skill.hex }}
						className="tech-stack-icon"
						aria-hidden="true"
					/>
				</div>
				<div className="tech-stack-text">{skill.name}</div>
			</div>
			<div className="text-sm font-medium text-elegant-text-secondary font-mono">
				{skill.progress}%
			</div>
		</div>
	</article>
);

function formatAboutRelativeTime(date: Date): string {
	const diffMs = Math.max(0, Date.now() - date.getTime());
	const diffSec = Math.floor(diffMs / 1000);
	if (diffSec < 45) return "just now";
	const diffMin = Math.floor(diffSec / 60);
	if (diffMin < 60) return `${diffMin}m ago`;
	const diffHours = Math.floor(diffMin / 60);
	if (diffHours < 24) return `${diffHours}h ago`;
	const diffDays = Math.floor(diffHours / 24);
	if (diffDays < 30) return `${diffDays}d ago`;
	const diffMonths = Math.floor(diffDays / 30);
	if (diffMonths < 12) return `${diffMonths}mo ago`;
	return `${Math.floor(diffMonths / 12)}y ago`;
}

function formatAboutAbsoluteTime(date: Date): string {
	return date.toLocaleString([], {
		year: "numeric",
		month: "short",
		day: "numeric",
		hour: "2-digit",
		minute: "2-digit",
	});
}

const CurrentlyBlock = ({
	prefersReducedMotion,
}: {
	prefersReducedMotion: boolean;
}) => {
	return (
		<m.div
			className="mt-6 shrink-0"
			initial={prefersReducedMotion ? false : { opacity: 0, y: 8 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{
				duration: 0.35,
				delay: 0.2,
				ease: [0.16, 1, 0.3, 1],
			}}
		>
			<div className="bg-elegant-card border border-elegant-border rounded-lg p-4 shadow-sm">
				<div className="space-y-1">
					{CURRENTLY.map(({ label, value, icon: Icon }) => (
						<div key={label} className="flex items-center gap-3 py-2 min-h-9">
							<Icon
								size={18}
								animateOnHover
								className="text-elegant-text-muted shrink-0"
								aria-hidden="true"
							/>
							<span className="text-[11px] font-bold uppercase tracking-widest text-elegant-text-primary shrink-0 w-15.5">
								{label}
							</span>
							<span className="text-sm text-elegant-text-secondary truncate flex-1 min-w-0">
								{value ? (
									value
								) : (
									<span className="text-elegant-text-muted/25 italic font-mono text-xs">
										—
									</span>
								)}
							</span>
						</div>
					))}
				</div>
			</div>
		</m.div>
	);
};

const TabBarLastUpdated = () => {
	const [open, setOpen] = useState(false);
	const canHover = useCanHover();
	const lastUpdatedDate = useMemo(() => {
		const d = new Date(ABOUT_LAST_UPDATED_ISO);
		return Number.isNaN(d.getTime()) ? null : d;
	}, []);
	const [relativeTime, setRelativeTime] = useState(() =>
		lastUpdatedDate ? formatAboutRelativeTime(lastUpdatedDate) : "",
	);
	const absoluteTime = useMemo(
		() => (lastUpdatedDate ? formatAboutAbsoluteTime(lastUpdatedDate) : ""),
		[lastUpdatedDate],
	);
	useEffect(() => {
		if (!lastUpdatedDate) return;
		setRelativeTime(formatAboutRelativeTime(lastUpdatedDate));
		const id = setInterval(
			() => setRelativeTime(formatAboutRelativeTime(lastUpdatedDate)),
			15_000,
		);
		return () => clearInterval(id);
	}, [lastUpdatedDate]);
	if (!lastUpdatedDate) return null;
	return (
		<Popover open={open} onOpenChange={setOpen}>
			<PopoverTrigger
				{...(canHover
					? {
							onMouseEnter: () => setOpen(true),
							onMouseLeave: () => setOpen(false),
							onFocus: () => setOpen(true),
							onBlur: () => setOpen(false),
						}
					: {})}
				className="inline-flex items-center justify-center rounded px-2 py-1 text-elegant-text-muted hover:text-elegant-text-primary hover:bg-elegant-bg transition-colors outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent touch-manipulation min-h-9 min-w-9 sm:min-h-9 sm:min-w-9"
				aria-label={`Last updated ${absoluteTime}`}
			>
				<Clock5
					size={18}
					animateOnHover={canHover ? true : undefined}
					animateOnTap={!canHover ? true : undefined}
					className="shrink-0"
					aria-hidden="true"
				/>
			</PopoverTrigger>
			<PopoverContent
				side="top"
				align="end"
				sideOffset={8}
				onOpenAutoFocus={(e) => e.preventDefault()}
				onCloseAutoFocus={(e) => e.preventDefault()}
				className="w-auto max-w-[min(320px,calc(100vw-2rem))] bg-elegant-card border-0 px-2.5 py-1.5 text-[11px] font-mono rounded-md shadow-xl p-2.5! leading-none whitespace-nowrap"
			>
				<span className="text-elegant-text-muted">Last updated: </span>
				<span className="text-elegant-text-primary font-medium">
					{relativeTime} / {absoluteTime}
				</span>
			</PopoverContent>
		</Popover>
	);
};

export const About = () => {
	const navigate = useNavigate();
	const prefersReducedMotion = useReducedMotion() ?? false;

	const onExit = () => navigate("/");

	const handleNavigate = (dest: string) => {
		if (dest === "Terminal") {
			onExit();
			window.dispatchEvent(new CustomEvent("open-terminal"));
		} else if (dest === "Files") {
			onExit();
			window.dispatchEvent(new CustomEvent("open-filemanager"));
		} else if (dest === "Home") {
			onExit();
		} else {
			navigate(`/${dest.toLowerCase()}`);
		}
	};

	const [showProfile, setShowProfile] = useState(false);
	const [isExpanded, setIsExpanded] = useState(false);
	const [activeCard, setActiveCard] = useState<"about" | "tech">("about");
	const [hasGlowed, setHasGlowed] = useState(false);

	const roleDisplayed = useRoleCycle(ROLES, prefersReducedMotion);

	// Initial glow timer
	useEffect(() => {
		const t = setTimeout(() => setHasGlowed(true), 2000);
		return () => clearTimeout(t);
	}, []);

	useSEO({
		title: "About | Bahauddin Alam",
		description:
			"About Bahauddin Alam - Full Stack Developer specializing in React, TypeScript, and Rust. Based in Patna, India.",
		url: "https://bahauddin.org/about",
		image: "https://bahauddin.org/assets/me.jpg",
	});

	return (
		<div className="h-full w-full bg-elegant-bg text-elegant-text-secondary font-mono selection:bg-elegant-accent/20 overflow-hidden">
			<div className="h-full flex flex-col">
				<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
					<PageHeader
						currentPath="about"
						onNavigate={handleNavigate}
						maxWidth="max-w-7xl"
					/>

					<main className="max-w-7xl mx-auto w-full px-4 sm:px-6 lg:px-8">
						<m.div
							className="grid grid-cols-1 lg:grid-cols-3 gap-8 pt-4 lg:pt-6 pb-28 lg:pb-32"
							initial={prefersReducedMotion ? false : { opacity: 0 }}
							animate={{ opacity: 1 }}
							transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
						>
							<AboutProfileSidebar
								roleDisplayed={roleDisplayed}
								prefersReducedMotion={prefersReducedMotion}
								onShowProfile={() => {
									trackEvent("profile-view");
									setShowProfile(true);
								}}
							/>

							<div className="lg:col-span-2 flex flex-col pt-2 lg:pt-6 w-full min-w-0">
								<div className="mb-10 shrink-0">
									<div className="flex items-center justify-between gap-2 mb-2">
										<div
											className="flex items-center gap-2"
											role="tablist"
											aria-label="Content sections"
										>
											{(["about", "tech"] as const).map((card) => (
												<button
													type="button"
													key={card}
													id={`tab-${card}`}
													role="tab"
													aria-selected={activeCard === card}
													aria-controls={`${card}-panel`}
													onClick={() => {
														setActiveCard(card);
														if (card === "tech") setIsExpanded(false);
														trackEvent("about-tab-view", { tab: card });
													}}
													className={`px-3 py-1.5 rounded-full text-xs font-bold uppercase tracking-wider transition-colors border outline-none focus-visible:ring-2 focus-visible:ring-elegant-accent ${
														activeCard === card
															? "bg-elegant-accent/15 border-elegant-accent/40 text-elegant-accent"
															: "border-elegant-border text-elegant-text-muted hover:text-elegant-text-primary hover:border-elegant-text-muted bg-transparent"
													}`}
												>
													{card === "about" ? "About Me" : "Tech Stack"}
												</button>
											))}
										</div>
										<TabBarLastUpdated />
									</div>
								</div>

								<div className="relative w-full">
									<BioCard
										activeCard={activeCard}
										isExpanded={isExpanded}
										hasGlowed={hasGlowed}
										prefersReducedMotion={prefersReducedMotion}
										onExpand={() => {
											setIsExpanded(true);
											trackEvent("about-bio-toggle", { expanded: true });
										}}
										onCollapse={() => {
											setIsExpanded(false);
											trackEvent("about-bio-toggle", { expanded: false });
										}}
										onActivate={() => {
											setActiveCard("about");
											trackEvent("about-tab-view", { tab: "about" });
										}}
									/>
									<SkillsCard
										activeCard={activeCard}
										hasGlowed={hasGlowed}
										prefersReducedMotion={prefersReducedMotion}
										onActivate={() => {
											setActiveCard("tech");
											setIsExpanded(false);
											trackEvent("about-tab-view", { tab: "tech" });
										}}
									/>
								</div>

								<CurrentlyBlock prefersReducedMotion={prefersReducedMotion} />
							</div>
						</m.div>
					</main>
				</div>

				<Dock
					onNavigate={handleNavigate}
					currentPage="About"
					className="py-3"
				/>

				{showProfile && (
					<ProfileLightbox onClose={() => setShowProfile(false)} />
				)}
			</div>
		</div>
	);
};
