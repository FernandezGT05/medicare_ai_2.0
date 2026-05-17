import { Router } from "express";
import { authUser, requireAuth } from "../auth/middleware.js";
import { assertApiKey, getConfig } from "../config.js";
import {
  findConsultationForUser,
  getSummaryForConsultation,
} from "../db/consultations.js";
import { createCall, verifyApiKey, listAgents } from "../bey/client.js";
import {
  AGENT_SPECIALTY_IDS,
  isAgentSpecialtyId,
  SPECIALTY_LABELS,
} from "../services/agentSpecialties.js";
import {
  getCatalogAgentHealth,
  isCatalogAgentId,
  resolveCatalogAgentBeyId,
} from "../services/agentCatalog.js";
import { buildPriorContextBlock } from "../services/priorContext.js";
import { buildPatientContextBlock } from "../services/patientContext.js";
import { resolveSpecialtySession } from "../services/specialtySession.js";
import {
  getSpecialtyPrompts,
  getSpecialtySystemPrompt,
} from "../services/specialtyPrompts.js";

export const apiRouter = Router();

apiRouter.get("/health", async (_req, res) => {
  const config = getConfig();
  let database: string = config.databaseUrl ? "postgres" : "not_configured";
  if (config.databaseUrl) {
    try {
      const { query } = await import("../db/db.js");
      await query("SELECT 1 AS ok");
      database = "postgres_connected";
    } catch (error) {
      database = "postgres_error";
      res.status(503).json({
        ok: false,
        database,
        dbError: error instanceof Error ? error.message : String(error),
        hasApiKey: Boolean(config.beyApiKey),
        locationServices: "nominatim",
        catalogAgents: getCatalogAgentHealth(),
      });
      return;
    }
  }
  res.json({
    ok: true,
    database,
    hasApiKey: Boolean(config.beyApiKey),
    locationServices: "nominatim",
    catalogAgents: getCatalogAgentHealth(),
  });
});

apiRouter.get("/agent-specialties", (_req, res) => {
  res.json({
    specialties: AGENT_SPECIALTY_IDS.map((id) => ({
      id,
      label: SPECIALTY_LABELS[id],
    })),
  });
});

/** Preview prompt text for a specialty (for admin/debug; prompts are applied server-side). */
apiRouter.get("/specialty-prompts/:specialty", (req, res) => {
  const { specialty } = req.params;
  if (!isAgentSpecialtyId(specialty)) {
    res.status(400).json({ error: "Invalid specialty." });
    return;
  }
  res.json({
    specialty,
    label: SPECIALTY_LABELS[specialty],
    ...getSpecialtyPrompts(specialty),
    systemPromptLength: getSpecialtySystemPrompt(specialty).length,
  });
});

/** Lists agents from Beyond Presence (debug / ops; UI uses the static catalog). */
apiRouter.get("/agents", async (_req, res) => {
  try {
    const apiKey = assertApiKey();
    const agents = await listAgents(apiKey);

    res.json({
      agents: agents.map((a) => ({
        id: a.id,
        name: a.name,
        avatarId: a.avatar_id,
      })),
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to list agents";
    res.status(500).json({ error: message });
  }
});

apiRouter.get("/session", requireAuth, async (req, res) => {
  const specialtyParam =
    typeof req.query.specialty === "string" ? req.query.specialty.trim() : "";
  const agentIdParam =
    typeof req.query.agentId === "string" ? req.query.agentId.trim() : "";
  const priorConsultationId =
    typeof req.query.priorConsultationId === "string"
      ? req.query.priorConsultationId.trim()
      : "";

  if (!specialtyParam || !isAgentSpecialtyId(specialtyParam)) {
    res.status(400).json({
      connected: false,
      error:
        "Missing or invalid specialty. Choose fitness-nutrition, physical-injuries, mental-health, or symptom-guidance.",
    });
    return;
  }

  if (!agentIdParam) {
    res.status(400).json({
      connected: false,
      error: "Missing agentId. Select an agent before starting a session.",
    });
    return;
  }

  if (!isCatalogAgentId(agentIdParam)) {
    res.status(400).json({
      connected: false,
      error:
        "Invalid agent. Choose nelly, yuruo, alan, or jerome.",
    });
    return;
  }

  const beyAgentId = resolveCatalogAgentBeyId(agentIdParam);
  if (!beyAgentId) {
    res.status(400).json({
      connected: false,
      error: `Agent "${agentIdParam}" is not configured on the server.`,
    });
    return;
  }

  try {
    const config = getConfig();
    const apiKey = assertApiKey(config);
    await verifyApiKey(apiKey);

    let priorContextBlock = "";
    let priorVisit: {
      consultationId: string;
      startedAt: string;
      specialtyLabel: string;
    } | null = null;

    if (priorConsultationId) {
      const user = authUser(req);
      const prior = await findConsultationForUser(
        priorConsultationId,
        user.id,
      );
      if (!prior) {
        res.status(400).json({
          connected: false,
          error: "Prior visit not found.",
        });
        return;
      }
      const priorSummary = await getSummaryForConsultation(prior.id);
      if (!priorSummary) {
        res.status(400).json({
          connected: false,
          error: "Prior visit has no summary yet. Pick another visit from History.",
        });
        return;
      }
      priorContextBlock = buildPriorContextBlock(
        priorSummary,
        prior.specialty,
        prior.started_at,
      );
      priorVisit = {
        consultationId: prior.id,
        startedAt: prior.started_at.toISOString(),
        specialtyLabel: SPECIALTY_LABELS[prior.specialty],
      };
    }

    const user = authUser(req);
    const patientContextBlock = buildPatientContextBlock(user);

    const { agent, embedUrl, specialty, agentId } = await resolveSpecialtySession(
      apiKey,
      specialtyParam,
      beyAgentId,
      patientContextBlock + priorContextBlock,
    );

    res.json({
      connected: true,
      specialty,
      agentId,
      catalogAgentId: agentIdParam,
      priorVisit,
      agent: {
        id: agent.id,
        name: agent.name,
        greeting: agent.greeting ?? null,
        language: agent.language ?? "en-US",
      },
      embedUrl,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Unknown server error";

    res.json({
      connected: false,
      error: message,
    });
  }
});

/** LiveKit room for in-app video (used by ConsultationCallContext). */
apiRouter.post("/calls", requireAuth, async (req, res) => {
  const agentId =
    typeof req.body?.agentId === "string" ? req.body.agentId.trim() : "";

  if (!agentId) {
    res.status(400).json({ error: "Missing agentId." });
    return;
  }

  try {
    const config = getConfig();
    const apiKey = assertApiKey(config);
    await verifyApiKey(apiKey);

    const call = await createCall(apiKey, {
      agent_id: agentId,
      livekit_username: "Patient",
    });

    res.status(201).json({
      callId: call.id,
      livekitUrl: call.livekit_url,
      livekitToken: call.livekit_token,
    });
  } catch (error) {
    const message =
      error instanceof Error ? error.message : "Failed to create call";
    res.status(500).json({ error: message });
  }
});
