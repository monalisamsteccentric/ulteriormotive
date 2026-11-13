-- Additive NEW-PROJECT schema only. Never targets pre-existing game tables.
-- Local and Supabase modes use the same compare-and-swap state machine.
-- All access is through the authenticated Next.js server; no public raw game state (which includes secrets).
CREATE TABLE IF NOT EXISTS public.um_app_state (
  id integer PRIMARY KEY CHECK (id = 1),
  version bigint NOT NULL DEFAULT 1 CHECK (version > 0),
  data jsonb NOT NULL
);
ALTER TABLE public.um_app_state ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON public.um_app_state FROM anon, authenticated;
GRANT SELECT, INSERT, UPDATE ON public.um_app_state TO service_role;
INSERT INTO public.um_app_state(id,version,data)
VALUES (1,1,'{"users":[],"sessions":{},"matches":[],"inquiries":[],"rates":{}}'::jsonb)
ON CONFLICT (id) DO NOTHING;
COMMENT ON TABLE public.um_app_state IS 'Private UM server state. Never publish to Realtime or expose service-role credentials.';
