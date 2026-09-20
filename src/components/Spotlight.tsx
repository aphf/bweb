import { AnimatePresence, m } from "motion/react";
import { IconWindowCode2 } from "nucleo-micro-bold-essential";
import {
	IconDarkLightFill18,
	IconEnvelopeFill18,
	IconFileContentFill18,
	IconFolderOpenFill18,
	IconHouse2Fill18,
	IconImageMountainFill18,
	IconImages2Fill18,
	IconMagnifierFaceWorriedFill18,
	IconMagnifierFill18,
	IconUserFill18,
} from "nucleo-ui-essential-fill-18";
import type React from "react";
import {
	useCallback,
	useEffect,
	useEffectEvent,
	useRef,
	useState,
} from "react";
import { useNavigate } from "react-router";
import { useTheme } from "../hooks/useTheme";

const DolphinIcon = () => (
	<img
		src="/assets/dolphin.svg"
		alt="Dolphin"
		className="size-4.5 select-none"
		draggable={false}
	/>
);

interface SpotlightOption {
	name: string;
	icon: React.ReactNode;
	keywords?: string;
}

const SPOTLIGHT_OPTIONS: SpotlightOption[] = [
	{
		name: "Home",
		icon: <IconHouse2Fill18 size={18} />,
		keywords: "home desktop start",
	},
	{
		name: "Terminal",
		icon: <IconWindowCode2 size={18} />,
		keywords: "terminal console cli bash shell",
	},
	{
		name: "Dolphin",
		icon: <DolphinIcon />,
		keywords: "dolphin file manager files explorer storage",
	},
	{
		name: "Alaska",
		icon: <IconImageMountainFill18 size={18} />,
		keywords: "alaska ai assistant chat intelligence ask",
	},
	{
		name: "Gallery",
		icon: <IconImages2Fill18 size={18} />,
		keywords: "gallery photos screenshots images pictures",
	},
	{
		name: "Projects",
		icon: <IconFolderOpenFill18 size={18} />,
		keywords: "projects work portfolio code github",
	},
	{
		name: "Notes",
		icon: <IconFileContentFill18 size={18} />,
		keywords: "notes guestbook visitors thoughts blog",
	},
	{
		name: "About",
		icon: <IconUserFill18 size={18} />,
		keywords: "about biography bahauddin profile skills info",
	},
	{
		name: "Contact",
		icon: <IconEnvelopeFill18 size={18} />,
		keywords: "contact email message get in touch reach",
	},
	{
		name: "Toggle Theme",
		icon: <IconDarkLightFill18 size={18} />,
		keywords: "toggle theme dark light mode switch",
	},
];

interface SpotlightProps {
	isOpen?: boolean;
	onClose?: () => void;
}

export const Spotlight = ({
	isOpen: controlledIsOpen,
	onClose,
}: SpotlightProps = {}) => {
	const [localIsOpen, setLocalIsOpen] = useState(false);
	const isOpen =
		controlledIsOpen !== undefined ? controlledIsOpen : localIsOpen;

	const [query, setQuery] = useState("");
	const [selectedIndex, setSelectedIndex] = useState(0);
	const inputRef = useRef<HTMLInputElement>(null);
	const listRef = useRef<HTMLDivElement>(null);
	const navigate = useNavigate();
	const { toggleTheme } = useTheme();

	const filtered = SPOTLIGHT_OPTIONS.filter((o) => {
		const q = query.toLowerCase().trim();
		if (!q) return true;
		return (
			o.name.toLowerCase().includes(q) ||
			(o.keywords?.toLowerCase().includes(q) ?? false)
		);
	});

	const closeSpotlight = useCallback(() => {
		if (onClose) {
			onClose();
		} else {
			setLocalIsOpen(false);
		}
		setQuery("");
	}, [onClose]);

	const openSpotlight = useCallback(() => {
		setLocalIsOpen(true);
		setSelectedIndex(0);
	}, []);

	const handleSelect = useCallback(
		(dest: string) => {
			closeSpotlight();
			requestAnimationFrame(() => {
				if (dest === "Toggle Theme") {
					toggleTheme();
				} else if (dest === "Terminal") {
					navigate("/");
					window.dispatchEvent(new CustomEvent("open-terminal"));
				} else if (dest === "Dolphin" || dest.startsWith("File")) {
					navigate("/");
					window.dispatchEvent(new CustomEvent("open-filemanager"));
				} else if (dest === "Alaska") {
					navigate("/");
					window.dispatchEvent(new CustomEvent("open-alaska"));
				} else if (dest === "Home") {
					navigate("/");
				} else {
					navigate(`/${dest.toLowerCase()}`);
				}
			});
		},
		[navigate, toggleTheme, closeSpotlight],
	);

	const handleKeyDown = useEffectEvent((e: KeyboardEvent) => {
		if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
			e.preventDefault();
			if (isOpen) {
				closeSpotlight();
			} else {
				openSpotlight();
			}
			return;
		}

		if (isOpen) {
			if (e.key === "Escape") {
				e.preventDefault();
				closeSpotlight();
			} else if (e.key === "ArrowDown") {
				e.preventDefault();
				setSelectedIndex((prev) => (prev + 1) % filtered.length);
			} else if (e.key === "ArrowUp") {
				e.preventDefault();
				setSelectedIndex(
					(prev) => (prev - 1 + filtered.length) % filtered.length,
				);
			} else if (e.key === "Enter") {
				e.preventDefault();
				if (filtered.length > 0) {
					handleSelect(filtered[selectedIndex].name);
				}
			}
		}
	});

	useEffect(() => {
		window.addEventListener("keydown", handleKeyDown);
		return () => window.removeEventListener("keydown", handleKeyDown);
	}, []);

	useEffect(() => {
		if (isOpen && inputRef.current) {
			inputRef.current.focus();
		}
	}, [isOpen]);

	useEffect(() => {
		if (listRef.current && isOpen) {
			const selectedElement = listRef.current.children[
				selectedIndex
			] as HTMLElement;
			if (selectedElement) {
				selectedElement.scrollIntoView({ block: "nearest" });
			}
		}
	}, [selectedIndex, isOpen]);

	return (
		<AnimatePresence>
			{isOpen && (
				<m.div
					role="dialog"
					aria-modal="true"
					aria-label="Navigation Spotlight"
					className="fixed inset-0 bg-black/60 backdrop-blur-sm z-100 flex items-center justify-center font-mono p-4"
					onClick={closeSpotlight}
					initial={{ opacity: 0 }}
					animate={{ opacity: 1 }}
					exit={{ opacity: 0 }}
					transition={{ duration: 0.15 }}
				>
					<m.div
						className="w-full max-w-xl bg-elegant-card/95 backdrop-blur-2xl border border-elegant-border rounded-2xl shadow-2xl overflow-hidden flex flex-col box-border"
						onClick={(e: React.MouseEvent) => e.stopPropagation()}
						initial={{ opacity: 0, scale: 0.96, y: -10 }}
						animate={{ opacity: 1, scale: 1, y: 0 }}
						exit={{ opacity: 0, scale: 0.96, y: -10 }}
						transition={{ type: "spring", bounce: 0, duration: 0.3 }}
					>
						<div className="flex items-center p-4 border-b border-elegant-border focus-within:border-elegant-accent transition-colors">
							<IconMagnifierFill18
								className="text-elegant-text-muted mr-3 pointer-events-none"
								size={20}
								aria-hidden="true"
							/>
							<input
								ref={inputRef}
								type="text"
								aria-label="Search pages"
								className="bg-transparent border-none outline-none text-elegant-text-primary text-xl grow placeholder-elegant-text-muted font-normal"
								placeholder="Where to?…"
								value={query}
								onChange={(e: React.ChangeEvent<HTMLInputElement>) => {
									setQuery(e.target.value);
									setSelectedIndex(0);
								}}
							/>
							<div
								className="text-xs text-elegant-text-muted border border-elegant-border rounded px-2 py-1 ml-2 hidden sm:block select-none"
								aria-hidden="true"
							>
								ESC
							</div>
						</div>
						<div
							ref={listRef}
							role="listbox"
							aria-label="Navigation destinations"
							className="max-h-[60vh] sm:max-h-75 overflow-y-auto py-2"
						>
							{filtered.map((opt, i) => (
								<button
									type="button"
									role="option"
									aria-selected={i === selectedIndex}
									key={opt.name}
									className={`w-full text-left px-4 py-3 flex items-center transition-colors outline-none focus-visible:bg-elegant-accent/15
                                        ${i === selectedIndex ? "bg-elegant-accent/10 text-elegant-text-primary" : "text-elegant-text-secondary hover:bg-elegant-accent/5"}
                                    `}
									onClick={(e: React.MouseEvent) => {
										e.preventDefault();
										e.stopPropagation();
										handleSelect(opt.name);
									}}
									onMouseEnter={() => setSelectedIndex(i)}
								>
									<span
										className={`mr-3 ${i === selectedIndex ? "text-elegant-accent" : "text-elegant-text-muted"}`}
										aria-hidden="true"
									>
										{opt.icon}
									</span>
									<span className="text-lg">{opt.name}</span>
									{i === selectedIndex && (
										<span
											className="ml-auto text-xs text-elegant-accent hidden sm:block"
											aria-hidden="true"
										>
											Jump to
										</span>
									)}
								</button>
							))}
							{filtered.length === 0 && (
								<div
									className="p-8 text-elegant-text-muted text-center flex flex-col items-center gap-2"
									role="status"
								>
									<IconMagnifierFaceWorriedFill18
										size={32}
										className="opacity-20"
										aria-hidden="true"
									/>
									<span>No results found</span>
								</div>
							)}
						</div>
					</m.div>
				</m.div>
			)}
		</AnimatePresence>
	);
};
