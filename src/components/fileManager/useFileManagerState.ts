import { useReducer } from "react";

export interface NavigationState {
	currentPath: string[];
	history: string[][];
	historyIndex: number;
	searchQuery: string;
	selectedItems: string[];
}

export type NavigationAction =
	| { type: "NAVIGATE"; path: string[] }
	| { type: "BACK" }
	| { type: "FORWARD" }
	| { type: "SET_SEARCH"; query: string }
	| { type: "SET_SELECTED"; items: string[] }
	| { type: "REMOVE_SELECTED"; item: string }
	| { type: "CLEAR_SELECTED" };

export const initialNavigationState: NavigationState = {
	currentPath: ["home", "neo"],
	history: [["home", "neo"]],
	historyIndex: 0,
	searchQuery: "",
	selectedItems: [],
};

export function navigationReducer(
	state: NavigationState,
	action: NavigationAction,
): NavigationState {
	switch (action.type) {
		case "NAVIGATE": {
			const newHist = state.history.slice(0, state.historyIndex + 1);
			newHist.push(action.path);
			return {
				...state,
				currentPath: action.path,
				history: newHist,
				historyIndex: newHist.length - 1,
				searchQuery: "",
				selectedItems: [],
			};
		}
		case "BACK": {
			if (state.historyIndex <= 0) return state;
			const nextIdx = state.historyIndex - 1;
			return {
				...state,
				historyIndex: nextIdx,
				currentPath: state.history[nextIdx],
				selectedItems: [],
			};
		}
		case "FORWARD": {
			if (state.historyIndex >= state.history.length - 1) return state;
			const nextIdx = state.historyIndex + 1;
			return {
				...state,
				historyIndex: nextIdx,
				currentPath: state.history[nextIdx],
				selectedItems: [],
			};
		}
		case "SET_SEARCH":
			return { ...state, searchQuery: action.query };
		case "SET_SELECTED":
			return { ...state, selectedItems: action.items };
		case "REMOVE_SELECTED":
			return {
				...state,
				selectedItems: state.selectedItems.filter((i) => i !== action.item),
			};
		case "CLEAR_SELECTED":
			return { ...state, selectedItems: [] };
		default:
			return state;
	}
}

export function useFileManagerState() {
	return useReducer(navigationReducer, initialNavigationState);
}
