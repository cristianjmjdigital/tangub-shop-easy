-- Add size options for fashion products

ALTER TABLE IF EXISTS public.products
  ADD COLUMN IF NOT EXISTS size_options text[] DEFAULT '{}'::text[];

-- Optional: index for filtering by size presence
CREATE INDEX IF NOT EXISTS idx_products_size_options ON public.products USING GIN (size_options);
