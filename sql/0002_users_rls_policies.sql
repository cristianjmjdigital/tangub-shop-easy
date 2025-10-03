-- 0002_users_rls_policies.sql
-- Purpose: Ensure users table trigger + RLS policies allow automatic profile creation
-- and authenticated user self-access while remaining secure.
-- Run this in Supabase SQL editor (or psql) before retrying signup.

-- 1. Ensure unique constraint (idempotent) on auth_user_id
DO $$
BEGIN
  -- Conditionally add unique constraint (ADD CONSTRAINT does not support IF NOT EXISTS directly)
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'users_auth_user_id_key'
  ) THEN
    ALTER TABLE public.users
      ADD CONSTRAINT users_auth_user_id_key UNIQUE (auth_user_id);
  END IF;
END$$;

-- 2. (Re)create the trigger function with SECURITY DEFINER so it can bypass missing grants
--    NOTE: RLS still applies, so policies are still required.
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  -- Insert a skeleton profile row if it does not already exist.
  INSERT INTO public.users (auth_user_id, email, full_name, role)
  VALUES (NEW.id, NEW.email, COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email), 'user')
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

-- 3. Recreate trigger (safe if already exists)
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.handle_new_auth_user();

-- 4. Enable RLS (if not already)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;

-- 5. Drop old policies if they exist (ignore errors if they don't)
DO $$
DECLARE r record; BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='users'
      AND policyname IN ('users_self_select','users_self_insert','users_self_update','users_admin_all')
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users;', r.policyname);
  END LOOP;
END$$;

-- Helper predicate reused in policies for admin detection
-- (Cannot define a named predicate, so we inline in each policy.)

-- 6. Policies
-- Allow a signed-in user to see their own row OR any row if they are admin.
CREATE POLICY users_self_select ON public.users
FOR SELECT USING (
  auth.uid() = auth_user_id OR EXISTS (
    SELECT 1 FROM public.users me WHERE me.auth_user_id = auth.uid() AND me.role = 'admin'
  )
);

-- Allow a user to insert only their own row (fallback manual upsert) - trigger also benefits.
CREATE POLICY users_self_insert ON public.users
FOR INSERT WITH CHECK (
  auth.uid() = auth_user_id
);

-- Allow user to update their own row; admins may update any row.
CREATE POLICY users_self_update ON public.users
FOR UPDATE USING (
  auth.uid() = auth_user_id OR EXISTS (
    SELECT 1 FROM public.users me WHERE me.auth_user_id = auth.uid() AND me.role = 'admin'
  )
) WITH CHECK (
  auth.uid() = auth_user_id OR EXISTS (
    SELECT 1 FROM public.users me WHERE me.auth_user_id = auth.uid() AND me.role = 'admin'
  )
);

-- (Optional) Explicit admin catch‑all (redundant but clear)
CREATE POLICY users_admin_all ON public.users
FOR ALL USING (
  EXISTS (SELECT 1 FROM public.users me WHERE me.auth_user_id = auth.uid() AND me.role = 'admin')
) WITH CHECK (
  EXISTS (SELECT 1 FROM public.users me WHERE me.auth_user_id = auth.uid() AND me.role = 'admin')
);

-- 7. Grants (Supabase usually preconfigures these; include for completeness)
GRANT SELECT, INSERT, UPDATE ON public.users TO authenticated;
GRANT SELECT ON public.users TO anon;

-- 8. Verification queries (run manually after this file):
-- SELECT policyname, permissive, roles, cmd FROM pg_policies WHERE tablename='users';
-- EXPLAIN (VERBOSE, COSTS OFF) SELECT * FROM public.users WHERE auth_user_id = auth.uid();

-- After running: retry signup. The trigger should create the row; fallback upsert permissible; RLS violation should disappear.
