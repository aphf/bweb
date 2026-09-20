import type React from "react";
import type { FileSystemNode } from "../fileSystem";

export interface CommandContext {
	currentPath: string[];
	fileSystem: Record<string, FileSystemNode>;
	user: string;
	setUser?: (user: string) => void;
	setFileSystem?: (
		updater:
			| ((
					prev: Record<string, FileSystemNode>,
			  ) => Record<string, FileSystemNode>)
			| Record<string, FileSystemNode>,
	) => void;
	navigate?: (path: string) => void;
	setFullScreen?: (component: React.ReactNode | null) => void;
	setIsInputVisible: (visible: boolean) => void;
	addToHistory?: (command: string, output: string | React.ReactNode) => void;
	updateHistory?: (id: string, output: string | React.ReactNode) => void;
	closeTerminal?: () => void;
	clearHistory?: () => void;
	resetTerminal?: () => void;
	entryId?: string;
	inputHistory?: string[];
}

export interface Command {
	description: string;
	usage?: string;
	execute: (
		args: string[],
		context: CommandContext,
	) => string | React.ReactNode | Promise<string | React.ReactNode>;
}
