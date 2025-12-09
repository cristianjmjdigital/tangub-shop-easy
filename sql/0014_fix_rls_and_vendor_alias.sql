-- Allow authenticated users to insert their own profile row (RLS fix)
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_insert_own'
  ) THEN
    CREATE POLICY "users_insert_own" ON public.users
    FOR INSERT
    TO authenticated
    WITH CHECK (auth.uid()::uuid = auth_user_id);
  END IF;
END $$;

-- Add vendor.store_name alias column to satisfy frontend expecting store_name
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS store_name text;

-- Backfill store_name from name
UPDATE public.vendors SET store_name = name WHERE store_name IS NULL;

-- Optional: keep name and store_name in sync via trigger (simple)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger WHERE tgname = 'vendors_sync_store_name'
  ) THEN
    CREATE OR REPLACE FUNCTION public.vendors_sync_store_name_fn()
    RETURNS trigger AS $$
    BEGIN
      IF NEW.store_name IS NULL THEN
        NEW.store_name := NEW.name;
      END IF;
      RETURN NEW;
    END;
    $$ LANGUAGE plpgsql;

    CREATE TRIGGER vendors_sync_store_name
    BEFORE INSERT OR UPDATE ON public.vendors
    FOR EACH ROW EXECUTE FUNCTION public.vendors_sync_store_name_fn();
  END IF;
END $$;