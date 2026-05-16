import OpenAI from "openai";
import { z } from "zod";
import { getConfig } from "../config.js";
import type { BeyCallMessage } from "../bey/calls.js";

const summarySchema = z.object({
  summary: z.string(),
  topics: z.array(z.string()),
  advice_given: z.array(z.string()),
  follow_up: z.string().nullable(),
});

export type VisitSummary = z.infer<typeof summarySchema>;

function formatTranscript(messages: BeyCallMessage[]): string {
  const lines: string[] = [];
  let previousLine: string | null = null;

  for (const m of messages) {
    const text = m.message.trim();
    if (!text) continue;
    const who =
      m.sender === "agent" || m.sender === "ai" ? "Assistant" : "User";
    const line = `${who}: ${text}`;
    if (line !== previousLine) {
      lines.push(line);
      previousLine = line;
    }
  }

  return lines.join("\n");
}

export async function summarizeTranscript(
  messages: BeyCallMessage[],
  specialtyLabel: string,
): Promise<VisitSummary> {
  const apiKey = getConfig().openaiApiKey;
  if (!apiKey) {
    throw new Error("OPENAI_API_KEY is not configured.");
  }

  const openai = new OpenAI({ apiKey });
  const transcript = formatTranscript(messages);
  if (!transcript.trim()) {
    return {
      summary: "No conversation content was captured for this visit.",
      topics: [],
      advice_given: [],
      follow_up: null,
    };
  }

  const response = await openai.chat.completions.create({
    model: getConfig().openaiModel,
    temperature: 0.2,
    response_format: { type: "json_object" },
    messages: [
      {
        role: "system",
        content: `You summarize virtual health assistant visits for storage in a patient history feature.
Consultation type: ${specialtyLabel}.
Rules:
- Base every detail ONLY on the transcript below. Do not invent goals, numbers, advice, or topics that are not stated or clearly implied in the conversation.
- Include the patient's stated goals (e.g. weight loss), habits, and specific numbers they mention (e.g. calorie intake, exercise frequency).
- In advice_given, list only guidance the assistant actually gave in the transcript—not generic wellness tips that were not discussed.
- Provide general wellness language only; never diagnose or prescribe.
- Output valid JSON with keys: summary (2-4 sentences), topics (string array), advice_given (string array), follow_up (string or null).
- follow_up must be actionable next steps for the patient (what to do next after this visit). Use 2-4 short lines separated by newline characters. Each line should be a concrete action (e.g. schedule a GP visit, track symptoms for a week). Use null only if no next steps were discussed.
- Do not paste the full transcript into the summary.
- Omit names and identifying details when possible.`,
      },
      {
        role: "user",
        content: `Summarize this visit transcript:\n\n${transcript}`,
      },
    ],
  });

  const raw = response.choices[0]?.message?.content;
  if (!raw) {
    throw new Error("OpenAI returned an empty summary.");
  }

  const parsed = summarySchema.parse(JSON.parse(raw));
  return parsed;
}
