export interface SEOData {
	title: string;
	description: string;
	url: string;
	image?: string;
}

interface RewriterElement {
	setInnerContent(content: string): void;
	setAttribute(name: string, value: string): void;
}

export function injectSEO(response: Response, data: SEOData): Response {
	let rewriter = new HTMLRewriter()
		.on("title", {
			element(element: RewriterElement) {
				element.setInnerContent(data.title);
			},
		})
		.on('meta[name="description"]', {
			element(element: RewriterElement) {
				element.setAttribute("content", data.description);
			},
		})
		.on('link[rel="canonical"]', {
			element(element: RewriterElement) {
				element.setAttribute("href", data.url);
			},
		})
		.on('link[rel="describedby"]', {
			element(element: RewriterElement) {
				element.setAttribute("href", "/llms.txt");
			},
		})
		.on('meta[property="og:title"]', {
			element(element: RewriterElement) {
				element.setAttribute("content", data.title);
			},
		})
		.on('meta[property="og:description"]', {
			element(element: RewriterElement) {
				element.setAttribute("content", data.description);
			},
		})
		.on('meta[property="og:url"]', {
			element(element: RewriterElement) {
				element.setAttribute("content", data.url);
			},
		})
		.on('meta[name="twitter:title"]', {
			element(element: RewriterElement) {
				element.setAttribute("content", data.title);
			},
		})
		.on('meta[name="twitter:description"]', {
			element(element: RewriterElement) {
				element.setAttribute("content", data.description);
			},
		})
		.on('meta[name="twitter:url"]', {
			element(element: RewriterElement) {
				element.setAttribute("content", data.url);
			},
		});

	if (data.image) {
		const image = data.image;
		rewriter = rewriter
			.on('meta[property="og:image"]', {
				element(element: RewriterElement) {
					element.setAttribute("content", image);
				},
			})
			.on('meta[name="twitter:image"]', {
				element(element: RewriterElement) {
					element.setAttribute("content", image);
				},
			});
	}

	const transformedResponse = rewriter.transform(response);
	const headers = new Headers(transformedResponse.headers);
	headers.set("Link", '</llms.txt>; rel="describedby"');
	headers.set("Cache-Control", "no-cache, no-store, must-revalidate");

	return new Response(transformedResponse.body, {
		status: transformedResponse.status,
		statusText: transformedResponse.statusText,
		headers,
	});
}

export async function serveSpaWithSEO(
	request: Request,
	env: { ASSETS: Fetcher },
	data: SEOData,
	status = 200,
): Promise<Response> {
	const url = new URL(request.url);
	const indexResponse = await env.ASSETS.fetch(
		new Request(new URL("/", url), request),
	);
	const seoResponse = injectSEO(indexResponse, data);
	if (status === 200) return seoResponse;
	return new Response(seoResponse.body, {
		status,
		statusText: status === 404 ? "Not Found" : seoResponse.statusText,
		headers: seoResponse.headers,
	});
}
