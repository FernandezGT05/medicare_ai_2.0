import { randomUUID } from "crypto";
import { query, queryOne } from "./db.js";
import { mapUserRow } from "./rowMappers.js";
import type { DbUser } from "./types.js";

type UserRow = Parameters<typeof mapUserRow>[0];

export async function upsertUser(input: {
  googleSub: string;
  email: string;
  name: string;
  pictureUrl?: string | null;
}): Promise<DbUser> {
  const id = randomUUID();
  const row = await queryOne<UserRow>(
    `INSERT INTO users (id, google_sub, email, name, picture_url)
     VALUES ($1, $2, $3, $4, $5)
     ON CONFLICT (google_sub) DO UPDATE SET
       email = EXCLUDED.email,
       name = EXCLUDED.name,
       picture_url = EXCLUDED.picture_url,
       updated_at = NOW()
     RETURNING *`,
    [id, input.googleSub, input.email, input.name, input.pictureUrl ?? null],
  );
  if (!row) {
    throw new Error("Failed to upsert user.");
  }
  return mapUserRow(row);
}

export async function findUserById(id: string): Promise<DbUser | null> {
  const row = await queryOne<UserRow>(`SELECT * FROM users WHERE id = $1`, [
    id,
  ]);
  return row ? mapUserRow(row) : null;
}

export async function updateUserProfile(
  userId: string,
  input: {
    name?: string;
    pictureUrl?: string | null;
    phone?: string | null;
    bio?: string | null;
  },
): Promise<DbUser | null> {
  const existing = await findUserById(userId);
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

  await query(
    `UPDATE users
     SET name = $1, picture_url = $2, phone = $3, bio = $4, updated_at = NOW()
     WHERE id = $5`,
    [name, pictureUrl, phone, bio, userId],
  );

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
