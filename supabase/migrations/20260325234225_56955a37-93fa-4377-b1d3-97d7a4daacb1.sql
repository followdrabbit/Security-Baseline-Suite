
-- Fix recursive RLS on team_members by using a security definer function
CREATE OR REPLACE FUNCTION public.get_user_team_ids(_user_id uuid)
RETURNS SETOF uuid
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = 'public'
AS $$
  SELECT team_id FROM public.team_members WHERE user_id = _user_id;
$$;

-- Drop problematic policies
DROP POLICY IF EXISTS "Team members can view members" ON public.team_members;
DROP POLICY IF EXISTS "Team members can view their teams" ON public.teams;
DROP POLICY IF EXISTS "Team members can view team projects" ON public.projects;
DROP POLICY IF EXISTS "Team members can view team controls" ON public.controls;
DROP POLICY IF EXISTS "Team members can update team controls" ON public.controls;

-- Recreate with security definer function
CREATE POLICY "Team members can view members"
  ON public.team_members FOR SELECT TO authenticated
  USING (team_id IN (SELECT public.get_user_team_ids(auth.uid())));

CREATE POLICY "Team members can view their teams"
  ON public.teams FOR SELECT TO authenticated
  USING (
    id IN (SELECT public.get_user_team_ids(auth.uid()))
    OR owner_id = auth.uid()
  );

CREATE POLICY "Team members can view team projects"
  ON public.projects FOR SELECT TO authenticated
  USING (
    team_id IS NOT NULL AND team_id IN (SELECT public.get_user_team_ids(auth.uid()))
  );

CREATE POLICY "Team members can view team controls"
  ON public.controls FOR SELECT TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.team_id IN (SELECT public.get_user_team_ids(auth.uid()))
    )
  );

CREATE POLICY "Team members can update team controls"
  ON public.controls FOR UPDATE TO authenticated
  USING (
    project_id IN (
      SELECT p.id FROM public.projects p
      WHERE p.team_id IN (SELECT public.get_user_team_ids(auth.uid()))
    )
  );
