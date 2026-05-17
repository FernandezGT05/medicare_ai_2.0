import { Router } from "express";
import { signSessionToken } from "../auth/jwt.js";
import { requireAuth, type AuthenticatedRequest } from "../auth/middleware.js";
import { healthProfileToResponse, updateHealthProfile } from "../db/healthProfile.js";
import { updateUserProfile, userToProfileResponse } from "../db/users.js";
import { buildLocationUpdateFromBody } from "../services/places/resolveLocation.js";

export const profileRouter = Router();

profileRouter.use(requireAuth);

profileRouter.get("/", (req, res) => {
  const { user } = req as AuthenticatedRequest;
  res.json({
    profile: userToProfileResponse(user),
    health: healthProfileToResponse(user),
  });
});

profileRouter.patch("/", async (req, res) => {
  const { user } = req as AuthenticatedRequest;
  const body = req.body ?? {};

  const name = typeof body.name === "string" ? body.name : undefined;
  const picture =
    body.picture === null || typeof body.picture === "string"
      ? body.picture
      : undefined;
  const phone =
    body.phone === null || typeof body.phone === "string"
      ? body.phone
      : undefined;
  const bio =
    body.bio === null || typeof body.bio === "string" ? body.bio : undefined;

  if (name !== undefined && name.trim().length > 80) {
    res.status(400).json({ error: "Name is too long (max 80 characters)." });
    return;
  }
  if (bio !== undefined && bio && bio.trim().length > 500) {
    res.status(400).json({ error: "Bio is too long (max 500 characters)." });
    return;
  }
  if (phone !== undefined && phone && phone.trim().length > 30) {
    res.status(400).json({ error: "Phone is too long." });
    return;
  }

  let updated = await updateUserProfile(user.id, {
    name,
    pictureUrl: picture,
    phone,
    bio,
  });
  if (!updated) {
    res.status(404).json({ error: "User not found." });
    return;
  }

  const locationResult = await buildLocationUpdateFromBody(user, body);
  if ("error" in locationResult) {
    res.status(400).json({ error: locationResult.error });
    return;
  }
  const locationUpdate = locationResult;

  if (Object.keys(locationUpdate).length > 0) {
    const withLocation = await updateHealthProfile(user.id, {
      ...locationUpdate,
      locationUsePrecise:
        typeof body.locationUsePrecise === "boolean"
          ? body.locationUsePrecise
          : undefined,
    });
    if (withLocation) updated = withLocation;
  }

  const profile = userToProfileResponse(updated);
  const token = await signSessionToken({
    sub: updated.id,
    email: updated.email,
    name: updated.name,
    picture: updated.picture_url ?? undefined,
  });

  res.json({ profile, token, health: healthProfileToResponse(updated) });
});
