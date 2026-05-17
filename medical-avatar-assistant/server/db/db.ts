import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import pg from "pg";

const { Pool } = pg;

let pool: pg.Pool | null = null;
let initPromise: Promise<void> | null = null;

export function getDatabaseUrl(): string {
  const url =
    process.env.DATABASE_URL?.trim() ||
    process.env.POSTGRES_URL?.trim() ||
    process.env.SUPABASE_DATABASE_URL?.trim() ||
    process.env.POSTGRES_PRISMA_URL?.trim();
  if (!url) {
    throw new Error(
      "DATABASE_URL is not configured. For Supabase on Vercel, use the Session pooler URI (IPv4), not the direct db.*.supabase.co host.",
    );
  }
  return url;
}

/** Supabase pooler (and PgBouncer) need simple queries — no prepared statements. */
function isPoolerConnection(connectionString: string): boolean {
  return (
    /pooler\.supabase\.com/i.test(connectionString) ||
    connectionString.includes("pgbouncer=true") ||
    /:6543\//.test(connectionString)
  );
}

function useSsl(connectionString: string): boolean {
  if (process.env.PGSSLMODE === "disable") return false;
  if (/localhost|127\.0\.0\.1/.test(connectionString)) return false;
  return true;
}

export function getPool(): pg.Pool {
  if (!pool) {
    const connectionString = getDatabaseUrl();
    const serverless = Boolean(process.env.VERCEL);
    pool = new Pool({
      connectionString,
      max: serverless ? 3 : 10,
      ssl: useSsl(connectionString) ? { rejectUnauthorized: false } : undefined,
      ...(isPoolerConnection(connectionString) ? { prepare: false } : {}),
    });
  }
  return pool;
}

async function runPostgresMigrations(): Promise<void> {
  const __dirname = path.dirname(fileURLToPath(import.meta.url));
  const migrationsDir = path.join(__dirname, "migrations", "postgres");
  const client = await getPool().connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS schema_migrations (
        name TEXT PRIMARY KEY,
        applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
      )
    `);
    const files = fs
      .readdirSync(migrationsDir)
      .filter((f) => f.endsWith(".sql"))
      .sort();
    for (const file of files) {
      const name = file;
      const applied = await client.query(
        "SELECT 1 FROM schema_migrations WHERE name = $1",
        [name],
      );
      if (applied.rowCount && applied.rowCount > 0) {
        continue;
      }
      const sql = fs.readFileSync(path.join(migrationsDir, file), "utf8");
      await client.query(sql);
      await client.query(
        "INSERT INTO schema_migrations (name) VALUES ($1) ON CONFLICT DO NOTHING",
        [name],
      );
    }
  } finally {
    client.release();
  }
}

export async function initDb(): Promise<void> {
  if (!initPromise) {
    initPromise = runPostgresMigrations();
  }
  await initPromise;
}

export async function query<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T[]> {
  await initDb();
  const result = await getPool().query<T>(text, params);
  return result.rows;
}

export async function queryOne<T extends pg.QueryResultRow = pg.QueryResultRow>(
  text: string,
  params?: unknown[],
): Promise<T | null> {
  const rows = await query<T>(text, params);
  return rows[0] ?? null;
}

export async function execute(
  text: string,
  params?: unknown[],
): Promise<number> {
  await initDb();
  const result = await getPool().query(text, params);
  return result.rowCount ?? 0;
}

export async function closeDb(): Promise<void> {
  if (pool) {
    await pool.end();
    pool = null;
    initPromise = null;
  }
}
