export async function checkAdmin(): Promise<boolean> {
	try {
		const res = await fetch("/api/auth/check");
		if (!res.ok) return false;
		const data = (await res.json()) as { authenticated?: boolean };
		return data.authenticated === true;
	} catch {
		return false;
	}
}

export async function logout(): Promise<void> {
	await fetch("/api/auth/logout", { method: "POST" });
}
