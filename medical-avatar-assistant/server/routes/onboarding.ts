import { Router } from "express";
import { signSessionToken } from "../auth/jwt.js";
import { authUser, requireAuth } from "../auth/middleware.js";
import { buildLocationUpdateFromBody } from "../services/places/resolveLocation.js";
import { geocodeAddress } from "../services/places/googlePlaces.js";
import {
  hasCompletedOnboarding,
  healthProfileToResponse,
  updateHealthProfile,
} from "../db/healthProfile.js";
import { userToProfileResponse } from "../db/users.js";

export const onboardingRouter = Router();

onboardingRouter.use(requireAuth);

onboardingRouter.get("/", (req, res) => {
  const user = authUser(req);
  res.json({
    completed: hasCompletedOnboarding(user),
    health: healthProfileToResponse(user),
    profile: userToProfileResponse(user),
  });
});

onboardingRouter.put("/", async (req, res) => {
  const user = authUser(req);
  const body = req.body ?? {};

  const locationResult = await buildLocationUpdateFromBody(user, body);
  if ("error" in locationResult) {
    res.status(400).json({ error: locationResult.error });
    return;
  }
  const locationUpdate = locationResult;

  const allergies = Array.isArray(body.allergies)
    ? body.allergies.filter((a: unknown) => typeof a === "string")
    : undefined;

  const updated = await updateHealthProfile(user.id, {
    name: typeof body.name === "string" ? body.name : undefined,
    dateOfBirth:
      body.dateOfBirth === null || typeof body.dateOfBirth === "string"
        ? body.dateOfBirth
        : undefined,
    weightKg:
      body.weightKg === null || typeof body.weightKg === "number"
        ? body.weightKg
        : undefined,
    heightCm:
      body.heightCm === null || typeof body.heightCm === "number"
        ? body.heightCm
        : undefined,
    gender:
      body.gender === null || typeof body.gender === "string"
        ? body.gender
        : undefined,
    allergies,
    locationUsePrecise:
      typeof body.locationUsePrecise === "boolean"
        ? body.locationUsePrecise
        : undefined,
    completeOnboarding: body.completeOnboarding === true,
    ...locationUpdate,
  });

  if (!updated) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  const token = await signSessionToken({
    sub: updated.id,
    email: updated.email,
    name: updated.name,
    picture: updated.picture_url ?? undefined,
  });

  res.json({
    profile: userToProfileResponse(updated),
    health: healthProfileToResponse(updated),
    token,
  });
});

/** Geocode an address or place description (onboarding autocomplete). */
onboardingRouter.post("/geocode", async (req, res) => {
  const address =
    typeof req.body?.address === "string" ? req.body.address.trim() : "";
  if (!address) {
    res.status(400).json({ error: "Address is required." });
    return;
  }
  const geocoded = await geocodeAddress(address);
  if (!geocoded) {
    res.status(404).json({ error: "Could not find that location." });
    return;
  }
  res.json({
    lat: geocoded.lat,
    lng: geocoded.lng,
    city: geocoded.city ?? null,
    region: geocoded.region ?? null,
    country: geocoded.country ?? null,
    postal: geocoded.postal ?? null,
    label: address,
  });
});
