import dotenv from "dotenv";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
export const envPath = path.resolve(__dirname, "../.env");

/** Re-read .env so BEY_AGENT_ID_* catalog overrides apply without a manual server restart. */
export function reloadEnv(): void {
  if (fs.existsSync(envPath)) {
    dotenv.config({ path: envPath, override: true });
  }
}

export function optional(name: string): string | undefined {
  const value = process.env[name]?.trim();
  return value || undefined;
}

export function getConfig() {
  reloadEnv();
  const databaseUrl =
    optional("DATABASE_URL") ??
    optional("POSTGRES_URL") ??
    optional("POSTGRES_PRISMA_URL");
  return {
    port: Number(process.env.PORT ?? 3001),
    beyApiKey: optional("BEY_API_KEY"),
    beyApiBaseUrl: "https://api.bey.dev",
    embedBaseUrl: "https://bey.chat",
    clientOrigin: process.env.CLIENT_ORIGIN ?? "http://localhost:5173",
    databaseUrl,
    googleClientId: optional("GOOGLE_CLIENT_ID") ?? optional("VITE_GOOGLE_CLIENT_ID"),
    jwtSecret: optional("JWT_SECRET"),
    openaiApiKey: optional("OPENAI_API_KEY"),
    openaiModel: process.env.OPENAI_MODEL?.trim() || "gpt-4o-mini",
    googleMapsApiKey:
      optional("GOOGLE_MAPS_API_KEY") ??
      optional("VITE_GOOGLE_MAPS_API_KEY"),
    envPath,
  };
}

export type AppConfig = ReturnType<typeof getConfig>;

export function assertApiKey(config: AppConfig = getConfig()): string {
  const value = config.beyApiKey;
  if (!value) {
    throw new Error("Missing required environment variable: BEY_API_KEY");
  }
  return value;
}
