-- Ensure unique, non-null ID numbers to prevent duplicates
BEGIN;
-- Drop prior non-unique index if present to avoid redundancy
DROP INDEX IF EXISTS public.users_id_number_idx;
-- Create a partial unique index so multiple NULLs are allowed but non-NULLs are unique
CREATE UNIQUE INDEX IF NOT EXISTS users_id_number_unique_idx
  ON public.users (id_number)
  WHERE id_number IS NOT NULL;
COMMIT;
