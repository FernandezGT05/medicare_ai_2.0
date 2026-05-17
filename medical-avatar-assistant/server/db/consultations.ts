import { randomUUID } from "crypto";
import { execute, query, queryOne } from "./db.js";
import { parseDbUtc, toDbUtcIso } from "./datetime.js";
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

export async function createConsultation(input: {
  userId: string;
  specialty: AgentSpecialtyId;
  catalogAgentId: string;
  beyAgentId: string;
}): Promise<DbConsultation> {
  const id = randomUUID();
  await query(
    `INSERT INTO consultations (id, user_id, specialty, catalog_agent_id, bey_agent_id)
     VALUES ($1, $2, $3, $4, $5)`,
    [id, input.userId, input.specialty, input.catalogAgentId, input.beyAgentId],
  );
  const created = await findConsultationById(id);
  if (!created) {
    throw new Error("Failed to create consultation.");
  }
  return created;
}

export async function findConsultationById(
  id: string,
): Promise<DbConsultation | null> {
  const row = await queryOne<ConsultationRow>(
    `SELECT * FROM consultations WHERE id = $1`,
    [id],
  );
  return row ? mapConsultationRow(row) : null;
}

export async function findConsultationForUser(
  id: string,
  userId: string,
): Promise<DbConsultation | null> {
  const row = await queryOne<ConsultationRow>(
    `SELECT * FROM consultations WHERE id = $1 AND user_id = $2`,
    [id, userId],
  );
  return row ? mapConsultationRow(row) : null;
}

export async function findConsultationByBeyCallId(
  beyCallId: string,
): Promise<DbConsultation | null> {
  const row = await queryOne<ConsultationRow>(
    `SELECT * FROM consultations WHERE bey_call_id = $1`,
    [beyCallId],
  );
  return row ? mapConsultationRow(row) : null;
}

export async function findLatestInProgressForUser(
  userId: string,
): Promise<DbConsultation | null> {
  const row = await queryOne<ConsultationRow>(
    `SELECT * FROM consultations
     WHERE user_id = $1 AND status = 'in_progress'
     ORDER BY started_at DESC
     LIMIT 1`,
    [userId],
  );
  return row ? mapConsultationRow(row) : null;
}

export async function findLatestInProgressForAgent(
  beyAgentId: string,
  maxAgeMinutes = 120,
): Promise<DbConsultation | null> {
  const row = await queryOne<ConsultationRow>(
    `SELECT * FROM consultations
     WHERE bey_agent_id = $1
       AND status = 'in_progress'
       AND started_at >= NOW() - ($2::int * INTERVAL '1 minute')
     ORDER BY started_at DESC
     LIMIT 1`,
    [beyAgentId, maxAgeMinutes],
  );
  return row ? mapConsultationRow(row) : null;
}

export async function listLinkedBeyCallIds(): Promise<Set<string>> {
  const rows = await query<{ bey_call_id: string }>(
    `SELECT bey_call_id FROM consultations WHERE bey_call_id IS NOT NULL`,
  );
  return new Set(rows.map((r) => r.bey_call_id));
}

export async function abandonStaleInProgressForUser(
  userId: string,
  keepConsultationId: string,
): Promise<void> {
  await execute(
    `UPDATE consultations
     SET status = 'failed',
         ended_at = COALESCE(ended_at, NOW())
     WHERE user_id = $1
       AND status = 'in_progress'
       AND id != $2`,
    [userId, keepConsultationId],
  );
}

export async function attachBeyCallId(
  consultationId: string,
  beyCallId: string,
): Promise<void> {
  await execute(
    `UPDATE consultations SET bey_call_id = $1 WHERE id = $2 AND bey_call_id IS NULL`,
    [beyCallId, consultationId],
  );
}

export async function setConsultationCallTimes(
  consultationId: string,
  startedAt: string,
  endedAt: string | null,
): Promise<void> {
  const started = toDbUtcIso(new Date(startedAt));
  const ended = endedAt ? toDbUtcIso(new Date(endedAt)) : null;
  await execute(
    `UPDATE consultations SET started_at = $1, ended_at = COALESCE($2, ended_at) WHERE id = $3`,
    [started, ended, consultationId],
  );
}

export async function deleteSummaryForConsultation(
  consultationId: string,
): Promise<boolean> {
  const changes = await execute(
    `DELETE FROM consultation_summaries WHERE consultation_id = $1`,
    [consultationId],
  );
  return changes > 0;
}

export async function setConsultationStatus(
  consultationId: string,
  status: ConsultationStatus,
  endedAt?: Date,
): Promise<void> {
  const ended =
    endedAt ??
    (status === "completed" || status === "failed" ? new Date() : null);
  if (ended) {
    await execute(
      `UPDATE consultations SET status = $1, ended_at = COALESCE(ended_at, $2) WHERE id = $3`,
      [status, ended.toISOString(), consultationId],
    );
  } else {
    await execute(`UPDATE consultations SET status = $1 WHERE id = $2`, [
      status,
      consultationId,
    ]);
  }
}

export async function insertSummary(input: {
  consultationId: string;
  summary: string;
  topics: string[];
  adviceGiven: string[];
  followUp: string | null;
}): Promise<DbConsultationSummary> {
  const existing = await queryOne<SummaryRow>(
    `SELECT * FROM consultation_summaries WHERE consultation_id = $1`,
    [input.consultationId],
  );
  if (existing) {
    return mapSummaryRow(existing);
  }

  const id = randomUUID();
  await query(
    `INSERT INTO consultation_summaries
       (id, consultation_id, summary, topics, advice_given, follow_up)
     VALUES ($1, $2, $3, $4, $5, $6)`,
    [
      id,
      input.consultationId,
      input.summary,
      JSON.stringify(input.topics),
      JSON.stringify(input.adviceGiven),
      input.followUp,
    ],
  );

  const row = await queryOne<SummaryRow>(
    `SELECT * FROM consultation_summaries WHERE consultation_id = $1`,
    [input.consultationId],
  );
  if (!row) {
    throw new Error("Failed to insert summary.");
  }
  return mapSummaryRow(row);
}

export async function getSummaryForConsultation(
  consultationId: string,
): Promise<DbConsultationSummary | null> {
  const row = await queryOne<SummaryRow>(
    `SELECT * FROM consultation_summaries WHERE consultation_id = $1`,
    [consultationId],
  );
  return row ? mapSummaryRow(row) : null;
}

export async function listHistoryForUser(
  userId: string,
): Promise<HistoryListItem[]> {
  const rows = await query<{
    id: string;
    specialty: string;
    catalog_agent_id: string;
    started_at: string | Date;
    ended_at: string | Date | null;
    status: ConsultationStatus;
    summary: string | null;
    topics: string | null;
    advice_given: string | null;
    follow_up: string | null;
  }>(
    `SELECT c.id, c.specialty, c.catalog_agent_id, c.started_at, c.ended_at, c.status,
            s.summary, s.topics, s.advice_given, s.follow_up
     FROM consultations c
     LEFT JOIN consultation_summaries s ON s.consultation_id = c.id
     WHERE c.user_id = $1
     ORDER BY c.started_at DESC`,
    [userId],
  );

  return rows.map((row) => ({
    consultationId: row.id,
    specialty: row.specialty as AgentSpecialtyId,
    catalogAgentId: row.catalog_agent_id,
    startedAt: parseDbUtc(row.started_at).toISOString(),
    endedAt: row.ended_at ? parseDbUtc(row.ended_at).toISOString() : null,
    status: row.status,
    summary: row.summary,
    topics: row.topics ? (JSON.parse(row.topics) as string[]) : [],
    adviceGiven: row.advice_given
      ? (JSON.parse(row.advice_given) as string[])
      : [],
    followUp: row.follow_up,
  }));
}

export async function deleteConsultationForUser(
  consultationId: string,
  userId: string,
): Promise<boolean> {
  const changes = await execute(
    `DELETE FROM consultations WHERE id = $1 AND user_id = $2`,
    [consultationId, userId],
  );
  return changes > 0;
}
