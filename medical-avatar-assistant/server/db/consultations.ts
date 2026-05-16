import { randomUUID } from "crypto";
import { getDb } from "./db.js";
import { parseSqliteUtc, toSqliteUtcIso } from "./datetime.js";
import { mapConsultationRow, mapSummaryRow } from "./rowMappers.js";
import type { AgentSpecialtyId } from "../services/agentSpecialties.js";
import type {
  ConsultationStatus,
  DbConsultation,
  DbConsultationSummary,
  HistoryListItem,
} from "./types.js";

type ConsultationRow = Parameters<typeof mapConsultationRow>[0];
type SummaryRow = Parameters<typeof mapSummaryRow>[0];

export function createConsultation(input: {
  userId: string;
  specialty: AgentSpecialtyId;
  catalogAgentId: string;
  beyAgentId: string;
}): DbConsultation {
  const db = getDb();
  const id = randomUUID();
  db.prepare(
    `INSERT INTO consultations (id, user_id, specialty, catalog_agent_id, bey_agent_id)
     VALUES (?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.userId,
    input.specialty,
    input.catalogAgentId,
    input.beyAgentId,
  );
  return findConsultationById(id)!;
}

export function findConsultationById(id: string): DbConsultation | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM consultations WHERE id = ?`)
    .get(id) as ConsultationRow | undefined;
  return row ? mapConsultationRow(row) : null;
}

export function findConsultationForUser(
  id: string,
  userId: string,
): DbConsultation | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM consultations WHERE id = ? AND user_id = ?`)
    .get(id, userId) as ConsultationRow | undefined;
  return row ? mapConsultationRow(row) : null;
}

export function findConsultationByBeyCallId(
  beyCallId: string,
): DbConsultation | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM consultations WHERE bey_call_id = ?`)
    .get(beyCallId) as ConsultationRow | undefined;
  return row ? mapConsultationRow(row) : null;
}

/** Latest in-progress visit for an agent (webhook fallback when tags are missing). */
export function findLatestInProgressForUser(
  userId: string,
): DbConsultation | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM consultations
       WHERE user_id = ? AND status = 'in_progress'
       ORDER BY started_at DESC
       LIMIT 1`,
    )
    .get(userId) as ConsultationRow | undefined;
  return row ? mapConsultationRow(row) : null;
}

export function findLatestInProgressForAgent(
  beyAgentId: string,
  maxAgeMinutes = 120,
): DbConsultation | null {
  const db = getDb();
  const row = db
    .prepare(
      `SELECT * FROM consultations
       WHERE bey_agent_id = ?
         AND status = 'in_progress'
         AND datetime(started_at) >= datetime('now', ?)
       ORDER BY started_at DESC
       LIMIT 1`,
    )
    .get(beyAgentId, `-${maxAgeMinutes} minutes`) as ConsultationRow | undefined;
  return row ? mapConsultationRow(row) : null;
}

/** Bey call IDs already linked to a visit (avoid double-matching). */
export function listLinkedBeyCallIds(): Set<string> {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT bey_call_id FROM consultations WHERE bey_call_id IS NOT NULL`,
    )
    .all() as Array<{ bey_call_id: string }>;
  return new Set(rows.map((r) => r.bey_call_id));
}

/** Mark older in-progress visits as failed when the user starts a new one. */
export function abandonStaleInProgressForUser(
  userId: string,
  keepConsultationId: string,
): void {
  const db = getDb();
  db.prepare(
    `UPDATE consultations
     SET status = 'failed',
         ended_at = COALESCE(ended_at, datetime('now'))
     WHERE user_id = ?
       AND status = 'in_progress'
       AND id != ?`,
  ).run(userId, keepConsultationId);
}

export function attachBeyCallId(
  consultationId: string,
  beyCallId: string,
): void {
  const db = getDb();
  db.prepare(
    `UPDATE consultations SET bey_call_id = ? WHERE id = ? AND bey_call_id IS NULL`,
  ).run(beyCallId, consultationId);
}

/** Align visit timestamps with the Beyond Presence call (actual conversation time). */
export function setConsultationCallTimes(
  consultationId: string,
  startedAt: string,
  endedAt: string | null,
): void {
  const db = getDb();
  const started = toSqliteUtcIso(new Date(startedAt));
  const ended = endedAt ? toSqliteUtcIso(new Date(endedAt)) : null;
  db.prepare(
    `UPDATE consultations SET started_at = ?, ended_at = COALESCE(?, ended_at) WHERE id = ?`,
  ).run(started, ended, consultationId);
}

export function deleteSummaryForConsultation(consultationId: string): boolean {
  const db = getDb();
  const result = db
    .prepare(`DELETE FROM consultation_summaries WHERE consultation_id = ?`)
    .run(consultationId);
  return result.changes > 0;
}

export function setConsultationStatus(
  consultationId: string,
  status: ConsultationStatus,
  endedAt?: Date,
): void {
  const db = getDb();
  const ended =
    endedAt?.toISOString() ??
    (status === "completed" || status === "failed"
      ? new Date().toISOString()
      : null);
  if (ended) {
    db.prepare(
      `UPDATE consultations SET status = ?, ended_at = COALESCE(ended_at, ?) WHERE id = ?`,
    ).run(status, ended, consultationId);
  } else {
    db.prepare(`UPDATE consultations SET status = ? WHERE id = ?`).run(
      status,
      consultationId,
    );
  }
}

export function insertSummary(input: {
  consultationId: string;
  summary: string;
  topics: string[];
  adviceGiven: string[];
  followUp: string | null;
}): DbConsultationSummary {
  const db = getDb();
  const existing = db
    .prepare(`SELECT * FROM consultation_summaries WHERE consultation_id = ?`)
    .get(input.consultationId) as SummaryRow | undefined;
  if (existing) {
    return mapSummaryRow(existing);
  }

  const id = randomUUID();
  db.prepare(
    `INSERT INTO consultation_summaries
       (id, consultation_id, summary, topics, advice_given, follow_up)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run(
    id,
    input.consultationId,
    input.summary,
    JSON.stringify(input.topics),
    JSON.stringify(input.adviceGiven),
    input.followUp,
  );

  const row = db
    .prepare(`SELECT * FROM consultation_summaries WHERE consultation_id = ?`)
    .get(input.consultationId) as SummaryRow;
  return mapSummaryRow(row);
}

export function getSummaryForConsultation(
  consultationId: string,
): DbConsultationSummary | null {
  const db = getDb();
  const row = db
    .prepare(`SELECT * FROM consultation_summaries WHERE consultation_id = ?`)
    .get(consultationId) as SummaryRow | undefined;
  return row ? mapSummaryRow(row) : null;
}

export function listHistoryForUser(userId: string): HistoryListItem[] {
  const db = getDb();
  const rows = db
    .prepare(
      `SELECT c.id, c.specialty, c.catalog_agent_id, c.started_at, c.ended_at, c.status,
              s.summary, s.topics, s.advice_given, s.follow_up
       FROM consultations c
       LEFT JOIN consultation_summaries s ON s.consultation_id = c.id
       WHERE c.user_id = ?
       ORDER BY c.started_at DESC`,
    )
    .all(userId) as Array<{
    id: string;
    specialty: string;
    catalog_agent_id: string;
    started_at: string;
    ended_at: string | null;
    status: ConsultationStatus;
    summary: string | null;
    topics: string | null;
    advice_given: string | null;
    follow_up: string | null;
  }>;

  return rows.map((row) => ({
    consultationId: row.id,
    specialty: row.specialty as AgentSpecialtyId,
    catalogAgentId: row.catalog_agent_id,
    startedAt: parseSqliteUtc(row.started_at).toISOString(),
    endedAt: row.ended_at ? parseSqliteUtc(row.ended_at).toISOString() : null,
    status: row.status,
    summary: row.summary,
    topics: row.topics ? (JSON.parse(row.topics) as string[]) : [],
    adviceGiven: row.advice_given
      ? (JSON.parse(row.advice_given) as string[])
      : [],
    followUp: row.follow_up,
  }));
}

export function deleteConsultationForUser(
  consultationId: string,
  userId: string,
): boolean {
  const db = getDb();
  const result = db
    .prepare(`DELETE FROM consultations WHERE id = ? AND user_id = ?`)
    .run(consultationId, userId);
  return result.changes > 0;
}
