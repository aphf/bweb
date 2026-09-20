import { adminCommands } from "./admin";
import { aiCommands } from "./ai";
import { filesystemCommands } from "./filesystem";
import { gitCommands } from "./git";
import { createHelpCommand } from "./help";
import { interactiveCommands } from "./interactive";
import { networkCommands } from "./network";
import { portfolioCommands } from "./portfolio";
import { systemCommands } from "./system";
import type { Command, CommandContext } from "./types";
import { xCommands } from "./x";

export type { Command, CommandContext };

export const commands: Record<string, Command> = {
	...systemCommands,
	...portfolioCommands,
	...xCommands,
	...gitCommands,
	...filesystemCommands,
	...networkCommands,
	...adminCommands,
	...aiCommands,
	...interactiveCommands,
};

// Inject help command with access to all registered commands
commands.help = createHelpCommand(() => commands);
