-- Add category column to products if missing and index it for filtering
-- Run this in Supabase SQL editor or your migration runner

alter table if exists public.products
  add column if not exists category text;

-- Optional: seed a default for rows missing category
-- update public.products set category = 'General' where category is null;

create index if not exists idx_products_category on public.products(category);
