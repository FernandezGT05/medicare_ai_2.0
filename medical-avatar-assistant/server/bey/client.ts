import type {
  Agent,
  Avatar,
  BeyCall,
  CreateAgentPayload,
  CreateCallPayload,
  Paginated,
  UpdateAgentPayload,
} from "./types.js";

const BEY_API_BASE_URL = "https://api.bey.dev";
const BEY_EMBED_BASE_URL = "https://bey.chat";

export class BeyApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
    readonly body?: unknown,
  ) {
    super(message);
    this.name = "BeyApiError";
  }
}

export async function beyFetch<T>(
  path: string,
  apiKey: string,
  init?: RequestInit,
): Promise<T> {
  const response = await fetch(`${BEY_API_BASE_URL}${path}`, {
    ...init,
    headers: {
      "x-api-key": apiKey,
      "content-type": "application/json",
      ...init?.headers,
    },
  });

  if (response.status === 204) {
    return undefined as T;
  }

  const text = await response.text();
  const body = text ? (JSON.parse(text) as unknown) : undefined;

  if (!response.ok) {
    const detail =
      typeof body === "object" &&
      body !== null &&
      "detail" in body &&
      Array.isArray((body as { detail: unknown }).detail)
        ? JSON.stringify((body as { detail: unknown }).detail)
        : text || response.statusText;

    throw new BeyApiError(
      `Beyond Presence API error (${response.status}): ${detail}`,
      response.status,
      body,
    );
  }

  return body as T;
}

export async function verifyApiKey(apiKey: string): Promise<boolean> {
  await beyFetch("/v1/auth/verify", apiKey, { method: "GET" });
  return true;
}

export async function listAgents(
  apiKey: string,
  limit = 50,
): Promise<Agent[]> {
  const page = await beyFetch<Paginated<Agent>>(
    `/v1/agents?limit=${limit}`,
    apiKey,
  );
  return page.data;
}

export async function retrieveAgent(
  apiKey: string,
  agentId: string,
): Promise<Agent> {
  return beyFetch<Agent>(`/v1/agents/${agentId}`, apiKey);
}

export async function createAgent(
  apiKey: string,
  payload: CreateAgentPayload,
): Promise<Agent> {
  return beyFetch<Agent>("/v1/agents", apiKey, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateAgent(
  apiKey: string,
  agentId: string,
  payload: UpdateAgentPayload,
): Promise<void> {
  await beyFetch<void>(`/v1/agents/${agentId}`, apiKey, {
    method: "PATCH",
    body: JSON.stringify(payload),
  });
}

export async function listAvatars(
  apiKey: string,
  limit = 50,
): Promise<Avatar[]> {
  const page = await beyFetch<Paginated<Avatar>>(
    `/v1/avatars?limit=${limit}`,
    apiKey,
  );
  return page.data;
}

export function embedUrl(agentId: string): string {
  return `${BEY_EMBED_BASE_URL}/${agentId}`;
}

export async function createCall(
  apiKey: string,
  payload: CreateCallPayload,
): Promise<BeyCall> {
  return beyFetch<BeyCall>("/v1/calls", apiKey, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
