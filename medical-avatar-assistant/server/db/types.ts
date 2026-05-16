import type { AgentSpecialtyId } from "../services/agentSpecialties.js";

export type ConsultationStatus =
  | "in_progress"
  | "summarizing"
  | "completed"
  | "failed";

export interface DbUser {
  id: string;
  google_sub: string;
  email: string;
  name: string;
  picture_url: string | null;
  phone: string | null;
  bio: string | null;
  date_of_birth: string | null;
  weight_kg: number | null;
  height_cm: number | null;
  gender: string | null;
  allergies: string[];
  location_lat: number | null;
  location_lng: number | null;
  location_city: string | null;
  location_region: string | null;
  location_country: string | null;
  location_postal: string | null;
  location_label: string | null;
  location_use_precise: boolean;
  onboarding_completed_at: Date | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbPlaceSuggestion {
  id: string;
  consultation_id: string;
  user_id: string;
  google_place_id: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string[];
  intent: string;
  reason: string;
  distance_meters: number | null;
  maps_url: string | null;
  created_at: Date;
}

export interface DbConsultation {
  id: string;
  user_id: string;
  bey_call_id: string | null;
  specialty: AgentSpecialtyId;
  catalog_agent_id: string;
  bey_agent_id: string;
  status: ConsultationStatus;
  started_at: Date;
  ended_at: Date | null;
  created_at: Date;
}

export type ReminderKind = "appointment" | "medication" | "follow_up" | "custom";
export type HealthLogKind = "medication" | "vital" | "symptom" | "note";

export interface DbReminder {
  id: string;
  user_id: string;
  kind: ReminderKind;
  title: string;
  notes: string | null;
  due_at: Date;
  completed_at: Date | null;
  consultation_id: string | null;
  created_at: Date;
  updated_at: Date;
}

export interface DbHealthLogEntry {
  id: string;
  user_id: string;
  kind: HealthLogKind;
  title: string;
  value: string | null;
  unit: string | null;
  notes: string | null;
  recorded_at: Date;
  created_at: Date;
  updated_at: Date;
}

export interface DbConsultationSummary {
  id: string;
  consultation_id: string;
  summary: string;
  topics: string[];
  advice_given: string[];
  follow_up: string | null;
  created_at: Date;
}

export interface HistoryListItem {
  consultationId: string;
  specialty: AgentSpecialtyId;
  catalogAgentId: string;
  startedAt: string;
  endedAt: string | null;
  status: ConsultationStatus;
  summary: string | null;
  topics: string[];
  adviceGiven: string[];
  followUp: string | null;
}
