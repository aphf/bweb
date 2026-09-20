import type { Command } from "./types";

export const createHelpCommand = (
	getAllCommands: () => Record<string, Command>,
): Command => ({
	description: "List all available commands",
	execute: (_args, context) => {
		const hiddenCommands = ["login", "inbox", "alerts", "admin", "logout"];
		const all = getAllCommands();
		const visibleCmds = new Set([
			...Object.keys(all).filter((cmd) => {
				if (hiddenCommands.includes(cmd)) return false;
				const desc = all[cmd]?.description?.toLowerCase() || "";
				if (desc.startsWith("alias for") || desc.includes("alias"))
					return false;
				return true;
			}),
			"cd",
		]);

		const commandList = Array.from(visibleCmds).sort().join(", ");

		return (
			<div className="font-mono text-sm leading-relaxed">
				<div>Available commands: {commandList}</div>
				{context?.user === "root" && (
					<div className="text-elegant-text-muted text-xs mt-1">
						Type 'admin' for administrative tools. (Tab to autocomplete)
					</div>
				)}
			</div>
		);
	},
});
