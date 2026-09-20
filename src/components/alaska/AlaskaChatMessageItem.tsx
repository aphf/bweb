import { m } from "motion/react";
import { IconImageMountainFill18 } from "nucleo-ui-essential-fill-18";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import LoadingState from "../LoadingState";

export interface ChatMessage {
	id: string;
	role: "user" | "assistant";
	content: string;
	timestamp: number;
	isStreaming?: boolean;
}

export function AlaskaChatMessageItem({ msg }: { msg: ChatMessage }) {
	return (
		<m.div
			key={msg.id}
			initial={{ opacity: 0, y: 16, scale: 0.96 }}
			animate={{ opacity: 1, y: 0, scale: 1 }}
			transition={{
				type: "spring",
				stiffness: 420,
				damping: 26,
				mass: 0.8,
			}}
			className={`flex flex-col ${
				msg.role === "user" ? "items-end" : "items-start"
			}`}
		>
			<div className="flex items-center gap-1 mb-1 text-[10px] text-elegant-text-muted px-1">
				{msg.role === "user" ? (
					<span>You</span>
				) : (
					<span className="flex items-center gap-1 font-semibold text-elegant-text-primary">
						<IconImageMountainFill18 size={12} /> Alaska
					</span>
				)}
			</div>

			<div
				className={`max-w-[88%] rounded-2xl px-3.5 py-2.5 text-xs leading-relaxed ${
					msg.role === "user"
						? "bg-elegant-text-primary text-elegant-bg rounded-tr-none font-sans font-medium shadow-md"
						: "bg-elegant-bg/90 border border-elegant-border text-elegant-text-primary rounded-tl-none font-sans"
				}`}
			>
				{msg.role === "assistant" ? (
					<div className="prose prose-xs max-w-none wrap-break-word text-elegant-text-primary">
						{msg.isStreaming && !msg.content ? (
							<LoadingState label="Thinking…" variant="Orbit" />
						) : (
							<>
								<ReactMarkdown
									remarkPlugins={[remarkGfm]}
									components={{
										a: ({ href, children }) => (
											<a
												href={href}
												target="_blank"
												rel="noopener noreferrer"
												className="text-elegant-accent underline font-semibold hover:opacity-80"
											>
												{children}
											</a>
										),
									}}
								>
									{msg.content}
								</ReactMarkdown>
								{msg.isStreaming && (
									<div className="mt-2 pt-1 border-t border-elegant-border/30">
										<LoadingState label="Streaming…" variant="Drive" />
									</div>
								)}
							</>
						)}
					</div>
				) : (
					<div className="whitespace-pre-wrap wrap-break-word">
						{msg.content}
					</div>
				)}
			</div>
		</m.div>
	);
}
