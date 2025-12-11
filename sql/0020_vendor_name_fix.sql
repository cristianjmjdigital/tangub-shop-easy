-- Ensure vendors inserts don't fail on NULL name by syncing name/store_name both ways
-- Run after restore and before accepting vendor signups

-- Replace trigger to coalesce name and store_name
CREATE OR REPLACE FUNCTION public.vendors_sync_store_name_fn()
RETURNS trigger AS $$
BEGIN
  -- If name missing but store_name provided, copy it
  IF NEW.name IS NULL AND NEW.store_name IS NOT NULL THEN
    NEW.name := NEW.store_name;
  END IF;
  -- If store_name missing but name provided, copy it
  IF NEW.store_name IS NULL AND NEW.name IS NOT NULL THEN
    NEW.store_name := NEW.name;
  END IF;
  RETURN NEW;
END;$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS vendors_sync_store_name ON public.vendors;
CREATE TRIGGER vendors_sync_store_name
BEFORE INSERT OR UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.vendors_sync_store_name_fn();

-- Optional: backfill existing rows where name is NULL but store_name has data
UPDATE public.vendors SET name = store_name WHERE name IS NULL AND store_name IS NOT NULL;