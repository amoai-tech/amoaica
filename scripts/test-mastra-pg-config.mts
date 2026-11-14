import assert from "node:assert/strict";
import { rootCertificates } from "node:tls";
import { verifiedPgSettings, optInPostgresStore } from "../src/mastra/optional-pg-storage";

const base = {
  POSTGRES_URL: "postgresql://tester:pass%40word@localhost:5432/db?sslmode=require",
  MASTRA_PG_CA_CERT_B64: Buffer.from(rootCertificates[0], "utf8").toString("base64"),
};

assert.equal(verifiedPgSettings({ ...base }), null);
assert.equal(verifiedPgSettings({ ...base, MASTRA_PG_ENABLED: "false" }), null);
console.log("PASS: default and explicit OFF preserve existing runtime");

assert.throws(() => verifiedPgSettings({ MASTRA_PG_ENABLED: "true" }), /POSTGRES_URL/);
assert.throws(() => verifiedPgSettings({ ...base, MASTRA_PG_ENABLED: "true", MASTRA_PG_CA_CERT_B64: "" }), /CA_CERT/);
assert.throws(() => verifiedPgSettings({ ...base, MASTRA_PG_ENABLED: "true", MASTRA_PG_CA_CERT_B64: "bm90IGEgY2VydA==" }), /CA certificate/);
assert.throws(() => verifiedPgSettings({ ...base, MASTRA_PG_ENABLED: "true", NODE_TLS_REJECT_UNAUTHORIZED: "0" }), /Unsafe global TLS bypass/);
assert.throws(() => verifiedPgSettings({ ...base, MASTRA_PG_ENABLED: "oops" }), /must be true or false/);
console.log("PASS: invalid credentials and insecure TLS bypass are rejected");

const options = verifiedPgSettings({ ...base, MASTRA_PG_ENABLED: "true" });
assert.ok(options);
assert.equal(options.host, "localhost");
assert.equal(options.port, 5432);
assert.equal(options.user, "tester");
assert.equal(options.password, "pass@word");
assert.equal(options.database, "db");
assert.equal(options.schemaName, "mastra_private");
assert.equal(options.disableInit, true);
assert.equal(options.ssl.rejectUnauthorized, true);
assert.equal(options.ssl.servername, "localhost");
assert.match(options.ssl.ca, /BEGIN CERTIFICATE/);
assert.equal("connectionString" in options, false);
console.log("PASS: URL sslmode cannot override explicit CA and hostname verification");

// Constructor-only test. No database connection or schema operations.
const keep = { ...process.env };
try {
  process.env.MASTRA_PG_ENABLED = "true";
  process.env.POSTGRES_URL = base.POSTGRES_URL;
  process.env.MASTRA_PG_CA_CERT_B64 = base.MASTRA_PG_CA_CERT_B64;
  delete process.env.NODE_TLS_REJECT_UNAUTHORIZED;
  const first = optInPostgresStore();
  const second = optInPostgresStore();
  assert.ok(first);
  assert.equal(first, second);
  assert.equal(first.constructor.name, "PostgresStore");
  console.log("PASS: one shared Mastra instance for agent and runtime");
} finally {
  for (const key of ["MASTRA_PG_ENABLED", "POSTGRES_URL", "MASTRA_PG_CA_CERT_B64", "NODE_TLS_REJECT_UNAUTHORIZED"]) {
    if (keep[key] === undefined) delete process.env[key];
    else process.env[key] = keep[key];
  }
}
console.log("PASS: all secure opt-in configuration checks");
