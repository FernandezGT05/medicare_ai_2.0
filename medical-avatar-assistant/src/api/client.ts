import type { AgentSpecialtyId } from "../config/agentSpecialties";
import { getSessionToken } from "../lib/authStorage";
import type {
  AuthExchangeResponse,
  ConsultationStartResponse,
  CreateCallResponse,
  FinalizeConsultationResponse,
  DashboardResponse,
  GeocodeResponse,
  HealthLogEntry,
  HealthLogListResponse,
  OnboardingResponse,
  OnboardingSaveResponse,
  PlaceIntent,
  PlacesSuggestResponse,
  PlaceSuggestion,
  ProfileResponse,
  ProfileUpdateResponse,
  ReminderItem,
  RemindersListResponse,
  HistoryDetail,
  HistoryListResponse,
  SessionResponse,
} from "../types/api";
import type { AuthUser } from "../types/auth";

const API_BASE = (import.meta.env.VITE_API_BASE_URL ?? "").replace(/\/$/, "");

function apiUrl(path: string): string {
  if (path.startsWith("http://") || path.startsWith("https://")) return path;
  return `${API_BASE}${path}`;
}

async function apiRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const token = getSessionToken();
  const headers = new Headers(init?.headers);
  if (!headers.has("Content-Type") && init?.body) {
    headers.set("Content-Type", "application/json");
  }
  if (token) {
    headers.set("Authorization", `Bearer ${token}`);
  }

  const response = await fetch(apiUrl(path), { ...init, headers });
  if (!response.ok) {
    const errBody = (await response.json().catch(() => ({}))) as {
      error?: string;
    };
    throw new Error(errBody.error ?? `Request failed (${response.status})`);
  }
  if (response.status === 204) {
    return undefined as T;
  }
  const text = await response.text();
  if (!text) {
    return undefined as T;
  }
  return JSON.parse(text) as T;
}

export function exchangeGoogleAuth(
  credential: string,
): Promise<AuthExchangeResponse> {
  return apiRequest<AuthExchangeResponse>("/api/auth/google", {
    method: "POST",
    body: JSON.stringify({ credential }),
  });
}

export function fetchAuthMe(): Promise<{ user: AuthUser }> {
  return apiRequest<{ user: AuthUser }>("/api/auth/me");
}

export function fetchSession(
  specialty: AgentSpecialtyId,
  agentId: string,
  priorConsultationId?: string | null,
): Promise<SessionResponse> {
  const params = new URLSearchParams({ specialty, agentId });
  if (priorConsultationId) {
    params.set("priorConsultationId", priorConsultationId);
  }
  return apiRequest<SessionResponse>(`/api/session?${params}`);
}

export function startConsultationRecord(input: {
  specialty: AgentSpecialtyId;
  catalogAgentId: string;
}): Promise<ConsultationStartResponse> {
  return apiRequest<ConsultationStartResponse>("/api/consultations/start", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function finalizeConsultationRecord(
  consultationId: string,
): Promise<FinalizeConsultationResponse> {
  return apiRequest<FinalizeConsultationResponse>(
    `/api/consultations/${consultationId}/finalize`,
    { method: "POST" },
  );
}

export function regenerateConsultationSummary(
  consultationId: string,
): Promise<FinalizeConsultationResponse> {
  return apiRequest<FinalizeConsultationResponse>(
    `/api/consultations/${consultationId}/regenerate-summary`,
    { method: "POST" },
  );
}

export function finalizePendingConsultation(): Promise<
  FinalizeConsultationResponse & { consultationId?: string }
> {
  return apiRequest<FinalizeConsultationResponse & { consultationId?: string }>(
    "/api/consultations/finalize-pending",
    { method: "POST" },
  );
}

export function fetchDashboard(): Promise<DashboardResponse> {
  return apiRequest<DashboardResponse>("/api/dashboard");
}

export function fetchProfile(): Promise<ProfileResponse> {
  return apiRequest<ProfileResponse>("/api/profile");
}

export function updateProfile(input: {
  name?: string;
  picture?: string | null;
  phone?: string | null;
  bio?: string | null;
  locationLabel?: string | null;
  locationLat?: number | null;
  locationLng?: number | null;
  locationCity?: string | null;
  locationRegion?: string | null;
  locationCountry?: string | null;
  locationPostal?: string | null;
  locationUsePrecise?: boolean;
  useCurrentLocation?: boolean;
}): Promise<ProfileUpdateResponse> {
  return apiRequest<ProfileUpdateResponse>("/api/profile", {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function fetchDashboardDetail(
  consultationId: string,
): Promise<HistoryDetail> {
  return apiRequest<HistoryDetail>(`/api/dashboard/${consultationId}`);
}

export function deleteDashboardVisit(consultationId: string): Promise<void> {
  return apiRequest<void>(`/api/dashboard/${consultationId}`, {
    method: "DELETE",
  });
}

/** @deprecated Use fetchDashboard */
export function fetchHistory(): Promise<HistoryListResponse> {
  return apiRequest<HistoryListResponse>("/api/history");
}

/** @deprecated Use fetchDashboardDetail */
export function fetchHistoryDetail(
  consultationId: string,
): Promise<HistoryDetail> {
  return apiRequest<HistoryDetail>(`/api/history/${consultationId}`);
}

/** @deprecated Use deleteDashboardVisit */
export function deleteHistoryVisit(consultationId: string): Promise<void> {
  return apiRequest<void>(`/api/history/${consultationId}`, {
    method: "DELETE",
  });
}

export function createConsultationCall(
  agentId: string,
): Promise<CreateCallResponse> {
  return apiRequest<CreateCallResponse>("/api/calls", {
    method: "POST",
    body: JSON.stringify({ agentId }),
  });
}

export function fetchOnboarding(): Promise<OnboardingResponse> {
  return apiRequest<OnboardingResponse>("/api/onboarding");
}

export function saveOnboarding(input: Record<string, unknown>): Promise<OnboardingSaveResponse> {
  return apiRequest<OnboardingSaveResponse>("/api/onboarding", {
    method: "PUT",
    body: JSON.stringify(input),
  });
}

export function geocodeAddress(address: string): Promise<GeocodeResponse> {
  return apiRequest<GeocodeResponse>("/api/onboarding/geocode", {
    method: "POST",
    body: JSON.stringify({ address }),
  });
}

export function fetchPlaceIntents(
  specialty: string,
): Promise<{ intents: PlaceIntent[] }> {
  return apiRequest<{ intents: PlaceIntent[] }>(
    `/api/places/intents?specialty=${encodeURIComponent(specialty)}`,
  );
}

export function suggestPlaces(input: {
  specialty: string;
  consultationId?: string;
  intentId?: string;
  contextText?: string;
}): Promise<PlacesSuggestResponse> {
  return apiRequest<PlacesSuggestResponse>("/api/places/suggest", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function fetchPlacesForConsultation(
  consultationId: string,
): Promise<{ places: PlaceSuggestion[] }> {
  return apiRequest<{ places: PlaceSuggestion[] }>(
    `/api/places/consultation/${consultationId}`,
  );
}

export function fetchReminders(): Promise<RemindersListResponse> {
  return apiRequest<RemindersListResponse>("/api/reminders");
}

export function createReminder(input: {
  kind: string;
  title: string;
  notes?: string | null;
  dueAt: string;
  consultationId?: string | null;
}): Promise<{ reminder: ReminderItem }> {
  return apiRequest<{ reminder: ReminderItem }>("/api/reminders", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function updateReminder(
  id: string,
  input: {
    kind?: string;
    title?: string;
    notes?: string | null;
    dueAt?: string;
    completed?: boolean;
  },
): Promise<{ reminder: ReminderItem }> {
  return apiRequest<{ reminder: ReminderItem }>(`/api/reminders/${id}`, {
    method: "PATCH",
    body: JSON.stringify(input),
  });
}

export function deleteReminder(id: string): Promise<void> {
  return apiRequest<void>(`/api/reminders/${id}`, { method: "DELETE" });
}

export function fetchHealthLog(): Promise<HealthLogListResponse> {
  return apiRequest<HealthLogListResponse>("/api/health-log");
}

export function createHealthLogEntry(input: {
  kind: string;
  title: string;
  value?: string | null;
  unit?: string | null;
  notes?: string | null;
  recordedAt?: string;
}): Promise<{ entry: HealthLogEntry }> {
  return apiRequest<{ entry: HealthLogEntry }>("/api/health-log", {
    method: "POST",
    body: JSON.stringify(input),
  });
}

export function deleteHealthLogEntry(id: string): Promise<void> {
  return apiRequest<void>(`/api/health-log/${id}`, { method: "DELETE" });
}
