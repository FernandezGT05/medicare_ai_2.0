import { randomUUID } from "crypto";
import { execute, query, queryOne } from "./db.js";
import { parseDbUtc } from "./datetime.js";
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
  created_at: string | Date;
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
    created_at: parseDbUtc(row.created_at),
  };
}

export async function deletePlaceSuggestionsForConsultation(
  consultationId: string,
): Promise<void> {
  await execute(`DELETE FROM place_suggestions WHERE consultation_id = $1`, [
    consultationId,
  ]);
}

export async function insertPlaceSuggestions(
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
): Promise<DbPlaceSuggestion[]> {
  await deletePlaceSuggestionsForConsultation(consultationId);

  const results: DbPlaceSuggestion[] = [];
  for (const place of places) {
    const id = randomUUID();
    await execute(
      `INSERT INTO place_suggestions
         (id, consultation_id, user_id, google_place_id, name, address, lat, lng,
          types, intent, reason, distance_meters, maps_url)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)`,
      [
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
      ],
    );
    const row = await queryOne<PlaceRow>(
      `SELECT * FROM place_suggestions WHERE id = $1`,
      [id],
    );
    if (row) {
      results.push(mapPlaceRow(row));
    }
  }
  return results;
}

export async function listPlaceSuggestionsForConsultation(
  consultationId: string,
): Promise<DbPlaceSuggestion[]> {
  const rows = await query<PlaceRow>(
    `SELECT * FROM place_suggestions
     WHERE consultation_id = $1
     ORDER BY (distance_meters IS NULL), distance_meters ASC, created_at ASC`,
    [consultationId],
  );
  return rows.map(mapPlaceRow);
}

export async function listRecentPlaceSuggestionsForUser(
  userId: string,
  limit = 12,
): Promise<DbPlaceSuggestion[]> {
  const rows = await query<PlaceRow>(
    `SELECT * FROM place_suggestions
     WHERE user_id = $1
     ORDER BY created_at DESC
     LIMIT $2`,
    [userId, limit],
  );
  return rows.map(mapPlaceRow);
}
