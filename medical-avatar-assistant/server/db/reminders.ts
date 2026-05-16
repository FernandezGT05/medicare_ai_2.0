import { randomUUID } from "crypto";
import { getDb } from "./db.js";
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

export function listRemindersForUser(userId: string): DbReminder[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM reminders
       WHERE user_id = ?
       ORDER BY completed_at IS NOT NULL, due_at ASC`,
    )
    .all(userId) as Record<string, unknown>[];
  return rows.map(mapRow);
}

export function createReminder(input: {
  userId: string;
  kind: ReminderKind;
  title: string;
  notes?: string | null;
  dueAt: Date;
  consultationId?: string | null;
}): DbReminder {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO reminders (id, user_id, kind, title, notes, due_at, consultation_id, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.userId,
    input.kind,
    input.title.trim(),
    input.notes?.trim() || null,
    input.dueAt.toISOString(),
    input.consultationId ?? null,
    now,
    now,
  );
  return mapRow(
    db.prepare(`SELECT * FROM reminders WHERE id = ?`).get(id) as Record<
      string,
      unknown
    >,
  );
}

export function findReminderForUser(
  id: string,
  userId: string,
): DbReminder | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM reminders WHERE id = ? AND user_id = ?`)
    .get(id, userId) as Record<string, unknown> | undefined;
  return row ? mapRow(row) : null;
}

export function updateReminder(
  id: string,
  userId: string,
  input: {
    kind?: ReminderKind;
    title?: string;
    notes?: string | null;
    dueAt?: Date;
    completed?: boolean;
  },
): DbReminder | null {
  const existing = findReminderForUser(id, userId);
  if (!existing) return null;

  const completedAt =
    input.completed === true
      ? new Date().toISOString()
      : input.completed === false
        ? null
        : (existing.completed_at?.toISOString() ?? null);

  const db = getDb();
  db.prepare(
    `UPDATE reminders SET
       kind = ?,
       title = ?,
       notes = ?,
       due_at = ?,
       completed_at = ?,
       updated_at = datetime('now')
     WHERE id = ? AND user_id = ?`,
  ).run(
    input.kind ?? existing.kind,
    input.title?.trim() ?? existing.title,
    input.notes !== undefined ? input.notes?.trim() || null : existing.notes,
    (input.dueAt ?? existing.due_at).toISOString(),
    completedAt,
    id,
    userId,
  );

  return findReminderForUser(id, userId);
}

export function deleteReminderForUser(id: string, userId: string): boolean {
  const db = getDb();
  const result = db
    .prepare(`DELETE FROM reminders WHERE id = ? AND user_id = ?`)
    .run(id, userId);
  return result.changes > 0;
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
