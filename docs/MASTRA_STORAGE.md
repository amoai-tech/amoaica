# AMO AI: durable Mastra memory on Vercel

## Root cause / why this change exists

Vercel function instances cannot share in-memory SQLite databases. Previously,
Mastra's top-level storage used :memory: and the agent Memory used
file::memory:. Chat history/working memory could disappear between requests.
Production also logged a missing-Mastra-thread warning and a separate
CopilotKit Intelligence runner-delivery timeout. Both need live rechecks;
the storage change addresses one architectural problem, not a guarantee
that every runner delivery error is fixed.

## Production

- Existing Vercel Production POSTGRES_URL from the amoaica Supabase integration
  is used automatically; no new key or paid Supabase Preview branch required.
- src/mastra/storage.ts selects a shared PostgresStore at both
  the agent and Mastra instance levels.
- Database uses internal mastra_private schema only; never include it
  among Supabase Data API exposed schemas.
- The small connection pool is appropriate for multiple Vercel instances.
- Missing POSTGRES_URL in Vercel Production fails closed instead of silently
  falling back to process-local history.

## Local development

If POSTGRES_URL/DATABASE_URL are missing, local development uses the ignored
file .mastra/amoaica-dev.db. This is not an external hosted database.
A Vercel Preview build without database credentials uses only /tmp scratch
storage (non-durable); that is NOT a connected testing environment and
must not be used to validate history or user authentication.

## Migrations and verification

1. Apply supabase/migrations/*_mastra_private_schema.sql to amoaica MAIN
   through reviewed Supabase migrations once; do not apply to another project.
2. Confirm mastra_private exists and anon/authenticated have no USAGE.
3. After production deployment, create a new chat, send one short message,
   and require RUN_FINISHED and a visible assistant answer.
4. Send a follow-up in the same thread, then refresh and confirm it persists.
5. Check Vercel function logs for Timed out trying to durably deliver
   runner events, missing-Mastra-thread warnings and database connection errors.
6. Confirm thread and message counts in mastra_private via read-only SQL,
   and keep CopilotKit Intelligence user ID equal to the authenticated Supabase
   sub claim. Do not log chat contents or bearer tokens.
7. Test a different account cannot access or replay another account's threads.

## AG-UI browser warning

RUN_STARTED fields organization_id / project_id are dropped by the AG-UI
schema validator. These warnings alone do not establish the root cause of a
missing assistant answer. Avoid suppressing them unless upstream SDK contract
or middleware is conclusively identified.
