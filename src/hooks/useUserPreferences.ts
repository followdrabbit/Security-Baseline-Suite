import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';

export interface UserPreferences {
  id: string;
  user_id: string;
  notify_source_processed: boolean;
  notify_control_status: boolean;
  notify_team_member_joined: boolean;
  created_at: string;
  updated_at: string;
}

export function useUserPreferences() {
  const { user } = useAuth();
  const queryClient = useQueryClient();

  const { data: preferences, isLoading } = useQuery({
    queryKey: ['user-preferences', user?.id],
    queryFn: async () => {
      if (!user) return null;
      const { data, error } = await supabase
        .from('user_preferences' as any)
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      if (error) throw error;
      return data as unknown as UserPreferences | null;
    },
    enabled: !!user,
  });

  const notifySourceProcessed = preferences?.notify_source_processed ?? true;
  const notifyControlStatus = preferences?.notify_control_status ?? true;
  const notifyTeamMemberJoined = preferences?.notify_team_member_joined ?? true;

  const updatePreference = useMutation({
    mutationFn: async (updates: Partial<Pick<UserPreferences, 'notify_source_processed' | 'notify_control_status' | 'notify_team_member_joined'>>) => {
      if (!user) return;
      const { data: existing } = await supabase
        .from('user_preferences' as any)
        .select('id')
        .eq('user_id', user.id)
        .maybeSingle();

      if (existing) {
        const { error } = await supabase
          .from('user_preferences' as any)
          .update(updates)
          .eq('user_id', user.id);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('user_preferences' as any)
          .insert({ user_id: user.id, ...updates });
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['user-preferences', user?.id] });
    },
  });

  return { preferences, notifySourceProcessed, notifyControlStatus, notifyTeamMemberJoined, isLoading, updatePreference };
}
