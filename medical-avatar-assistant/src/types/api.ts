import type { AgentSpecialtyId } from "../config/agentSpecialties";
import type { AuthUser } from "./auth";

export interface SessionAgent {
  id: string;
  name: string;
  greeting: string | null;
  language: string;
}

export interface PriorVisitContext {
  consultationId: string;
  startedAt: string;
  specialtyLabel: string;
}

export interface SessionResponse {
  connected: boolean;
  specialty?: AgentSpecialtyId;
  agentId?: string;
  catalogAgentId?: string;
  agent?: SessionAgent;
  embedUrl?: string;
  priorVisit?: PriorVisitContext | null;
  error?: string;
}

export interface AuthExchangeResponse {
  token: string;
  user: AuthUser;
}

export interface ConsultationStartResponse {
  consultationId: string;
}

export interface FinalizeConsultationResponse {
  ok: boolean;
  alreadyDone?: boolean;
}

export interface HistoryListItem {
  consultationId: string;
  specialty: AgentSpecialtyId;
  specialtyLabel: string;
  catalogAgentId: string;
  agentLabel: string;
  startedAt: string;
  endedAt: string | null;
  summary: string;
  topics: string[];
  adviceGiven: string[];
  followUp: string | null;
}

export interface HistoryPendingItem {
  consultationId: string;
  specialty: AgentSpecialtyId;
  specialtyLabel: string;
  catalogAgentId: string;
  agentLabel: string;
  startedAt: string;
  status: string;
}

export interface HistoryListResponse {
  history: HistoryListItem[];
  pending: HistoryPendingItem[];
}

export interface HistoryDetail extends HistoryListItem {
  status: string;
}

export interface DashboardSpecialtyStat {
  specialty: AgentSpecialtyId;
  specialtyLabel: string;
  count: number;
}

export interface DashboardStats {
  totalVisits: number;
  completedVisits: number;
  pendingVisits: number;
  lastVisitAt: string | null;
  specialtyBreakdown: DashboardSpecialtyStat[];
  recentTopics: string[];
}

export interface FollowUpItem {
  consultationId: string;
  startedAt: string;
  specialty: AgentSpecialtyId;
  specialtyLabel: string;
  catalogAgentId: string;
  agentLabel: string;
  followUp: string;
  nextSteps: string[];
}

export interface UserProfile {
  sub: string;
  email: string;
  name: string;
  picture?: string | null;
  phone?: string | null;
  bio?: string | null;
  updatedAt?: string;
}

export interface ProfileResponse {
  profile: UserProfile;
  health?: HealthProfile;
}

export interface ProfileUpdateResponse {
  profile: UserProfile;
  token: string;
  health?: HealthProfile;
}

export interface DashboardResponse {
  stats: DashboardStats;
  history: HistoryListItem[];
  pending: HistoryPendingItem[];
  followUps: FollowUpItem[];
}

export interface HealthLocation {
  lat: number | null;
  lng: number | null;
  city: string | null;
  region: string | null;
  country: string | null;
  postal: string | null;
  label: string | null;
  usePrecise: boolean;
}

export interface HealthProfile {
  name: string;
  dateOfBirth: string | null;
  age: number | null;
  weightKg: number | null;
  heightCm: number | null;
  gender: string | null;
  allergies: string[];
  location: HealthLocation;
  onboardingCompleted: boolean;
  hasLocation: boolean;
}

export interface OnboardingResponse {
  completed: boolean;
  health: HealthProfile;
  profile: UserProfile;
}

export interface OnboardingSaveResponse {
  profile: UserProfile;
  health: HealthProfile;
  token: string;
}

export interface GeocodeResponse {
  lat: number;
  lng: number;
  city: string | null;
  region: string | null;
  country: string | null;
  postal: string | null;
  label: string;
}

export interface PlaceIntent {
  id: string;
  label: string;
  textQuery: string;
  description: string;
}

export interface PlaceSuggestion {
  id: string;
  consultationId: string;
  googlePlaceId: string;
  name: string;
  address: string;
  lat: number;
  lng: number;
  types: string[];
  intent: string;
  reason: string;
  distanceMeters: number | null;
  mapsUrl: string | null;
}

export interface PlacesSearchArea {
  label: string;
  lat: number;
  lng: number;
}

export interface PlacesSuggestResponse {
  blocked: boolean;
  message: string | null;
  intent: PlaceIntent;
  places: PlaceSuggestion[];
  searchArea?: PlacesSearchArea | null;
}

export interface CreateCallResponse {
  callId: string;
  livekitUrl: string;
  livekitToken: string;
}

export type ReminderKind =
  | "appointment"
  | "medication"
  | "follow_up"
  | "custom";

export interface ReminderItem {
  id: string;
  kind: ReminderKind;
  title: string;
  notes: string | null;
  dueAt: string;
  completedAt: string | null;
  consultationId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface RemindersListResponse {
  reminders: ReminderItem[];
}

export type HealthLogKind = "medication" | "vital" | "symptom" | "note";

export interface HealthLogEntry {
  id: string;
  kind: HealthLogKind;
  title: string;
  value: string | null;
  unit: string | null;
  notes: string | null;
  recordedAt: string;
  createdAt: string;
  updatedAt: string;
}

export interface HealthLogListResponse {
  entries: HealthLogEntry[];
  profile: HealthProfile;
}
