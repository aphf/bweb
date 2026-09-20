import { useEffect } from "react";

interface SEOProps {
	title: string;
	description: string;
	url?: string;
	image?: string;
}

export const useSEO = ({ title, description, url, image }: SEOProps) => {
	useEffect(() => {
		const prevTitle = document.title;
		const prevDescription =
			document
				.querySelector('meta[name="description"]')
				?.getAttribute("content") || "";

		const getMeta = (p: string) =>
			document
				.querySelector(`meta[property="${p}"]`)
				?.getAttribute("content") || null;
		const getTwitter = (n: string) =>
			document.querySelector(`meta[name="${n}"]`)?.getAttribute("content") ||
			null;

		const prevOgTitle = getMeta("og:title");
		const prevOgDesc = getMeta("og:description");
		const prevOgUrl = getMeta("og:url");
		const prevOgImage = getMeta("og:image");

		const prevTwTitle = getTwitter("twitter:title");
		const prevTwDesc = getTwitter("twitter:description");
		const prevTwImage = getTwitter("twitter:image");

		const prevCanonical =
			document.querySelector('link[rel="canonical"]')?.getAttribute("href") ||
			null;

		document.title = title;

		const metaDescription = document.querySelector('meta[name="description"]');
		if (metaDescription) {
			metaDescription.setAttribute("content", description);
		}

		const setMeta = (property: string, content: string) => {
			let element = document.querySelector(`meta[property="${property}"]`);
			if (!element) {
				element = document.createElement("meta");
				element.setAttribute("property", property);
				document.head.appendChild(element);
			}
			element.setAttribute("content", content);
		};

		setMeta("og:title", title);
		setMeta("og:description", description);
		if (url) setMeta("og:url", url);
		if (image) setMeta("og:image", image);

		const setTwitter = (name: string, content: string) => {
			let element = document.querySelector(`meta[name="${name}"]`);
			if (!element) {
				element = document.createElement("meta");
				element.setAttribute("name", name);
				document.head.appendChild(element);
			}
			element.setAttribute("content", content);
		};

		setTwitter("twitter:title", title);
		setTwitter("twitter:description", description);
		if (image) setTwitter("twitter:image", image);

		let canonical = document.querySelector('link[rel="canonical"]');
		if (canonical && url) {
			canonical.setAttribute("href", url);
		} else if (!canonical && url) {
			canonical = document.createElement("link");
			canonical.setAttribute("rel", "canonical");
			canonical.setAttribute("href", url);
			document.head.appendChild(canonical);
		}

		let describedBy = document.querySelector('link[rel="describedby"]');
		if (!describedBy) {
			describedBy = document.createElement("link");
			describedBy.setAttribute("rel", "describedby");
			describedBy.setAttribute("href", "/llms.txt");
			document.head.appendChild(describedBy);
		}

		return () => {
			document.title = prevTitle;
			const md = document.querySelector('meta[name="description"]');
			if (md) md.setAttribute("content", prevDescription);

			const restoreMeta = (p: string, c: string | null) => {
				const el = document.querySelector(`meta[property="${p}"]`);
				if (el) {
					if (c !== null) el.setAttribute("content", c);
					else el.remove();
				}
			};

			restoreMeta("og:title", prevOgTitle);
			restoreMeta("og:description", prevOgDesc);
			restoreMeta("og:url", prevOgUrl);
			restoreMeta("og:image", prevOgImage);

			const restoreTwitter = (n: string, c: string | null) => {
				const el = document.querySelector(`meta[name="${n}"]`);
				if (el) {
					if (c !== null) el.setAttribute("content", c);
					else el.remove();
				}
			};

			restoreTwitter("twitter:title", prevTwTitle);
			restoreTwitter("twitter:description", prevTwDesc);
			restoreTwitter("twitter:image", prevTwImage);

			const can = document.querySelector('link[rel="canonical"]');
			if (can) {
				if (prevCanonical !== null) can.setAttribute("href", prevCanonical);
				else can.remove();
			}
		};
	}, [title, description, url, image]);
};
