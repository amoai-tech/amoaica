-- AMO AI foundation.
-- Matches the migration version already applied to amoaica Supabase MAIN.
-- Brand-new databases can replay this file; Auth users are not copied.

BEGIN;

CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS boolean
LANGUAGE sql
STABLE
SECURITY INVOKER
SET search_path = ''
AS $$
  SELECT COALESCE(
    (auth.jwt() -> 'app_metadata' ->> 'app_role') = 'super_admin',
    false
  );
$$;

REVOKE ALL ON FUNCTION public.is_super_admin() FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated;

CREATE TABLE IF NOT EXISTS public.projects (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL CHECK (length(trim(name)) > 0),
  description text,
  status text NOT NULL DEFAULT 'draft'
    CHECK (status IN ('draft', 'active', 'completed')),
  owner_id uuid NOT NULL DEFAULT auth.uid()
    REFERENCES auth.users(id),
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.projects ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE public.projects FROM anon;
GRANT SELECT, INSERT, UPDATE, DELETE
  ON TABLE public.projects TO authenticated;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public'
      AND tablename = 'projects'
      AND policyname = 'Project owner or Super Admin'
  ) THEN
    CREATE POLICY "Project owner or Super Admin"
    ON public.projects
    FOR ALL
    TO authenticated
    USING (
      owner_id = (SELECT auth.uid())
      OR (SELECT public.is_super_admin())
    )
    WITH CHECK (
      owner_id = (SELECT auth.uid())
      OR (SELECT public.is_super_admin())
    );
  END IF;
END;
$$;

COMMIT;
