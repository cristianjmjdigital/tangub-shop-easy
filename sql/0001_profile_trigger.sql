-- Trigger-based automatic profile creation for Supabase auth users
-- Run this in the Supabase SQL editor once.

CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
BEGIN
  INSERT INTO public.users (auth_user_id, full_name, email, role)
  VALUES (NEW.id, COALESCE(NEW.raw_user_meta_data->>'full_name',''), NEW.email, 'user')
  ON CONFLICT (auth_user_id) DO NOTHING;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE PROCEDURE public.handle_new_auth_user();

-- Optional: sample aggregate queries for admin metrics
-- SELECT count(*) FROM public.users;
-- SELECT count(*) FROM public.vendors;
-- SELECT count(*) FROM public.products;
-- SELECT count(*) FROM public.orders;