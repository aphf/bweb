import type React from "react";
import { useCallback, useState } from "react";

export interface TerminalOutput {
	id: string;
	command: string;
	response: string | React.ReactNode;
	path: string;
	user: string;
}

export const useCommandHistory = (
	user: string,
	getPromptPath: () => string,
) => {
	const [history, setHistory] = useState<TerminalOutput[]>([
		{
			id: "welcome",
			command: "",
			response:
				'Welcome to Neosphere v3.0. Type "help" to start. (Tab to autocomplete)',
			path: "~",
			user: "neo",
		},
	]);
	const [inputHistory, setInputHistory] = useState<string[]>([]);

	const addToHistory = useCallback(
		(
			command: string,
			response: string | React.ReactNode,
			customId?: string,
		) => {
			const entryId = customId || Math.random().toString(36).substring(2, 11);
			setHistory((prev) => [
				...prev,
				{
					id: entryId,
					command,
					response,
					path: getPromptPath(),
					user: user,
				},
			]);
			return entryId;
		},
		[getPromptPath, user],
	);

	const updateHistory = useCallback(
		(id: string, response: string | React.ReactNode) => {
			setHistory((prev) =>
				prev.map((item) => (item.id === id ? { ...item, response } : item)),
			);
		},
		[],
	);

	const clearHistory = useCallback(() => {
		setHistory([]);
	}, []);

	return {
		history,
		setHistory,
		inputHistory,
		setInputHistory,
		addToHistory,
		updateHistory,
		clearHistory,
	};
};
