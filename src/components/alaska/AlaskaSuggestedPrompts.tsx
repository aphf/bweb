import { m } from "motion/react";
import { IconLightbulb3Fill18 } from "nucleo-ui-essential-fill-18";
import { trackEvent } from "../../lib/analytics";

const SUGGESTED_PROMPTS = [
	"What are Bahauddin's top skills?",
	"Tell me about Neosphere OS",
	"Show me Bahauddin's projects",
];

export function AlaskaSuggestedPrompts({
	onSelect,
}: {
	onSelect: (promptText: string) => void;
}) {
	return (
		<m.div
			initial={{ opacity: 0, y: 10 }}
			animate={{ opacity: 1, y: 0 }}
			transition={{ delay: 0.15 }}
			className="pt-2 space-y-1.5"
		>
			<div className="text-[10px] text-elegant-text-muted px-1">
				Suggested Prompts:
			</div>
			<div className="flex flex-wrap gap-1.5">
				{SUGGESTED_PROMPTS.map((promptText, idx) => (
					<button
						key={promptText}
						type="button"
						onClick={() => {
							trackEvent("alaska-suggested-click", { index: idx });
							onSelect(promptText);
						}}
						className="flex items-center text-left text-[11px] font-sans px-2.5 py-1.5 rounded-xl bg-elegant-bg border border-elegant-border hover:border-elegant-text-primary text-elegant-text-secondary hover:text-elegant-text-primary transition-[border-color,color,transform] duration-150 cursor-pointer active:scale-95 gap-1.5"
					>
						<IconLightbulb3Fill18
							size={13}
							className="text-elegant-text-primary shrink-0"
						/>
						<span>{promptText}</span>
					</button>
				))}
			</div>
		</m.div>
	);
}
