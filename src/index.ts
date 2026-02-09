#!/usr/bin/env bun

import { loadConfig, promptForConfig, type Config } from "./config";
import { testConnection, isDatabaseReady, nukeDatabase, runMigrate, runBackfill } from "./sync";
import { startServer } from "./server";

const flags = new Set(process.argv.slice(2));
const forceResync = flags.has("--resync");
const forceNuke = flags.has("--nuke");

async function main() {
  console.log("\n  Stripe Sync Explorer\n");

  if (forceNuke) console.log("  --nuke flag: will drop and recreate everything");
  else if (forceResync) console.log("  --resync flag: will re-run migrate + backfill");

  // ── 1. Load or prompt for config ──
  let config: Config;
  const existing = loadConfig();

  if (existing) {
    console.log("  Using config from .env");
    console.log(`  Database: ${existing.databaseUrl}`);
    console.log(`  Stripe:   ${existing.stripeKey.slice(0, 12)}...\n`);
    config = existing;
  } else {
    config = await promptForConfig();
  }

  // ── 2. Test database connection ──
  try {
    await testConnection(config.databaseUrl);
    console.log("  Database connection OK.");
  } catch (err: any) {
    console.error("\n  Failed to connect to PostgreSQL:");
    console.error(`  ${err.message}\n`);
    console.error("  Make sure PostgreSQL is running. You can use the included docker-compose.yml:");
    console.error("    docker compose up -d\n");
    process.exit(1);
  }

  // ── 3. Check if data is already synced ──
  if (forceNuke) {
    console.log("  Nuking database...\n");
    await nukeDatabase(config.databaseUrl);
  }

  const shouldSync = forceNuke || forceResync || !(await isDatabaseReady(config.databaseUrl));

  if (shouldSync) {
    console.log("  Running sync...\n");
    await runMigrate(config.databaseUrl);
    await runBackfill(config);
    console.log("");
  } else {
    console.log("  Database already has Stripe data — skipping sync.\n");
  }

  // ── 4. Start the web UI ──
  startServer(config);
}

main().catch((err) => {
  console.error("Fatal error:", err);
  process.exit(1);
});
