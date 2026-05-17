import cors from "cors";
import express, { type Express } from "express";
import { getConfig } from "./config.js";
import { runMigrations } from "./db/migrate.js";
import { apiRouter } from "./routes/api.js";
import { authRouter } from "./routes/auth.js";
import { consultationsRouter } from "./routes/consultations.js";
import { dashboardRouter } from "./routes/dashboard.js";
import { onboardingRouter } from "./routes/onboarding.js";
import { placesRouter } from "./routes/places.js";
import { profileRouter } from "./routes/profile.js";
import { healthLogRouter } from "./routes/healthLog.js";
import { historyRouter } from "./routes/history.js";
import { remindersRouter } from "./routes/reminders.js";
import { webhooksRouter } from "./routes/webhooks.js";

let dbReady = false;

export async function initServer(): Promise<void> {
  if (dbReady) return;
  await runMigrations();
  dbReady = true;
}

function buildCorsOrigins(): Set<string> {
  const config = getConfig();
  const origins = new Set<string>([
    config.clientOrigin,
    "http://localhost:5173",
    "http://127.0.0.1:5173",
  ]);
  if (process.env.VERCEL_URL) {
    origins.add(`https://${process.env.VERCEL_URL}`);
  }
  const frontend = process.env.FRONTEND_URL?.trim();
  if (frontend) origins.add(frontend);
  return origins;
}

export function createApp(): Express {
  const app = express();
  const corsOrigins = buildCorsOrigins();

  app.use(
    cors({
      origin(origin, callback) {
        if (!origin) {
          callback(null, true);
          return;
        }
        if (corsOrigins.has(origin)) {
          callback(null, true);
          return;
        }
        if (/^https?:\/\/(localhost|127\.0\.0\.1):\d+$/.test(origin)) {
          callback(null, true);
          return;
        }
        try {
          const host = new URL(origin).hostname;
          if (host.endsWith(".vercel.app")) {
            callback(null, true);
            return;
          }
        } catch {
          /* ignore */
        }
        callback(new Error(`CORS blocked for origin: ${origin}`));
      },
      methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization"],
    }),
  );
  app.use(express.json({ limit: "2mb" }));

  app.use("/api/auth", authRouter);
  app.use("/api/dashboard", dashboardRouter);
  app.use("/api/profile", profileRouter);
  app.use("/api/onboarding", onboardingRouter);
  app.use("/api/places", placesRouter);
  app.use("/api/reminders", remindersRouter);
  app.use("/api/health-log", healthLogRouter);
  app.use("/api/history", historyRouter);
  app.use("/api/consultations", consultationsRouter);
  app.use("/api/webhooks", webhooksRouter);
  app.use("/api", apiRouter);

  return app;
}
