-- Patch messages table to align with app expectations
-- Existing columns (from dashboard screenshot): id int8, order_id int8, sender_role text, recipient_user_id int8, content text, created_at timestamptz
-- We add vendor_id, sender_user_id, receiver_user_id to match frontend inserts.

alter table if exists public.messages
  add column if not exists vendor_id uuid references public.vendors(id) on delete cascade,
  add column if not exists sender_user_id bigint references public.users(id) on delete cascade,
  add column if not exists receiver_user_id bigint references public.users(id) on delete cascade;

-- Keep recipient_user_id for backward compatibility; ensure an index for unread lookups
create index if not exists idx_messages_receiver on public.messages(receiver_user_id) where read_at is null;

-- Optional: if you want to mirror recipient_user_id into receiver_user_id for legacy rows
-- update public.messages set receiver_user_id = recipient_user_id where receiver_user_id is null and recipient_user_id is not null;
