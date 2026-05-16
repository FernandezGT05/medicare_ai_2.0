import fs from "fs";
import { envPath, getConfig, reloadEnv } from "./config.js";
import { closeDb } from "./db/db.js";
import { createApp, initServer } from "./app.js";
import {
  CATALOG_AGENT_IDS,
  CATALOG_AGENT_LABELS,
  resolveCatalogAgentBeyId,
} from "./services/agentCatalog.js";

reloadEnv();
const bootConfig = getConfig();

function logCatalogAgentConfig(): void {
  const config = getConfig();
  console.log(`Loaded env from ${config.envPath}`);
  console.log(`SQLite database: ${config.sqlitePath}`);
  if (!config.beyApiKey) {
    console.warn("Warning: BEY_API_KEY is not set. Add it to .env to connect.");
  }
  if (!config.openaiApiKey) {
    console.warn("Warning: OPENAI_API_KEY is not set. Visit summaries will fail.");
  }
  if (!config.jwtSecret) {
    console.warn("Warning: JWT_SECRET is not set. Auth will fail.");
  }
  console.log("Location services: OpenStreetMap Nominatim (no Google billing required)");
  for (const id of CATALOG_AGENT_IDS) {
    const beyId = resolveCatalogAgentBeyId(id);
    const label = CATALOG_AGENT_LABELS[id];
    console.log(
      `  ${label} (${id}): ${beyId ?? "not configured — set BEY_AGENT_ID_${id.toUpperCase()} in .env"}`,
    );
  }
}

initServer();
const app = createApp();

if (fs.existsSync(envPath)) {
  fs.watch(envPath, (eventType) => {
    if (eventType === "change") {
      reloadEnv();
      console.log(".env changed — reloaded configuration");
      logCatalogAgentConfig();
    }
  });
}

try {
  const port = bootConfig.port;
  console.log("Database ready (SQLite).");
  app.listen(port, () => {
    console.log(`API server listening on http://localhost:${port}`);
    logCatalogAgentConfig();
  });
} catch (error) {
  console.error("Failed to start server:", error);
  process.exit(1);
}

process.on("SIGTERM", () => {
  closeDb();
});
