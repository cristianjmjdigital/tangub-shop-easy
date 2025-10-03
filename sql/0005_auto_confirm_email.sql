-- 0005_auto_confirm_email.sql
-- Purpose: For a school project (NOT for production), automatically mark emails as confirmed
-- so Supabase auth does not block login with 'Email not confirmed'.
-- This sets email_confirmed_at immediately after user creation.
-- WARNING: This removes the security benefit of email ownership verification.

CREATE OR REPLACE FUNCTION public.auto_confirm_email()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  UPDATE auth.users
    SET email_confirmed_at = NOW(), confirmed_at = NOW()
  WHERE id = NEW.id;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_auto_confirm_email ON auth.users;
CREATE TRIGGER trg_auto_confirm_email
AFTER INSERT ON auth.users
FOR EACH ROW EXECUTE PROCEDURE public.auto_confirm_email();

-- Verification query (run manually):
-- SELECT id, email, email_confirmed_at FROM auth.users ORDER BY created_at DESC LIMIT 5;
