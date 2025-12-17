-- Allow receivers to mark messages as read
-- Policy enables authenticated users to update read_at for messages they receive

BEGIN;

-- Update policy for receivers
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'messages_update_receiver' AND tablename = 'messages'
  ) THEN
    CREATE POLICY messages_update_receiver ON public.messages
      FOR UPDATE TO authenticated
      USING (
        EXISTS (
          SELECT 1 FROM public.users u WHERE u.id = receiver_user_id AND u.auth_user_id = auth.uid()::uuid
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.users u WHERE u.id = receiver_user_id AND u.auth_user_id = auth.uid()::uuid
        )
      );
  END IF;
END $$;

COMMIT;
