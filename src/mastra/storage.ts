import { mkdirSync } from "node:fs";
import { join } from "node:path";
import { LibSQLStore } from "@mastra/libsql";
import { PostgresStore } from "@mastra/pg";

/**
 * Use one shared Mastra store for agent Memory and the Mastra instance.
 * The hosted Supabase database comes from Vercel's existing POSTGRES_URL.
 * Keep native Mastra tables in an internal schema, not the PostgREST public API.
 */
export function createMastraStorage() {
  const connectionString =
    process.env.POSTGRES_URL?.trim() || process.env.DATABASE_URL?.trim();

  if (connectionString) {
    return new PostgresStore({
      id: "amoaica-mastra",
      connectionString,
      schemaName: "mastra_private",
      // Vercel may run multiple function instances. Cap each instance's pool.
      max: 2,
      idleTimeoutMillis: 10_000,
    });
  }

  if (process.env.VERCEL_ENV === "production") {
    throw new Error("Production Mastra requires POSTGRES_URL; refusing in-memory storage.");
  }

  // Local-only fallback. Never use ephemeral in-memory SQLite in production.
  // Vercel Preview has no production DB credentials, and its app code is read-only.
  // Only its /tmp directory can hold throwaway scratch files. It must not be
  // used for production or for testing durable conversation history.
  const dir = process.env.VERCEL
    ? join("/tmp", "amoaica-mastra-preview")
    : join(process.cwd(), ".mastra");
  mkdirSync(dir, { recursive: true });
  return new LibSQLStore({
    id: "amoaica-mastra-local",
    url: "file:" + join(dir, "amoaica-dev.db"),
  });
}

export const storage = createMastraStorage();
