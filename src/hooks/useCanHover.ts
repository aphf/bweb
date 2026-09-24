import { useSyncExternalStore } from "react";

const QUERY = "(hover: hover) and (pointer: fine)";

function subscribe(onChange: () => void) {
	const mql = window.matchMedia(QUERY);
	mql.addEventListener("change", onChange);
	return () => mql.removeEventListener("change", onChange);
}

function getSnapshot() {
	return window.matchMedia(QUERY).matches;
}

function getServerSnapshot() {
	return false;
}

export function useCanHover(): boolean {
	return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
