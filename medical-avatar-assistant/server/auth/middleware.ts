import type { NextFunction, Request, Response } from "express";
import { findUserById } from "../db/users.js";
import type { DbUser } from "../db/types.js";
import { verifySessionToken } from "./jwt.js";

export interface AuthenticatedRequest extends Request {
  user: DbUser;
}

/** After `requireAuth`, read the authenticated user (Express 5–safe cast). */
export function authUser(req: Request): DbUser {
  return (req as unknown as AuthenticatedRequest).user;
}

function bearerToken(req: Request): string | null {
  const header = req.headers.authorization;
  if (!header?.startsWith("Bearer ")) {
    return null;
  }
  return header.slice(7).trim() || null;
}

export async function requireAuth(
  req: Request,
  res: Response,
  next: NextFunction,
): Promise<void> {
  const token = bearerToken(req);
  if (!token) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }

  try {
    const claims = await verifySessionToken(token);
    const user = await findUserById(claims.userId);
    if (!user) {
      res.status(401).json({ error: "Session expired. Please sign in again." });
      return;
    }
    (req as AuthenticatedRequest).user = user;
    next();
  } catch {
    res.status(401).json({ error: "Invalid or expired session." });
  }
}
