/**
 * EXPLICIT SCHEMA CHANGE — never run as part of Vercel app startup/CI.
 * Requires validated TLS preflight and manual approval.
 */
import { PostgresStore } from "@mastra/pg";
import { verifiedPgSettings } from "../src/mastra/optional-pg-storage";

async function main() {
  if (
    process.env.MASTRA_PG_ENABLED !== "true" ||
    process.env.MASTRA_PG_SCHEMA_INIT !== "I_APPROVE_SCHEMA_CHANGES"
  ) {
    throw new Error("Schema init blocked without explicit approval variables");
  }
  const config = verifiedPgSettings();
  if (!config) throw new Error("PG configuration is not enabled");

  // Verify network, certificate, hostname and authorization before any DDL.
  const store = new PostgresStore({ ...config, disableInit: false });
  try {
    const r = await store.pool.query("SELECT 1 AS ok");
    if (r.rows[0]?.ok !== 1) throw new Error("Database preflight failed");
    await store.init();
    console.log("PASS: Mastra private schema and tables initialized");
  } finally {
    await store.close();
  }
}

main().catch((e: unknown) => {
  const code = e && typeof e === "object" && "code" in e
    ? String((e as { code: unknown }).code)
    : "CONFIG_OR_INIT_ERROR";
  console.error("FAIL: Mastra database initialization, code:", code);
  process.exitCode = 1;
});
