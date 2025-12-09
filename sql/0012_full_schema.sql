-- Tangub Shop Easy - Core Schema
-- Safe to re-run: uses IF NOT EXISTS where possible

BEGIN;

-- Extensions
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Users table (app profile, linked to Supabase auth)
CREATE TABLE IF NOT EXISTS public.users (
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

-- Unique ID number constraint (allow multiple NULLs)
CREATE UNIQUE INDEX IF NOT EXISTS users_id_number_unique_idx
  ON public.users (id_number)
  WHERE id_number IS NOT NULL;

-- Vendors
CREATE TABLE IF NOT EXISTS public.vendors (
  id BIGSERIAL PRIMARY KEY,
  owner_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  name text NOT NULL,
  description text,
  address text,
  phone text,
  barangay text,
  created_at timestamptz DEFAULT now()
);

-- Products
CREATE TABLE IF NOT EXISTS public.products (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT REFERENCES public.vendors(id) ON DELETE CASCADE,
  name text NOT NULL,
  description text,
  price numeric(12,2) NOT NULL CHECK (price >= 0),
  stock integer DEFAULT 0 CHECK (stock >= 0),
  image_url text,
  active boolean DEFAULT true,
  created_at timestamptz DEFAULT now()
);

-- Orders
CREATE TABLE IF NOT EXISTS public.orders (
  id BIGSERIAL PRIMARY KEY,
  user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  vendor_id BIGINT REFERENCES public.vendors(id) ON DELETE SET NULL,
  status text CHECK (status IN ('pending','preparing','for_delivery','delivered','cancelled')) DEFAULT 'pending',
  total_amount numeric(12,2) DEFAULT 0,
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

-- Order Items
CREATE TABLE IF NOT EXISTS public.order_items (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES public.orders(id) ON DELETE CASCADE,
  product_id BIGINT REFERENCES public.products(id) ON DELETE SET NULL,
  quantity integer NOT NULL CHECK (quantity > 0),
  unit_price numeric(12,2) NOT NULL CHECK (unit_price >= 0),
  subtotal numeric(12,2) GENERATED ALWAYS AS (quantity * unit_price) STORED
);

-- Messages (optional: admin/customer communications)
CREATE TABLE IF NOT EXISTS public.messages (
  id BIGSERIAL PRIMARY KEY,
  order_id BIGINT REFERENCES public.orders(id) ON DELETE CASCADE,
  sender_role text CHECK (sender_role IN ('admin','vendor','user')),
  recipient_user_id BIGINT REFERENCES public.users(id) ON DELETE SET NULL,
  content text NOT NULL,
  created_at timestamptz DEFAULT now()
);

-- Basic indexes
CREATE INDEX IF NOT EXISTS idx_users_auth_user_id ON public.users(auth_user_id);
CREATE INDEX IF NOT EXISTS idx_vendors_owner ON public.vendors(owner_user_id);
CREATE INDEX IF NOT EXISTS idx_products_vendor ON public.products(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_user ON public.orders(user_id);
CREATE INDEX IF NOT EXISTS idx_orders_vendor ON public.orders(vendor_id);
CREATE INDEX IF NOT EXISTS idx_orders_status ON public.orders(status);
CREATE INDEX IF NOT EXISTS idx_order_items_order ON public.order_items(order_id);

COMMIT;

-- Row Level Security (RLS) policies
ALTER TABLE public.users ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.vendors ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Public readable lists (adjust as needed)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'products' AND policyname = 'products_read_public'
  ) THEN
    CREATE POLICY "products_read_public" ON public.products
    FOR SELECT USING (true);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'vendors' AND policyname = 'vendors_read_public'
  ) THEN
    CREATE POLICY "vendors_read_public" ON public.vendors
    FOR SELECT USING (true);
  END IF;
END $$;

-- Users: allow user to read/update own row; admins can read all (if role column used in JWT)
-- Adjust for your JWT setup; default supabase exposes auth.uid()
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_select_own'
  ) THEN
    CREATE POLICY "users_select_own" ON public.users
    FOR SELECT USING (auth.uid()::uuid = auth_user_id);
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'users' AND policyname = 'users_update_own'
  ) THEN
    CREATE POLICY "users_update_own" ON public.users
    FOR UPDATE USING (auth.uid()::uuid = auth_user_id);
  END IF;
END $$;

-- Orders: user can read their orders; vendor can read orders for their shop
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'orders' AND policyname = 'orders_select_user_or_vendor'
  ) THEN
    CREATE POLICY "orders_select_user_or_vendor" ON public.orders
    FOR SELECT USING (
      auth.uid()::uuid = (SELECT auth_user_id FROM public.users WHERE public.users.id = orders.user_id)
      OR
      EXISTS (
        SELECT 1 FROM public.vendors v
        WHERE v.id = orders.vendor_id AND v.owner_user_id = (SELECT id FROM public.users WHERE auth_user_id = auth.uid()::uuid)
      )
    );
  END IF;
END $$;

-- Order items: visible if order visible
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'order_items' AND policyname = 'order_items_select_via_order'
  ) THEN
    CREATE POLICY "order_items_select_via_order" ON public.order_items
    FOR SELECT USING (
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

-- Messages: visible to participants
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'public' AND tablename = 'messages' AND policyname = 'messages_select_participants'
  ) THEN
    CREATE POLICY "messages_select_participants" ON public.messages
    FOR SELECT USING (
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

-- Storage bucket for ID images
-- Run these once (idempotent where possible)
-- Note: Supabase storage functions are executed separately; included here for convenience
-- Create bucket
-- select storage.create_bucket('id-images', public => true);
-- Policies
-- create policy "id-images read public" on storage.objects for select using (bucket_id = 'id-images');
-- create policy "id-images write authenticated" on storage.objects for insert to authenticated with check (bucket_id = 'id-images');
