import { randomUUID } from "crypto";
import { getDb } from "./db.js";
import { mapUserRow } from "./rowMappers.js";
import type { DbUser } from "./types.js";

export function upsertUser(input: {
  googleSub: string;
  email: string;
  name: string;
  pictureUrl?: string | null;
}): DbUser {
  const db = getDb();
  const existing = db
    .prepare(`SELECT * FROM users WHERE google_sub = ?`)
    .get(input.googleSub) as Parameters<typeof mapUserRow>[0] | undefined;

  if (existing) {
    db.prepare(
      `UPDATE users SET email = ?, name = ?, picture_url = ?, updated_at = datetime('now')
       WHERE google_sub = ?`,
    ).run(input.email, input.name, input.pictureUrl ?? null, input.googleSub);
    const updated = db
      .prepare(`SELECT * FROM users WHERE google_sub = ?`)
      .get(input.googleSub) as Parameters<typeof mapUserRow>[0];
    return mapUserRow(updated);
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO users (id, google_sub, email, name, picture_url)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(id, input.googleSub, input.email, input.name, input.pictureUrl ?? null);

  const row = db
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(id) as Parameters<typeof mapUserRow>[0];
  return mapUserRow(row);
}

export function findUserById(id: string): DbUser | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM users WHERE id = ?`)
    .get(id) as Parameters<typeof mapUserRow>[0] | undefined;
  return row ? mapUserRow(row) : null;
}

export function updateUserProfile(
  userId: string,
  input: {
    name?: string;
    pictureUrl?: string | null;
    phone?: string | null;
    bio?: string | null;
  },
): DbUser | null {
  const db = getDb();
  const existing = findUserById(userId);
  if (!existing) return null;

  const name =
    input.name !== undefined ? input.name.trim() || existing.name : existing.name;
  const pictureUrl =
    input.pictureUrl !== undefined ? input.pictureUrl : existing.picture_url;
  const phone =
    input.phone !== undefined
      ? input.phone?.trim() || null
      : existing.phone;
  const bio =
    input.bio !== undefined ? input.bio?.trim() || null : existing.bio;

  db.prepare(
    `UPDATE users
     SET name = ?, picture_url = ?, phone = ?, bio = ?, updated_at = datetime('now')
     WHERE id = ?`,
  ).run(name, pictureUrl, phone, bio, userId);

  return findUserById(userId);
}

export function userToProfileResponse(user: DbUser) {
  return {
    sub: user.google_sub,
    email: user.email,
    name: user.name,
    picture: user.picture_url,
    phone: user.phone,
    bio: user.bio,
    updatedAt: user.updated_at.toISOString(),
  };
}
