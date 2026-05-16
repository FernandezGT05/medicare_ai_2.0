export type AgentLanguage = "en" | "en-US" | string;

export interface Agent {
  id: string;
  name: string;
  avatar_id: string;
  system_prompt: string;
  language?: AgentLanguage | null;
  greeting?: string | null;
  max_session_length_minutes?: number | null;
}

export interface Avatar {
  id: string;
  name: string;
  status: "to-train" | "training" | "available" | "failed";
  visibility: "public" | "private";
}

export interface Paginated<T> {
  data: T[];
  has_more: boolean;
  next_cursor?: string;
}

export interface CreateAgentPayload {
  name: string;
  avatar_id: string;
  system_prompt: string;
  language?: AgentLanguage;
  greeting?: string;
  max_session_length_minutes?: number;
}

export interface UpdateAgentPayload {
  name?: string;
  avatar_id?: string;
  system_prompt?: string;
  language?: AgentLanguage;
  greeting?: string;
  max_session_length_minutes?: number;
}

export interface BeyCall {
  id: string;
  agent_id: string;
  tags: Record<string, string>;
  started_at: string;
  ended_at: string | null;
  livekit_url: string;
  livekit_token: string;
}

export interface CreateCallPayload {
  agent_id: string;
  livekit_username?: string;
}
