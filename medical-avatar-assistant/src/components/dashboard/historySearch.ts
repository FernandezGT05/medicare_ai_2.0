import type { HistoryListItem, HistoryPendingItem } from "../../types/api";

function normalizeQuery(query: string): string {
  return query.trim().toLowerCase();
}

function haystackForVisit(
  item: HistoryListItem | HistoryPendingItem,
  extra?: {
    summary?: string;
    topics?: string[];
    adviceGiven?: string[];
    followUp?: string | null;
  },
): string {
  const parts = [
    item.specialtyLabel,
    item.agentLabel,
    "status" in item ? item.status : "",
    new Date(item.startedAt).toLocaleString(),
    extra?.summary,
    extra?.topics?.join(" "),
    extra?.adviceGiven?.join(" "),
    extra?.followUp ?? "",
  ];
  return parts.filter(Boolean).join(" ").toLowerCase();
}

export function matchesHistorySearch(
  query: string,
  item: HistoryListItem | HistoryPendingItem,
): boolean {
  const normalized = normalizeQuery(query);
  if (!normalized) return true;

  const haystack =
    "summary" in item
      ? haystackForVisit(item, {
          summary: item.summary,
          topics: item.topics,
          adviceGiven: item.adviceGiven,
          followUp: item.followUp,
        })
      : haystackForVisit(item);

  return normalized
    .split(/\s+/)
    .every((term) => haystack.includes(term));
}
