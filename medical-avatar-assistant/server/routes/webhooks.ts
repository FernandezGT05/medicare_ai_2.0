import { Router } from "express";
import { processCallEndedWebhook } from "../services/finalizeConsultation.js";

export const webhooksRouter = Router();

interface BeyWebhookMessage {
  sender: string;
  message: string;
  sent_at?: string;
}

interface BeyWebhookBody {
  event_type?: string;
  call_id?: string;
  user_name?: string;
  messages?: BeyWebhookMessage[];
  message?: BeyWebhookMessage;
  call_data?: {
    agentId?: string;
    userName?: string;
    tags?: Record<string, string>;
  };
  tags?: Record<string, string>;
}

webhooksRouter.post("/bey", async (req, res) => {
  const body = req.body as BeyWebhookBody;

  if (body.event_type === "test") {
    res.sendStatus(200);
    return;
  }

  if (body.event_type === "call_ended") {
    const callId = body.call_id;
    const agentId =
      body.call_data?.agentId ??
      (typeof (body as { agent_id?: string }).agent_id === "string"
        ? (body as { agent_id: string }).agent_id
        : undefined);

    if (!callId || !agentId) {
      res.status(400).json({ error: "Missing call_id or agent id." });
      return;
    }

    const messages = body.messages ?? [];
    const tags = body.tags ?? body.call_data?.tags;

    try {
      await processCallEndedWebhook({
        callId,
        agentId,
        messages,
        tags,
      });
      res.sendStatus(200);
    } catch (error) {
      console.error("[webhook] call_ended processing failed:", error);
      res.sendStatus(200);
    }
    return;
  }

  res.sendStatus(200);
});
