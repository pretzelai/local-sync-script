import pg from "pg";
import type { Config } from "./config";

const { Pool } = pg;

export async function testConnection(databaseUrl: string): Promise<void> {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    await pool.query("SELECT 1");
  } finally {
    await pool.end();
  }
}

export async function isDatabaseReady(databaseUrl: string): Promise<boolean> {
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    const result = await pool.query(
      `SELECT COUNT(*) as cnt 
       FROM information_schema.tables 
       WHERE table_schema = 'stripe' 
       AND table_type = 'BASE TABLE'`
    );
    const tableCount = parseInt(result.rows[0].cnt, 10);
    // Consider ready if stripe schema has at least a few tables (migrations ran)
    return tableCount > 5;
  } catch {
    return false;
  } finally {
    await pool.end();
  }
}

export async function runMigrate(databaseUrl: string): Promise<void> {
  console.log("[sync] Running migrations...");
  const proc = Bun.spawn(
    [
      "bunx",
      "@paymentsdb/sync-engine",
      "migrate",
      "--database-url",
      databaseUrl,
    ],
    {
      stdout: "inherit",
      stderr: "inherit",
    }
  );
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Migration failed with exit code ${code}`);
  }
  console.log("[sync] Migrations complete.");
}

export async function runBackfill(
  config: Config,
  object: string = "all"
): Promise<void> {
  console.log(`[sync] Backfilling ${object} from Stripe (this may take a while)...`);
  const proc = Bun.spawn(
    [
      "bunx",
      "@paymentsdb/sync-engine",
      "backfill",
      object,
      "--stripe-key",
      config.stripeKey,
      "--database-url",
      config.databaseUrl,
    ],
    {
      stdout: "inherit",
      stderr: "inherit",
    }
  );
  const code = await proc.exited;
  if (code !== 0) {
    throw new Error(`Backfill failed with exit code ${code}`);
  }
  console.log("[sync] Backfill complete.");
}

export async function nukeDatabase(databaseUrl: string): Promise<void> {
  console.log("[sync] Dropping stripe schema...");
  const pool = new Pool({ connectionString: databaseUrl, max: 1 });
  try {
    await pool.query("DROP SCHEMA IF EXISTS stripe CASCADE");
    console.log("[sync] Schema dropped.");
  } finally {
    await pool.end();
  }
}
