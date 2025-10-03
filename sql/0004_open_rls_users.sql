-- 0004_open_rls_users.sql
-- Purpose: Loosen RLS for school project (NOT for production!)
-- Allows any authenticated user to SELECT/INSERT/UPDATE/DELETE rows in users.
-- Grants anon read access too. Use with caution.

ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE r record; BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='users'
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users;', r.policyname);
  END LOOP;
END$$;

-- Wide open policies
CREATE POLICY users_select_all ON public.users FOR SELECT USING ( true );
CREATE POLICY users_insert_all ON public.users FOR INSERT WITH CHECK ( true );
CREATE POLICY users_update_all ON public.users FOR UPDATE USING ( true ) WITH CHECK ( true );
CREATE POLICY users_delete_all ON public.users FOR DELETE USING ( true );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;
