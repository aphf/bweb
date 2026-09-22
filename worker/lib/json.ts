export function json(
	data: unknown,
	status = 200,
	headers?: HeadersInit,
): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { "Content-Type": "application/json", ...headers },
	});
}

export function methodNotAllowed(allowed: string[]): Response {
	return json(
		{ error: `Method not allowed. Use: ${allowed.join(", ")}` },
		405,
		{ Allow: allowed.join(", ") },
	);
}

export function withPoweredBy(response: Response): Response {
	if (response.status === 101) return response;
	const headers = new Headers(response.headers);
	if (!headers.has("X-Powered-By")) headers.set("X-Powered-By", "Neosphere");
	return new Response(response.body, {
		status: response.status,
		statusText: response.statusText,
		headers,
	});
}
