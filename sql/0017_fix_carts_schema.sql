-- Align carts schema to BIGINT IDs used elsewhere
BEGIN;

-- Drop conflicting UUID-based tables if they exist
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.carts CASCADE;

-- Recreate carts with BIGINT keys
CREATE TABLE IF NOT EXISTS public.carts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vendor_id BIGINT REFERENCES public.vendors(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id)
);

CREATE TABLE IF NOT EXISTS public.cart_items (
  id BIGSERIAL PRIMARY KEY,
  cart_id BIGINT NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE (cart_id, product_id)
);

-- Indexes
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON public.cart_items(product_id);

COMMIT;

-- Enable RLS and permissive read; tighten later as needed
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='carts' AND policyname='carts_select_own'
  ) THEN
    CREATE POLICY "carts_select_own" ON public.carts FOR SELECT USING (
      auth.uid()::uuid = (SELECT auth_user_id FROM public.users u WHERE u.id = carts.user_id)
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='carts' AND policyname='carts_insert_own'
  ) THEN
    CREATE POLICY "carts_insert_own" ON public.carts FOR INSERT TO authenticated WITH CHECK (
      auth.uid()::uuid = (SELECT auth_user_id FROM public.users u WHERE u.id = carts.user_id)
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cart_items' AND policyname='cart_items_select_via_cart'
  ) THEN
    CREATE POLICY "cart_items_select_via_cart" ON public.cart_items FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND
          auth.uid()::uuid = (SELECT auth_user_id FROM public.users u WHERE u.id = c.user_id)
      )
    );
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='cart_items' AND policyname='cart_items_insert_via_cart'
  ) THEN
    CREATE POLICY "cart_items_insert_via_cart" ON public.cart_items FOR INSERT TO authenticated WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND
          auth.uid()::uuid = (SELECT auth_user_id FROM public.users u WHERE u.id = c.user_id)
      )
    );
  END IF;
END $$;
