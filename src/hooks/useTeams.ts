import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { localDb } from '@/integrations/localdb/client';
import { useAuth } from '@/contexts/AuthContext';

export interface Team {
  id: string;
  name: string;
  owner_id: string;
  created_at: string;
}

export interface TeamMember {
  id: string;
  team_id: string;
  user_id: string;
  role: string;
  joined_at: string;
}

export function useTeams() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: teams = [], isLoading } = useQuery({
    queryKey: ['teams', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await localDb
        .from('teams')
        .select('*')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data as Team[];
    },
    enabled: !!user,
  });

  const createTeam = useMutation({
    mutationFn: async (name: string) => {
      if (!user) throw new Error('Not authenticated');
      const { data, error } = await localDb
        .from('teams')
        .insert({ name, owner_id: user.id })
        .select()
        .single();
      if (error) throw error;
      // Auto-add owner as member
      await localDb.from('team_members').insert({
        team_id: data.id,
        user_id: user.id,
        role: 'owner',
      });
      return data;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['teams'] }),
  });

  const addMember = useMutation({
    mutationFn: async ({ teamId, userId }: { teamId: string; userId: string }) => {
      const { error } = await localDb
        .from('team_members')
        .insert({ team_id: teamId, user_id: userId, role: 'member' });
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team_members'] }),
  });

  const removeMember = useMutation({
    mutationFn: async (memberId: string) => {
      const { error } = await localDb
        .from('team_members')
        .delete()
        .eq('id', memberId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['team_members'] }),
  });

  const assignProjectToTeam = useMutation({
    mutationFn: async ({ projectId, teamId }: { projectId: string; teamId: string | null }) => {
      const { error } = await localDb
        .from('projects')
        .update({ team_id: teamId })
        .eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ['projects'] }),
  });

  return { teams, isLoading, createTeam, addMember, removeMember, assignProjectToTeam };
}

export function useTeamMembers(teamId: string | null) {
  return useQuery({
    queryKey: ['team_members', teamId],
    queryFn: async () => {
      if (!teamId) return [];
      const { data, error } = await localDb
        .from('team_members')
        .select('*')
        .eq('team_id', teamId);
      if (error) throw error;
      return data as TeamMember[];
    },
    enabled: !!teamId,
  });
}


