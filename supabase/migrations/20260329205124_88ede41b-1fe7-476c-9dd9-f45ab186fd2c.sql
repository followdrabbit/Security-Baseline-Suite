
-- Add new notification preference columns
ALTER TABLE public.user_preferences
  ADD COLUMN notify_control_status boolean NOT NULL DEFAULT true,
  ADD COLUMN notify_team_member_joined boolean NOT NULL DEFAULT true;

-- Update the control status change trigger to respect user preferences
CREATE OR REPLACE FUNCTION public.notify_control_status_change()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  member RECORD;
  proj_name text;
  ctrl_title text;
  should_notify boolean;
BEGIN
  IF OLD.review_status IS DISTINCT FROM NEW.review_status THEN
    SELECT name INTO proj_name FROM public.projects WHERE id = NEW.project_id;
    ctrl_title := NEW.title;
    
    FOR member IN
      SELECT tm.user_id
      FROM public.team_members tm
      JOIN public.projects p ON p.team_id = tm.team_id
      WHERE p.id = NEW.project_id
        AND tm.user_id != auth.uid()
    LOOP
      SELECT COALESCE(
        (SELECT notify_control_status FROM public.user_preferences WHERE user_id = member.user_id),
        true
      ) INTO should_notify;

      IF should_notify THEN
        INSERT INTO public.notifications (user_id, project_id, control_id, type, title, message, actor_id)
        VALUES (
          member.user_id,
          NEW.project_id,
          NEW.id,
          'control_status_change',
          'Control ' || NEW.review_status,
          ctrl_title || ' in ' || COALESCE(proj_name, 'project') || ' was ' || NEW.review_status,
          auth.uid()
        );
      END IF;
    END LOOP;
    
    IF EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = NEW.project_id AND user_id != auth.uid()
      AND team_id IS NULL
    ) THEN
      SELECT COALESCE(
        (SELECT notify_control_status FROM public.user_preferences WHERE user_id = p.user_id),
        true
      ) INTO should_notify
      FROM public.projects p WHERE p.id = NEW.project_id;

      IF should_notify THEN
        INSERT INTO public.notifications (user_id, project_id, control_id, type, title, message, actor_id)
        SELECT user_id, NEW.project_id, NEW.id, 'control_status_change',
          'Control ' || NEW.review_status,
          ctrl_title || ' in ' || COALESCE(proj_name, 'project') || ' was ' || NEW.review_status,
          auth.uid()
        FROM public.projects WHERE id = NEW.project_id AND user_id != auth.uid();
      END IF;
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

-- Create trigger for team member joined notifications
CREATE OR REPLACE FUNCTION public.notify_team_member_joined()
  RETURNS trigger
  LANGUAGE plpgsql
  SECURITY DEFINER
  SET search_path TO 'public'
AS $$
DECLARE
  team_name text;
  member RECORD;
  should_notify boolean;
BEGIN
  SELECT name INTO team_name FROM public.teams WHERE id = NEW.team_id;

  -- Notify all existing team members (except the new one)
  FOR member IN
    SELECT tm.user_id
    FROM public.team_members tm
    WHERE tm.team_id = NEW.team_id
      AND tm.user_id != NEW.user_id
  LOOP
    SELECT COALESCE(
      (SELECT notify_team_member_joined FROM public.user_preferences WHERE user_id = member.user_id),
      true
    ) INTO should_notify;

    IF should_notify THEN
      INSERT INTO public.notifications (user_id, team_id, type, title, message, actor_id)
      VALUES (
        member.user_id,
        NEW.team_id,
        'team_member_joined',
        'New Team Member',
        'A new member joined ' || COALESCE(team_name, 'your team'),
        NEW.user_id
      );
    END IF;
  END LOOP;

  RETURN NEW;
END;
$$;

CREATE TRIGGER trg_notify_team_member_joined
  AFTER INSERT ON public.team_members
  FOR EACH ROW EXECUTE FUNCTION public.notify_team_member_joined();
