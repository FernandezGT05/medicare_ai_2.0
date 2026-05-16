import { getConfig, reloadEnv } from "../config.js";
import { closeDb, getDb } from "./db.js";
import { runMigrations } from "./migrate.js";

reloadEnv();
console.log(`SQLite database: ${getConfig().sqlitePath}`);
getDb();
runMigrations();
console.log("Migrations complete.");
closeDb();
