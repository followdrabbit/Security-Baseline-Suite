
-- Activity log table for source status changes
CREATE TABLE public.source_activity_logs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  source_id uuid NOT NULL,
  user_id uuid NOT NULL,
  previous_status text,
  new_status text NOT NULL,
  event_type text NOT NULL DEFAULT 'status_change',
  metadata jsonb DEFAULT '{}'::jsonb,
  created_at timestamp with time zone NOT NULL DEFAULT now()
);

-- Index for fast lookup by source
CREATE INDEX idx_source_activity_logs_source_id ON public.source_activity_logs(source_id);

-- RLS
ALTER TABLE public.source_activity_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own source logs"
  ON public.source_activity_logs FOR SELECT
  TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert logs"
  ON public.source_activity_logs FOR INSERT
  TO authenticated
  WITH CHECK (user_id = auth.uid());

-- Trigger function to log status changes
CREATE OR REPLACE FUNCTION public.log_source_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path = public
AS $$
BEGIN
  -- Log on INSERT (source created)
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.source_activity_logs (source_id, user_id, previous_status, new_status, event_type, metadata)
    VALUES (NEW.id, NEW.user_id, NULL, NEW.status, 'created', jsonb_build_object('name', NEW.name, 'type', NEW.type));
    RETURN NEW;
  END IF;

  -- Log on UPDATE when status changes
  IF TG_OP = 'UPDATE' AND OLD.status IS DISTINCT FROM NEW.status THEN
    INSERT INTO public.source_activity_logs (source_id, user_id, previous_status, new_status, event_type, metadata)
    VALUES (NEW.id, NEW.user_id, OLD.status, NEW.status, 'status_change', jsonb_build_object('name', NEW.name));
    RETURN NEW;
  END IF;

  RETURN NEW;
END;
$$;

-- Attach trigger to sources table
CREATE TRIGGER trg_source_status_change
  AFTER INSERT OR UPDATE ON public.sources
  FOR EACH ROW
  EXECUTE FUNCTION public.log_source_status_change();
