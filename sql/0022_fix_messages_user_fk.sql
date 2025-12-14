-- Align messages sender/receiver columns to match public.users(id) type (bigint)
-- Run in Supabase SQL editor or migration runner after 0021 attempt

-- Clean up existing constraints
alter table if exists public.messages drop constraint if exists messages_sender_user_id_fkey;
alter table if exists public.messages drop constraint if exists messages_receiver_user_id_fkey;

-- Ensure receiver_user_id column exists as bigint
alter table if exists public.messages
  add column if not exists receiver_user_id bigint;

-- Coerce types to bigint if they were uuid/text
alter table if exists public.messages
  alter column sender_user_id type bigint using sender_user_id::bigint,
  alter column receiver_user_id type bigint using receiver_user_id::bigint;

-- Recreate foreign keys
alter table if exists public.messages
  add constraint messages_sender_user_id_fkey foreign key (sender_user_id) references public.users(id) on delete cascade,
  add constraint messages_receiver_user_id_fkey foreign key (receiver_user_id) references public.users(id) on delete cascade;

-- Recreate index for unread lookups
create index if not exists idx_messages_receiver on public.messages(receiver_user_id) where read_at is null;
