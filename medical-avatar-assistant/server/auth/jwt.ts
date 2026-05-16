import { SignJWT, jwtVerify } from "jose";
import { getConfig } from "../config.js";

export interface SessionClaims {
  sub: string;
  email: string;
  name: string;
  picture?: string;
}

function secretKey(): Uint8Array {
  const secret = getConfig().jwtSecret;
  if (!secret) {
    throw new Error("JWT_SECRET is not configured.");
  }
  return new TextEncoder().encode(secret);
}

export async function signSessionToken(
  claims: SessionClaims,
  expiresIn = "7d",
): Promise<string> {
  return new SignJWT({ ...claims })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secretKey());
}

export async function verifySessionToken(
  token: string,
): Promise<SessionClaims & { userId: string }> {
  const { payload } = await jwtVerify(token, secretKey());
  const sub = payload.sub;
  if (typeof sub !== "string") {
    throw new Error("Invalid session token.");
  }
  return {
    userId: sub,
    sub,
    email: String(payload.email ?? ""),
    name: String(payload.name ?? ""),
    picture:
      typeof payload.picture === "string" ? payload.picture : undefined,
  };
}
