import { randomUUID } from "crypto";
import { getDb } from "./db.js";
import type { DbHealthLogEntry } from "./types.js";

export type HealthLogKind = "medication" | "vital" | "symptom" | "note";

function mapRow(row: Record<string, unknown>): DbHealthLogEntry {
  return {
    id: String(row.id),
    user_id: String(row.user_id),
    kind: row.kind as HealthLogKind,
    title: String(row.title),
    value: row.value != null ? String(row.value) : null,
    unit: row.unit != null ? String(row.unit) : null,
    notes: row.notes != null ? String(row.notes) : null,
    recorded_at: new Date(String(row.recorded_at)),
    created_at: new Date(String(row.created_at)),
    updated_at: new Date(String(row.updated_at)),
  };
}

export function listHealthLogForUser(userId: string): DbHealthLogEntry[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT * FROM health_log_entries
       WHERE user_id = ?
       ORDER BY recorded_at DESC, created_at DESC`,
    )
    .all(userId) as Record<string, unknown>[];
  return rows.map(mapRow);
}

export function createHealthLogEntry(input: {
  userId: string;
  kind: HealthLogKind;
  title: string;
  value?: string | null;
  unit?: string | null;
  notes?: string | null;
  recordedAt: Date;
}): DbHealthLogEntry {
  const db = getDb();
  const id = randomUUID();
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO health_log_entries (id, user_id, kind, title, value, unit, notes, recorded_at, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.userId,
    input.kind,
    input.title.trim(),
    input.value?.trim() || null,
    input.unit?.trim() || null,
    input.notes?.trim() || null,
    input.recordedAt.toISOString(),
    now,
    now,
  );
  return mapRow(
    db.prepare(`SELECT * FROM health_log_entries WHERE id = ?`).get(id) as Record<
      string,
      unknown
    >,
  );
}

export function findHealthLogEntryForUser(
  id: string,
  userId: string,
): DbHealthLogEntry | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM health_log_entries WHERE id = ? AND user_id = ?`)
    .get(id, userId) as Record<string, unknown> | undefined;
  return row ? mapRow(row) : null;
}

export function deleteHealthLogEntryForUser(
  id: string,
  userId: string,
): boolean {
  const db = getDb();
  const result = db
    .prepare(`DELETE FROM health_log_entries WHERE id = ? AND user_id = ?`)
    .run(id, userId);
  return result.changes > 0;
}

export function healthLogEntryToJson(e: DbHealthLogEntry) {
  return {
    id: e.id,
    kind: e.kind,
    title: e.title,
    value: e.value,
    unit: e.unit,
    notes: e.notes,
    recordedAt: e.recorded_at.toISOString(),
    createdAt: e.created_at.toISOString(),
    updatedAt: e.updated_at.toISOString(),
  };
}
