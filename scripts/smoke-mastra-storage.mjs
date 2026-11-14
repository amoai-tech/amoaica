import assert from "node:assert/strict";
import { spawnSync } from "node:child_process";

const command = process.platform === "win32" ? "node_modules/.bin/tsx.cmd" : "node_modules/.bin/tsx";
const file = "scripts/check-mastra-storage.mts";
const safeEnv = { ...process.env };
delete safeEnv.POSTGRES_URL;
delete safeEnv.DATABASE_URL;
delete safeEnv.VERCEL_ENV;

function check(name, env, expectedCode = 0, expectedText = "PASS") {
  const r = spawnSync(command, [file], { env, encoding: "utf8", timeout: 20000 });
  assert.equal(r.status, expectedCode, name + ": unexpected exit code\n" + (r.stderr || ""));
  assert.match((r.stdout || "") + (r.stderr || ""), new RegExp(expectedText), name);
  console.log("PASS: " + name);
}

check("local fallback has file-backed storage", safeEnv);
check("Vercel Preview without database uses only /tmp scratch storage", {
  ...safeEnv,
  VERCEL: "1",
  VERCEL_ENV: "preview",
});
check("production config selects Postgres", {
  ...safeEnv,
  VERCEL_ENV: "production",
  POSTGRES_URL: "postgresql://tester:fake@127.0.0.1:5432/fakedb",
});
check("production refuses ephemeral storage without DB credentials", {
  ...safeEnv,
  VERCEL_ENV: "production",
}, 1, "Production Mastra requires POSTGRES_URL");
