
CREATE TABLE public.baseline_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL,
  user_id uuid NOT NULL,
  version integer NOT NULL DEFAULT 1,
  control_count integer NOT NULL DEFAULT 0,
  controls_snapshot jsonb NOT NULL DEFAULT '[]'::jsonb,
  changes_summary text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'draft',
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

ALTER TABLE public.baseline_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own versions" ON public.baseline_versions
  FOR SELECT TO authenticated USING (auth.uid() = user_id);

CREATE POLICY "Users can insert their own versions" ON public.baseline_versions
  FOR INSERT TO authenticated WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can delete their own versions" ON public.baseline_versions
  FOR DELETE TO authenticated USING (auth.uid() = user_id);
