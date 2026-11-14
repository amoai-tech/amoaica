# AMO AI Supabase setup

## Scope

- GitHub: amoai-tech/amoaica
- Production Supabase project: amoaica
- Do not use the older amoai website database.
- Migration 20261114094055_create_projects_foundation.sql matches
  the migration version already applied on this Supabase main branch.
- The new app has only the public.projects business table.
- Every user is an authenticated Postgres role; application Super Admin
  is a **separate** authorization claim, not a Postgres superuser.

## Rebuild a fresh development database

1. Enable a Supabase Preview branch or local Supabase.
2. Run local migrations: supabase db reset ONLY on local development.
   Never run db reset against the hosted production database.
3. Create a NEW Auth test account in the branch. Production accounts
   are not copied to preview.
4. To grant the test account Super Admin in Supabase SQL Editor:

```sql
UPDATE auth.users
SET raw_app_meta_data =
  coalesce(raw_app_meta_data, '{}'::jsonb)
  || '{"app_role":"super_admin","permissions":["*"]}'::jsonb
WHERE id = 'REPLACE_WITH_TEST_USER_UUID'::uuid;
```

5. Sign out and sign back in to refresh the user's JWT.
6. Test projects SELECT/INSERT/UPDATE/DELETE using a real authenticated session.
   The is_super_admin() function checks signed JWT app_metadata.

## Security

- public.projects is protected by RLS.
- Authenticated owners can manage their own projects.
- The Super Admin JWT claim allows managing every project.
- Unauthenticated clients have no privileges on projects.
- The helper is_super_admin() is SECURITY INVOKER; do NOT replace
  it with SECURITY DEFINER or grant bypassrls.
- permissions: ["*"] is app-specific metadata; it does not grant
  SQL superuser privileges.

## Vercel environments

Production Supabase secrets sync to PRODUCTION ONLY.
Never point Vercel Preview or local development to the main database.
Supabase + GitHub branching (and Supabase/Vercel integration) must
provision a branch-specific database and credentials for each PR.
Supabase may need to redeploy a PR after its DB branch is provisioned.

NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY
are required for the Next.js app. Only add per-environment server-side
AI keys after validating the deployment boundary.

Do not merge a migration PR into main before validating schema,
RLS and Preview isolation.

## Verification checklist

- [ ] Supabase schema has the same six columns, defaults, checks, and FK.
- [ ] RLS enabled, no anon SELECT, single owner/admin ALL policy.
- [ ] is_super_admin() is SECURITY INVOKER and callable by authenticated only.
- [ ] No production Auth users or data are copied to Preview.
- [ ] Different users cannot read one another's projects.
- [ ] Super Admin can access all projects after refreshing JWT.
- [ ] Vercel Preview environment points to Preview project, NOT main.
- [ ] No server-side secret or postgres password is exposed to browser.
- [ ] Real sign-in / logout / refresh / invalid session tested in Preview.
