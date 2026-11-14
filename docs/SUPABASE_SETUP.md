# AMO AI: Projects database setup and permissions

## What this is

This guide documents how to reproduce the first app table (public.projects)
and its Row Level Security (RLS) permissions using the migration stored in GitHub.

- App repository: https://github.com/amoai-tech/amoaica
- Existing Supabase project: amoaica; the table and migration version already exist there.
- This PR does not create a new hosted database, reset passwords, or change live users.
- We are NOT enabling Supabase Preview Branching. There is no paid preview branch.

## What is saved in GitHub

supabase/migrations/20261114094055_create_projects_foundation.sql:

- Creates projects with id, name, description, status, owner_id, created_at
- Restricts status to draft, active, or completed
- Enforces a reference from owner_id to Supabase Auth users
- Enables RLS so an authenticated user can manage their own rows
- Provides is_super_admin(), a JWT app_metadata helper that grants application
  Super Admin access to all projects, NOT PostgreSQL superuser privileges
- Prevents anonymous users from querying the projects table

The migration matches the version previously applied in Supabase.
Do not manually reapply it to the same production database just because this
GitHub PR is merged.

## Rebuild safely, without a Supabase Preview branch

1. On your own development computer, run supabase start to create a LOCAL
   Supabase instance (requires Supabase CLI and a working local Docker runtime).
2. Run supabase db reset ONLY against that local instance to replay the
   version-controlled migrations. Never reset the hosted production database.
3. Use supabase status to get the local test URL and public key; do not reuse
   hosted production database credentials for automated tests.
4. Create a local Auth test user; Auth users are not copied from hosted project.
5. To give that local test account application Super Admin, update
   raw_app_meta_data using the Supabase SQL editor or Auth Admin API:

~~~sql
-- Only for the user you intentionally want to make Super Admin.
-- Replace with the UUID of a user in the same database.
UPDATE auth.users
SET raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"app_role":"super_admin","permissions":["*"]}'::jsonb
WHERE id = 'REPLACE_WITH_TEST_USER_UUID'::uuid;
~~~

6. Sign out and back in so the signed JWT contains the new app role.
7. Verify normal users see only their own projects and Super Admin sees all
   projects. Test creation, listing, editing, and deletion.

## How GitHub CI tests security

scripts/smoke-auth-guards.mjs checks the UNAUTHENTICATED application:

- Sign-in screen or safe Supabase setup pending screen renders
- Homepage sends visitors to login when Supabase is configured
- Anonymous GET/POST/PATCH/DELETE calls to CopilotKit endpoint are rejected
- Invalid OAuth callback redirects to login

CI runs with Supabase intentionally unconfigured. It does not
prove live login, JWT role enforcement, RLS isolation, or database CRUD.
Those need separately validated authenticated tests.

## Safe deployment boundaries

- Production Vercel is connected to the hosted Supabase database.
- Vercel Preview builds are useful for compilation, but must NOT
  use Production Supabase credentials for data-writing tests.
- No Supabase Preview branch is required; use local Supabase for migration tests.
- Keep OPENAI_API_KEY, CPK_INTELLIGENCE_API_KEY, database secrets,
  and service-role keys server-side. Never expose them with NEXT_PUBLIC_.
- NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY are public
  browser configuration, not superuser privileges.

## Pre-merge checklist

- [ ] CI build, TypeScript, anonymous auth smoke checks and dependency audit pass.
- [ ] Migration matches current projects structure and recorded version.
- [ ] RLS enabled and anon SELECT denied, both in schema and hosted database.
- [ ] is_super_admin() uses signed app_metadata; it is SECURITY INVOKER.
- [ ] No production secrets, passwords, or user data committed.
- [ ] No preview branch or new paid resource created.
- [ ] Authenticated owner vs non-owner vs Super Admin RLS journeys tested
      independently, or recorded as follow-up with clear limitation.
- [ ] PR merges cleanly into latest main.

This PR does not fix password-reset email rate limits: that is a separate
Supabase Auth provider quota / email configuration issue.
