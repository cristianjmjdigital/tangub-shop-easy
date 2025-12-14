-- Allow admins to read all users and orders (dashboard metrics)
-- Requires an authenticated session where the profile row has role='admin'.
-- We avoid recursive self-reference in policies by using a SECURITY DEFINER helper.

-- Helper: check if current auth user is an admin (runs as table owner, bypasses RLS)
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS boolean
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.users u
    WHERE u.auth_user_id = auth.uid()::uuid
      AND u.role = 'admin'
  );
$$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='users_select_admin_all' AND tablename='users') THEN
    CREATE POLICY users_select_admin_all ON public.users FOR SELECT USING (public.is_admin());
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='orders_select_admin_all' AND tablename='orders') THEN
    CREATE POLICY orders_select_admin_all ON public.orders FOR SELECT USING (public.is_admin());
  END IF;
END $$;
