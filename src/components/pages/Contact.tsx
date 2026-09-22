import { DrawablyBadge, DrawablyToggle } from "drawably/react";
import {
	IconEnvelopeFill18,
	IconMsgWritingFill18,
	IconUserFill18,
} from "nucleo-ui-essential-fill-18";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import "drawably/style.css";
import {
	Popover,
	PopoverContent,
	PopoverTrigger,
} from "@/components/animate-ui/components/radix/popover";
import { LoaderCircle } from "@/components/animate-ui/icons/loader-circle";
import { Send } from "@/components/animate-ui/icons/send";
import { Button } from "@/components/animate-ui/primitives/buttons/button";
import { useSEO } from "../../hooks/useSEO";
import { useTheme } from "../../hooks/useTheme";
import { trackEvent } from "../../lib/analytics";
import { Dock } from "../Dock";
import { PageHeader } from "../PageHeader";
import { Checkbox } from "../ui/checkbox";
import { RadiantLines } from "../ui/radiant-lines";

export const Contact = () => {
	const navigate = useNavigate();
	const { theme, setTheme } = useTheme();
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

	useSEO({
		title: "Contact | Bahauddin Alam",
		description:
			"Get in touch with Bahauddin Alam. Available for new projects and collaborations.",
		url: "https://bahauddin.org/contact",
	});

	const [formData, setFormData] = useState({
		name: "",
		email: "",
		message: "",
	});
	const [status, setStatus] = useState<
		"idle" | "loading" | "success" | "error"
	>("idle");
	const submittingRef = useRef(false);
	const scrollRef = useRef<HTMLDivElement>(null);
	const boostRef = useRef(0);
	const decayTimerRef = useRef<number | null>(null);
	const [warpBoost, setWarpBoost] = useState(0);
	const [warpDir, setWarpDir] = useState<-1 | 1>(-1);

	useEffect(() => {
		return () => {
			if (decayTimerRef.current !== null) {
				window.clearInterval(decayTimerRef.current);
			}
		};
	}, []);

	const handleWheel = (e: React.WheelEvent) => {
		if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
			return;
		}
		const scroller = scrollRef.current;
		if (scroller && scroller.scrollHeight > scroller.clientHeight + 1) {
			return; // real scrolling already drives the warp
		}
		const delta = e.deltaY / 150;
		if (delta === 0) return;
		setWarpDir(delta > 0 ? 1 : -1);
		boostRef.current = Math.min(14, boostRef.current + Math.abs(delta));
		setWarpBoost(boostRef.current);
		if (decayTimerRef.current !== null) {
			window.clearInterval(decayTimerRef.current);
		}
		decayTimerRef.current = window.setInterval(() => {
			boostRef.current *= 0.85;
			if (Math.abs(boostRef.current) < 0.05) {
				boostRef.current = 0;
				if (decayTimerRef.current !== null) {
					window.clearInterval(decayTimerRef.current);
					decayTimerRef.current = null;
				}
			}
			setWarpBoost(boostRef.current);
		}, 50);
	};

	const handleSubmit = async (e: React.FormEvent) => {
		e.preventDefault();
		if (submittingRef.current || !isFormValid) return;
		submittingRef.current = true;
		setStatus("loading");

		try {
			const res = await fetch("/api/contact", {
				method: "POST",
				headers: { "Content-Type": "application/json" },
				body: JSON.stringify(formData),
			});

			if (!res.ok) {
				const err = await res.json();
				throw new Error(err.error || "Failed to send message");
			}

			setStatus("success");
			trackEvent("contact-submit", { status: "success" });
			setFormData({ name: "", email: "", message: "" });
			setTimeout(() => setStatus("idle"), 3000);
		} catch {
			setStatus("error");
			trackEvent("contact-submit", { status: "error" });
			setTimeout(() => setStatus("idle"), 3000);
		} finally {
			submittingRef.current = false;
		}
	};

	const isNameValid = formData.name.trim().length > 0;
	const isEmailValid = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(
		formData.email.trim(),
	);
	const messageWordCount = formData.message
		.trim()
		.split(/\s+/)
		.filter(Boolean).length;
	const isMessageValid = messageWordCount >= 3;

	const isFormValid = isNameValid && isEmailValid && isMessageValid;

	const startedRef = useRef(false);
	const trackStart = () => {
		if (startedRef.current) return;
		startedRef.current = true;
		trackEvent("contact-start");
	};

	const handleDrawablyToggle = () => {
		const next = theme === "dark" ? "light" : "dark";
		setTheme(next);
		trackEvent("toggle-theme", { to: next, source: "contact-drawably-toggle" });
	};

	const checks = [
		{ label: "Your name", done: isNameValid },
		{ label: "Valid email address", done: isEmailValid },
		{
			label: `Message at least 3 words (${messageWordCount}/3)`,
			done: isMessageValid,
		},
	];

	const showHint = !isFormValid && status !== "loading" && status !== "success";

	const canSubmit = isFormValid && status !== "loading" && status !== "success";

	const sendButton = (
		<Button
			type={canSubmit ? "submit" : "button"}
			disabled={status === "loading" || status === "success"}
			aria-disabled={!isFormValid}
			className={`font-bold py-1.5 px-4 rounded-sm transition-[background-color,border-color,color] duration-300 flex items-center justify-center gap-2 border text-sm outline-none focus-visible:ring-2 focus-visible:ring-elegant-accent ${
				status === "success"
					? "bg-linear-to-r from-violet-600 to-indigo-600 text-white border-transparent cursor-default shadow-md"
					: status === "error"
						? "bg-red-500 text-white hover:bg-red-600 border-transparent cursor-pointer"
						: isFormValid
							? "bg-elegant-accent hover:bg-elegant-accent-hover text-elegant-bg border-transparent cursor-pointer shadow-md"
							: "bg-elegant-card border-elegant-border text-elegant-text-secondary cursor-help hover:bg-elegant-card"
			}`}
		>
			{status === "loading" ? (
				<LoaderCircle size={16} animate aria-hidden="true" />
			) : (
				<Send
					size={16}
					animate={status === "success"}
					animateOnHover
					aria-hidden="true"
				/>
			)}
			{status === "loading"
				? "Sending…"
				: status === "success"
					? "Sent!"
					: status === "error"
						? "Failed to Send"
						: "Send"}
		</Button>
	);

	return (
		<div
			className="relative h-full w-full bg-elegant-bg text-elegant-text-secondary font-mono overflow-hidden"
			onWheel={handleWheel}
		>
			<RadiantLines
				containerRef={scrollRef}
				starCount={600}
				displacement={1 + warpBoost}
				direction={warpDir}
			/>
			<div className="relative z-10 h-full flex flex-col">
				<div
					ref={scrollRef}
					className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden"
				>
					<PageHeader
						currentPath="contact"
						onNavigate={handleNavigate}
						maxWidth="max-w-4xl"
					/>

					<main className="max-w-4xl mx-auto w-full px-4 sm:px-6 lg:px-8 pt-4 pb-28 lg:pt-8 lg:pb-32">
						<section
							className="max-w-2xl mx-auto w-full"
							aria-labelledby="contact-heading"
						>
							<div className="bg-elegant-card/40 border border-elegant-border rounded-sm p-6 shadow-2xl">
								<div className="mb-6">
									<h1
										id="contact-heading"
										className="text-xl font-bold text-elegant-text-primary text-balance"
									>
										Say Hello
									</h1>
									<p className="mt-1.5 text-sm text-elegant-text-secondary">
										I’ll usually get back to you within a day or two.
									</p>
								</div>

								<form
									onSubmit={handleSubmit}
									onFocus={trackStart}
									onChange={trackStart}
									className="space-y-4"
									aria-label="Contact form"
								>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div>
											<label
												htmlFor="name"
												className="block text-xs text-elegant-text-secondary mb-1.5"
											>
												Name
											</label>
											<div className="relative">
												<IconUserFill18
													size={16}
													className="absolute left-3 top-1/2 -translate-y-1/2 text-elegant-text-muted pointer-events-none"
													aria-hidden="true"
												/>
												<input
													id="name"
													name="name"
													type="text"
													required
													autoComplete="name"
													value={formData.name}
													onChange={(e) =>
														setFormData((prev) => ({
															...prev,
															name: e.target.value,
														}))
													}
													className="w-full bg-elegant-bg/50 border border-elegant-border rounded-sm pl-10 pr-3 py-2.5 text-sm text-elegant-text-primary outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-[box-shadow,border-color] placeholder-elegant-text-muted"
													placeholder="Enter your name"
												/>
											</div>
										</div>

										<div>
											<label
												htmlFor="email"
												className="block text-xs text-elegant-text-secondary mb-1.5"
											>
												Email
											</label>
											<div className="relative">
												<IconEnvelopeFill18
													size={16}
													className="absolute left-3 top-1/2 -translate-y-1/2 text-elegant-text-muted pointer-events-none"
													aria-hidden="true"
												/>
												<input
													id="email"
													name="email"
													type="email"
													required
													autoComplete="email"
													spellCheck={false}
													value={formData.email}
													onChange={(e) =>
														setFormData((prev) => ({
															...prev,
															email: e.target.value,
														}))
													}
													className="w-full bg-elegant-bg/50 border border-elegant-border rounded-sm pl-10 pr-3 py-2.5 text-sm text-elegant-text-primary outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-[box-shadow,border-color] placeholder-elegant-text-muted"
													placeholder="your.email@example.com"
												/>
											</div>
										</div>
									</div>

									<div>
										<label
											htmlFor="message"
											className="block text-xs text-elegant-text-secondary mb-1.5"
										>
											Message
										</label>
										<div className="relative">
											<IconMsgWritingFill18
												size={16}
												className="absolute left-3 top-3 text-elegant-text-muted pointer-events-none"
												aria-hidden="true"
											/>
											<textarea
												id="message"
												name="message"
												required
												value={formData.message}
												onChange={(e) =>
													setFormData((prev) => ({
														...prev,
														message: e.target.value,
													}))
												}
												rows={5}
												className="w-full bg-elegant-bg/50 border border-elegant-border rounded-sm pl-10 pr-3 py-2.5 text-sm text-elegant-text-primary outline-none focus-visible:ring-1 focus-visible:ring-blue-500 focus-visible:border-blue-500 transition-[box-shadow,border-color] resize-none placeholder-elegant-text-muted"
												placeholder="Write your message here…"
											/>
										</div>
									</div>

									<div
										aria-live="polite"
										className="flex items-center justify-end gap-3"
									>
										{showHint ? (
											<Popover>
												<PopoverTrigger asChild>{sendButton}</PopoverTrigger>
												<PopoverContent
													side="bottom"
													align="center"
													className="w-72 rounded-xl border border-elegant-border bg-elegant-card/95 p-3.5 font-mono text-sm text-elegant-text-primary shadow-2xl backdrop-blur-md outline-none"
												>
													<p className="text-xs text-elegant-text-secondary">
														Please make sure you have entered these:
													</p>
													<ul className="mt-2.5 space-y-1.5">
														{checks.map((check) => (
															<li
																key={check.label}
																className="flex items-center gap-2 text-xs"
															>
																<Checkbox
																	checked={check.done}
																	disabled
																	aria-hidden="true"
																/>
																<span
																	className={
																		check.done
																			? "text-elegant-text-muted line-through"
																			: "text-elegant-text-primary"
																	}
																>
																	{check.label}
																	<span className="sr-only">
																		{check.done ? " (done)" : " (missing)"}
																	</span>
																</span>
															</li>
														))}
													</ul>
												</PopoverContent>
											</Popover>
										) : (
											sendButton
										)}
									</div>
								</form>
							</div>

							<p className="mt-8 text-center text-xs text-elegant-text-muted">
								<DrawablyBadge
									key={theme}
									seed={1760748534}
									roughness={0.3}
									boil={0.8}
									stroke="#6d4bd6"
									className="leading-loose"
									style={{ padding: "10px 20px" }}
								>
									scroll to travel through space
									{theme !== "dark" && (
										<>
											<br />
											<span className="inline-flex items-center gap-1.5">
												best viewed in dark mode
												<DrawablyToggle
													seed={1637470322}
													roughness={0.4}
													boil={0.6}
													stroke="#6d4bd6"
													checked={false}
													onChange={handleDrawablyToggle}
													aria-label="Switch to dark mode"
												/>
											</span>
										</>
									)}
								</DrawablyBadge>
							</p>
						</section>
					</main>
				</div>

				<Dock
					onNavigate={handleNavigate}
					currentPage="Contact"
					className="py-3"
				/>
			</div>
		</div>
	);
};
