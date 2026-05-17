import { assertApiKey } from "../config.js";
import {
  listAllCalls,
  listAllCallMessages,
  retrieveCall,
  type BeyCall,
} from "../bey/calls.js";
import {
  attachBeyCallId,
  deleteSummaryForConsultation,
  findConsultationByBeyCallId,
  findConsultationById,
  getSummaryForConsultation,
  insertSummary,
  listLinkedBeyCallIds,
  setConsultationCallTimes,
  setConsultationStatus,
} from "../db/consultations.js";
import type { DbConsultation } from "../db/types.js";
import { SPECIALTY_LABELS } from "./agentSpecialties.js";
import { suggestPlacesAfterFinalize } from "./places/suggestPlaces.js";
import { summarizeTranscript } from "./summarize.js";

const FINALIZE_RETRY_ATTEMPTS = 6;
const FINALIZE_RETRY_DELAY_MS = 2000;

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export function findMatchingCall(
  calls: BeyCall[],
  consultation: DbConsultation,
  usedCallIds: ReadonlySet<string> = new Set(),
): BeyCall | null {
  const startedMs = consultation.started_at.getTime();
  const windowStart = startedMs - 5 * 60_000;
  const windowEnd = startedMs + 4 * 60 * 60_000;

  const available = calls.filter((c) => !usedCallIds.has(c.id));

  const tagMatch = available.find(
    (c) =>
      c.tags?.consultationId === consultation.id ||
      c.tags?.consultation_id === consultation.id,
  );
  if (tagMatch) {
    return tagMatch;
  }

  const candidates = available
    .filter((c) => c.agent_id === consultation.bey_agent_id)
    .map((c) => ({ call: c, callStart: new Date(c.started_at).getTime() }))
    .filter(
      ({ callStart }) =>
        Number.isFinite(callStart) &&
        callStart >= windowStart &&
        callStart <= windowEnd,
    )
    .sort((a, b) => {
      const aDist = Math.abs(a.callStart - startedMs);
      const bDist = Math.abs(b.callStart - startedMs);
      if (aDist !== bDist) return aDist - bDist;
      const aEnded = a.call.ended_at ? 1 : 0;
      const bEnded = b.call.ended_at ? 1 : 0;
      if (aEnded !== bEnded) return bEnded - aEnded;
      return b.callStart - a.callStart;
    });

  return candidates[0]?.call ?? null;
}

async function resolveBeyCall(
  apiKey: string,
  consultation: DbConsultation,
): Promise<BeyCall> {
  if (consultation.bey_call_id) {
    return retrieveCall(apiKey, consultation.bey_call_id);
  }

  let lastError: Error | null = null;
  for (let attempt = 0; attempt < FINALIZE_RETRY_ATTEMPTS; attempt++) {
    const calls = await listAllCalls(apiKey);
    const usedCallIds = await listLinkedBeyCallIds();
    const match = findMatchingCall(calls, consultation, usedCallIds);
    if (match) {
      await attachBeyCallId(consultation.id, match.id);
      return match;
    }
    lastError = new Error(
      "Could not find your Beyond Presence call yet. Wait a few seconds and try again from History.",
    );
    if (attempt < FINALIZE_RETRY_ATTEMPTS - 1) {
      await sleep(FINALIZE_RETRY_DELAY_MS);
    }
  }
  throw lastError ?? new Error("Could not find Beyond Presence call.");
}

async function syncVisitTimesFromCall(
  consultationId: string,
  call: BeyCall,
): Promise<void> {
  if (!call.started_at) {
    return;
  }
  await setConsultationCallTimes(consultationId, call.started_at, call.ended_at);
}

export async function finalizeConsultationById(
  consultationId: string,
): Promise<{ ok: boolean; alreadyDone?: boolean }> {
  const consultation = await findConsultationById(consultationId);
  if (!consultation) {
    throw new Error("Consultation not found.");
  }
  return finalizeConsultation(consultation);
}

export async function finalizeConsultation(
  consultation: DbConsultation,
): Promise<{ ok: boolean; alreadyDone?: boolean }> {
  const existingSummary = await getSummaryForConsultation(consultation.id);
  if (existingSummary) {
    await setConsultationStatus(consultation.id, "completed", new Date());
    return { ok: true, alreadyDone: true };
  }

  const apiKey = assertApiKey();
  const beyCall = await resolveBeyCall(apiKey, consultation);
  await syncVisitTimesFromCall(consultation.id, beyCall);

  const duplicate = await findConsultationByBeyCallId(beyCall.id);
  if (duplicate && duplicate.id !== consultation.id) {
    throw new Error("This call is already linked to another visit.");
  }

  await setConsultationStatus(consultation.id, "summarizing");

  try {
    const messages = await listAllCallMessages(apiKey, beyCall.id);
    const specialtyLabel =
      SPECIALTY_LABELS[consultation.specialty] ?? consultation.specialty;
    const summary = await summarizeTranscript(messages, specialtyLabel);

    await insertSummary({
      consultationId: consultation.id,
      summary: summary.summary,
      topics: summary.topics,
      adviceGiven: summary.advice_given,
      followUp: summary.follow_up,
    });
    const endedAt = beyCall.ended_at ? new Date(beyCall.ended_at) : new Date();
    await setConsultationStatus(consultation.id, "completed", endedAt);
    const { findUserById } = await import("../db/users.js");
    const user = await findUserById(consultation.user_id);
    if (user) {
      await suggestPlacesAfterFinalize(consultation, user);
    }
    return { ok: true };
  } catch (error) {
    await setConsultationStatus(consultation.id, "failed", new Date());
    throw error;
  }
}

export async function regenerateConsultationSummary(
  consultation: DbConsultation,
): Promise<{ ok: boolean }> {
  await deleteSummaryForConsultation(consultation.id);
  await setConsultationStatus(consultation.id, "in_progress");
  const refreshed = await findConsultationById(consultation.id);
  if (!refreshed) {
    throw new Error("Consultation not found.");
  }
  return finalizeConsultation(refreshed);
}

export async function processCallEndedWebhook(input: {
  callId: string;
  agentId: string;
  messages: Array<{ sender: string; message: string; sent_at?: string }>;
  tags?: Record<string, string>;
}): Promise<void> {
  const existing = await findConsultationByBeyCallId(input.callId);
  if (existing?.status === "completed") {
    return;
  }

  let consultation = existing;
  if (!consultation) {
    const consultationId =
      input.tags?.consultationId ?? input.tags?.consultation_id;
    if (consultationId) {
      consultation = await findConsultationById(consultationId);
    }
  }
  if (!consultation) {
    const { findLatestInProgressForAgent } = await import(
      "../db/consultations.js"
    );
    consultation = await findLatestInProgressForAgent(input.agentId);
  }
  if (!consultation) {
    console.warn(
      `[webhook] No consultation matched for call ${input.callId} agent ${input.agentId}`,
    );
    return;
  }

  await attachBeyCallId(consultation.id, input.callId);

  try {
    const call = await retrieveCall(assertApiKey(), input.callId);
    await syncVisitTimesFromCall(consultation.id, call);
  } catch {
    // Webhook path can still summarize from provided messages.
  }

  if ((await getSummaryForConsultation(consultation.id)) !== null) {
    await setConsultationStatus(consultation.id, "completed", new Date());
    return;
  }

  await setConsultationStatus(consultation.id, "summarizing");

  try {
    const specialtyLabel =
      SPECIALTY_LABELS[consultation.specialty] ?? consultation.specialty;
    const summary = await summarizeTranscript(
      input.messages.map((m) => ({
        sender: m.sender === "ai" ? "agent" : m.sender,
        message: m.message,
        sent_at: m.sent_at ?? new Date().toISOString(),
      })),
      specialtyLabel,
    );
    await insertSummary({
      consultationId: consultation.id,
      summary: summary.summary,
      topics: summary.topics,
      adviceGiven: summary.advice_given,
      followUp: summary.follow_up,
    });
    await setConsultationStatus(consultation.id, "completed", new Date());
    const { findUserById } = await import("../db/users.js");
    const webhookUser = await findUserById(consultation.user_id);
    if (webhookUser) {
      await suggestPlacesAfterFinalize(consultation, webhookUser);
    }
  } catch (error) {
    await setConsultationStatus(consultation.id, "failed", new Date());
    throw error;
  }
}
