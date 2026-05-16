-- Health profile, location, onboarding, and place suggestions

ALTER TABLE users ADD COLUMN date_of_birth TEXT;
ALTER TABLE users ADD COLUMN weight_kg REAL;
ALTER TABLE users ADD COLUMN height_cm REAL;
ALTER TABLE users ADD COLUMN gender TEXT;
ALTER TABLE users ADD COLUMN allergies TEXT DEFAULT '[]';
ALTER TABLE users ADD COLUMN location_lat REAL;
ALTER TABLE users ADD COLUMN location_lng REAL;
ALTER TABLE users ADD COLUMN location_city TEXT;
ALTER TABLE users ADD COLUMN location_region TEXT;
ALTER TABLE users ADD COLUMN location_country TEXT;
ALTER TABLE users ADD COLUMN location_postal TEXT;
ALTER TABLE users ADD COLUMN location_label TEXT;
ALTER TABLE users ADD COLUMN location_use_precise INTEGER NOT NULL DEFAULT 1;
ALTER TABLE users ADD COLUMN onboarding_completed_at TEXT;

CREATE TABLE IF NOT EXISTS place_suggestions (
  id TEXT PRIMARY KEY,
  consultation_id TEXT NOT NULL REFERENCES consultations(id) ON DELETE CASCADE,
  user_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  google_place_id TEXT NOT NULL,
  name TEXT NOT NULL,
  address TEXT NOT NULL,
  lat REAL NOT NULL,
  lng REAL NOT NULL,
  types TEXT NOT NULL DEFAULT '[]',
  intent TEXT NOT NULL,
  reason TEXT NOT NULL,
  distance_meters INTEGER,
  maps_url TEXT,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE INDEX IF NOT EXISTS idx_place_suggestions_consultation
  ON place_suggestions(consultation_id);
CREATE INDEX IF NOT EXISTS idx_place_suggestions_user
  ON place_suggestions(user_id);
