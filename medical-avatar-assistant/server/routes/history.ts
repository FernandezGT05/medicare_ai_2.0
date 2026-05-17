import { Router } from "express";
import { authUser, requireAuth } from "../auth/middleware.js";
import {
  deleteConsultationForUser,
  findConsultationForUser,
  getSummaryForConsultation,
  listHistoryForUser,
} from "../db/consultations.js";
import { CATALOG_AGENT_LABELS, isCatalogAgentId } from "../services/agentCatalog.js";
import { SPECIALTY_LABELS } from "../services/agentSpecialties.js";
import {
  mapCompletedVisits,
  mapPendingVisits,
} from "../services/userVisitsPayload.js";

export const historyRouter = Router();

historyRouter.use(requireAuth);

historyRouter.get("/", async (req, res) => {
  const user = authUser(req);
  const items = await listHistoryForUser(user.id);
  res.json({
    history: mapCompletedVisits(items),
    pending: mapPendingVisits(items),
  });
});

historyRouter.get("/:consultationId", async (req, res) => {
  const user = authUser(req);
  const consultation = await findConsultationForUser(
    req.params.consultationId,
    user.id,
  );
  if (!consultation) {
    res.status(404).json({ error: "Visit not found." });
    return;
  }
  const summary = await getSummaryForConsultation(consultation.id);
  if (!summary) {
    res.status(404).json({ error: "Summary not available for this visit." });
    return;
  }
  res.json({
    consultationId: consultation.id,
    specialty: consultation.specialty,
    specialtyLabel: SPECIALTY_LABELS[consultation.specialty],
    catalogAgentId: consultation.catalog_agent_id,
    agentLabel: isCatalogAgentId(consultation.catalog_agent_id)
      ? CATALOG_AGENT_LABELS[consultation.catalog_agent_id]
      : consultation.catalog_agent_id,
    startedAt: consultation.started_at.toISOString(),
    endedAt: consultation.ended_at?.toISOString() ?? null,
    status: consultation.status,
    summary: summary.summary,
    topics: summary.topics,
    adviceGiven: summary.advice_given,
    followUp: summary.follow_up,
  });
});

historyRouter.delete("/:consultationId", async (req, res) => {
  const user = authUser(req);
  const deleted = await deleteConsultationForUser(
    req.params.consultationId,
    user.id,
  );
  if (!deleted) {
    res.status(404).json({ error: "Visit not found." });
    return;
  }
  res.status(204).send();
});
