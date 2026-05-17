-- PostgreSQL schema (consolidated from SQLite migrations 001–004)

CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  google_sub TEXT NOT NULL UNIQUE,
  email TEXT NOT NULL,
  name TEXT NOT NULL,
  picture_url TEXT,
  phone TEXT,
  bio TEXT,
  date_of_birth TEXT,
  weight_kg DOUBLE PRECISION,
  height_cm DOUBLE PRECISION,
  gender TEXT,
  allergies TEXT NOT NULL DEFAULT '[]',
  location_lat DOUBLE PRECISION,
  location_lng DOUBLE PRECISION,
  location_city TEXT,
  location_region TEXT,
  location_country TEXT,
  location_postal TEXT,
  location_label TEXT,
  location_use_precise BOOLEAN NOT NULL DEFAULT TRUE,
  onboarding_completed_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
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
  started_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  ended_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS consultation_summaries (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL UNIQUE REFERENCES consultations(id) ON DELETE CASCADE,
  summary TEXT NOT NULL,
  topics TEXT NOT NULL DEFAULT '[]',
  advice_given TEXT NOT NULL DEFAULT '[]',
  follow_up TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS place_suggestions (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat DOUBLE PRECISION NOT NULL,
  lng DOUBLE PRECISION NOT NULL,
  types TEXT NOT NULL DEFAULT '[]',
  intent TEXT NOT NULL,
  reason TEXT NOT NULL,
  distance_meters INTEGER,
  maps_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS reminders (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('appointment', 'medication', 'follow_up', 'custom')),
  title TEXT NOT NULL,
  notes TEXT,
  due_at TIMESTAMPTZ NOT NULL,
  completed_at TIMESTAMPTZ,
  consultation_id TEXT REFERENCES consultations(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS health_log_entries (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind TEXT NOT NULL CHECK (kind IN ('medication', 'vital', 'symptom', 'note')),
  title TEXT NOT NULL,
  value TEXT,
  unit TEXT,
  notes TEXT,
  recorded_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_consultations_user_id ON consultations(user_id);
CREATE INDEX IF NOT EXISTS idx_consultations_user_started ON consultations(user_id, started_at DESC);
CREATE INDEX IF NOT EXISTS idx_consultations_status ON consultations(status);
CREATE INDEX IF NOT EXISTS idx_place_suggestions_consultation ON place_suggestions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_place_suggestions_user ON place_suggestions(user_id);
CREATE INDEX IF NOT EXISTS idx_reminders_user_due ON reminders(user_id, due_at);
CREATE INDEX IF NOT EXISTS idx_health_log_user_recorded ON health_log_entries(user_id, recorded_at DESC);
