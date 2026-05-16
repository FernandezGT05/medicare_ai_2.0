export const AGENT_SPECIALTY_IDS = [
  "fitness-nutrition",
  "physical-injuries",
  "mental-health",
  "symptom-guidance",
] as const;

export type AgentSpecialtyId = (typeof AGENT_SPECIALTY_IDS)[number];

export function isAgentSpecialtyId(value: string): value is AgentSpecialtyId {
  return (AGENT_SPECIALTY_IDS as readonly string[]).includes(value);
}

export const SPECIALTY_LABELS: Record<AgentSpecialtyId, string> = {
  "fitness-nutrition": "Fitness & nutrition",
  "physical-injuries": "Physical injuries",
  "mental-health": "Mental health & emotional support",
  "symptom-guidance": "Symptom guidance",
};
