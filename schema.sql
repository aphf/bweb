DROP TABLE IF EXISTS notes;
DROP TABLE IF EXISTS note_edits;

CREATE TABLE notes (
  id TEXT PRIMARY KEY,
  filename TEXT UNIQUE,
  content TEXT,
  ip TEXT,
  city TEXT,
  country TEXT,
  timezone TEXT,
  user_agent TEXT,
  created_at INTEGER,
  updated_at INTEGER
);

CREATE TABLE note_edits (
  id TEXT PRIMARY KEY,
  note_id TEXT,
  previous_content TEXT,
  ip TEXT,
  city TEXT,
  created_at INTEGER,
  commit_msg TEXT,
  author_name TEXT,
  country TEXT,
  FOREIGN KEY(note_id) REFERENCES notes(id)
);


CREATE TABLE IF NOT EXISTS messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT NOT NULL,
    message TEXT NOT NULL,
    ip TEXT,
    user_agent TEXT,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    read BOOLEAN DEFAULT 0
);



CREATE TABLE IF NOT EXISTS config (
    key TEXT PRIMARY KEY,
    value TEXT
);

-- D1-backed drop-in for KVNamespace ops used by cron caches, rate limits,
-- and alert state (see worker/lib/d1-kv.ts). TTL emulated via expires_at
-- (0 = never expires). Self-created at runtime if missing.
CREATE TABLE IF NOT EXISTS kv_store (
    key TEXT PRIMARY KEY,
    value TEXT NOT NULL,
    expires_at INTEGER NOT NULL DEFAULT 0
);

CREATE TABLE IF NOT EXISTS public (
    path TEXT PRIMARY KEY,
    type TEXT NOT NULL,
    content TEXT,
    size INTEGER DEFAULT 0,
    author TEXT,
    updated_at INTEGER
);

CREATE TABLE IF NOT EXISTS ai_queries (
    id TEXT PRIMARY KEY,
    ip TEXT,
    user_agent TEXT,
    city TEXT,
    country TEXT,
    prompt TEXT NOT NULL,
    response TEXT NOT NULL,
    model TEXT NOT NULL,
    cost REAL DEFAULT 0,
    prompt_tokens INTEGER DEFAULT 0,
    completion_tokens INTEGER DEFAULT 0,
    is_admin INTEGER DEFAULT 0,
    created_at INTEGER NOT NULL
);





