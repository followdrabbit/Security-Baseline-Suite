import { useState, useEffect, useCallback } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export interface TemplateVersion {
  id: string;
  label: string;
  snapshot: Record<string, string>;
  created_at: string;
}

export function useTemplateVersions() {
  const { user } = useAuth();
  const [versions, setVersions] = useState<TemplateVersion[]>([]);
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!user) return;
    try {
      const { data, error } = await supabase
        .from('rule_template_versions')
        .select('id, label, snapshot, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      setVersions(
        (data || []).map((r: any) => ({
          id: r.id,
          label: r.label,
          snapshot: r.snapshot as Record<string, string>,
          created_at: r.created_at,
        }))
      );
    } catch (err) {
      console.error('Failed to load template versions:', err);
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => { load(); }, [load]);

  const saveVersion = useCallback(async (label: string, snapshot: Record<string, string>) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('rule_template_versions')
        .insert({ user_id: user.id, label, snapshot: snapshot as any });
      if (error) throw error;
      toast.success('Version saved');
      await load();
    } catch (err) {
      console.error('Failed to save version:', err);
      toast.error('Failed to save version');
    }
  }, [user, load]);

  const deleteVersion = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const { error } = await supabase
        .from('rule_template_versions')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      setVersions(prev => prev.filter(v => v.id !== id));
      toast.success('Version deleted');
    } catch (err) {
      console.error('Failed to delete version:', err);
      toast.error('Failed to delete version');
    }
  }, [user]);

  return { versions, loading, saveVersion, deleteVersion, reload: load };
}
