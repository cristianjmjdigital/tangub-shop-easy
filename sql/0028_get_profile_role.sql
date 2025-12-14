-- Helper function to fetch a user's role via SECURITY DEFINER to avoid RLS edge cases
-- Returns NULL if no profile row exists

CREATE OR REPLACE FUNCTION public.get_profile_role(auth_uid uuid DEFAULT auth.uid())
RETURNS text
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
SET row_security = off
AS $$
  SELECT role FROM public.users WHERE auth_user_id = auth_uid LIMIT 1;
$$;

GRANT EXECUTE ON FUNCTION public.get_profile_role(uuid) TO anon, authenticated;
