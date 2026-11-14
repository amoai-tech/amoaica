# AMO AI Dashboard

Independent Next.js application for the AMO AI client workspace.

**Status:** Development foundation. The initial repository is **not** a public production deployment. The existing AMO website, its Vercel project, and its Supabase database remain separate.

## Stack

- Next.js 16, React, TypeScript
- CopilotKit v2 for AI chat and rich client interactions
- Mastra for AI agents, tools, and workflows
- OpenAI for the selected agent model
- Supabase Auth and PostgreSQL for a **new, separate AMO AI project**
- CopilotKit Cloud Intelligence for conversation threads

## Local setup

```bash
npm ci
cp .env.example .env
# Add your model key, CopilotKit key, and later the NEW Supabase URL/publishable key
npm run dev
```

The Next.js interface is on the port shown by Next.js (often 3000 or 3001). The local Mastra Studio/API is on the port shown by Mastra (often 4111 or 4112).

**Supabase pending mode:** Until both `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` are configured, the home page displays a setup notice, and the CopilotKit API returns HTTP 503. This prevents accidentally using the existing AMO production database.

Never copy credentials from the older project to make the pending notice disappear. Use only the newly created AMO AI Supabase project.

## Authentication

The app uses Supabase email/password and Google OAuth via `@supabase/ssr`. The CopilotKit runtime checks verified Supabase JWT claims, and its threads are scoped to the verified user ID.

After creating the new project:
1. Configure its publishable key and URL in the ignored local `.env`.
2. Email Auth is enabled by default. Google Auth must be configured separately in the new Supabase project. Only after enabling it, set `NEXT_PUBLIC_GOOGLE_AUTH_ENABLED=true`.
   The existing AMO website's users do **not** automatically exist in this new project.
3. Configure **Auth URL Configuration** to allow your local `/auth/callback` URL and later your preview deployment.
4. Create or invite a **test account in the new Supabase project** and verify a real sign-in and refresh/reopen of a saved conversation.
5. Enable signup only after tenant isolation and RLS testing.

Signup remains intentionally disabled in this baseline. Agent and workflow data models are not finalized.

## Commands

```bash
npm run dev
npx tsc --noEmit
npm run build
npm audit --omit=dev --audit-level=critical
```

**Security:** Keep all secret keys server-side, never commit `.env` or `.env.local`, and do not deploy publicly until authenticated journeys, multi-tenant access, cloud thread persistence, and dependency advisories are reviewed. Mastra Studio is for local development and listens on loopback by default.

## Repositories and deployment boundaries

- **This project:** https://github.com/amoai-tech/amoaica
- **Existing AMO website:** https://github.com/amoai-tech/amo_agency
- **Existing website Vercel:** preserved; this repository is not connected to it.
- **Existing Supabase:** preserved; this application must use a newly created Supabase project.

The CopilotKit/Mastra "Proverbs / Weather / Moon" UI is intentionally retained for integration testing, not as the final business dashboard.

## Schema migrations

The first Supabase schema migration and a safe Preview/RLS checklist are in [docs/SUPABASE_SETUP.md](docs/SUPABASE_SETUP.md). Do not merge database migrations until the Preview branch has been verified.
