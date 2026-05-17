import { initDb } from "./db.js";

/** Apply pending Postgres migrations (idempotent). */
export async function runMigrations(): Promise<void> {
  await initDb();
}
