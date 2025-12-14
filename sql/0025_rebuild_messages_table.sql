-- Rebuild messages table to match frontend expectations (bigint IDs, vendor chat)
-- This drops the existing messages table (currently empty) and recreates it.

BEGIN;

DROP TABLE IF EXISTS public.messages CASCADE;

CREATE TABLE public.messages (
  id BIGSERIAL PRIMARY KEY,
  vendor_id BIGINT REFERENCES public.vendors(id) ON DELETE SET NULL,
  order_id BIGINT REFERENCES public.orders(id) ON DELETE SET NULL,
  sender_user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  receiver_user_id BIGINT NOT NULL REFERENCES public.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  created_at timestamptz DEFAULT now(),
  read_at timestamptz,
  sender_role text CHECK (sender_role IN ('admin','vendor','user'))
);

CREATE INDEX IF NOT EXISTS idx_messages_receiver ON public.messages(receiver_user_id) WHERE read_at IS NULL;
CREATE INDEX IF NOT EXISTS idx_messages_vendor ON public.messages(vendor_id);
CREATE INDEX IF NOT EXISTS idx_messages_order ON public.messages(order_id);

ALTER TABLE public.messages ENABLE ROW LEVEL SECURITY;

-- Allow participants to select
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'messages_select_participants' AND tablename = 'messages'
  ) THEN
    CREATE POLICY messages_select_participants ON public.messages FOR SELECT USING (
      EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = sender_user_id AND u.auth_user_id = auth.uid()::uuid
      )
      OR EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = receiver_user_id AND u.auth_user_id = auth.uid()::uuid
      )
    );
  END IF;
END $$;

-- Allow sender to insert
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'messages_insert_sender' AND tablename = 'messages'
  ) THEN
    CREATE POLICY messages_insert_sender ON public.messages FOR INSERT TO authenticated WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.users u WHERE u.id = sender_user_id AND u.auth_user_id = auth.uid()::uuid
      )
    );
  END IF;
END $$;

COMMIT;
