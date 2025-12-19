-- Fix: respect signup metadata for role/vendor_status during auth user trigger
-- Also backfill any auth users that were created with vendor metadata but ended up as role='user'.

BEGIN;

-- Recreate the trigger function to read raw_user_meta_data from auth.users
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  meta_role text := COALESCE(NEW.raw_user_meta_data->>'role', 'user');
  meta_vendor_status text := COALESCE(
    NEW.raw_user_meta_data->>'vendor_status',
    CASE WHEN meta_role = 'vendor' THEN 'pending' ELSE 'approved' END
  );
BEGIN
  INSERT INTO public.users (auth_user_id, email, full_name, role, vendor_status, city)
  VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'full_name', NEW.email),
    meta_role,
    meta_vendor_status,
    COALESCE(NEW.raw_user_meta_data->>'city', 'Tangub City')
  )
  ON CONFLICT (auth_user_id) DO UPDATE
    SET email = EXCLUDED.email,
        full_name = COALESCE(EXCLUDED.full_name, public.users.full_name),
        role = EXCLUDED.role,
        vendor_status = EXCLUDED.vendor_status,
        city = COALESCE(EXCLUDED.city, public.users.city);
  RETURN NEW;
END;
$$;

-- Backfill any auth users that signed up as vendor (metadata) but profile remained user
UPDATE public.users u
SET role = 'vendor', vendor_status = COALESCE(u.vendor_status, 'pending')
FROM auth.users au
WHERE au.id = u.auth_user_id
  AND COALESCE(au.raw_user_meta_data->>'role', 'user') = 'vendor'
  AND u.role <> 'vendor';

COMMIT;
