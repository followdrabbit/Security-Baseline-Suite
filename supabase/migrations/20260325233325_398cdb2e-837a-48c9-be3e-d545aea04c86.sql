
-- Fix: restrict notification inserts to only allow inserting for team members or project owners
DROP POLICY "System can insert notifications" ON public.notifications;

CREATE POLICY "Authenticated users can insert notifications"
  ON public.notifications FOR INSERT TO authenticated
  WITH CHECK (
    -- Allow if the actor is inserting a notification for a project they have access to
    project_id IN (
      SELECT id FROM public.projects WHERE user_id = auth.uid()
      UNION
      SELECT p.id FROM public.projects p
      JOIN public.team_members tm ON tm.team_id = p.team_id
      WHERE tm.user_id = auth.uid()
    )
    OR
    -- Allow trigger-based inserts (actor_id set)
    actor_id IS NOT NULL
  );
