-- Compatibility schema adjustments based on frontend queries

BEGIN;

-- Add orders.total expected by AdminDashboard; keep in sync with total_amount
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS total numeric(12,2);

-- Backfill total from total_amount
UPDATE public.orders SET total = total_amount WHERE total IS NULL;

-- Trigger to keep total in sync when total_amount changes
DROP TRIGGER IF EXISTS orders_sync_total ON public.orders;
DROP FUNCTION IF EXISTS public.orders_sync_total_fn();

CREATE FUNCTION public.orders_sync_total_fn()
RETURNS trigger AS $body$
BEGIN
  IF NEW.total IS NULL THEN
    NEW.total := NEW.total_amount;
  END IF;
  RETURN NEW;
END;
$body$ LANGUAGE plpgsql;

CREATE TRIGGER orders_sync_total
BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_sync_total_fn();

COMMIT;

-- RLS: allow inserts for orders by the authenticated user
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='orders' AND policyname='orders_insert_own'
  ) THEN
    CREATE POLICY "orders_insert_own" ON public.orders
    FOR INSERT TO authenticated
    WITH CHECK (
      auth.uid()::uuid = (SELECT auth_user_id FROM public.users WHERE public.users.id = orders.user_id)
    );
  END IF;
END $$;

-- RLS: allow inserts for order_items if user owns the order (or vendor owns the order's vendor)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='order_items' AND policyname='order_items_insert_via_order'
  ) THEN
    CREATE POLICY "order_items_insert_via_order" ON public.order_items
    FOR INSERT TO authenticated
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.orders o WHERE o.id = order_items.order_id AND (
          auth.uid()::uuid = (SELECT auth_user_id FROM public.users WHERE public.users.id = o.user_id)
          OR EXISTS (
            SELECT 1 FROM public.vendors v
            WHERE v.id = o.vendor_id AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
          )
        )
      )
    );
  END IF;
END $$;
