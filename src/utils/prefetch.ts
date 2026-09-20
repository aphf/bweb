let prefetchedAll = false;

export const prefetchTerminal = () => import("../components/Terminal");
export const prefetchFileManager = () =>
	import("../components/fileManager/FileManager");
export const prefetchAlaska = () => import("../components/AlaskaWindow");
export const prefetchSpotlight = () => import("../components/Spotlight");

export const prefetchPage = (path: string) => {
	const clean = path.toLowerCase().replace(/^\//, "");
	if (clean === "about") import("../components/pages/About");
	else if (clean === "projects") import("../components/pages/Projects");
	else if (clean === "gallery") import("../components/pages/Gallery");
	else if (clean === "notes") import("../components/pages/Notes");
	else if (clean === "contact") import("../components/pages/Contact");
	else if (clean === "404" || clean === "not-found")
		import("../components/pages/404");
};

export const prefetchAllPages = () => {
	import("../components/pages/About");
	import("../components/pages/Projects");
	import("../components/pages/Gallery");
	import("../components/pages/Notes");
	import("../components/pages/Contact");
	import("../components/pages/404");
};

export const prefetchEverything = () => {
	if (prefetchedAll) return;
	prefetchedAll = true;

	prefetchTerminal();
	prefetchFileManager();
	prefetchAlaska();
	prefetchSpotlight();

	prefetchAllPages();
};
