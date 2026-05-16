import { beyFetch } from "./client.js";
import type { Paginated } from "./types.js";

export interface BeyCall {
  id: string;
  agent_id: string;
  tags?: Record<string, string>;
  started_at: string;
  ended_at: string | null;
}

/** Raw list-call shape (top-level or nested under `status`). */
interface RawBeyCall {
  id: string;
  agent_id: string;
  tags?: Record<string, string>;
  started_at?: string;
  ended_at?: string | null;
  status?: {
    type?: string;
    started_at?: string;
    ended_at?: string | null;
  };
}

/** Bey recently moved call timestamps under `status`; normalize for matching. */
export function normalizeCall(raw: RawBeyCall): BeyCall {
  const started_at = raw.started_at ?? raw.status?.started_at ?? "";
  const ended_at =
    raw.ended_at !== undefined ? raw.ended_at : (raw.status?.ended_at ?? null);
  return {
    id: raw.id,
    agent_id: raw.agent_id,
    tags: raw.tags,
    started_at,
    ended_at,
  };
}

export interface BeyCallMessage {
  sender: "user" | "agent" | "ai" | string;
  message: string;
  sent_at: string;
}

function normalizeMessages(
  body: BeyCallMessage[] | Paginated<BeyCallMessage> | undefined,
): BeyCallMessage[] {
  if (!body) return [];
  const list = Array.isArray(body) ? body : body.data;
  return list.map((m) => ({
    message: m.message,
    sent_at: m.sent_at,
    sender: m.sender === "ai" ? "agent" : m.sender,
  }));
}

/** Fetch all recent calls (paginated). */
export async function listAllCalls(
  apiKey: string,
  maxPages = 5,
): Promise<BeyCall[]> {
  const calls: BeyCall[] = [];
  let cursor: string | null | undefined = undefined;

  for (let page = 0; page < maxPages; page++) {
    const query = new URLSearchParams({ limit: "50" });
    if (cursor) {
      query.set("cursor", cursor);
    }
    const response = await beyFetch<
      | Paginated<RawBeyCall>
      | { data?: RawBeyCall[]; has_more?: boolean; next_cursor?: string }
    >(`/v1/calls?${query}`, apiKey);

    const batch = (Array.isArray(response) ? response : (response.data ?? [])).map(
      normalizeCall,
    );
    calls.push(...batch);

    const hasMore =
      !Array.isArray(response) &&
      response.has_more === true &&
      Boolean(response.next_cursor);
    cursor = !Array.isArray(response) ? response.next_cursor : undefined;
    if (!hasMore || !cursor) {
      break;
    }
  }

  return calls;
}

export async function listCalls(
  apiKey: string,
  limit = 50,
): Promise<BeyCall[]> {
  const page = await beyFetch<Paginated<RawBeyCall>>(
    `/v1/calls?limit=${limit}`,
    apiKey,
  );
  return (page.data ?? []).map(normalizeCall);
}

export async function retrieveCall(
  apiKey: string,
  callId: string,
): Promise<BeyCall> {
  const raw = await beyFetch<RawBeyCall>(`/v1/calls/${callId}`, apiKey);
  return normalizeCall(raw);
}

/** Fetch the full transcript (paginated). */
export async function listAllCallMessages(
  apiKey: string,
  callId: string,
  maxPages = 10,
): Promise<BeyCallMessage[]> {
  const messages: BeyCallMessage[] = [];
  let cursor: string | null | undefined = undefined;

  for (let page = 0; page < maxPages; page++) {
    const query = new URLSearchParams({ limit: "100" });
    if (cursor) {
      query.set("cursor", cursor);
    }
    const body = await beyFetch<
      BeyCallMessage[] | Paginated<BeyCallMessage> | { data?: BeyCallMessage[]; has_more?: boolean; next_cursor?: string }
    >(`/v1/calls/${callId}/messages?${query}`, apiKey);

    messages.push(...normalizeMessages(body));

    const hasMore =
      !Array.isArray(body) &&
      body.has_more === true &&
      Boolean(body.next_cursor);
    cursor = !Array.isArray(body) ? body.next_cursor : undefined;
    if (!hasMore || !cursor) {
      break;
    }
  }

  return messages;
}

export async function listCallMessages(
  apiKey: string,
  callId: string,
): Promise<BeyCallMessage[]> {
  return listAllCallMessages(apiKey, callId, 1);
}
