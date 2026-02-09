import pg from "pg";
import type { Config } from "./config";
import { savedQueries } from "./queries";
import { nukeDatabase, runMigrate, runBackfill } from "./sync";

const { Pool } = pg;

let syncStatus: "idle" | "syncing" | "error" = "idle";
let syncMessage = "";

export function startServer(config: Config) {
  const pool = new Pool({
    connectionString: config.databaseUrl,
    max: 10,
  });

  const htmlPath = `${import.meta.dir}/ui.html`;

  const server = Bun.serve({
    port: 3000,

    async fetch(req) {
      const url = new URL(req.url);

      // ── Serve UI ──
      if (url.pathname === "/") {
        return new Response(Bun.file(htmlPath), {
          headers: { "Content-Type": "text/html; charset=utf-8" },
        });
      }

      // ── Pre-installed queries ──
      if (url.pathname === "/api/queries") {
        return Response.json(savedQueries);
      }

      // ── Execute SQL ──
      if (url.pathname === "/api/query" && req.method === "POST") {
        try {
          const { sql } = (await req.json()) as { sql: string };
          if (!sql?.trim()) {
            return Response.json({ error: "Empty query" }, { status: 400 });
          }

          const start = performance.now();
          const result = await pool.query(sql);
          const elapsed = Math.round(performance.now() - start);

          return Response.json({
            columns: result.fields?.map((f) => f.name) ?? [],
            rows: result.rows ?? [],
            rowCount: result.rowCount ?? 0,
            elapsed,
          });
        } catch (err: any) {
          return Response.json(
            { error: err.message ?? "Query failed" },
            { status: 400 }
          );
        }
      }

      // ── Nuke & Resync ──
      if (url.pathname === "/api/nuke" && req.method === "POST") {
        if (syncStatus === "syncing") {
          return Response.json(
            { error: "Sync already in progress" },
            { status: 409 }
          );
        }

        syncStatus = "syncing";
        syncMessage = "Starting nuke & resync...";

        // Run async — client polls /api/status
        (async () => {
          try {
            syncMessage = "Dropping stripe schema...";
            await nukeDatabase(config.databaseUrl);

            syncMessage = "Running migrations...";
            await runMigrate(config.databaseUrl);

            syncMessage = "Backfilling Stripe data (this may take a while)...";
            await runBackfill(config);

            syncStatus = "idle";
            syncMessage = "Sync complete!";
          } catch (err: any) {
            syncStatus = "error";
            syncMessage = err.message ?? "Unknown error during sync";
            console.error("[sync] Error:", err);
          }
        })();

        return Response.json({ status: "started" });
      }

      // ── Sync Status ──
      if (url.pathname === "/api/status") {
        return Response.json({ status: syncStatus, message: syncMessage });
      }

      // ── List Tables ──
      if (url.pathname === "/api/tables") {
        try {
          const result = await pool.query(`
            SELECT 
              schemaname || '.' || relname AS table_name,
              n_live_tup AS estimated_rows
            FROM pg_stat_user_tables
            WHERE schemaname = 'stripe'
            ORDER BY n_live_tup DESC
          `);
          return Response.json(result.rows);
        } catch (err: any) {
          return Response.json({ error: err.message }, { status: 400 });
        }
      }

      return new Response("Not Found", { status: 404 });
    },
  });

  // Graceful shutdown
  process.on("SIGINT", async () => {
    console.log("\nShutting down...");
    await pool.end();
    server.stop();
    process.exit(0);
  });

  console.log(`\n  Web UI running at http://localhost:${server.port}\n`);
  console.log("  Press Ctrl+C to stop.\n");
}
