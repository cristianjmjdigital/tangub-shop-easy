-- NOTE: This migration targets the BIGINT/serial schema (orders.id, vendors.id, users.id are BIGINT).
-- If your environment uses UUIDs instead, adjust the types to uuid accordingly.

create table if not exists public.order_ratings (
  id bigserial primary key,
  order_id bigint not null references public.orders (id) on delete cascade,
  vendor_id bigint not null references public.vendors (id) on delete cascade,
  user_id bigint not null references public.users (id) on delete cascade,
  rating smallint not null check (rating >= 1 and rating <= 5),
  review text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists order_ratings_order_user_key on public.order_ratings (order_id, user_id);
create index if not exists order_ratings_vendor_idx on public.order_ratings (vendor_id);

alter table public.order_ratings enable row level security;

-- Map auth.uid() (uuid) to public.users via auth_user_id
create policy "Users can read own ratings" on public.order_ratings
  for select using (
    exists (
      select 1 from public.users u
      where u.id = order_ratings.user_id
        and u.auth_user_id = auth.uid()
    )
  );

create policy "Users can upsert own ratings" on public.order_ratings
  for insert with check (
    exists (
      select 1 from public.users u
      where u.id = order_ratings.user_id
        and u.auth_user_id = auth.uid()
    )
  );

create policy "Users can update own ratings" on public.order_ratings
  for update using (
    exists (
      select 1 from public.users u
      where u.id = order_ratings.user_id
        and u.auth_user_id = auth.uid()
    )
  )
  with check (
    exists (
      select 1 from public.users u
      where u.id = order_ratings.user_id
        and u.auth_user_id = auth.uid()
    )
  );

-- Vendor owners can read ratings for their store
create policy "Vendors can read ratings for their store" on public.order_ratings
  for select using (
    exists (
      select 1 from public.vendors v
      where v.id = order_ratings.vendor_id
        and v.owner_user_id = (
          select u.id from public.users u where u.auth_user_id = auth.uid()
        )
    )
  );

-- Keep updated_at fresh on updates
create or replace function public.set_order_ratings_updated_at() returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists trg_order_ratings_updated_at on public.order_ratings;
create trigger trg_order_ratings_updated_at
before update on public.order_ratings
for each row execute function public.set_order_ratings_updated_at();
