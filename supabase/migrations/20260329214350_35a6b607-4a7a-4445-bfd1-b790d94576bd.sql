ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS extraction_model text,
  ADD COLUMN IF NOT EXISTS extraction_tokens integer;