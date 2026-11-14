-- Private, server-only Mastra memory and workflow storage.
-- Mastra creates its own tables under this schema on initialization.
-- Do not expose this schema via Supabase Data API.
CREATE SCHEMA IF NOT EXISTS mastra_private;
REVOKE ALL ON SCHEMA mastra_private FROM PUBLIC;
REVOKE ALL ON SCHEMA mastra_private FROM anon, authenticated;
COMMENT ON SCHEMA mastra_private IS 'Internal Mastra agent state; never add to exposed API schemas';
