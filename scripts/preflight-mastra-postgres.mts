/**
 * Read-only TLS preflight. Does NOT initialize tables or change records.
 * Must run inside the actual environment being certified.
 * Never prints connection strings, passwords or certificates.
 */
import assert from "node:assert/strict";
import { PostgresStore } from "@mastra/pg";
import { verifiedPgSettings } from "../src/mastra/optional-pg-storage";

async function main() {
  if (process.env.MASTRA_PG_ENABLED !== "true") {
    throw new Error("Set MASTRA_PG_ENABLED=true for the preflight process only");
  }
  const options = verifiedPgSettings();
  assert.ok(options);
  const store = new PostgresStore(options);
  try {
    const result = await store.pool.query("SELECT 1::integer AS ok");
    assert.equal(result.rows[0]?.ok, 1);
    console.log("PASS: PostgreSQL read-only connection with verified TLS and hostname");
  } finally {
    await store.close();
  }
}

main().catch((error: unknown) => {
  const code = error && typeof error === "object" && "code" in error
    ? String((error as { code: unknown }).code)
    : "CONFIG_OR_CONNECTION_ERROR";
  // Deliberately don't log raw error messages that may contain connection URLs.
  console.error("FAIL: PostgreSQL TLS preflight, error code:", code);
  process.exitCode = 1;
});
