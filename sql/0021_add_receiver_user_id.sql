-- Fix missing receiver_user_id column in messages table
-- Run this in Supabase SQL editor or via migration runner

alter table if exists public.messages
  add column if not exists receiver_user_id uuid references public.users(id) on delete cascade;

-- Index to speed unread lookups
create index if not exists idx_messages_receiver on public.messages(receiver_user_id) where read_at is null;

-- Optional: ensure messages table is in schema cache
-- select * from public.messages limit 1;
