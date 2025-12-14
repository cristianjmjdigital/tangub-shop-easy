-- Align messages.vendor_id type to match vendors.id (bigint)
-- Run after 0023 if vendors.id is bigint

-- Drop old FK if any
alter table if exists public.messages drop constraint if exists messages_vendor_id_fkey;

-- Ensure column exists and convert to bigint
alter table if exists public.messages
  add column if not exists vendor_id bigint;

alter table if exists public.messages
  alter column vendor_id type bigint using vendor_id::bigint;

-- Recreate FK to vendors.id
alter table if exists public.messages
  add constraint messages_vendor_id_fkey foreign key (vendor_id) references public.vendors(id) on delete cascade;
