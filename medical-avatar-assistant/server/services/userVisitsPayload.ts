import { CATALOG_AGENT_LABELS, isCatalogAgentId } from "./agentCatalog.js";
import { SPECIALTY_LABELS } from "./agentSpecialties.js";
import type { HistoryListItem } from "../db/types.js";

export function mapCompletedVisits(items: HistoryListItem[]) {
  return items
    .filter((item) => item.status === "completed" && item.summary)
    .map((item) => ({
      consultationId: item.consultationId,
      specialty: item.specialty,
      specialtyLabel: SPECIALTY_LABELS[item.specialty],
      catalogAgentId: item.catalogAgentId,
      agentLabel: isCatalogAgentId(item.catalogAgentId)
        ? CATALOG_AGENT_LABELS[item.catalogAgentId]
        : item.catalogAgentId,
      startedAt: item.startedAt,
      endedAt: item.endedAt,
      summary: item.summary!,
      topics: item.topics,
      adviceGiven: item.adviceGiven,
      followUp: item.followUp,
    }));
}

export function mapPendingVisits(items: HistoryListItem[]) {
  return items
    .filter((item) => item.status !== "completed" || !item.summary)
    .map((item) => ({
      consultationId: item.consultationId,
      specialty: item.specialty,
      specialtyLabel: SPECIALTY_LABELS[item.specialty],
      catalogAgentId: item.catalogAgentId,
      agentLabel: isCatalogAgentId(item.catalogAgentId)
        ? CATALOG_AGENT_LABELS[item.catalogAgentId]
        : item.catalogAgentId,
      startedAt: item.startedAt,
      status: item.status,
    }));
}

export function buildDashboardStats(items: HistoryListItem[]) {
  const completed = items.filter(
    (item) => item.status === "completed" && item.summary,
  );
  const pending = items.filter(
    (item) => item.status !== "completed" || !item.summary,
  );

  const specialtyCounts = new Map<string, { specialty: string; count: number }>();
  for (const item of completed) {
    const existing = specialtyCounts.get(item.specialty);
    if (existing) {
      existing.count += 1;
    } else {
      specialtyCounts.set(item.specialty, {
        specialty: item.specialty,
        count: 1,
      });
    }
  }

  const specialtyBreakdown = [...specialtyCounts.values()]
    .map((entry) => ({
      specialty: entry.specialty,
      specialtyLabel: SPECIALTY_LABELS[entry.specialty as keyof typeof SPECIALTY_LABELS],
      count: entry.count,
    }))
    .sort((a, b) => b.count - a.count);

  const recentTopics: string[] = [];
  const seenTopics = new Set<string>();
  for (const item of completed) {
    for (const topic of item.topics) {
      const key = topic.trim().toLowerCase();
      if (!key || seenTopics.has(key)) continue;
      seenTopics.add(key);
      recentTopics.push(topic);
      if (recentTopics.length >= 8) break;
    }
    if (recentTopics.length >= 8) break;
  }

  return {
    totalVisits: items.length,
    completedVisits: completed.length,
    pendingVisits: pending.length,
    lastVisitAt: items[0]?.startedAt ?? null,
    specialtyBreakdown,
    recentTopics,
  };
}

function buildNextSteps(
  followUp: string | null,
  adviceGiven: string[],
): string[] {
  const steps: string[] = [];
  const seen = new Set<string>();

  const add = (text: string) => {
    const normalized = text.trim();
    if (!normalized) return;
    const key = normalized.toLowerCase();
    if (seen.has(key)) return;
    seen.add(key);
    steps.push(normalized);
  };

  if (followUp?.trim()) {
    const lines = followUp
      .split(/\n+/)
      .map((line) => line.replace(/^[-•*]\s*/, "").replace(/^\d+[.)]\s*/, "").trim())
      .filter(Boolean);
    if (lines.length > 1) {
      for (const line of lines) add(line);
    } else {
      add(followUp.trim());
    }
  }

  for (const advice of adviceGiven) {
    add(advice);
  }

  return steps;
}

export function mapFollowUps(items: HistoryListItem[]) {
  return items
    .filter(
      (item) =>
        item.status === "completed" &&
        (item.followUp?.trim() || item.adviceGiven.length > 0),
    )
    .map((item) => {
      const followUpText = item.followUp?.trim() ?? "";
      const nextSteps = buildNextSteps(item.followUp, item.adviceGiven);
      return {
        consultationId: item.consultationId,
        startedAt: item.startedAt,
        specialty: item.specialty,
        specialtyLabel: SPECIALTY_LABELS[item.specialty],
        catalogAgentId: item.catalogAgentId,
        agentLabel: isCatalogAgentId(item.catalogAgentId)
          ? CATALOG_AGENT_LABELS[item.catalogAgentId]
          : item.catalogAgentId,
        followUp: followUpText || nextSteps.join("\n"),
        nextSteps,
      };
    });
}
