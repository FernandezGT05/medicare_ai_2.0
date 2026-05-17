import { randomUUID } from "crypto";
import { execute, query, queryOne } from "./db.js";
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

export async function listHealthLogForUser(
  userId: string,
): Promise<DbHealthLogEntry[]> {
  const rows = await query<Record<string, unknown>>(
    `SELECT * FROM health_log_entries
     WHERE user_id = $1
     ORDER BY recorded_at DESC, created_at DESC`,
    [userId],
  );
  return rows.map(mapRow);
}

export async function createHealthLogEntry(input: {
  userId: string;
  kind: HealthLogKind;
  title: string;
  value?: string | null;
  unit?: string | null;
  notes?: string | null;
  recordedAt: Date;
}): Promise<DbHealthLogEntry> {
  const id = randomUUID();
  const now = new Date().toISOString();
  await execute(
    `INSERT INTO health_log_entries (id, user_id, kind, title, value, unit, notes, recorded_at, created_at, updated_at)
     VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
    [
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
    ],
  );
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM health_log_entries WHERE id = $1`,
    [id],
  );
  if (!row) {
    throw new Error("Failed to create health log entry.");
  }
  return mapRow(row);
}

export async function findHealthLogEntryForUser(
  id: string,
  userId: string,
): Promise<DbHealthLogEntry | null> {
  const row = await queryOne<Record<string, unknown>>(
    `SELECT * FROM health_log_entries WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return row ? mapRow(row) : null;
}

export async function deleteHealthLogEntryForUser(
  id: string,
  userId: string,
): Promise<boolean> {
  const changes = await execute(
    `DELETE FROM health_log_entries WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return changes > 0;
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
