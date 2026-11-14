import { X509Certificate } from "node:crypto";
import { PostgresStore } from "@mastra/pg";

/**
 * OPT-IN only. Existing in-memory Mastra storage remains the default.
 * Enable MASTRA_PG_ENABLED only after authenticated, verified TLS
 * preflight and database initialization have passed.
 */
export function verifiedPgSettings(env: NodeJS.ProcessEnv = process.env) {
  const requested = env.MASTRA_PG_ENABLED?.trim();
  if (requested === "true" && env.NODE_TLS_REJECT_UNAUTHORIZED === "0") {
    throw new Error("Unsafe global TLS bypass detected; refusing PostgreSQL");
  }
  if (!requested || requested === "false") return null;
  if (requested !== "true") throw new Error("MASTRA_PG_ENABLED must be true or false");

  const rawUrl = env.POSTGRES_URL?.trim() || env.DATABASE_URL?.trim();
  if (!rawUrl) throw new Error("PostgreSQL storage needs POSTGRES_URL or DATABASE_URL");
  const caBase64 = env.MASTRA_PG_CA_CERT_B64?.trim();
  if (!caBase64) throw new Error("PostgreSQL storage needs MASTRA_PG_CA_CERT_B64");

  // Refuse non-PEM input. A CA certificate is public, but its trust source
  // must be validated against the Supabase project's SSL Configuration page.
  const ca = Buffer.from(caBase64, "base64").toString("utf8");
  if (!ca.includes("-----BEGIN CERTIFICATE-----")) {
    throw new Error("Invalid CA certificate format");
  }
  try {
    new X509Certificate(ca);
  } catch {
    throw new Error("Invalid CA certificate");
  }

  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    throw new Error("Invalid PostgreSQL connection URL");
  }
  if (
    (url.protocol !== "postgres:" && url.protocol !== "postgresql:") ||
    !url.hostname ||
    !url.username ||
    !url.password ||
    !url.pathname ||
    url.pathname === "/"
  ) {
    throw new Error("PostgreSQL URL needs a hostname, database, username and password");
  }
  if (url.hash) throw new Error("PostgreSQL URL fragments are not supported");
  const port = url.port ? Number(url.port) : 5432;
  if (!Number.isInteger(port) || port < 1 || port > 65535) {
    throw new Error("Invalid PostgreSQL port");
  }

  // Use host-based config, not connectionString. In node-postgres,
  // a URL sslmode parameter can override an explicit ssl object.
  // Explicit CA + hostname verification is mandatory and cannot be bypassed.
  return {
    id: "amoaica-mastra-durable",
    host: url.hostname,
    port,
    database: decodeURIComponent(url.pathname.slice(1)),
    user: decodeURIComponent(url.username),
    password: decodeURIComponent(url.password),
    schemaName: "mastra_private",
    max: 2,
    idleTimeoutMillis: 10_000,
    // Initialize tables separately after verified TLS preflight.
    // Never auto-create tables concurrently on serverless function startup.
    disableInit: true,
    ssl: {
      ca,
      rejectUnauthorized: true as const,
      servername: url.hostname,
    },
  };
}

// Shared for Next.js dev HMR and all imports within one server process.
// Not shared across Vercel instances; persistent state belongs in PostgreSQL.
const serverSingleton = globalThis as typeof globalThis & {
  __amoaicaDurableMastraStorage?: PostgresStore;
};

/** Both Mastra and its Agent Memory must use this same instance. */
export function optInPostgresStore() {
  const config = verifiedPgSettings();
  if (!config) return undefined;
  return (serverSingleton.__amoaicaDurableMastraStorage ??= new PostgresStore(config));
}
