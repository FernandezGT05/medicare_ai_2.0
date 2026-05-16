import type { AgentSpecialtyId } from "../../config/agentSpecialties";
import type { FollowUpItem } from "../../types/api";

export function formatFollowUpDate(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString(undefined, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

export function formatFollowUpDateShort(iso: string): string {
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return "Unknown date";
  return date.toLocaleDateString(undefined, {
    dateStyle: "medium",
  });
}

export function normalizeFollowUpItem(
  item: Partial<FollowUpItem> & Pick<FollowUpItem, "consultationId" | "startedAt">,
): FollowUpItem {
  const followUp = typeof item.followUp === "string" ? item.followUp : "";
  const nextSteps = Array.isArray(item.nextSteps)
    ? item.nextSteps.filter((s): s is string => typeof s === "string")
    : [];

  return {
    consultationId: item.consultationId,
    startedAt: item.startedAt,
    specialty: (item.specialty ?? "symptom-guidance") as AgentSpecialtyId,
    specialtyLabel: item.specialtyLabel ?? "Consultation",
    catalogAgentId: item.catalogAgentId ?? "",
    agentLabel: item.agentLabel ?? "Assistant",
    followUp,
    nextSteps,
  };
}

export function stepsForItem(item: FollowUpItem): string[] {
  const nextSteps = item.nextSteps ?? [];
  if (nextSteps.length > 0) return nextSteps;
  const followUp = item.followUp ?? "";
  if (!followUp.trim()) return [];
  return [followUp.trim()];
}