-- Add delivery_method to orders to distinguish delivery vs pickup

BEGIN;

ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS delivery_method text CHECK (delivery_method IN ('delivery','pickup')) DEFAULT 'delivery';

-- Backfill existing rows
UPDATE public.orders SET delivery_method = 'delivery' WHERE delivery_method IS NULL;

COMMIT;
