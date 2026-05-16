/** OpenStreetMap Nominatim — free geocoding and place search (no API key or billing). */

const USER_AGENT =
  "MedicalAvatarAssistant/1.0 (local health app; not for bulk geocoding)";

const NOMINATIM_BASE = "https://nominatim.openstreetmap.org";

function nominatimHeaders(): HeadersInit {
  return { "User-Agent": USER_AGENT, Accept: "application/json" };
}

function haversineMeters(
  lat1: number,
  lng1: number,
  lat2: number,
  lng2: number,
): number {
  const r = 6371000;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLng = toRad(lng2 - lng1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLng / 2) ** 2;
  return Math.round(2 * r * Math.asin(Math.sqrt(a)));
}

function parseAddress(addr: Record<string, string> | undefined) {
  if (!addr) return {};
  return {
    city:
      addr.city ?? addr.town ?? addr.village ?? addr.suburb ?? addr.neighbourhood,
    region: addr.state ?? addr.region,
    country: addr.country,
    postal: addr.postcode,
  };
}

export interface PlaceSearchResult {
  googlePlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string[];
  distanceMeters: number | null;
  mapsUrl: string;
}

export async function geocodeAddress(
  address: string,
): Promise<{
  lat: number;
  lng: number;
  city?: string;
  region?: string;
  country?: string;
  postal?: string;
} | null> {
  const q = address.trim();
  if (!q) return null;

  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("q", q);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", "1");
  url.searchParams.set("addressdetails", "1");

  await waitForNominatimSlot();
  const response = await fetch(url, { headers: nominatimHeaders() });
  if (!response.ok) return null;

  const data = (await response.json()) as Array<{
    lat: string;
    lon: string;
    address?: Record<string, string>;
  }>;

  const hit = data[0];
  if (!hit) return null;

  const parsed = parseAddress(hit.address);
  return {
    lat: Number.parseFloat(hit.lat),
    lng: Number.parseFloat(hit.lon),
    ...parsed,
  };
}

export async function reverseGeocode(
  lat: number,
  lng: number,
): Promise<{
  label: string;
  city?: string;
  region?: string;
  country?: string;
  postal?: string;
} | null> {
  const url = new URL(`${NOMINATIM_BASE}/reverse`);
  url.searchParams.set("lat", String(lat));
  url.searchParams.set("lon", String(lng));
  url.searchParams.set("format", "json");
  url.searchParams.set("addressdetails", "1");

  await waitForNominatimSlot();
  const response = await fetch(url, { headers: nominatimHeaders() });
  if (!response.ok) return null;

  const data = (await response.json()) as {
    display_name?: string;
    address?: Record<string, string>;
  };

  if (!data.display_name) return null;
  const parsed = parseAddress(data.address);
  return { label: data.display_name, ...parsed };
}

const NOMINATIM_MIN_INTERVAL_MS = 1100;
let lastNominatimRequestAt = 0;

async function waitForNominatimSlot(): Promise<void> {
  const elapsed = Date.now() - lastNominatimRequestAt;
  if (elapsed < NOMINATIM_MIN_INTERVAL_MS) {
    await new Promise((r) => setTimeout(r, NOMINATIM_MIN_INTERVAL_MS - elapsed));
  }
  lastNominatimRequestAt = Date.now();
}

/** Try each query until one returns results (respects Nominatim rate limits). */
export async function searchPlacesWithFallbacks(input: {
  lat: number;
  lng: number;
  queries: string[];
  maxResults?: number;
  radiusKm?: number;
}): Promise<PlaceSearchResult[]> {
  const unique = [
    ...new Set(input.queries.map((q) => q.trim()).filter(Boolean)),
  ];
  for (let i = 0; i < unique.length; i++) {
    const results = await searchPlacesNearby({
      lat: input.lat,
      lng: input.lng,
      textQuery: unique[i]!,
      maxResults: input.maxResults,
      radiusKm: input.radiusKm,
    });
    if (results.length > 0) return results;
  }
  return [];
}

export async function searchPlacesNearby(input: {
  lat: number;
  lng: number;
  textQuery: string;
  maxResults?: number;
  radiusKm?: number;
}): Promise<PlaceSearchResult[]> {
  const maxResults = input.maxResults ?? 5;
  const radiusKm = input.radiusKm ?? 12;
  const delta = radiusKm / 111;
  const cleanQuery = input.textQuery.replace(/\s+near\s+me\s*$/i, "").trim();

  const url = new URL(`${NOMINATIM_BASE}/search`);
  url.searchParams.set("q", cleanQuery);
  url.searchParams.set("format", "json");
  url.searchParams.set("limit", String(maxResults * 3));
  url.searchParams.set("addressdetails", "1");
  // Restrict to a box around the user (lat/lon alone bias to wrong countries).
  url.searchParams.set(
    "viewbox",
    `${input.lng - delta},${input.lat + delta},${input.lng + delta},${input.lat - delta}`,
  );
  url.searchParams.set("bounded", "1");

  await waitForNominatimSlot();
  const response = await fetch(url, { headers: nominatimHeaders() });
  if (!response.ok) {
    const errText = await response.text();
    throw new Error(`Place search failed: ${errText.slice(0, 200)}`);
  }

  const data = (await response.json()) as Array<{
    place_id: number;
    lat: string;
    lon: string;
    display_name: string;
    type?: string;
    class?: string;
    name?: string;
  }>;

  const maxDistanceM = radiusKm * 1000;

  return data
    .map((item) => {
      const lat = Number.parseFloat(item.lat);
      const lng = Number.parseFloat(item.lon);
      const name =
        item.name ??
        item.display_name.split(",")[0]?.trim() ??
        "Unknown place";
      const distanceMeters = haversineMeters(input.lat, input.lng, lat, lng);
      return {
        googlePlaceId: `osm:${item.place_id}`,
        name,
        address: item.display_name,
        lat,
        lng,
        types: [item.type, item.class].filter(Boolean) as string[],
        distanceMeters,
        mapsUrl: `https://www.openstreetmap.org/?mlat=${lat}&mlon=${lng}#map=17/${lat}/${lng}`,
      };
    })
    .filter((p) => p.distanceMeters <= maxDistanceM)
    .sort((a, b) => (a.distanceMeters ?? 0) - (b.distanceMeters ?? 0))
    .slice(0, maxResults);
}
