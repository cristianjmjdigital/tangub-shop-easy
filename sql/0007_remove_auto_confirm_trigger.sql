-- Migration: Remove obsolete auto-confirm trigger causing signup failures
-- Reason: Supabase auth now has email confirmations disabled. The custom trigger
-- 'trg_auto_confirm_email' (function: auto_confirm_email) attempts to mutate
-- internal auth columns during signup, leading to 500 'Database error saving new user'.
-- This script safely drops the trigger and its function if they exist.

begin;

-- Drop trigger on auth.users if present
DROP TRIGGER IF EXISTS trg_auto_confirm_email ON auth.users;

-- Drop helper function (adjust signature if it differs in your DB)
DROP FUNCTION IF EXISTS auth.auto_confirm_email();

commit;

-- After running this migration, retry signup with a fresh email.
-- If signup still fails with a 500, inspect other auth.* triggers (e.g., on_auth_user_created)
-- but that one is normally safe; leave it intact unless logs implicate it.
