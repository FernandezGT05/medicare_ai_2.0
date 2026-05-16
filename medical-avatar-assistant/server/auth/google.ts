import { OAuth2Client } from "google-auth-library";
import { getConfig } from "../config.js";

export interface VerifiedGoogleUser {
  googleSub: string;
  email: string;
  name: string;
  picture?: string;
}

export async function verifyGoogleCredential(
  credential: string,
): Promise<VerifiedGoogleUser> {
  const clientId = getConfig().googleClientId;
  if (!clientId) {
    throw new Error("GOOGLE_CLIENT_ID is not configured on the server.");
  }

  const client = new OAuth2Client(clientId);
  const ticket = await client.verifyIdToken({
    idToken: credential,
    audience: clientId,
  });
  const payload = ticket.getPayload();
  if (!payload?.sub || !payload.email) {
    throw new Error("Invalid Google token payload.");
  }

  return {
    googleSub: payload.sub,
    email: payload.email,
    name: payload.name ?? payload.email,
    picture: payload.picture,
  };
}
