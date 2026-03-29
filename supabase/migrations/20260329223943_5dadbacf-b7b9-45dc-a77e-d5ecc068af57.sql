ALTER TABLE public.baseline_versions 
  ADD COLUMN IF NOT EXISTS sources_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  ADD COLUMN IF NOT EXISTS project_snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  ADD COLUMN IF NOT EXISTS published_at timestamptz;

ALTER TABLE public.projects
  ADD COLUMN IF NOT EXISTS current_version integer NOT NULL DEFAULT 0;