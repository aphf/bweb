import { useEffect, useState } from "react";
import { trackEvent } from "../lib/analytics";

export type Theme = "dark" | "light";

const THEME_KEY = "bweb_theme";

export function getInitialTheme(): Theme {
	if (typeof window === "undefined") return "dark";
	try {
		const stored = localStorage.getItem(THEME_KEY);
		if (stored === "light" || stored === "dark") {
			return stored;
		}
	} catch {}
	if (
		typeof window.matchMedia === "function" &&
		window.matchMedia("(prefers-color-scheme: light)").matches
	) {
		return "light";
	}
	return "dark";
}

export function applyTheme(theme: Theme) {
	if (typeof document === "undefined") return;
	const root = document.documentElement;
	if (theme === "light") {
		root.classList.add("light");
		root.setAttribute("data-theme", "light");
	} else {
		root.classList.remove("light");
		root.setAttribute("data-theme", "dark");
	}
	try {
		localStorage.setItem(THEME_KEY, theme);
	} catch {}
	window.dispatchEvent(new CustomEvent("theme-change", { detail: { theme } }));
}

export function useTheme() {
	const [theme, setThemeState] = useState<Theme>(getInitialTheme);

	useEffect(() => {
		applyTheme(theme);

		const handleThemeChange = (e: Event) => {
			const customEvent = e as CustomEvent<{ theme: Theme }>;
			if (customEvent.detail?.theme) {
				setThemeState(customEvent.detail.theme);
			}
		};

		const mediaQuery =
			typeof window.matchMedia === "function"
				? window.matchMedia("(prefers-color-scheme: light)")
				: null;

		const handleMediaChange = (e: MediaQueryListEvent) => {
			try {
				const stored = localStorage.getItem(THEME_KEY);
				if (!stored) {
					const newTheme: Theme = e.matches ? "light" : "dark";
					setThemeState(newTheme);
					applyTheme(newTheme);
				}
			} catch {}
		};

		window.addEventListener("theme-change", handleThemeChange);
		if (mediaQuery) {
			mediaQuery.addEventListener("change", handleMediaChange);
		}

		return () => {
			window.removeEventListener("theme-change", handleThemeChange);
			if (mediaQuery) {
				mediaQuery.removeEventListener("change", handleMediaChange);
			}
		};
	}, [theme]);

	const toggleTheme = () => {
		const next = theme === "dark" ? "light" : "dark";
		setThemeState(next);
		applyTheme(next);
		trackEvent("toggle-theme", { to: next });
	};

	const setTheme = (newTheme: Theme) => {
		setThemeState(newTheme);
		applyTheme(newTheme);
	};

	return { theme, toggleTheme, setTheme, isDark: theme === "dark" };
}
