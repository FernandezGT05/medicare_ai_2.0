import { parseDbUtc } from "./datetime.js";
import type { DbConsultation, DbConsultationSummary, DbUser } from "./types.js";

type UserRow = Omit<DbUser, "created_at" | "updated_at"> & {
  created_at: string | Date;
  updated_at: string | Date;
  onboarding_completed_at?: string | Date | null;
};

type ConsultationRow = Omit<
  DbConsultation,
  "started_at" | "ended_at" | "created_at"
> & {
  started_at: string | Date;
  ended_at: string | Date | null;
  created_at: string | Date;
};

type SummaryRow = Omit<DbConsultationSummary, "created_at" | "topics" | "advice_given"> & {
  created_at: string | Date;
  topics: string;
  advice_given: string;
};

function parseJsonArray(value: string | unknown): string[] {
  if (Array.isArray(value)) {
    return value as string[];
  }
  if (typeof value !== "string" || !value.trim()) {
    return [];
  }
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as string[]) : [];
  } catch {
    return [];
  }
}

export function mapUserRow(row: UserRow): DbUser {
  return {
    ...row,
    phone: row.phone ?? null,
    bio: row.bio ?? null,
    date_of_birth: row.date_of_birth ?? null,
    weight_kg: row.weight_kg ?? null,
    height_cm: row.height_cm ?? null,
    gender: row.gender ?? null,
    allergies: parseJsonArray(row.allergies),
    location_lat: row.location_lat ?? null,
    location_lng: row.location_lng ?? null,
    location_city: row.location_city ?? null,
    location_region: row.location_region ?? null,
    location_country: row.location_country ?? null,
    location_postal: row.location_postal ?? null,
    location_label: row.location_label ?? null,
    location_use_precise: Boolean(row.location_use_precise ?? true),
    onboarding_completed_at: row.onboarding_completed_at
      ? parseDbUtc(row.onboarding_completed_at)
      : null,
    created_at: parseDbUtc(row.created_at),
    updated_at: parseDbUtc(row.updated_at),
  };
}

export function mapConsultationRow(row: ConsultationRow): DbConsultation {
  return {
    ...row,
    started_at: parseDbUtc(row.started_at),
    ended_at: row.ended_at ? parseDbUtc(row.ended_at) : null,
    created_at: parseDbUtc(row.created_at),
  };
}

export function mapSummaryRow(row: SummaryRow): DbConsultationSummary {
  return {
    id: row.id,
    consultation_id: row.consultation_id,
    summary: row.summary,
    topics: parseJsonArray(row.topics),
    advice_given: parseJsonArray(row.advice_given),
    follow_up: row.follow_up,
    created_at: new Date(row.created_at),
  };
}
