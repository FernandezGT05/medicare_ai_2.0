import { getDb } from "./db.js";
import { findUserById } from "./users.js";
import type { DbUser } from "./types.js";

export interface HealthProfileUpdate {
  name?: string;
  dateOfBirth?: string | null;
  weightKg?: number | null;
  heightCm?: number | null;
  gender?: string | null;
  allergies?: string[];
  locationLat?: number | null;
  locationLng?: number | null;
  locationCity?: string | null;
  locationRegion?: string | null;
  locationCountry?: string | null;
  locationPostal?: string | null;
  locationLabel?: string | null;
  locationUsePrecise?: boolean;
  completeOnboarding?: boolean;
}

export function hasCompletedOnboarding(user: DbUser): boolean {
  return user.onboarding_completed_at !== null;
}

export function userHasLocation(user: DbUser): boolean {
  if (user.location_lat != null && user.location_lng != null) return true;
  return Boolean(
    user.location_label?.trim() ||
      user.location_city?.trim() ||
      user.location_postal?.trim(),
  );
}

/** Text we can send to the geocoder when lat/lng are missing. */
export function locationGeocodeQuery(user: DbUser): string | null {
  const parts = [
    user.location_label,
    user.location_postal,
    user.location_city,
    user.location_region,
    user.location_country,
  ]
    .map((p) => p?.trim())
    .filter(Boolean);
  const unique = [...new Set(parts)];
  const query = unique.join(", ");
  return query || null;
}

export function getLocationForPlaces(user: DbUser): {
  lat: number;
  lng: number;
  label: string;
} | null {
  if (user.location_lat != null && user.location_lng != null) {
    const label =
      user.location_label ??
      [user.location_city, user.location_region, user.location_country]
        .filter(Boolean)
        .join(", ");
    return { lat: user.location_lat, lng: user.location_lng, label };
  }
  return null;
}

export function updateHealthProfile(
  userId: string,
  input: HealthProfileUpdate,
): DbUser | null {
  const existing = findUserById(userId);
  if (!existing) return null;

  const db = getDb();
  const name =
    input.name !== undefined ? input.name.trim() || existing.name : existing.name;
  const dateOfBirth =
    input.dateOfBirth !== undefined
      ? input.dateOfBirth
      : existing.date_of_birth;
  const weightKg =
    input.weightKg !== undefined ? input.weightKg : existing.weight_kg;
  const heightCm =
    input.heightCm !== undefined ? input.heightCm : existing.height_cm;
  const gender =
    input.gender !== undefined ? input.gender : existing.gender;
  const allergies =
    input.allergies !== undefined
      ? JSON.stringify(input.allergies)
      : JSON.stringify(existing.allergies);
  const locationLat =
    input.locationLat !== undefined ? input.locationLat : existing.location_lat;
  const locationLng =
    input.locationLng !== undefined ? input.locationLng : existing.location_lng;
  const locationCity =
    input.locationCity !== undefined
      ? input.locationCity
      : existing.location_city;
  const locationRegion =
    input.locationRegion !== undefined
      ? input.locationRegion
      : existing.location_region;
  const locationCountry =
    input.locationCountry !== undefined
      ? input.locationCountry
      : existing.location_country;
  const locationPostal =
    input.locationPostal !== undefined
      ? input.locationPostal
      : existing.location_postal;
  const locationLabel =
    input.locationLabel !== undefined
      ? input.locationLabel
      : existing.location_label;
  const locationUsePrecise =
    input.locationUsePrecise !== undefined
      ? input.locationUsePrecise
        ? 1
        : 0
      : existing.location_use_precise
        ? 1
        : 0;
  const onboardingCompletedAt = input.completeOnboarding
    ? new Date().toISOString()
    : existing.onboarding_completed_at?.toISOString() ?? null;

  db.prepare(
    `UPDATE users SET
       name = ?,
       date_of_birth = ?,
       weight_kg = ?,
       height_cm = ?,
       gender = ?,
       allergies = ?,
       location_lat = ?,
       location_lng = ?,
       location_city = ?,
       location_region = ?,
       location_country = ?,
       location_postal = ?,
       location_label = ?,
       location_use_precise = ?,
       onboarding_completed_at = COALESCE(?, onboarding_completed_at),
       updated_at = datetime('now')
     WHERE id = ?`,
  ).run(
    name,
    dateOfBirth,
    weightKg,
    heightCm,
    gender,
    allergies,
    locationLat,
    locationLng,
    locationCity,
    locationRegion,
    locationCountry,
    locationPostal,
    locationLabel,
    locationUsePrecise,
    onboardingCompletedAt,
    userId,
  );

  return findUserById(userId);
}

export function healthProfileToResponse(user: DbUser) {
  const age = user.date_of_birth
    ? Math.floor(
        (Date.now() - new Date(user.date_of_birth).getTime()) /
          (365.25 * 24 * 60 * 60 * 1000),
      )
    : null;

  return {
    name: user.name,
    dateOfBirth: user.date_of_birth,
    age: age !== null && Number.isFinite(age) ? age : null,
    weightKg: user.weight_kg,
    heightCm: user.height_cm,
    gender: user.gender,
    allergies: user.allergies,
    location: {
      lat: user.location_lat,
      lng: user.location_lng,
      city: user.location_city,
      region: user.location_region,
      country: user.location_country,
      postal: user.location_postal,
      label: user.location_label,
      usePrecise: user.location_use_precise,
    },
    onboardingCompleted: hasCompletedOnboarding(user),
    hasLocation: userHasLocation(user),
  };
}
