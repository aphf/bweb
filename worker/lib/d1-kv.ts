const SCHEMA =
	"CREATE TABLE IF NOT EXISTS kv_store (key TEXT PRIMARY KEY, value TEXT NOT NULL, expires_at INTEGER NOT NULL DEFAULT 0)";

export interface KvPutOptions {
	expirationTtl?: number;
}

let ensured = false;

async function ensureTable(db: D1Database): Promise<void> {
	if (ensured) return;
	await db.exec(SCHEMA);
	ensured = true;
}

export async function kvGet(
	db: D1Database | undefined,
	key: string,
): Promise<string | null> {
	if (!db) return null;
	await ensureTable(db);
	const row = await db
		.prepare("SELECT value, expires_at FROM kv_store WHERE key = ?1")
		.bind(key)
		.first<{ value: string; expires_at: number }>();
	if (!row) return null;
	if (row.expires_at !== 0 && row.expires_at <= Date.now()) {
		await db
			.prepare("DELETE FROM kv_store WHERE key = ?1")
			.bind(key)
			.run()
			.catch(() => {});
		return null;
	}
	return row.value;
}

export async function kvPut(
	db: D1Database | undefined,
	key: string,
	value: string,
	opts?: KvPutOptions,
): Promise<void> {
	if (!db) return;
	await ensureTable(db);
	const expiresAt =
		opts?.expirationTtl && opts.expirationTtl > 0
			? Date.now() + opts.expirationTtl * 1000
			: 0;
	await db
		.prepare(
			`INSERT INTO kv_store (key, value, expires_at) VALUES (?1, ?2, ?3)
			ON CONFLICT(key) DO UPDATE SET value = excluded.value, expires_at = excluded.expires_at`,
		)
		.bind(key, value, expiresAt)
		.run();
}

export async function kvDelete(
	db: D1Database | undefined,
	key: string,
): Promise<void> {
	if (!db) return;
	await ensureTable(db);
	await db.prepare("DELETE FROM kv_store WHERE key = ?1").bind(key).run();
}
