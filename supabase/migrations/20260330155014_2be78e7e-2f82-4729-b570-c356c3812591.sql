
-- Table to store per-user custom rule values
CREATE TABLE public.user_rule_values (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  rule_id text NOT NULL,
  value text NOT NULL,
  updated_at timestamp with time zone NOT NULL DEFAULT now(),
  UNIQUE (user_id, rule_id)
);

-- RLS
ALTER TABLE public.user_rule_values ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own rule values"
  ON public.user_rule_values FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own rule values"
  ON public.user_rule_values FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own rule values"
  ON public.user_rule_values FOR UPDATE
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can delete their own rule values"
  ON public.user_rule_values FOR DELETE
  TO authenticated
  USING (user_id = auth.uid());

-- Auto-update updated_at
CREATE TRIGGER update_user_rule_values_updated_at
  BEFORE UPDATE ON public.user_rule_values
  FOR EACH ROW
  EXECUTE FUNCTION public.update_updated_at_column();
