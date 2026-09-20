import {
	IconEnvelopeFill18,
	IconMsgWritingFill18,
	IconPaperPlane2Fill18,
	IconUserFill18,
} from "nucleo-ui-essential-fill-18";
import type React from "react";
import { useRef, useState } from "react";
import { useNavigate } from "react-router";
import { useSEO } from "../../hooks/useSEO";
import { Dock } from "../Dock";
import { PageHeader } from "../PageHeader";

export const Contact = () => {
	const navigate = useNavigate();
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
			setFormData({ name: "", email: "", message: "" });
			setTimeout(() => setStatus("idle"), 3000);
		} catch {
			setStatus("error");
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

	return (
		<div className="h-full w-full bg-elegant-bg text-elegant-text-secondary font-mono overflow-hidden">
			<div className="h-full flex flex-col">
				<div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden">
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
							<div className="bg-elegant-card border border-elegant-border rounded-sm p-6 shadow-2xl">
								<div className="flex items-center gap-3 mb-6">
									<IconPaperPlane2Fill18
										className="text-elegant-text-muted"
										size={20}
										aria-hidden="true"
									/>
									<h1
										id="contact-heading"
										className="text-xl font-bold text-elegant-text-primary text-balance"
									>
										Send Message
									</h1>
								</div>

								<form
									onSubmit={handleSubmit}
									className="space-y-4"
									aria-label="Contact form"
								>
									<div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
										<div>
											<label
												htmlFor="name"
												className="block text-xs text-elegant-text-secondary mb-1.5"
											>
												Name{" "}
												<span
													className="text-elegant-accent"
													aria-hidden="true"
												>
													*
												</span>
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
													className="w-full bg-elegant-bg border border-elegant-border rounded-sm pl-10 pr-3 py-2.5 text-sm text-elegant-text-primary outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent focus-visible:border-elegant-accent transition-colors placeholder-elegant-text-muted"
													placeholder="Enter your name"
												/>
											</div>
										</div>

										<div>
											<label
												htmlFor="email"
												className="block text-xs text-elegant-text-secondary mb-1.5"
											>
												Email{" "}
												<span
													className="text-elegant-accent"
													aria-hidden="true"
												>
													*
												</span>
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
													className="w-full bg-elegant-bg border border-elegant-border rounded-sm pl-10 pr-3 py-2.5 text-sm text-elegant-text-primary outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent focus-visible:border-elegant-accent transition-colors placeholder-elegant-text-muted"
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
											Message{" "}
											<span className="text-elegant-accent" aria-hidden="true">
												*
											</span>
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
												className="w-full bg-elegant-bg border border-elegant-border rounded-sm pl-10 pr-3 py-2.5 text-sm text-elegant-text-primary outline-none focus-visible:ring-1 focus-visible:ring-elegant-accent focus-visible:border-elegant-accent transition-colors resize-none placeholder-elegant-text-muted"
												placeholder="Write your message here…"
											/>
										</div>
									</div>

									<div aria-live="polite">
										<button
											type="submit"
											disabled={
												status === "loading" ||
												status === "success" ||
												!isFormValid
											}
											className={`w-full font-bold py-2.5 px-6 rounded-sm transition-[transform,background-color,border-color,color] duration-300 flex items-center justify-center gap-2 border text-sm outline-none focus-visible:ring-2 focus-visible:ring-elegant-accent ${
												status === "success"
													? "bg-green-500 text-white hover:bg-green-600 border-transparent cursor-default"
													: status === "error"
														? "bg-red-500 text-white hover:bg-red-600 border-transparent cursor-pointer"
														: isFormValid
															? "bg-elegant-accent hover:bg-elegant-accent-hover text-elegant-bg border-transparent cursor-pointer shadow-md active:scale-[0.99]"
															: "bg-elegant-card border-elegant-border text-elegant-text-muted/50 cursor-not-allowed opacity-40 hover:bg-elegant-card"
											}`}
										>
											<IconPaperPlane2Fill18
												size={16}
												className={status === "loading" ? "animate-pulse" : ""}
												aria-hidden="true"
											/>
											{status === "loading"
												? "Sending…"
												: status === "success"
													? "Message Sent!"
													: status === "error"
														? "Failed to Send"
														: "Send Message"}
										</button>
									</div>
								</form>
							</div>
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
