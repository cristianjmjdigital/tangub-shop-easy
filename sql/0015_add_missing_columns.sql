-- Add missing columns referenced by frontend

-- products.main_image_url used in Index.tsx ProductCard
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS main_image_url text;

-- vendors.logo_url used for Featured Shops avatars
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS logo_url text;

-- vendors.store_name for consistency if not yet created
ALTER TABLE public.vendors
  ADD COLUMN IF NOT EXISTS store_name text;

-- Backfill store_name from name when null
UPDATE public.vendors SET store_name = name WHERE store_name IS NULL;