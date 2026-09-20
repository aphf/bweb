import { IconImageMountainFill18 } from "nucleo-ui-essential-fill-18";
import { AiCommandOutput } from "../../components/terminal/AiCommandOutput";
import type { Command } from "./types";

export const aiCommands: Record<string, Command> = {
	ai: {
		description: "Ask Alaska an intelligence prompt (-i opens GUI)",
		usage: "ai [-i] <your question>",
		execute: (args, { entryId, updateHistory }) => {
			if (
				args.includes("-i") ||
				args.includes("--interactive") ||
				args.includes("-g") ||
				args.includes("--gui")
			) {
				if (typeof window !== "undefined") {
					window.dispatchEvent(new CustomEvent("open-alaska"));
				}
				return "Launching Alaska AI Assistant GUI...";
			}

			const prompt = args.join(" ").trim();
			if (!prompt) {
				return (
					<div className="flex flex-col gap-1 text-sm font-mono max-w-lg py-1">
						<div className="text-elegant-text-primary font-bold flex items-center gap-1.5">
							<IconImageMountainFill18 size={16} /> Alaska Assistant
						</div>
						<div className="text-xs text-elegant-text-secondary">
							Ask questions about Bahauddin Alam, tech stack, or general
							developer queries.
						</div>
						<div className="text-xs text-elegant-text-primary pl-2 mt-1">
							Usage:{" "}
							<span className="text-elegant-accent font-bold">
								ai &lt;question&gt;
							</span>{" "}
							or <span className="text-elegant-accent font-bold">ai -i</span>{" "}
							(opens GUI window)
						</div>
						<div className="text-xs text-elegant-text-muted pl-2">
							Example: ai What are Bahauddin's top skills?
						</div>
					</div>
				);
			}

			return (
				<AiCommandOutput
					prompt={prompt}
					entryId={entryId}
					updateHistory={updateHistory}
				/>
			);
		},
	},
	ask: {
		description: "Alias for ai (-i opens GUI)",
		usage: "ask [-i] <your question>",
		execute: (args, context) => aiCommands.ai.execute(args, context),
	},
	alaska: {
		description: "Launch Alaska AI GUI or ask a prompt",
		usage: "alaska [-i] [question]",
		execute: (args, context) => {
			if (
				args.length === 0 ||
				args.includes("-i") ||
				args.includes("--interactive") ||
				args.includes("-g") ||
				args.includes("--gui")
			) {
				if (typeof window !== "undefined") {
					window.dispatchEvent(new CustomEvent("open-alaska"));
				}
				return "Launching Alaska AI Assistant GUI...";
			}
			return aiCommands.ai.execute(args, context);
		},
	},
};
