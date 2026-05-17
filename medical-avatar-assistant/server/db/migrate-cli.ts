import { reloadEnv } from "../config.js";
import { closeDb } from "./db.js";
import { runMigrations } from "./migrate.js";

reloadEnv();

try {
  await runMigrations();
  console.log("Postgres migrations applied.");
} catch (error) {
  console.error("Migration failed:", error);
  process.exitCode = 1;
} finally {
  await closeDb();
}
