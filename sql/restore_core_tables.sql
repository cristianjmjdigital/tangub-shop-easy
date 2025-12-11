-- Restore core commerce tables for Tangub Shop Easy
-- Includes columns aligned to frontend usage and recent fixes
-- Order: users -> vendors -> products -> carts -> cart_items -> orders -> order_items -> messages

BEGIN;

-- USERS
DROP TABLE IF EXISTS public.users CASCADE;
CREATE TABLE public.users (
  id BIGSERIAL PRIMARY KEY,
  auth_user_id uuid UNIQUE,
  email text,
  full_name text,
  role text CHECK (role IN ('user','vendor','admin')) DEFAULT 'user',
  phone text,
  city text DEFAULT 'Tangub City',
  barangay text,
  id_number text,
  id_image_url text,
  created_at timestamptz DEFAULT now()
);
CREATE UNIQUE INDEX IF NOT EXISTS users_id_number_unique_idx ON public.users(id_number) WHERE id_number IS NOT NULL;
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);

-- VENDORS
DROP TABLE IF EXISTS public.vendors CASCADE;
CREATE TABLE public.vendors (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  store_name text,
  address text,
  phone text,
  barangay text,
  logo_url text,
  created_at timestamptz DEFAULT now()
);
-- keep store_name in sync with name
CREATE OR REPLACE FUNCTION public.vendors_sync_store_name_fn()
RETURNS trigger AS $$
BEGIN
  IF NEW.store_name IS NULL THEN NEW.store_name := NEW.name; END IF;
  RETURN NEW;
END;$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS vendors_sync_store_name ON public.vendors;
CREATE TRIGGER vendors_sync_store_name BEFORE INSERT OR UPDATE ON public.vendors
FOR EACH ROW EXECUTE FUNCTION public.vendors_sync_store_name_fn();

-- PRODUCTS
DROP TABLE IF EXISTS public.products CASCADE;
CREATE TABLE public.products (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  stock integer DEFAULT 0 CHECK (stock >= 0),
  image_url text,
  main_image_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON public.products(vendor_id);

-- CARTS
DROP TABLE IF EXISTS public.cart_items CASCADE;
DROP TABLE IF EXISTS public.carts CASCADE;
CREATE TABLE public.carts (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  vendor_id BIGINT REFERENCES public.vendors(id) ON DELETE SET NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (user_id, vendor_id)
);

-- CART ITEMS
CREATE TABLE public.cart_items (
  id BIGSERIAL PRIMARY KEY,
  cart_id BIGINT NOT NULL REFERENCES public.carts(id) ON DELETE CASCADE,
  product_id BIGINT NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  created_at timestamptz DEFAULT now(),
  UNIQUE (cart_id, product_id)
);
CREATE INDEX IF NOT EXISTS idx_cart_items_cart ON public.cart_items(cart_id);
CREATE INDEX IF NOT EXISTS idx_cart_items_product ON public.cart_items(product_id);

-- ORDERS
DROP TABLE IF EXISTS public.order_items CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
CREATE TABLE public.orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  vendor_id BIGINT REFERENCES public.vendors(id) ON DELETE SET NULL,
  status text CHECK (status IN ('pending','preparing','for_delivery','delivered','cancelled')) DEFAULT 'pending',
  total_amount numeric(12,2) DEFAULT 0,
  total numeric(12,2),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);
-- keep total in sync
CREATE OR REPLACE FUNCTION public.orders_sync_total_fn()
RETURNS trigger AS $$
BEGIN
  IF NEW.total IS NULL THEN NEW.total := NEW.total_amount; END IF;
  RETURN NEW;
END;$$ LANGUAGE plpgsql;
DROP TRIGGER IF EXISTS orders_sync_total ON public.orders;
CREATE TRIGGER orders_sync_total BEFORE INSERT OR UPDATE ON public.orders
FOR EACH ROW EXECUTE FUNCTION public.orders_sync_total_fn();
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON public.orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);

-- ORDER ITEMS
CREATE TABLE public.order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
  quantity INTEGER NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  subtotal numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

-- MESSAGES
DROP TABLE IF EXISTS public.messages CASCADE;
CREATE TABLE public.messages (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_role text CHECK (sender_role IN ('admin','vendor','user')),
  recipient_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);
CREATE INDEX IF NOT EXISTS idx_messages_order ON public.messages(order_id);

COMMIT;

-- Enable RLS
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.carts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.cart_items ENABLE ROW LEVEL SECURITY;

-- Basic policies (permissive read; tighten as needed)
-- Products/Vendors public read
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='products_read_public' AND tablename='products') THEN
    CREATE POLICY products_read_public ON public.products FOR SELECT USING (true);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='vendors_read_public' AND tablename='vendors') THEN
    CREATE POLICY vendors_read_public ON public.vendors FOR SELECT USING (true);
  END IF;
END $$;

-- Users: select/update own; insert own
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='users_select_own' AND tablename='users') THEN
    CREATE POLICY users_select_own ON public.users FOR SELECT USING (auth.uid()::uuid = auth_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='users_update_own' AND tablename='users') THEN
    CREATE POLICY users_update_own ON public.users FOR UPDATE USING (auth.uid()::uuid = auth_user_id);
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='users_insert_own' AND tablename='users') THEN
    CREATE POLICY users_insert_own ON public.users FOR INSERT TO authenticated WITH CHECK (auth.uid()::uuid = auth_user_id);
  END IF;
END $$;

-- Orders: select if buyer or vendor owner; insert by buyer
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='orders_select_user_or_vendor' AND tablename='orders') THEN
    CREATE POLICY orders_select_user_or_vendor ON public.orders FOR SELECT USING (
      auth.uid()::uuid = (SELECT auth_user_id FROM public.users WHERE public.users.id = orders.user_id)
      OR EXISTS (
        SELECT 1 FROM public.vendors v
        WHERE v.id = orders.vendor_id AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='orders_insert_own' AND tablename='orders') THEN
    CREATE POLICY orders_insert_own ON public.orders FOR INSERT TO authenticated WITH CHECK (
      auth.uid()::uuid = (SELECT auth_user_id FROM public.users WHERE public.users.id = orders.user_id)
    );
  END IF;
END $$;

-- Order items: select/insert if order visible
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='order_items_select_via_order' AND tablename='order_items') THEN
    CREATE POLICY order_items_select_via_order ON public.order_items FOR SELECT USING (
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
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='order_items_insert_via_order' AND tablename='order_items') THEN
    CREATE POLICY order_items_insert_via_order ON public.order_items FOR INSERT TO authenticated WITH CHECK (
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

-- Carts: select/insert own
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='carts_select_own' AND tablename='carts') THEN
    CREATE POLICY carts_select_own ON public.carts FOR SELECT USING (
      auth.uid()::uuid = (SELECT auth_user_id FROM public.users u WHERE u.id = carts.user_id)
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='carts_insert_own' AND tablename='carts') THEN
    CREATE POLICY carts_insert_own ON public.carts FOR INSERT TO authenticated WITH CHECK (
      auth.uid()::uuid = (SELECT auth_user_id FROM public.users u WHERE u.id = carts.user_id)
    );
  END IF;
END $$;

-- Cart items: select/insert via owned cart
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='cart_items_select_via_cart' AND tablename='cart_items') THEN
    CREATE POLICY cart_items_select_via_cart ON public.cart_items FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND
          auth.uid()::uuid = (SELECT auth_user_id FROM public.users u WHERE u.id = c.user_id)
      )
    );
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='cart_items_insert_via_cart' AND tablename='cart_items') THEN
    CREATE POLICY cart_items_insert_via_cart ON public.cart_items FOR INSERT TO authenticated WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.carts c WHERE c.id = cart_items.cart_id AND
          auth.uid()::uuid = (SELECT auth_user_id FROM public.users u WHERE u.id = c.user_id)
      )
    );
  END IF;
END $$;

-- Messages: select if participant via order
DO $$ BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname='messages_select_participants' AND tablename='messages') THEN
    CREATE POLICY messages_select_participants ON public.messages FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.orders o WHERE o.id = messages.order_id AND (
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

-- Storage bucket note (run separately if needed)
-- select storage.create_bucket(name := 'id-images', public := true);
-- create policy "id-images read public" on storage.objects for select using (bucket_id = 'id-images');
-- create policy "id-images write authenticated" on storage.objects for insert to authenticated with check (bucket_id = 'id-images');
-- create policy "id-images update authenticated" on storage.objects for update to authenticated using (bucket_id = 'id-images') with check (bucket_id = 'id-images');
