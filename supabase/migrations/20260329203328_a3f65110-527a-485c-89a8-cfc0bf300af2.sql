CREATE TABLE public.user_preferences (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL UNIQUE,
  notify_source_processed boolean NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.user_preferences ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view own preferences" ON public.user_preferences
  FOR SELECT TO authenticated USING (user_id = auth.uid());

CREATE POLICY "Users can insert own preferences" ON public.user_preferences
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update own preferences" ON public.user_preferences
  FOR UPDATE TO authenticated USING (user_id = auth.uid());

CREATE TRIGGER trg_user_preferences_updated_at
  BEFORE UPDATE ON public.user_preferences
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE OR REPLACE FUNCTION public.notify_source_processed()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  should_notify boolean;
BEGIN
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status AND NEW.status = 'processed' THEN
    SELECT COALESCE(
      (SELECT notify_source_processed FROM public.user_preferences WHERE user_id = NEW.user_id),
      true
    ) INTO should_notify;

    IF should_notify THEN
      INSERT INTO public.notifications (user_id, project_id, type, title, message)
      VALUES (
        NEW.user_id,
        NEW.project_id,
        'source_processed',
        'Source Processed',
        NEW.name || ' has been processed successfully'
      );
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_source_processed
  AFTER UPDATE ON public.sources
  FOR EACH ROW EXECUTE FUNCTION public.notify_source_processed();