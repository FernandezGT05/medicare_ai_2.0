CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('appointment', 'medication', 'follow_up', 'custom')),
  title TEXT NOT NULL,
  notes TEXT,
  due_at TEXT NOT NULL,
  completed_at TEXT,
  consultation_id TEXT REFERENCES consultations(id) ON DELETE SET NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE TABLE IF NOT EXISTS health_log_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('medication', 'vital', 'symptom', 'note')),
  title TEXT NOT NULL,
  value TEXT,
  unit TEXT,
  notes TEXT,
  recorded_at TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now')),
  updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_reminders_user_due ON reminders(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_health_log_user_recorded ON health_log_entries(user_id, recorded_at DESC);
