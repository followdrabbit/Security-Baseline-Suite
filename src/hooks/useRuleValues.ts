import { useState, useEffect, useCallback, useRef } from 'react';
import { localDb } from '@/integrations/localdb/client';
import { useAuth } from '@/contexts/AuthContext';
import { toast } from 'sonner';

interface UseRuleValuesOptions {
  defaults: Record<string, string>;
}

export function useRuleValues({ defaults }: UseRuleValuesOptions) {
  const { user } = useAuth();
  const [values, setValues] = useState<Record<string, string>>(defaults);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const loadedRef = useRef(false);

  // Load from DB on mount
  useEffect(() => {
    if (!user || loadedRef.current) return;
    loadedRef.current = true;

    const load = async () => {
      try {
        const { data, error } = await localDb
          .from('user_rule_values')
          .select('rule_id, value')
          .eq('user_id', user.id);

        if (error) throw error;

        if (data && data.length > 0) {
          const merged = { ...defaults };
          data.forEach(row => {
            if (row.rule_id in defaults) {
              merged[row.rule_id] = row.value;
            }
          });
          setValues(merged);
        }
      } catch (err) {
        console.error('Failed to load rule values:', err);
      } finally {
        setLoading(false);
      }
    };

    load();
  }, [user, defaults]);

  // Reset loaded flag if user changes
  useEffect(() => {
    loadedRef.current = false;
  }, [user?.id]);

  const updateValue = useCallback(async (ruleId: string, value: string) => {
    if (!user) return;

    // Optimistic update
    setValues(prev => ({ ...prev, [ruleId]: value }));

    try {
      setSaving(true);
      if (value === defaults[ruleId]) {
        // If restoring to default, delete the row
        await localDb
          .from('user_rule_values')
          .delete()
          .eq('user_id', user.id)
          .eq('rule_id', ruleId);
      } else {
        // Upsert custom value
        const { error } = await localDb
          .from('user_rule_values')
          .upsert(
            { user_id: user.id, rule_id: ruleId, value },
            { onConflict: 'user_id,rule_id' }
          );
        if (error) throw error;
      }
    } catch (err) {
      console.error('Failed to save rule value:', err);
      toast.error('Failed to save');
      // Revert optimistic update
      setValues(prev => ({ ...prev, [ruleId]: defaults[ruleId] }));
    } finally {
      setSaving(false);
    }
  }, [user, defaults]);

  const restoreOne = useCallback(async (ruleId: string) => {
    await updateValue(ruleId, defaults[ruleId]);
  }, [updateValue, defaults]);

  const restoreAll = useCallback(async () => {
    if (!user) return;
    setValues(defaults);
    try {
      setSaving(true);
      await localDb
        .from('user_rule_values')
        .delete()
        .eq('user_id', user.id);
    } catch (err) {
      console.error('Failed to restore all:', err);
    } finally {
      setSaving(false);
    }
  }, [user, defaults]);

  return { values, loading, saving, updateValue, restoreOne, restoreAll };
}


