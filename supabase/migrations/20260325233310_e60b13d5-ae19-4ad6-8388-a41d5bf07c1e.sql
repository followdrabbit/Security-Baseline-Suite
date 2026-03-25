
-- Teams table
CREATE TABLE public.teams (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  owner_id uuid NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;

-- Team members table
CREATE TABLE public.team_members (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id uuid NOT NULL,
  role text NOT NULL DEFAULT 'member',
  joined_at timestamptz NOT NULL DEFAULT now(),
  UNIQUE(team_id, user_id)
);

ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;

-- Add team_id to projects
ALTER TABLE public.projects ADD COLUMN team_id uuid REFERENCES public.teams(id) ON DELETE SET NULL;

-- Notifications table
CREATE TABLE public.notifications (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL,
  team_id uuid REFERENCES public.teams(id) ON DELETE CASCADE,
  project_id uuid REFERENCES public.projects(id) ON DELETE CASCADE,
  control_id uuid REFERENCES public.controls(id) ON DELETE CASCADE,
  type text NOT NULL DEFAULT 'control_status_change',
  title text NOT NULL,
  message text NOT NULL DEFAULT '',
  is_read boolean NOT NULL DEFAULT false,
  actor_id uuid,
  created_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- RLS for teams: members can view their teams
CREATE POLICY "Team members can view their teams"
  ON public.teams FOR SELECT TO authenticated
  USING (
    id IN (SELECT team_id FROM public.team_members WHERE user_id = auth.uid())
    OR owner_id = auth.uid()
  );

CREATE POLICY "Users can create teams"
  ON public.teams FOR INSERT TO authenticated
  WITH CHECK (owner_id = auth.uid());

CREATE POLICY "Team owners can update teams"
  ON public.teams FOR UPDATE TO authenticated
  USING (owner_id = auth.uid());

CREATE POLICY "Team owners can delete teams"
  ON public.teams FOR DELETE TO authenticated
  USING (owner_id = auth.uid());

-- RLS for team_members
CREATE POLICY "Team members can view members"
  ON public.team_members FOR SELECT TO authenticated
  USING (
    team_id IN (SELECT team_id FROM public.team_members tm WHERE tm.user_id = auth.uid())
  );

CREATE POLICY "Team owners can manage members"
  ON public.team_members FOR INSERT TO authenticated
  WITH CHECK (
    team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid())
  );

CREATE POLICY "Team owners can remove members"
  ON public.team_members FOR DELETE TO authenticated
  USING (
    team_id IN (SELECT id FROM public.teams WHERE owner_id = auth.uid())
    OR user_id = auth.uid()
  );

-- RLS for notifications
CREATE POLICY "Users can view their own notifications"
  ON public.notifications FOR SELECT TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
  ON public.notifications FOR UPDATE TO authenticated
  USING (user_id = auth.uid());

CREATE POLICY "System can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (true);

-- Update projects RLS: add team access (existing policies remain, add new one)
CREATE POLICY "Team members can view team projects"
  ON public.projects FOR SELECT TO authenticated
  USING (
    team_id IS NOT NULL AND team_id IN (
      SELECT team_id FROM public.team_members WHERE user_id = auth.uid()
    )
  );

-- Team members can view controls of team projects
CREATE POLICY "Team members can view team controls"
  ON public.controls FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Team members can update controls of team projects
CREATE POLICY "Team members can update team controls"
  ON public.controls FOR UPDATE TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
    )
  );

-- Enable realtime for notifications
ALTER PUBLICATION supabase_realtime ADD TABLE public.notifications;

-- Trigger function to create notifications on control review status change
CREATE OR REPLACE FUNCTION public.notify_control_status_change()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = 'public'
AS $$
DECLARE
  member RECORD;
  proj_name text;
  ctrl_title text;
BEGIN
  IF OLD.review_status IS DISTINCT FROM NEW.review_status THEN
    SELECT name INTO proj_name FROM public.projects WHERE id = NEW.project_id;
    ctrl_title := NEW.title;
    
    -- Notify all team members of the project (except the person who made the change)
    FOR member IN
      SELECT tm.user_id
      FROM public.team_members tm
      JOIN public.projects p ON p.team_id = tm.team_id
      WHERE p.id = NEW.project_id
        AND tm.user_id != auth.uid()
    LOOP
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
    END LOOP;
    
    -- Also notify the project owner if different from current user
    IF EXISTS (
      SELECT 1 FROM public.projects
      WHERE id = NEW.project_id AND user_id != auth.uid()
      AND team_id IS NULL
    ) THEN
      INSERT INTO public.notifications (user_id, project_id, control_id, type, title, message, actor_id)
      SELECT user_id, NEW.project_id, NEW.id, 'control_status_change',
        'Control ' || NEW.review_status,
        ctrl_title || ' in ' || COALESCE(proj_name, 'project') || ' was ' || NEW.review_status,
        auth.uid()
      FROM public.projects WHERE id = NEW.project_id AND user_id != auth.uid();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_control_status_change
  AFTER UPDATE ON public.controls
  FOR EACH ROW
  EXECUTE FUNCTION public.notify_control_status_change();
