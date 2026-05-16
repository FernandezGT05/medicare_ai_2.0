import { Router } from "express";
import { verifyGoogleCredential } from "../auth/google.js";
import { signSessionToken, verifySessionToken } from "../auth/jwt.js";
import { requireAuth, type AuthenticatedRequest } from "../auth/middleware.js";
import { upsertUser, userToProfileResponse } from "../db/users.js";

export const authRouter = Router();

authRouter.post("/google", async (req, res) => {
  const credential =
    typeof req.body?.credential === "string" ? req.body.credential.trim() : "";
  if (!credential) {
    res.status(400).json({ error: "Missing Google credential." });
    return;
  }

  try {
    const googleUser = await verifyGoogleCredential(credential);
    const user = await upsertUser({
      googleSub: googleUser.googleSub,
      email: googleUser.email,
      name: googleUser.name,
      pictureUrl: googleUser.picture ?? null,
    });
    const token = await signSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture_url ?? undefined,
    });

    res.json({
      token,
      user: userToProfileResponse(user),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Google sign-in failed.";
    res.status(401).json({ error: message });
  }
});

authRouter.get("/me", requireAuth, (req, res) => {
  const { user } = req as AuthenticatedRequest;
  res.json({ user: userToProfileResponse(user) });
});

authRouter.post("/refresh", async (req, res) => {
  const token =
    typeof req.body?.token === "string" ? req.body.token.trim() : "";
  if (!token) {
    res.status(400).json({ error: "Missing token." });
    return;
  }
  try {
    const claims = await verifySessionToken(token);
    const { findUserById } = await import("../db/users.js");
    const user = await findUserById(claims.userId);
    if (!user) {
      res.status(401).json({ error: "Session expired." });
      return;
    }
    const nextToken = await signSessionToken({
      sub: user.id,
      email: user.email,
      name: user.name,
      picture: user.picture_url ?? undefined,
    });
    res.json({ token: nextToken });
  } catch {
    res.status(401).json({ error: "Invalid session." });
  }
});
