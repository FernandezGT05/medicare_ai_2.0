import { Router } from "express";
import { authUser, requireAuth } from "../auth/middleware.js";
import { findConsultationForUser } from "../db/consultations.js";
import { listPlaceSuggestionsForConsultation } from "../db/placeSuggestions.js";
import type { DbPlaceSuggestion } from "../db/types.js";
import { isAgentSpecialtyId } from "../services/agentSpecialties.js";
import { getIntentsForSpecialty } from "../services/places/placeIntents.js";
import { suggestPlacesForUser } from "../services/places/suggestPlaces.js";

export const placesRouter = Router();

placesRouter.use(requireAuth);

function placeToJson(p: DbPlaceSuggestion) {
  return {
    id: p.id,
    consultationId: p.consultation_id,
    googlePlaceId: p.google_place_id,
    name: p.name,
    address: p.address,
    lat: p.lat,
    lng: p.lng,
    types: p.types,
    intent: p.intent,
    reason: p.reason,
    distanceMeters: p.distance_meters,
    mapsUrl: p.maps_url,
  };
}

placesRouter.get("/intents", (req, res) => {
  const specialty =
    typeof req.query.specialty === "string" ? req.query.specialty.trim() : "";
  if (!isAgentSpecialtyId(specialty)) {
    res.status(400).json({ error: "Invalid specialty." });
    return;
  }
  res.json({ intents: getIntentsForSpecialty(specialty) });
});

placesRouter.get("/consultation/:consultationId", async (req, res) => {
  const user = authUser(req);
  const consultation = await findConsultationForUser(
    req.params.consultationId,
    user.id,
  );
  if (!consultation) {
    res.status(404).json({ error: "Visit not found." });
    return;
  }
  const places = await listPlaceSuggestionsForConsultation(consultation.id);
  res.json({ places: places.map(placeToJson) });
});

placesRouter.post("/suggest", async (req, res) => {
  const user = authUser(req);
  const body = req.body ?? {};
  const specialty =
    typeof body.specialty === "string" ? body.specialty.trim() : "";
  if (!isAgentSpecialtyId(specialty)) {
    res.status(400).json({ error: "Invalid or missing specialty." });
    return;
  }

  let consultationId =
    typeof body.consultationId === "string"
      ? body.consultationId.trim()
      : undefined;
  if (consultationId) {
    const consultation = await findConsultationForUser(consultationId, user.id);
    if (!consultation) {
      res.status(404).json({ error: "Visit not found." });
      return;
    }
  }

  const intentId =
    typeof body.intentId === "string" ? body.intentId.trim() : undefined;
  const contextText =
    typeof body.contextText === "string" ? body.contextText : undefined;

  const result = await suggestPlacesForUser({
    user,
    specialty,
    consultationId,
    intentId,
    contextText,
  });

  res.json({
    blocked: result.blocked,
    message: result.message ?? null,
    intent: result.intent,
    places: result.places.map(placeToJson),
    searchArea: result.searchArea ?? null,
  });
});
