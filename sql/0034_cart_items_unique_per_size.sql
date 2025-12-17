-- Allow multiple sizes of the same product in one cart by including size in the unique constraint

BEGIN;

-- Drop existing unique constraint (cart_id, product_id)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'cart_items_cart_id_product_id_key'
      AND conrelid = 'public.cart_items'::regclass
  ) THEN
    ALTER TABLE public.cart_items DROP CONSTRAINT cart_items_cart_id_product_id_key;
  END IF;
END $$;

-- Add new unique constraint including size (null sizes still treated distinctly via coalesce)
ALTER TABLE public.cart_items
  ADD CONSTRAINT cart_items_unique_cart_product_size
  UNIQUE (cart_id, product_id, size);

COMMIT;
