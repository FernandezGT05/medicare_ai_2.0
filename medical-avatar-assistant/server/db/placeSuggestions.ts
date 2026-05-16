import { randomUUID } from "crypto";
import { getDb } from "./db.js";
import { parseSqliteUtc } from "./datetime.js";
import type { DbPlaceSuggestion } from "./types.js";

type PlaceRow = {
  id: string;
  consultation_id: string;
  user_id: string;
  google_place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string;
  intent: string;
  reason: string;
  distance_meters: number | null;
  maps_url: string | null;
  created_at: string;
};

function mapPlaceRow(row: PlaceRow): DbPlaceSuggestion {
  let types: string[] = [];
  try {
    types = JSON.parse(row.types) as string[];
  } catch {
    types = [];
  }
  return {
    ...row,
    types,
    created_at: parseSqliteUtc(row.created_at),
  };
}

export function deletePlaceSuggestionsForConsultation(
  consultationId: string,
): void {
  const db = getDb();
  db.prepare(`DELETE FROM place_suggestions WHERE consultation_id = ?`).run(
    consultationId,
  );
}

export function insertPlaceSuggestions(
  consultationId: string,
  userId: string,
  places: Array<{
    googlePlaceId: string;
    name: string;
    address: string;
    lat: number;
    lng: number;
    types: string[];
    intent: string;
    reason: string;
    distanceMeters?: number | null;
    mapsUrl?: string | null;
  }>,
): DbPlaceSuggestion[] {
  deletePlaceSuggestionsForConsultation(consultationId);
  const db = getDb();
  const insert = db.prepare(
    `INSERT INTO place_suggestions
       (id, consultation_id, user_id, google_place_id, name, address, lat, lng,
        types, intent, reason, distance_meters, maps_url)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  );

  const results: DbPlaceSuggestion[] = [];
  for (const place of places) {
    const id = randomUUID();
    insert.run(
      id,
      consultationId,
      userId,
      place.googlePlaceId,
      place.name,
      place.address,
      place.lat,
      place.lng,
      JSON.stringify(place.types),
      place.intent,
      place.reason,
      place.distanceMeters ?? null,
      place.mapsUrl ?? null,
    );
    const row = db
      .prepare(`SELECT * FROM place_suggestions WHERE id = ?`)
      .get(id) as PlaceRow;
    results.push(mapPlaceRow(row));
  }
  return results;
}

export function listPlaceSuggestionsForConsultation(
  consultationId: string,
): DbPlaceSuggestion[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM place_suggestions
       WHERE consultation_id = ?
       ORDER BY (distance_meters IS NULL), distance_meters ASC, created_at ASC`,
    )
    .all(consultationId) as PlaceRow[];
  return rows.map(mapPlaceRow);
}

export function listRecentPlaceSuggestionsForUser(
  userId: string,
  limit = 12,
): DbPlaceSuggestion[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM place_suggestions
       WHERE user_id = ?
       ORDER BY created_at DESC
       LIMIT ?`,
    )
    .all(userId, limit) as PlaceRow[];
  return rows.map(mapPlaceRow);
}
