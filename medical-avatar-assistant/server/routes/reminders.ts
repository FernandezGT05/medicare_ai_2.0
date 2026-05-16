import { Router } from "express";
import { requireAuth, type AuthenticatedRequest } from "../auth/middleware.js";
import {
  createReminder,
  deleteReminderForUser,
  listRemindersForUser,
  reminderToJson,
  updateReminder,
  type ReminderKind,
} from "../db/reminders.js";

const KINDS: ReminderKind[] = [
  "appointment",
  "medication",
  "follow_up",
  "custom",
];

export const remindersRouter = Router();

remindersRouter.use(requireAuth);

remindersRouter.get("/", (req, res) => {
  const { user } = req as AuthenticatedRequest;
  const reminders = listRemindersForUser(user.id).map(reminderToJson);
  res.json({ reminders });
});

remindersRouter.post("/", (req, res) => {
  const { user } = req as AuthenticatedRequest;
  const body = req.body ?? {};
  const kind = typeof body.kind === "string" ? body.kind.trim() : "";
  const title = typeof body.title === "string" ? body.title.trim() : "";
  const dueAtRaw = typeof body.dueAt === "string" ? body.dueAt : "";

  if (!KINDS.includes(kind as ReminderKind)) {
    res.status(400).json({ error: "Invalid reminder type." });
    return;
  }
  if (!title || title.length > 120) {
    res.status(400).json({ error: "Title is required (max 120 characters)." });
    return;
  }
  const dueAt = new Date(dueAtRaw);
  if (Number.isNaN(dueAt.getTime())) {
    res.status(400).json({ error: "Valid due date and time are required." });
    return;
  }

  const notes =
    body.notes === null || typeof body.notes === "string" ? body.notes : null;
  if (notes && notes.length > 500) {
    res.status(400).json({ error: "Notes are too long (max 500 characters)." });
    return;
  }

  const consultationId =
    typeof body.consultationId === "string" ? body.consultationId.trim() : null;

  const created = createReminder({
    userId: user.id,
    kind: kind as ReminderKind,
    title,
    notes,
    dueAt,
    consultationId: consultationId || null,
  });

  res.status(201).json({ reminder: reminderToJson(created) });
});

remindersRouter.patch("/:id", (req, res) => {
  const { user } = req as AuthenticatedRequest;
  const body = req.body ?? {};

  const input: Parameters<typeof updateReminder>[2] = {};

  if (typeof body.kind === "string") {
    if (!KINDS.includes(body.kind as ReminderKind)) {
      res.status(400).json({ error: "Invalid reminder type." });
      return;
    }
    input.kind = body.kind as ReminderKind;
  }
  if (typeof body.title === "string") {
    const title = body.title.trim();
    if (!title || title.length > 120) {
      res.status(400).json({ error: "Title is required (max 120 characters)." });
      return;
    }
    input.title = title;
  }
  if (body.notes === null || typeof body.notes === "string") {
    if (body.notes && body.notes.length > 500) {
      res.status(400).json({ error: "Notes are too long." });
      return;
    }
    input.notes = body.notes;
  }
  if (typeof body.dueAt === "string") {
    const dueAt = new Date(body.dueAt);
    if (Number.isNaN(dueAt.getTime())) {
      res.status(400).json({ error: "Invalid due date." });
      return;
    }
    input.dueAt = dueAt;
  }
  if (typeof body.completed === "boolean") {
    input.completed = body.completed;
  }

  const updated = updateReminder(req.params.id, user.id, input);
  if (!updated) {
    res.status(404).json({ error: "Reminder not found." });
    return;
  }
  res.json({ reminder: reminderToJson(updated) });
});

remindersRouter.delete("/:id", (req, res) => {
  const { user } = req as AuthenticatedRequest;
  const deleted = deleteReminderForUser(req.params.id, user.id);
  if (!deleted) {
    res.status(404).json({ error: "Reminder not found." });
    return;
  }
  res.status(204).send();
});
