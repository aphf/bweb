import {
	useCallback,
	useEffect,
	useLayoutEffect,
	useRef,
	useState,
} from "react";
import { useNavigate } from "react-router";
import { trackEvent } from "../lib/analytics";
import { commands } from "../utils/commands";
import { resolvePath, resolvePathArray } from "../utils/fileSystemUtils";
import {
	type TerminalOutput,
	useCommandHistory,
} from "./terminal/useCommandHistory";
import { useFileSystem } from "./terminal/useFileSystem";
import { useTerminalUser } from "./terminal/useTerminalUser";

export type { TerminalOutput };

export interface UseTerminalOptions {
	onClose?: () => void;
}

export const useTerminal = (options?: UseTerminalOptions) => {
	const { user, setUser } = useTerminalUser();
	const {
		fileSystem,
		setFileSystem,
		currentPath,
		setCurrentPath,
		getPromptPath,
	} = useFileSystem();
	const {
		history,
		setHistory,
		addToHistory,
		updateHistory,
		clearHistory,
		inputHistory,
		setInputHistory,
	} = useCommandHistory(user, getPromptPath);

	const [activeComponent, setActiveComponent] =
		useState<React.ReactNode | null>(null);
	const [isInputVisible, setIsInputVisible] = useState(true);

	const navigate = useNavigate();
	const initializedRef = useRef(false);
	const executeRef = useRef<
		(commandStr: string, isInitialLoad?: boolean) => Promise<void>
	>(async () => {});

	const execute = useCallback(
		async (commandStr: string, isInitialLoad = false) => {
			const trimmed = commandStr.trim();
			if (!trimmed) {
				if (!isInitialLoad) addToHistory(trimmed, "");
				return;
			}

			if (!isInitialLoad) {
				setInputHistory((prev) => [...prev, trimmed]);
				const cmdBucket =
					trimmed.split(" ")[0]?.toLowerCase().slice(0, 30) || "unknown";
				trackEvent("terminal-command", { command: cmdBucket });
			}

			const [cmdName, ...args] = trimmed.split(" ");

			if (cmdName === "clear") {
				clearHistory();
				return;
			}

			if (cmdName === "cd") {
				if (args.length === 0) {
					setCurrentPath(["home", "neo"]);
					addToHistory(trimmed, "");
				} else {
					const dest = args[0];
					const node = resolvePath(fileSystem, currentPath, dest);

					if (!node) {
						addToHistory(trimmed, `cd: no such file or directory: ${dest}`);
					} else if (node.type !== "directory") {
						addToHistory(trimmed, `cd: not a directory: ${dest}`);
					} else {
						const newPath = resolvePathArray(currentPath, dest);
						setCurrentPath(newPath);
						addToHistory(trimmed, "");
					}
				}
				return;
			}

			const cmdKey = cmdName.toLowerCase() === "help" ? "help" : cmdName;
			const cmd = commands[cmdKey];
			if (cmd) {
				const entryId = Math.random().toString(36).substring(2, 11);
				try {
					const context = {
						currentPath,
						navigate,
						setFullScreen: setActiveComponent,
						setIsInputVisible,
						fileSystem,
						setFileSystem,
						user,
						setUser,
						closeTerminal: options?.onClose,
						clearHistory,
						updateHistory,
						entryId,
						inputHistory,
						resetTerminal: () => {
							setHistory([
								{
									id: "welcome",
									command: "",
									response:
										'Welcome to Neosphere v3.0. Type "help" to start. (Tab to autocomplete)',
									path: "~",
									user: "neo",
								},
							]);
						},
					};
					const result = await cmd.execute(args, context);

					if (result) {
						let historyCommand = trimmed;
						if (cmdName === "login" && args.length > 0) {
							historyCommand = "login *********";
						}
						addToHistory(historyCommand, result, entryId);
					}
				} catch (e: unknown) {
					let historyCommand = trimmed;
					if (cmdName === "login" && args.length > 0) {
						historyCommand = "login *********";
					}
					addToHistory(
						historyCommand,
						`Error executing ${cmdName}: ${e instanceof Error ? e.message : String(e)}`,
						entryId,
					);
				}
			} else {
				addToHistory(trimmed, `${cmdName}: command not found`);
			}
		},
		[
			addToHistory,
			clearHistory,
			currentPath,
			fileSystem,
			inputHistory,
			navigate,
			options?.onClose,
			setHistory,
			setInputHistory,
			setCurrentPath,
			setFileSystem,
			updateHistory,
			user,
			setUser,
		],
	);

	useEffect(() => {
		executeRef.current = execute;
	});

	useLayoutEffect(() => {
		if (initializedRef.current) return;
		initializedRef.current = true;

		const params = new URLSearchParams(window.location.search);
		const dir = params.get("dir");
		if (dir) {
			executeRef.current(`cd ${dir}`, true);
			window.history.replaceState({}, "", window.location.pathname);
		}
	}, []);

	const handleTabCompletion = (input: string): string => {
		if (!input) return "";
		const [cmd, ...args] = input.split(" ");

		if (args.length === 0 && !input.endsWith(" ")) {
			const allCmds = Array.from(new Set([...Object.keys(commands), "cd"]));
			const matches = allCmds.filter((c) =>
				c.toLowerCase().startsWith(cmd.toLowerCase()),
			);
			if (matches.length === 1) return `${matches[0]} `;
			return input;
		}

		const fileCmds = [
			"cd",
			"cat",
			"ls",
			"nano",
			"share",
			"rm",
			"head",
			"tail",
			"cp",
			"mv",
			"touch",
			"mkdir",
			"tree",
			"base64",
		];

		if (fileCmds.includes(cmd)) {
			const partialPath = args[args.length - 1] || "";
			let parentDir = ".";
			let prefix = "";
			let searchPrefix = partialPath;

			const lastSlash = partialPath.lastIndexOf("/");
			if (lastSlash !== -1) {
				parentDir = partialPath.substring(0, lastSlash) || "/";
				prefix = partialPath.substring(0, lastSlash + 1);
				searchPrefix = partialPath.substring(lastSlash + 1);
			}

			const node = resolvePath(fileSystem, currentPath, parentDir);

			if (node && node.type === "directory" && node.children) {
				const candidates = Object.keys(node.children);
				const matches = candidates.filter((c) => c.startsWith(searchPrefix));

				if (matches.length === 1) {
					const matchedName = matches[0];
					const isDir = node.children[matchedName]?.type === "directory";
					const completed = `${prefix}${matchedName}${isDir ? "/" : ""}`;
					const newArgs = [...args];
					newArgs[newArgs.length - 1] = completed;
					return `${cmd} ${newArgs.join(" ")}`;
				}
			}
		}
		return input;
	};

	return {
		history,
		currentPath,
		inputHistory,
		setInputHistory,
		addToHistory,
		setCurrentPath,
		getPromptPath,
		execute: (cmd: string) => execute(cmd),
		clearHistory,
		activeComponent,
		isInputVisible,
		setIsInputVisible,
		setActiveComponent,
		handleTabCompletion,
		fileSystem,
		setFileSystem,
		user,
	};
};
