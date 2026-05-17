import { Router } from "express";
import { authUser, requireAuth } from "../auth/middleware.js";
import {
  abandonStaleInProgressForUser,
  createConsultation,
  findConsultationForUser,
  findLatestInProgressForUser,
} from "../db/consultations.js";
import { isAgentSpecialtyId } from "../services/agentSpecialties.js";
import {
  isCatalogAgentId,
  resolveCatalogAgentBeyId,
} from "../services/agentCatalog.js";
import {
  finalizeConsultation,
  regenerateConsultationSummary,
} from "../services/finalizeConsultation.js";

export const consultationsRouter = Router();

consultationsRouter.use(requireAuth);

consultationsRouter.post("/start", async (req, res) => {
  const specialty =
    typeof req.body?.specialty === "string" ? req.body.specialty.trim() : "";
  const catalogAgentId =
    typeof req.body?.catalogAgentId === "string"
      ? req.body.catalogAgentId.trim()
      : "";

  if (!isAgentSpecialtyId(specialty)) {
    res.status(400).json({ error: "Invalid specialty." });
    return;
  }
  if (!isCatalogAgentId(catalogAgentId)) {
    res.status(400).json({ error: "Invalid agent." });
    return;
  }

  const beyAgentId = resolveCatalogAgentBeyId(catalogAgentId);
  if (!beyAgentId) {
    res.status(400).json({ error: "Agent is not configured." });
    return;
  }

  const user = authUser(req);
  const consultation = await createConsultation({
    userId: user.id,
    specialty,
    catalogAgentId,
    beyAgentId,
  });
  await abandonStaleInProgressForUser(user.id, consultation.id);

  res.status(201).json({ consultationId: consultation.id });
});

/** Finalize the user's most recent in-progress visit (e.g. left without End consultation). */
consultationsRouter.post("/finalize-pending", async (req, res) => {
  const user = authUser(req);
  const consultation = await findLatestInProgressForUser(user.id);
  if (!consultation) {
    res.status(404).json({ error: "No visit waiting for a summary." });
    return;
  }

  try {
    const result = await finalizeConsultation(consultation);
    res.json({
      ok: true,
      consultationId: consultation.id,
      alreadyDone: result.alreadyDone ?? false,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to finalize visit.";
    res.status(502).json({ error: message });
  }
});

consultationsRouter.post(
  "/:consultationId/regenerate-summary",
  async (req, res) => {
    const user = authUser(req);
    const consultation = await findConsultationForUser(
      req.params.consultationId,
      user.id,
    );
    if (!consultation) {
      res.status(404).json({ error: "Visit not found." });
      return;
    }

    try {
      await regenerateConsultationSummary(consultation);
      res.json({ ok: true });
    } catch (error) {
      const message =
        error instanceof Error ? error.message : "Failed to regenerate summary.";
      res.status(502).json({ error: message });
    }
  },
);

consultationsRouter.post("/:consultationId/finalize", async (req, res) => {
  const user = authUser(req);
  const consultation = await findConsultationForUser(
    req.params.consultationId,
    user.id,
  );
  if (!consultation) {
    res.status(404).json({ error: "Visit not found." });
    return;
  }

  try {
    const result = await finalizeConsultation(consultation);
    res.json({ ok: true, alreadyDone: result.alreadyDone ?? false });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to finalize visit.";
    res.status(502).json({ error: message });
  }
});
