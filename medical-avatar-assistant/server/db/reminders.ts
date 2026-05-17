import { randomUUID } from "crypto";
import { execute, query, queryOne } from "./db.js";
import type { DbReminder } from "./types.js";

export type ReminderKind = "appointment" | "medication" | "follow_up" | "custom";

function mapRow(row: Record<string, unknown>): DbReminder {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    kind: row.kind as ReminderKind,
    title: String(row.title),
    notes: row.notes != null ? String(row.notes) : null,
    due_at: new Date(String(row.due_at)),
    completed_at:
      row.completed_at != null ? new Date(String(row.completed_at)) : null,
    consultation_id:
      row.consultation_id != null ? String(row.consultation_id) : null,
    created_at: new Date(String(row.created_at)),
    updated_at: new Date(String(row.updated_at)),
  };
}

export async function listRemindersForUser(userId: string): Promise<DbReminder[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM reminders
     WHERE user_id = $1
     ORDER BY (completed_at IS NOT NULL), due_at ASC`,
    [userId],
  );
  return rows.map(mapRow);
}

export async function createReminder(input: {
  userId: string;
  kind: ReminderKind;
  title: string;
  notes?: string | null;
  dueAt: Date;
  consultationId?: string | null;
}): Promise<DbReminder> {
  const id = randomUUID();
  const now = new Date().toISOString();
  await execute(
    `INSERT INTO reminders (id, user_id, kind, title, notes, due_at, consultation_id, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)`,
    [
      id,
      input.userId,
      input.kind,
      input.title.trim(),
      input.notes?.trim() || null,
      input.dueAt.toISOString(),
      input.consultationId ?? null,
      now,
      now,
    ],
  );
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM reminders WHERE id = $1`,
    [id],
  );
  if (!row) {
    throw new Error("Failed to create reminder.");
  }
  return mapRow(row);
}

export async function findReminderForUser(
  id: string,
  userId: string,
): Promise<DbReminder | null> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM reminders WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return row ? mapRow(row) : null;
}

export async function updateReminder(
  id: string,
  userId: string,
  input: {
    kind?: ReminderKind;
    title?: string;
    notes?: string | null;
    dueAt?: Date;
    completed?: boolean;
  },
): Promise<DbReminder | null> {
  const existing = await findReminderForUser(id, userId);
  if (!existing) return null;

  const completedAt =
    input.completed === true
      ? new Date().toISOString()
      : input.completed === false
        ? null
        : (existing.completed_at?.toISOString() ?? null);

  await execute(
    `UPDATE reminders SET
       kind = $1,
       title = $2,
       notes = $3,
       due_at = $4,
       completed_at = $5,
       updated_at = NOW()
     WHERE id = $6 AND user_id = $7`,
    [
      input.kind ?? existing.kind,
      input.title?.trim() ?? existing.title,
      input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
      (input.dueAt ?? existing.due_at).toISOString(),
      completedAt,
      id,
      userId,
    ],
  );

  return findReminderForUser(id, userId);
}

export async function deleteReminderForUser(
  id: string,
  userId: string,
): Promise<boolean> {
  const changes = await execute(
    `DELETE FROM reminders WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return changes > 0;
}

export function reminderToJson(r: DbReminder) {
  return {
    id: r.id,
    kind: r.kind,
    title: r.title,
    notes: r.notes,
    dueAt: r.due_at.toISOString(),
    completedAt: r.completed_at?.toISOString() ?? null,
    consultationId: r.consultation_id,
    createdAt: r.created_at.toISOString(),
    updatedAt: r.updated_at.toISOString(),
  };
}
