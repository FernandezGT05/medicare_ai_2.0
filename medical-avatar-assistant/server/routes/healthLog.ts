import { Router } from "express";
import { authUser, requireAuth } from "../auth/middleware.js";
import { healthProfileToResponse } from "../db/healthProfile.js";
import {
  createHealthLogEntry,
  deleteHealthLogEntryForUser,
  healthLogEntryToJson,
  listHealthLogForUser,
  type HealthLogKind,
} from "../db/healthLog.js";

const KINDS: HealthLogKind[] = ["medication", "vital", "symptom", "note"];

export const healthLogRouter = Router();

healthLogRouter.use(requireAuth);

healthLogRouter.get("/", async (req, res) => {
  const user = authUser(req);
  const entries = (await listHealthLogForUser(user.id)).map(healthLogEntryToJson);
  res.json({
    entries,
    profile: healthProfileToResponse(user),
  });
});

healthLogRouter.post("/", async (req, res) => {
  const user = authUser(req);
  const body = req.body ?? {};
  const kind = typeof body.kind === "string" ? body.kind.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";

  if (!KINDS.includes(kind as HealthLogKind)) {
    res.status(400).json({ error: "Invalid entry type." });
    return;
  }
  if (!title || title.length > 120) {
    res.status(400).json({ error: "Title is required (max 120 characters)." });
    return;
  }

  const recordedAtRaw =
    typeof body.recordedAt === "string" ? body.recordedAt : "";
  const recordedAt = recordedAtRaw
    ? new Date(recordedAtRaw)
    : new Date();
  if (Number.isNaN(recordedAt.getTime())) {
    res.status(400).json({ error: "Invalid date." });
    return;
  }

  const value =
    body.value === null || typeof body.value === "string" ? body.value : null;
  const unit =
    body.unit === null || typeof body.unit === "string" ? body.unit : null;
  const notes =
    body.notes === null || typeof body.notes === "string" ? body.notes : null;

  if (value && value.length > 80) {
    res.status(400).json({ error: "Value is too long." });
    return;
  }
  if (notes && notes.length > 500) {
    res.status(400).json({ error: "Notes are too long." });
    return;
  }

  const created = await createHealthLogEntry({
    userId: user.id,
    kind: kind as HealthLogKind,
    title,
    value,
    unit,
    notes,
    recordedAt,
  });

  res.status(201).json({ entry: healthLogEntryToJson(created) });
});

healthLogRouter.delete("/:id", async (req, res) => {
  const user = authUser(req);
  const deleted = await deleteHealthLogEntryForUser(req.params.id, user.id);
  if (!deleted) {
    res.status(404).json({ error: "Entry not found." });
    return;
  }
  res.status(204).send();
});
