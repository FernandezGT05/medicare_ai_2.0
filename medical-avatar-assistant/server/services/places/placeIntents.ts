import type { AgentSpecialtyId } from "../agentSpecialties.js";

export interface PlaceIntentOption {
  id: string;
  label: string;
  /** Primary label for search (OSM-friendly short terms work best). */
  textQuery: string;
  /** Tried in order until results are found (Nominatim / OpenStreetMap). */
  searchQueries: string[];
  googleTypes?: string[];
  description: string;
}

const COMMON_INTENTS: PlaceIntentOption[] = [
  {
    id: "pharmacy",
    label: "Pharmacy",
    textQuery: "pharmacy",
    searchQueries: ["pharmacy", "farmacia"],
    googleTypes: ["pharmacy"],
    description: "Pick up medications or OTC products",
  },
  {
    id: "urgent_care",
    label: "Urgent care",
    textQuery: "clinic",
    searchQueries: ["clinic", "doctors", "hospital", "pronto soccorso"],
    googleTypes: ["doctor", "hospital"],
    description: "Same-day or walk-in care",
  },
  {
    id: "hospital",
    label: "Hospital / ER",
    textQuery: "hospital",
    searchQueries: ["hospital", "ospedale", "emergency"],
    googleTypes: ["hospital"],
    description: "Emergency or hospital services",
  },
  {
    id: "gp",
    label: "Doctor / clinic",
    textQuery: "doctors",
    searchQueries: ["doctors", "clinic", "medico", "ambulatorio"],
    googleTypes: ["doctor"],
    description: "Primary or general care",
  },
];

const BY_SPECIALTY: Record<AgentSpecialtyId, PlaceIntentOption[]> = {
  "symptom-guidance": [
    COMMON_INTENTS[1],
    COMMON_INTENTS[0],
    COMMON_INTENTS[3],
    COMMON_INTENTS[2],
  ],
  "physical-injuries": [
    {
      id: "physio",
      label: "Physiotherapy",
      textQuery: "physiotherapist",
      searchQueries: ["physiotherapist", "physiotherapy", "fisioterapia", "clinic"],
      googleTypes: ["physiotherapist"],
      description: "Rehab and injury support",
    },
    COMMON_INTENTS[1],
    COMMON_INTENTS[3],
    COMMON_INTENTS[0],
  ],
  "mental-health": [
    {
      id: "therapist",
      label: "Mental health services",
      textQuery: "psychologist",
      searchQueries: ["psychologist", "counselling", "psicologo", "mental health"],
      googleTypes: ["health"],
      description: "Counseling and therapy resources",
    },
    COMMON_INTENTS[3],
    COMMON_INTENTS[0],
  ],
  "fitness-nutrition": [
    {
      id: "gym",
      label: "Gym / fitness",
      textQuery: "fitness",
      searchQueries: ["fitness", "gym", "sports centre", "palestra"],
      googleTypes: ["gym"],
      description: "Exercise and fitness facilities",
    },
    {
      id: "nutrition",
      label: "Nutrition services",
      textQuery: "dietitian",
      searchQueries: ["dietitian", "nutritionist", "dietista", "clinic"],
      description: "Nutrition counseling",
    },
    COMMON_INTENTS[0],
    COMMON_INTENTS[3],
  ],
};

export function getIntentsForSpecialty(
  specialty: AgentSpecialtyId,
): PlaceIntentOption[] {
  return BY_SPECIALTY[specialty] ?? COMMON_INTENTS;
}

export function getIntentById(
  specialty: AgentSpecialtyId,
  intentId: string,
): PlaceIntentOption | null {
  return getIntentsForSpecialty(specialty).find((i) => i.id === intentId) ?? null;
}

const RED_FLAG_PATTERN =
  /\b(chest pain|can't breathe|cannot breathe|suicidal|kill myself|stroke|severe bleeding|unconscious|heart attack|911|999|112)\b/i;

export function shouldBlockPlaceSuggestions(text: string): boolean {
  return RED_FLAG_PATTERN.test(text);
}
