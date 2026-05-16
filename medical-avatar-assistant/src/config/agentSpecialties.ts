export const AGENT_SPECIALTY_IDS = [
  "fitness-nutrition",
  "physical-injuries",
  "mental-health",
  "symptom-guidance",
] as const;

export type AgentSpecialtyId = (typeof AGENT_SPECIALTY_IDS)[number];

export interface AgentSpecialtyOption {
  id: AgentSpecialtyId;
  title: string;
  description: string;
  icon: string;
}

export const AGENT_SPECIALTY_OPTIONS: AgentSpecialtyOption[] = [
  {
    id: "fitness-nutrition",
    title: "Fitness & nutrition",
    description:
      "Workouts, meal planning, healthy habits, and general wellness goals with practical, non-clinical guidance.",
    icon: "🏋️",
  },
  {
    id: "physical-injuries",
    title: "Physical injuries",
    description:
      "Recovery basics, mobility questions, and when to seek in-person care for strains, sprains, and injuries.",
    icon: "🩹",
  },
  {
    id: "mental-health",
    title: "Mental health & emotional support",
    description:
      "Coping strategies, stress relief, and emotional check-ins — with clear limits; not a crisis or therapy replacement.",
    icon: "🧠",
  },
  {
    id: "symptom-guidance",
    title: "Symptom guidance",
    description:
      "Understand common symptoms, self-care tips, and when to follow up with a clinician — not a diagnosis.",
    icon: "🩺",
  },
];

export function isAgentSpecialtyId(value: string): value is AgentSpecialtyId {
  return (AGENT_SPECIALTY_IDS as readonly string[]).includes(value);
}

export function getSpecialtyOption(
  id: AgentSpecialtyId,
): AgentSpecialtyOption | undefined {
  return AGENT_SPECIALTY_OPTIONS.find((o) => o.id === id);
}
