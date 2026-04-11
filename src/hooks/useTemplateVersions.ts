import { useState, useEffect, useCallback } from 'react';
import { localDb } from '@/integrations/localdb/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

export const MAX_TEMPLATE_VERSIONS = 20;

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
      const { data, error } = await localDb
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

  const pruneOldVersions = useCallback(async (currentVersions: TemplateVersion[]) => {
    if (!user || currentVersions.length <= MAX_TEMPLATE_VERSIONS) return;
    const toDelete = currentVersions.slice(MAX_TEMPLATE_VERSIONS);
    for (const v of toDelete) {
      await localDb
        .from('rule_template_versions')
        .delete()
        .eq('id', v.id)
        .eq('user_id', user.id);
    }
  }, [user]);

  const saveVersion = useCallback(async (label: string, snapshot: Record<string, string>) => {
    if (!user) return;
    try {
      const { error } = await localDb
        .from('rule_template_versions')
        .insert({ user_id: user.id, label, snapshot: snapshot as any });
      if (error) throw error;
      toast.success('Version saved');
      await load();
      // Prune after reload so versions state is fresh
      const { data } = await localDb
        .from('rule_template_versions')
        .select('id, label, snapshot, created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (data && data.length > MAX_TEMPLATE_VERSIONS) {
        await pruneOldVersions(data.map((r: any) => ({ id: r.id, label: r.label, snapshot: r.snapshot, created_at: r.created_at })));
        await load();
        toast.info(`Oldest version(s) removed (max ${MAX_TEMPLATE_VERSIONS})`);
      }
    } catch (err) {
      console.error('Failed to save version:', err);
      toast.error('Failed to save version');
    }
  }, [user, load, pruneOldVersions]);

  const deleteVersion = useCallback(async (id: string) => {
    if (!user) return;
    try {
      const { error } = await localDb
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

  const renameVersion = useCallback(async (id: string, newLabel: string) => {
    if (!user) return;
    try {
      const { error } = await localDb
        .from('rule_template_versions')
        .update({ label: newLabel })
        .eq('id', id)
        .eq('user_id', user.id);
      if (error) throw error;
      setVersions(prev => prev.map(v => v.id === id ? { ...v, label: newLabel } : v));
      toast.success('Version renamed');
    } catch (err) {
      console.error('Failed to rename version:', err);
      toast.error('Failed to rename version');
    }
  }, [user]);

  return { versions, loading, saveVersion, deleteVersion, renameVersion, reload: load };
}


