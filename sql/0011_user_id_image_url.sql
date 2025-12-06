-- Add column to store uploaded ID image URL/path
ALTER TABLE public.users
  ADD COLUMN IF NOT EXISTS id_image_url text;