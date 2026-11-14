# AMO AI: Mastra + Supabase — verified integration plan

## Short answer

Mastra uses Supabase in TWO separate ways:
1. PostgresStore persists conversations, agent memory, workflow state.
2. MastraAuthSupabase protects a separately hosted Mastra HTTP server.

The present Next.js app embeds a Mastra agent behind its own authenticated
CopilotKit route. Supabase auth.getClaims() is checked on every route method.
Do not add a second MastraAuthSupabase layer to that embedded route.

## What failed in Production

PR #3 added PostgresStore directly to the running app. PostgreSQL TLS failed
with SELF_SIGNED_CERT_IN_CHAIN before the model could answer. PR #4 reverted
this change. The new implementation is OPT-IN ONLY and defaults to the
original in-memory LibSQL stores. It has NOT been enabled in Vercel.

Never fix a certificate failure using NODE_TLS_REJECT_UNAUTHORIZED=0,
ssl: { rejectUnauthorized: false }, or sslmode=disable.

## Secure PostgreSQL configuration

Official references:
- https://mastra.ai/integrations/databases/postgresql
- https://supabase.com/docs/guides/platform/ssl-enforcement
- https://supabase.com/docs/guides/database/connecting-to-postgres
- https://supabase.com/docs/guides/database/psql

Current tested package pair: @mastra/core 1.41.0 + @mastra/pg 1.12.0.
Do not install @mastra/pg@latest independently: newer releases can require
a newer @mastra/core peer. Upgrade the Mastra packages together later.

The opt-in implementation:
- Requires MASTRA_PG_ENABLED=true and POSTGRES_URL (server-only).
- Requires MASTRA_PG_CA_CERT_B64, the base64 PEM root certificate from the
  **amoaica** project's Database > SSL Configuration, not another project.
- Parses the database URL to individual host/port/database/user/password
  properties. This avoids node-postgres connection-string query parameters
  silently overriding the explicit TLS object.
- Enforces trusted CA validation AND matching hostname on TLS connections.
- Uses one shared PostgresStore instance for Mastra and agent Memory.
- Limits each serverless instance to two connections.
- Uses schema mastra_private, not public; anon/authenticated have no
  USAGE on that schema. Do not expose it in Supabase Data API.
- Sets disableInit: true in the runtime. Initial table creation is a
  **separate, manually approved database operation**.
- Prevents global TLS verification bypass when enabled.

## Rollout order — no automatic production changes

1. Keep MASTRA_PG_ENABLED absent or false everywhere. This is the default.
2. Obtain the project's CA certificate from the Supabase Dashboard.
3. Download into a secure temporary local file; inspect its source.
4. Set MASTRA_PG_CA_CERT_B64 and POSTGRES_URL in a **secure test environment**.
   Never paste the password or certificate value into a PR or chat.
5. Run: MASTRA_PG_ENABLED=true npm run verify:mastra-pg-tls
   This runs only SELECT 1; it does NOT create tables.
   PASS proves network, login, trusted certificate and hostname **from that
   execution environment only**. Test again inside Vercel before switching.
6. After code review and explicit authorization, initialize the schema once:
   MASTRA_PG_ENABLED=true
   MASTRA_PG_SCHEMA_INIT=I_APPROVE_SCHEMA_CHANGES npm run init:mastra-pg
   WARNING: creates Mastra tables. Run only on the intended database.
7. Validate tables in mastra_private, role isolation and backup/retention.
8. With verified Vercel credentials and working tables, set
   MASTRA_PG_ENABLED=true for a controlled canary. Require signed-in
   first response, follow-up, refresh/history, and two-user isolation.
9. Inspect Vercel logs: no TLS errors, failed runs or delivery timeouts.
10. If anything fails, set MASTRA_PG_ENABLED=false, redeploy and investigate.
    Do not weaken SSL verification or grant superuser to app clients.

A local preflight against the hosted database cannot prove Vercel's runtime
certificates, so the Vercel-specific preflight is still a hard release gate.

## Authentication architecture

Current runtime: src/app/api/copilotkit/[[...slug]]/route.ts checks signed
Supabase JWT claims. identifyUser uses the verified sub as the thread owner.
Never replace these checks with a browser-provided user_id.

@mastra/auth-supabase is useful ONLY when running a separate, externally
reachable Mastra API and when the Mastra client forwards the user's JWT.
Its default authorizeUser queries public.users.isAdmin. AMO AI does not
have that column; application roles are in secure app_metadata. Enabling
default authorization would deny access. If a separate server is introduced,
use a custom authorizeUser and per-route policy based on app_metadata.

Do not wire all Mastra Connect Supabase management tools into a customer
agent. The provider can manage rows, storage and Auth users. Use least
privilege, scoped tools and explicit approval for destructive operations.

## Testing checklist

- [x] In-memory behavior remains default (feature flag absent).
- [x] Local build/TypeScript and security configuration smoke tests.
- [x] Invalid CA, missing credentials and global TLS bypass rejected.
- [x] Postgres URL query sslmode cannot replace explicit certificate check.
- [x] No PostgreSQL schema changes applied by this PR.
- [ ] Read-only TLS preflight with actual database credentials and CA.
- [ ] Database schema initialization separately approved and completed.
- [ ] Vercel-specific TLS preflight before enabling the new path.
- [ ] Signed-in chat returns answer and RUN_FINISHED.
- [ ] Follow-up/refresh/history and multi-user isolation pass.
- [ ] Fresh runner delivery timeouts absent from post-canary runtime logs.

AG-UI organization_id/project_id console warnings are a separate upstream
issue and do not establish chat failure. See CopilotKit issue #8251.
