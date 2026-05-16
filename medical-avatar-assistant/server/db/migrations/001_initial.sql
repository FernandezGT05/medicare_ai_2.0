-- SQLite: per-user visit history (users → consultations → summaries)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  picture_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS consultations (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  bey_call_id TEXT UNIQUE,
  specialty TEXT NOT NULL,
  catalog_agent_id TEXT NOT NULL,
  bey_agent_id TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'in_progress'
    CHECK (status IN ('in_progress', 'summarizing', 'completed', 'failed')),
  started_at TEXT NOT NULL DEFAULT (datetime('now')),
  ended_at TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS consultation_summaries (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL UNIQUE REFERENCES consultations(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  topics TEXT NOT NULL DEFAULT '[]',
  advice_given TEXT NOT NULL DEFAULT '[]',
  follow_up TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_user_started ON consultations(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
