-- Track stock per size for fashion products
ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS size_stock jsonb DEFAULT '{}'::jsonb;

-- Keep a helper view of total stock by size via JSON; total stock column stays authoritative
-- Existing rows will see an empty object meaning uniform stock is in the `stock` column.
