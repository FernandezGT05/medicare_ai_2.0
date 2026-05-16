import fs from "fs";
import path from "path";
import { DatabaseSync } from "node:sqlite";
import { getConfig } from "../config.js";

let db: DatabaseSync | null = null;

export function getDb(): DatabaseSync {
  if (!db) {
    const { sqlitePath } = getConfig();
    const dir = path.dirname(sqlitePath);
    fs.mkdirSync(dir, { recursive: true });
    db = new DatabaseSync(sqlitePath);
    db.exec("PRAGMA journal_mode = WAL");
    db.exec("PRAGMA foreign_keys = ON");
  }
  return db;
}

export function closeDb(): void {
  if (db) {
    db.close();
    db = null;
  }
}
