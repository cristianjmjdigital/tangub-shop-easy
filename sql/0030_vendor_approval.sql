-- Add vendor approval status to users
BEGIN;

ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS vendor_status text CHECK (vendor_status IN ('pending','approved','rejected')) DEFAULT 'approved';

-- Backfill any existing rows to approved to avoid locking out current vendors/users
UPDATE public.users SET vendor_status = 'approved' WHERE vendor_status IS NULL;

COMMIT;
