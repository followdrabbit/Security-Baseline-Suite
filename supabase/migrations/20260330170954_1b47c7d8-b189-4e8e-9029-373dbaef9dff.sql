
CREATE TABLE public.rule_template_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  label text NOT NULL DEFAULT '',
  snapshot jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.rule_template_versions ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own template versions"
  ON public.rule_template_versions FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own template versions"
  ON public.rule_template_versions FOR INSERT TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can delete their own template versions"
  ON public.rule_template_versions FOR DELETE TO authenticated
  USING (user_id = auth.uid());
