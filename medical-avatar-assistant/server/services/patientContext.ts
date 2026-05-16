import type { DbUser } from "../db/types.js";
import { userHasLocation } from "../db/healthProfile.js";

function formatAge(dateOfBirth: string | null): string | null {
  if (!dateOfBirth) return null;
  const dob = new Date(dateOfBirth);
  if (Number.isNaN(dob.getTime())) return null;
  const age = Math.floor(
    (Date.now() - dob.getTime()) / (365.25 * 24 * 60 * 60 * 1000),
  );
  return age >= 0 && age < 130 ? String(age) : null;
}

export function buildPatientContextBlock(user: DbUser): string {
  const lines: string[] = [];
  const age = formatAge(user.date_of_birth);
  if (age) lines.push(`Age (self-reported): ${age}`);
  if (user.gender?.trim()) lines.push(`Gender (self-reported): ${user.gender}`);
  if (user.weight_kg != null) lines.push(`Weight (self-reported): ${user.weight_kg} kg`);
  if (user.height_cm != null) lines.push(`Height (self-reported): ${user.height_cm} cm`);
  if (user.allergies.length > 0) {
    lines.push(`Allergies (self-reported): ${user.allergies.join(", ")}`);
  }

  if (userHasLocation(user)) {
    const locationParts = [
      user.location_city,
      user.location_region,
      user.location_country,
    ].filter(Boolean);
    const locationLabel =
      user.location_use_precise && user.location_label
        ? user.location_label
        : locationParts.join(", ") || user.location_label || "User's area";
    lines.push(`General location (self-reported): ${locationLabel}`);
    lines.push(
      "You may mention that local resources (pharmacies, clinics, gyms, etc.) can be suggested in the app when appropriate. Do not invent specific business names unless the user asks.",
    );
  }

  if (lines.length === 0) return "";

  return `

## Patient profile (self-reported — not verified)
${lines.map((l) => `- ${l}`).join("\n")}
Treat as conversational context only. Not a medical record.`;
}
