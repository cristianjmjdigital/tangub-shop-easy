-- Add optional government/valid ID number to users
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS id_number text;

-- Optional index if you search by id_number
CREATE INDEX IF NOT EXISTS idx_users_id_number ON public.users(id_number);
