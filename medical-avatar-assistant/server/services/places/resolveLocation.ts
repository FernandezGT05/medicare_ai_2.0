import type { DbUser } from "../../db/types.js";
import {
  getLocationForPlaces,
  locationGeocodeQuery,
  updateHealthProfile,
} from "../../db/healthProfile.js";
import {
  geocodeAddress,
  reverseGeocode,
} from "./googlePlaces.js";
import { isLabelConsistentWithPlace } from "./locationConsistency.js";

export interface ResolvedLocation {
  lat: number;
  lng: number;
  label: string;
}

/** Resolve coordinates for nearby search; fixes stale GPS when label says elsewhere. */
export async function resolveUserCoordinates(
  user: DbUser,
): Promise<ResolvedLocation | null> {
  const textQuery = locationGeocodeQuery(user);
  const stored = getLocationForPlaces(user);

  if (stored && textQuery) {
    const reversed = await reverseGeocode(stored.lat, stored.lng);
    if (
      reversed &&
      !isLabelConsistentWithPlace(textQuery, {
        label: reversed.label,
        country: reversed.country,
        city: reversed.city,
      })
    ) {
      const geocoded = await geocodeAddress(textQuery);
      if (geocoded) {
        updateHealthProfile(user.id, {
          locationLat: geocoded.lat,
          locationLng: geocoded.lng,
          locationCity: geocoded.city ?? user.location_city,
          locationRegion: geocoded.region ?? user.location_region,
          locationCountry: geocoded.country ?? user.location_country,
          locationPostal: geocoded.postal ?? user.location_postal,
          locationLabel: user.location_label ?? textQuery,
        });
        return {
          lat: geocoded.lat,
          lng: geocoded.lng,
          label: user.location_label ?? textQuery,
        };
      }
    }
    return {
      lat: stored.lat,
      lng: stored.lng,
      label: stored.label || textQuery,
    };
  }

  if (stored) {
    return {
      lat: stored.lat,
      lng: stored.lng,
      label: stored.label || "Saved location",
    };
  }

  if (!textQuery) return null;

  const geocoded = await geocodeAddress(textQuery);
  if (!geocoded) return null;

  updateHealthProfile(user.id, {
    locationLat: geocoded.lat,
    locationLng: geocoded.lng,
    locationCity: geocoded.city ?? user.location_city,
    locationRegion: geocoded.region ?? user.location_region,
    locationCountry: geocoded.country ?? user.location_country,
    locationPostal: geocoded.postal ?? user.location_postal,
  });

  return {
    lat: geocoded.lat,
    lng: geocoded.lng,
    label: user.location_label ?? textQuery,
  };
}

/** Apply location from profile/onboarding save body. */
export async function buildLocationUpdateFromBody(
  _user: DbUser,
  body: Record<string, unknown>,
): Promise<Parameters<typeof updateHealthProfile>[1] | { error: string }> {
  const labelText =
    typeof body.locationLabel === "string" ? body.locationLabel.trim() : "";
  const useCurrentLocation = body.useCurrentLocation === true;
  const hasCoords =
    body.locationLat != null &&
    body.locationLng != null &&
    !Number.isNaN(Number(body.locationLat)) &&
    !Number.isNaN(Number(body.locationLng));

  if (!labelText && body.locationLabel === "") {
    return {
      locationLat: null,
      locationLng: null,
      locationCity: null,
      locationRegion: null,
      locationCountry: null,
      locationPostal: null,
      locationLabel: null,
    };
  }

  // Typed address always wins over old GPS coordinates.
  if (labelText && !useCurrentLocation) {
    const geocoded = await geocodeAddress(labelText);
    if (!geocoded) {
      return {
        error:
          "Could not find that address. Try a more specific city or area (e.g. Colombo 7, Sri Lanka).",
      };
    }
    return {
      locationLat: geocoded.lat,
      locationLng: geocoded.lng,
      locationCity: geocoded.city ?? null,
      locationRegion: geocoded.region ?? null,
      locationCountry: geocoded.country ?? null,
      locationPostal: geocoded.postal ?? null,
      locationLabel: labelText,
    };
  }

  if (hasCoords && useCurrentLocation) {
    const lat = Number(body.locationLat);
    const lng = Number(body.locationLng);
    let update: Parameters<typeof updateHealthProfile>[1] = {
      locationLat: lat,
      locationLng: lng,
      locationCity:
        typeof body.locationCity === "string" ? body.locationCity : null,
      locationRegion:
        typeof body.locationRegion === "string" ? body.locationRegion : null,
      locationCountry:
        typeof body.locationCountry === "string" ? body.locationCountry : null,
      locationPostal:
        typeof body.locationPostal === "string" ? body.locationPostal : null,
      locationLabel: labelText || null,
    };
    if (!labelText || labelText.toLowerCase() === "current location") {
      const reversed = await reverseGeocode(lat, lng);
      if (reversed) {
        update = {
          ...update,
          locationLabel: reversed.label,
          locationCity: reversed.city ?? update.locationCity ?? null,
          locationRegion: reversed.region ?? update.locationRegion ?? null,
          locationCountry: reversed.country ?? update.locationCountry ?? null,
          locationPostal: reversed.postal ?? update.locationPostal ?? null,
        };
      }
    }
    return update;
  }

  if (labelText) {
    const geocoded = await geocodeAddress(labelText);
    if (!geocoded) {
      return {
        error:
          "Could not find that address. Try a more specific city or area name.",
      };
    }
    return {
      locationLat: geocoded.lat,
      locationLng: geocoded.lng,
      locationCity: geocoded.city ?? null,
      locationRegion: geocoded.region ?? null,
      locationCountry: geocoded.country ?? null,
      locationPostal: geocoded.postal ?? null,
      locationLabel: labelText,
    };
  }

  return {};
}
