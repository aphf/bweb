import { jwtVerify } from "jose";

export function getAuthToken(request: Request): string | null {
	const authHeader = request.headers.get("Authorization");
	if (authHeader?.startsWith("Bearer ")) {
		return authHeader.slice("Bearer ".length);
	}

	const cookieHeader = request.headers.get("Cookie");
	if (cookieHeader) {
		for (const part of cookieHeader.split(";")) {
			const [name, ...rest] = part.trim().split("=");
			if (name === "admin_token") {
				return decodeURIComponent(rest.join("="));
			}
		}
	}

	return null;
}

export async function verifyAuth(
	request: Request,
	env: { JWT_SECRET?: string; ADMIN_PASSWORD?: string },
): Promise<boolean> {
	const token = getAuthToken(request);
	if (!token) return false;

	try {
		const jwtSecret = env.JWT_SECRET || env.ADMIN_PASSWORD;
		if (!jwtSecret) {
			console.error("Missing JWT_SECRET or ADMIN_PASSWORD");
			return false;
		}
		const secret = new TextEncoder().encode(jwtSecret);
		await jwtVerify(token, secret);
		return true;
	} catch (e: unknown) {
		console.error("JWT Verify Error:", e);
	}

	return false;
}
