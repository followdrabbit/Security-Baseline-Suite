ALTER TABLE public.sources
  ADD COLUMN IF NOT EXISTS previous_extracted_content text,
  ADD COLUMN IF NOT EXISTS previous_extraction_model text,
  ADD COLUMN IF NOT EXISTS previous_extraction_tokens integer;