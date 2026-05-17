import { getSummaryForConsultation } from "../../db/consultations.js";
import {
  userHasLocation,
  type HealthProfileUpdate,
} from "../../db/healthProfile.js";
import { resolveUserCoordinates } from "./resolveLocation.js";
import { insertPlaceSuggestions } from "../../db/placeSuggestions.js";
import type { DbConsultation, DbPlaceSuggestion, DbUser } from "../../db/types.js";
import type { AgentSpecialtyId } from "../agentSpecialties.js";
import { geocodeAddress, searchPlacesWithFallbacks } from "./googlePlaces.js";
import {
  getIntentById,
  getIntentsForSpecialty,
  shouldBlockPlaceSuggestions,
  type PlaceIntentOption,
} from "./placeIntents.js";

export interface SuggestPlacesInput {
  user: DbUser;
  specialty: AgentSpecialtyId;
  consultationId?: string;
  intentId?: string;
  contextText?: string;
}

function pickIntent(
  specialty: AgentSpecialtyId,
  intentId?: string,
  contextText?: string,
): PlaceIntentOption {
  if (intentId) {
    const found = getIntentById(specialty, intentId);
    if (found) return found;
  }

  const intents = getIntentsForSpecialty(specialty);
  const lower = (contextText ?? "").toLowerCase();
  if (lower.includes("pharmacy") || lower.includes("medication")) {
    return intents.find((i) => i.id === "pharmacy") ?? intents[0];
  }
  if (lower.includes("gym") || lower.includes("fitness")) {
    return intents.find((i) => i.id === "gym") ?? intents[0];
  }
  if (lower.includes("therapy") || lower.includes("mental")) {
    return intents.find((i) => i.id === "therapist") ?? intents[0];
  }
  if (lower.includes("physio") || lower.includes("injury")) {
    return intents.find((i) => i.id === "physio") ?? intents[0];
  }
  return intents[0];
}

function buildReason(intent: PlaceIntentOption, contextSnippet?: string): string {
  if (contextSnippet?.trim()) {
    return `Suggested because your visit discussed: ${contextSnippet.trim().slice(0, 120)}`;
  }
  return intent.description;
}

export async function suggestPlacesForUser(
  input: SuggestPlacesInput,
): Promise<{
  places: DbPlaceSuggestion[];
  intent: PlaceIntentOption;
  blocked: boolean;
  message?: string;
  searchArea?: { label: string; lat: number; lng: number };
}> {
  if (!userHasLocation(input.user)) {
    return {
      places: [],
      intent: pickIntent(input.specialty, input.intentId),
      blocked: true,
      message:
        "Add your location in Dashboard → Profile (or redo onboarding) to see nearby places.",
    };
  }

  let contextText = input.contextText ?? "";
  if (input.consultationId) {
    const summary = await getSummaryForConsultation(input.consultationId);
    if (summary) {
      contextText = [summary.summary, summary.follow_up, ...summary.topics].join(
        " ",
      );
    }
  }

  if (shouldBlockPlaceSuggestions(contextText)) {
    return {
      places: [],
      intent: pickIntent(input.specialty, input.intentId),
      blocked: true,
      message:
        "For urgent or emergency symptoms, contact local emergency services instead of searching nearby places.",
    };
  }

  const coords = await resolveUserCoordinates(input.user);
  if (!coords) {
    return {
      places: [],
      intent: pickIntent(input.specialty, input.intentId),
      blocked: true,
      message: "Could not resolve your location. Try updating your address.",
    };
  }

  const searchArea = {
    label: coords.label,
    lat: coords.lat,
    lng: coords.lng,
  };

  const intent = pickIntent(input.specialty, input.intentId, contextText);
  const results = await searchPlacesWithFallbacks({
    lat: coords.lat,
    lng: coords.lng,
    queries: intent.searchQueries,
    maxResults: 5,
  });

  if (results.length === 0) {
    return {
      places: [],
      intent,
      blocked: false,
      message:
        "No nearby matches found for that category. Try another type or broaden your saved location.",
    };
  }

  const contextSnippet =
    contextText.trim().slice(0, 80) || intent.description;

  const mapped = results.map((r) => ({
    googlePlaceId: r.googlePlaceId,
    name: r.name,
    address: r.address,
    lat: r.lat,
    lng: r.lng,
    types: r.types,
    intent: intent.id,
    reason: buildReason(intent, contextSnippet),
    distanceMeters: r.distanceMeters,
    mapsUrl: r.mapsUrl,
  }));

  if (input.consultationId && mapped.length > 0) {
    const saved = await insertPlaceSuggestions(
      input.consultationId,
      input.user.id,
      mapped,
    );
    return { places: saved, intent, blocked: false, searchArea };
  }

  return {
    places: mapped.map((p, i) => ({
      id: `ephemeral-${i}`,
      consultation_id: input.consultationId ?? "",
      user_id: input.user.id,
      google_place_id: p.googlePlaceId,
      name: p.name,
      address: p.address,
      lat: p.lat,
      lng: p.lng,
      types: p.types,
      intent: p.intent,
      reason: p.reason,
      distance_meters: p.distanceMeters,
      maps_url: p.mapsUrl,
      created_at: new Date(),
    })),
    intent,
    blocked: false,
    searchArea,
  };
}

export async function suggestPlacesAfterFinalize(
  consultation: DbConsultation,
  user: DbUser,
): Promise<void> {
  try {
    await suggestPlacesForUser({
      user,
      specialty: consultation.specialty,
      consultationId: consultation.id,
    });
  } catch (error) {
    console.warn(
      "[places] Could not generate suggestions after finalize:",
      error instanceof Error ? error.message : error,
    );
  }
}

export function geocodeToHealthUpdate(
  geocoded: Awaited<ReturnType<typeof geocodeAddress>>,
  label: string,
): Partial<HealthProfileUpdate> {
  if (!geocoded) return { locationLabel: label };
  return {
    locationLat: geocoded.lat,
    locationLng: geocoded.lng,
    locationCity: geocoded.city ?? null,
    locationRegion: geocoded.region ?? null,
    locationCountry: geocoded.country ?? null,
    locationPostal: geocoded.postal ?? null,
    locationLabel: label,
  };
}
