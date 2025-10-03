-- 0003_users_rls_policies_fix.sql
-- Purpose: Replace recursive self-referential policies that caused infinite recursion
-- with simpler self-only policies (admin logic can be re-added later via a SECURITY DEFINER helper).
-- Also ensures updates (barangay, phone, app_role) are permitted for the owning user.

-- 1. Drop current policies
DO $$
DECLARE r record; BEGIN
  FOR r IN (
    SELECT policyname FROM pg_policies WHERE schemaname='public' AND tablename='users'
      AND policyname IN (
        'users_self_select','users_self_insert','users_self_update','users_admin_all'
      )
  ) LOOP
    EXECUTE format('DROP POLICY IF EXISTS %I ON public.users;', r.policyname);
  END LOOP;
END$$;

-- 2. Recreate minimal non-recursive policies
CREATE POLICY users_self_select ON public.users
FOR SELECT USING ( auth.uid() = auth_user_id );

CREATE POLICY users_self_insert ON public.users
FOR INSERT WITH CHECK ( auth.uid() = auth_user_id );

CREATE POLICY users_self_update ON public.users
FOR UPDATE USING ( auth.uid() = auth_user_id )
  WITH CHECK ( auth.uid() = auth_user_id );

-- (Optional) Later: create a SECURITY DEFINER function is_admin(auth.uid()) to avoid recursion
-- and add an admin policy leveraging that function.

-- 3. Verification queries (run manually after executing this file):
-- SELECT policyname, cmd FROM pg_policies WHERE tablename='users';
-- Try an update via client (should succeed for self row now).
