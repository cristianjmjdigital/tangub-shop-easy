-- Add size column to cart_items to support fashion variants
ALTER TABLE IF EXISTS public.cart_items
  ADD COLUMN IF NOT EXISTS size text;

-- Optional: index to quickly group by product/size
CREATE INDEX IF NOT EXISTS idx_cart_items_product_size ON public.cart_items(product_id, size);
