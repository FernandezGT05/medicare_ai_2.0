import { embedUrl, retrieveAgent, updateAgent } from "../bey/client.js";
import type { Agent } from "../bey/types.js";
import type { AgentSpecialtyId } from "./agentSpecialties.js";
import {
  getSpecialtyGreeting,
  getSpecialtySystemPrompt,
} from "./specialtyPrompts.js";

export interface ResolvedSession {
  agent: Agent;
  embedUrl: string;
  specialty: AgentSpecialtyId;
  agentId: string;
}

/**
 * Applies the specialty prompt to the chosen agent, then returns embed session info.
 * Specialty and agent are independent — any agent can run any specialty prompt.
 */
export async function resolveSpecialtySession(
  apiKey: string,
  specialty: AgentSpecialtyId,
  agentId: string,
  priorContextBlock = "",
): Promise<ResolvedSession> {
  const systemPrompt =
    getSpecialtySystemPrompt(specialty) + (priorContextBlock || "");
  const greeting = getSpecialtyGreeting(specialty);

  await updateAgent(apiKey, agentId, {
    system_prompt: systemPrompt,
    greeting,
  });

  const agent = await retrieveAgent(apiKey, agentId);

  return {
    agent,
    embedUrl: embedUrl(agentId),
    specialty,
    agentId,
  };
}
