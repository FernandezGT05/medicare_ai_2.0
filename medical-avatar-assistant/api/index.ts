import express, { type Express } from "express";
import { createApp, initServer } from "../server/app.js";

function buildStartupErrorApp(message: string): Express {
  const app = express();
  app.use(express.json());
  app.all("*", (_req, res) => {
    res.status(503).json({
      ok: false,
      error: message,
      hint:
        "Set DATABASE_URL in Vercel to your Supabase Session pooler URI (aws-*.pooler.supabase.com:5432), then redeploy.",
    });
  });
  return app;
}

let app: Express;

try {
  await initServer();
  app = createApp();
  console.log("[api] Database ready");
} catch (error) {
  const message =
    error instanceof Error ? error.message : "Database initialization failed";
  console.error("[api] Startup failed:", error);
  app = buildStartupErrorApp(message);
}

export default app;
