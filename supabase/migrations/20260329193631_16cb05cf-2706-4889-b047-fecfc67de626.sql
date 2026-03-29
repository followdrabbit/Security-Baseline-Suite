ALTER TABLE public.sources 
  ADD COLUMN IF NOT EXISTS raw_content text,
  ADD COLUMN IF NOT EXISTS processed_at timestamp with time zone,
  ADD COLUMN IF NOT EXISTS extraction_method text;