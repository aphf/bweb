import { SignJWT } from "jose";
import type { Env } from "../env";
import { verifyAuth } from "../lib/auth";
import { json, methodNotAllowed } from "../lib/json";
import { checkRateLimit } from "../lib/rate-limit";

export async function handleAuthLogin(
	request: Request,
	env: Env,
): Promise<Response> {
	try {
		const ip = request.headers.get("CF-Connecting-IP") || "unknown";

		const allowed = await checkRateLimit(env, `login:${ip}`, 5, 60);
		if (!allowed) {
			return json(
				{ error: "Too many login attempts. Please try again later." },
				429,
			);
		}

		const { password } = (await request.json()) as { password?: string };

		if (!password) {
			return json({ error: "Password required" }, 400);
		}

		if (!env.ADMIN_PASSWORD) {
			console.error("Server misconfiguration: Missing ADMIN_PASSWORD");
			return json({ error: "Server misconfiguration" }, 500);
		}

		const encoder = new TextEncoder();
		const [inputHash, storedHash] = await Promise.all([
			crypto.subtle.digest("SHA-256", encoder.encode(password)),
			crypto.subtle.digest("SHA-256", encoder.encode(env.ADMIN_PASSWORD)),
		]);

		const equal = crypto.subtle.timingSafeEqual(inputHash, storedHash);
		if (!equal) {
			return json({ error: "Invalid password" }, 401);
		}

		const jwtSecret = env.JWT_SECRET || env.ADMIN_PASSWORD;
		if (!jwtSecret)
			throw new Error("Server misconfiguration: Missing JWT secret");
		const secret = new TextEncoder().encode(jwtSecret);
		const token = await new SignJWT({ role: "admin" })
			.setProtectedHeader({ alg: "HS256" })
			.setIssuedAt()
			.setExpirationTime("24h")
			.sign(secret);

		const cookie = `admin_token=${token}; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=86400`;
		return new Response(JSON.stringify({ success: true }), {
			status: 200,
			headers: { "Content-Type": "application/json", "Set-Cookie": cookie },
		});
	} catch (e: unknown) {
		return json(
			{ error: e instanceof Error ? e.message : "Unknown error" },
			500,
		);
	}
}

export async function handleAuthCheck(
	request: Request,
	env: Env,
): Promise<Response> {
	const authenticated = await verifyAuth(request, env);
	return json({ authenticated });
}

export function handleAuthLogout(): Response {
	return new Response(JSON.stringify({ success: true }), {
		status: 200,
		headers: {
			"Content-Type": "application/json",
			"Set-Cookie":
				"admin_token=; HttpOnly; Secure; SameSite=Lax; Path=/; Max-Age=0",
		},
	});
}

export async function handleAdminConfig(
	request: Request,
	env: Env,
): Promise<Response> {
	if (!(await verifyAuth(request, env))) {
		return new Response("Unauthorized", { status: 401 });
	}

	if (request.method === "POST") {
		try {
			const { key, value } = (await request.json()) as {
				key?: string;
				value?: string;
			};
			if (!key || value === undefined)
				return new Response("Missing key or value", { status: 400 });

			await env.DB.prepare(
				"INSERT INTO config (key, value) VALUES (?, ?) ON CONFLICT(key) DO UPDATE SET value = ?",
			)
				.bind(key, value, value)
				.run();

			return json({ success: true });
		} catch (e: unknown) {
			return json(
				{ error: e instanceof Error ? e.message : "Unknown error" },
				500,
			);
		}
	}

	if (request.method === "GET") {
		const { results } = await env.DB.prepare("SELECT * FROM config").run();
		const config: Record<string, string> = {};
		if (results) {
			for (const row of results as { key: string; value: string }[]) {
				config[row.key] = row.value;
			}
		}
		return json(config);
	}

	return methodNotAllowed(["GET", "POST"]);
}
