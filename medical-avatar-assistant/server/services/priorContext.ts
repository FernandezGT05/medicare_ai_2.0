import type { DbConsultationSummary } from "../db/types.js";
import { SPECIALTY_LABELS } from "./agentSpecialties.js";
import type { AgentSpecialtyId } from "./agentSpecialties.js";

export function buildPriorContextBlock(
  prior: DbConsultationSummary,
  priorSpecialty: AgentSpecialtyId,
  priorDate: Date,
): string {
  const dateLabel = priorDate.toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
  const topics =
    prior.topics.length > 0 ? prior.topics.join("; ") : "Not recorded";
  const advice =
    prior.advice_given.length > 0
      ? prior.advice_given.map((a) => `- ${a}`).join("\n")
      : "- Not recorded";

  return `

## Prior visit context (informational only — not a medical record)
Date: ${dateLabel} · Consultation type: ${SPECIALTY_LABELS[priorSpecialty]}
Summary: ${prior.summary}
Topics discussed: ${topics}
Prior guidance given:
${advice}
${prior.follow_up ? `Follow-up noted: ${prior.follow_up}` : ""}
Ask the user if anything has changed since that visit. Do not assume prior advice still applies without confirmation.`;
}
