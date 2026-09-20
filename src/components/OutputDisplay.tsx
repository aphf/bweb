import React from "react";
import type { TerminalOutput } from "../hooks/useTerminal";
import { Typewriter } from "./Typewriter";

interface OutputDisplayProps {
	history: TerminalOutput[];
}

const HistoryItem = React.memo(({ entry }: { entry: TerminalOutput }) => (
	<div className="mb-2">
		{entry.command && (
			<div className="flex flex-wrap">
				<span className="text-elegant-accent mr-2">
					{entry.user}@neosphere:{entry.path}$
				</span>
				<span className="whitespace-pre-wrap break-all">
					{(() => {
						const parts = entry.command.split(" ");
						const cmd = parts[0];
						const args = parts.slice(1).join(" ");
						return (
							<>
								<span className="text-elegant-text-primary">{cmd}</span>
								{args && (
									<span className="text-elegant-text-secondary"> {args}</span>
								)}
							</>
						);
					})()}
				</span>
			</div>
		)}
		<div className="whitespace-pre-wrap wrap-break-word text-elegant-text-primary">
			{typeof entry.response === "string" ? (
				entry.response.length > 50 ? (
					<Typewriter text={entry.response} speed={10} />
				) : (
					entry.response
				)
			) : (
				entry.response
			)}
		</div>
	</div>
));

export const OutputDisplay = ({ history }: OutputDisplayProps) => {
	return (
		<div className="flex flex-col space-y-2 mb-2">
			{history.map((entry) => (
				<HistoryItem key={entry.id} entry={entry} />
			))}
		</div>
	);
};
