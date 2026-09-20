import { useState } from "react";

export interface InboxMessage {
	id: number;
	name: string;
	email: string;
	message: string;
	timestamp: string;
}

interface InboxMessageItemProps {
	msg: InboxMessage;
}

export const InboxMessageItem = ({ msg }: InboxMessageItemProps) => {
	const [copied, setCopied] = useState(false);

	const handleCopyId = (e: React.MouseEvent) => {
		e.stopPropagation();
		navigator.clipboard.writeText(msg.id.toString());
		setCopied(true);
		setTimeout(() => setCopied(false), 2000);
	};

	return (
		<div className="bg-white/5 p-3 rounded border border-white/10 group relative hover:bg-white/10 transition-colors">
			<div className="flex justify-between items-start mb-2">
				<div className="flex flex-col">
					<span className="text-elegant-text-primary font-bold">
						{msg.name}
					</span>
					<span className="text-elegant-text-muted text-xs">{msg.email}</span>
				</div>
				<div className="flex flex-col items-end">
					<span className="text-elegant-text-muted text-xs">
						{new Date(msg.timestamp).toLocaleString()}
					</span>
					<button
						type="button"
						onClick={handleCopyId}
						className={`text-xs transition-[color,opacity] duration-200 flex items-center gap-1 ${copied ? "text-green-400 opacity-100" : "text-elegant-text-muted opacity-0 group-hover:opacity-100 hover:text-elegant-accent"}`}
						title="Click to copy ID"
					>
						{copied ? "Copied!" : `ID: ${msg.id}`}
					</button>
				</div>
			</div>
			<div className="text-elegant-text-secondary whitespace-pre-wrap">
				{msg.message}
			</div>
		</div>
	);
};
