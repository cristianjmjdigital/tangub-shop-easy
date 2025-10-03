-- Commerce & Messages Schema Migration
-- Run this in Supabase SQL editor.
-- Idempotent pattern: uses create table if not exists where possible and guards.

-- USERS table assumed existing (public.users) with id uuid PK (references auth.users.id).

create table if not exists public.vendors (
  id uuid primary key default gen_random_uuid(),
  store_name text not null,
  address text,
  owner_user_id uuid references public.users(id) on delete set null,
  created_at timestamptz default now()
);

create table if not exists public.products (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  name text not null,
  description text,
  price numeric(12,2) not null default 0,
  stock integer not null default 0,
  main_image_url text,
  created_at timestamptz default now()
);

create table if not exists public.carts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete cascade,
  created_at timestamptz default now(),
  unique(user_id) -- one active cart per user (simplified)
);

create table if not exists public.cart_items (
  id uuid primary key default gen_random_uuid(),
  cart_id uuid not null references public.carts(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete cascade,
  quantity integer not null check (quantity > 0),
  created_at timestamptz default now(),
  unique(cart_id, product_id)
);

create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users(id) on delete set null,
  total numeric(14,2) not null default 0,
  status text not null default 'pending',
  created_at timestamptz default now()
);

create table if not exists public.order_items (
  id uuid primary key default gen_random_uuid(),
  order_id uuid not null references public.orders(id) on delete cascade,
  product_id uuid not null references public.products(id) on delete set null,
  vendor_id uuid references public.vendors(id) on delete set null,
  quantity integer not null check (quantity > 0),
  price_at_purchase numeric(12,2) not null,
  created_at timestamptz default now()
);

-- Messaging table
create table if not exists public.messages (
  id uuid primary key default gen_random_uuid(),
  vendor_id uuid references public.vendors(id) on delete cascade,
  sender_user_id uuid not null references public.users(id) on delete cascade,
  receiver_user_id uuid not null references public.users(id) on delete cascade,
  content text not null,
  created_at timestamptz default now(),
  read_at timestamptz
);

-- Indexes for performance
create index if not exists idx_products_vendor on public.products(vendor_id);
create index if not exists idx_cart_items_cart on public.cart_items(cart_id);
create index if not exists idx_cart_items_product on public.cart_items(product_id);
create index if not exists idx_orders_user on public.orders(user_id);
create index if not exists idx_order_items_order on public.order_items(order_id);
create index if not exists idx_messages_receiver on public.messages(receiver_user_id) where read_at is null;
create index if not exists idx_messages_vendor on public.messages(vendor_id);
create index if not exists idx_messages_participants on public.messages(sender_user_id, receiver_user_id);

-- Simple stock decrement helper (optional) - uses security definer so callable via RPC if locked down later
create or replace function public.decrement_product_stock(p_id uuid, p_qty int)
returns void as $$
begin
  update public.products set stock = stock - p_qty where id = p_id and stock >= p_qty;
end;$$ language plpgsql security definer;

-- (Optional) Basic permissive RLS (already noted project uses open policies) - include as comments
-- alter table public.vendors enable row level security;
-- create policy "vendors all" on public.vendors for all using (true) with check (true);
-- Repeat for products, carts, cart_items, orders, order_items, messages as needed.
