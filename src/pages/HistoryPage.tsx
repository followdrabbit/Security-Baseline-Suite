import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import StatusBadge from '@/components/StatusBadge';
import ConfirmationModal from '@/components/ConfirmationModal';
import VersionDiffModal, { type DiffEntry } from '@/components/VersionDiffModal';
import SideBySideCompare from '@/components/SideBySideCompare';
import HelpButton from '@/components/HelpButton';
import { TimelineEntrySkeleton } from '@/components/skeletons/SkeletonPremium';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { History as HistoryIcon, GitCompare, RotateCcw, Clock, Loader2, Columns3, Shield, Rocket } from 'lucide-react';

interface BaselineVersion {
  id: string;
  project_id: string;
  version: number;
  control_count: number;
  controls_snapshot: any[];
  changes_summary: string;
  status: string;
  created_at: string;
}

const History: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [selectedProjectId, setSelectedProjectId] = useState<string>('');
  const [restoreModal, setRestoreModal] = useState<{ open: boolean; versionId?: string; version?: string }>({ open: false });
  const [restoring, setRestoring] = useState(false);
  const [diffModal, setDiffModal] = useState<{ open: boolean; fromVersion: number; toVersion: number; entries: DiffEntry[] }>({
    open: false, fromVersion: 0, toVersion: 0, entries: [],
  });
  const [sideBySide, setSideBySide] = useState<{
    open: boolean;
    left: { version: number; controls: any[] };
    right: { version: number; controls: any[] };
  }>({ open: false, left: { version: 0, controls: [] }, right: { version: 0, controls: [] } });

  const { data: projects = [] } = useQuery({
    queryKey: ['history-projects', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, technology')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const { data: versions = [], isLoading: loading } = useQuery({
    queryKey: ['baseline-versions', user?.id, selectedProjectId],
    queryFn: async () => {
      if (!user || !selectedProjectId) return [];
      const { data, error } = await supabase
        .from('baseline_versions')
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', selectedProjectId)
        .order('version', { ascending: false });
      if (error) throw error;
      return (data || []) as BaselineVersion[];
    },
    enabled: !!user && !!selectedProjectId,
  });

  // Fetch audit logs
  const { data: auditLogs = [] } = useQuery({
    queryKey: ['version-audit-logs', user?.id, selectedProjectId],
    queryFn: async () => {
      if (!user || !selectedProjectId) return [];
      const { data, error } = await supabase
        .from('version_audit_logs' as any)
        .select('*')
        .eq('user_id', user.id)
        .eq('project_id', selectedProjectId)
        .order('created_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      return (data || []) as any[];
    },
    enabled: !!user && !!selectedProjectId,
  });

  // Auto-select first project
  React.useEffect(() => {
    if (projects.length > 0 && !selectedProjectId) {
      setSelectedProjectId(projects[0].id);
    }
  }, [projects, selectedProjectId]);

  const buildDiff = (fromVersion: BaselineVersion, toVersion: BaselineVersion): DiffEntry[] => {
    const fromControls = (fromVersion.controls_snapshot || []) as any[];
    const toControls = (toVersion.controls_snapshot || []) as any[];

    const fromMap = new Map(fromControls.map(c => [c.control_id, c]));
    const toMap = new Map(toControls.map(c => [c.control_id, c]));

    const entries: DiffEntry[] = [];

    // Added controls (in "to" but not in "from")
    for (const [id, c] of toMap) {
      if (!fromMap.has(id)) {
        entries.push({
          controlId: c.control_id,
          title: c.title,
          changeType: 'added',
          criticality: c.criticality,
        });
      }
    }

    // Removed controls (in "from" but not in "to")
    for (const [id, c] of fromMap) {
      if (!toMap.has(id)) {
        entries.push({
          controlId: c.control_id,
          title: c.title,
          changeType: 'removed',
          criticality: c.criticality,
        });
      }
    }

    // Modified controls
    for (const [id, toC] of toMap) {
      const fromC = fromMap.get(id);
      if (!fromC) continue;
      const fieldChanges: { field: string; before: string; after: string }[] = [];
      if (fromC.title !== toC.title) fieldChanges.push({ field: 'Title', before: fromC.title, after: toC.title });
      if (fromC.description !== toC.description) fieldChanges.push({ field: 'Description', before: fromC.description || '', after: toC.description || '' });
      if (fromC.criticality !== toC.criticality) fieldChanges.push({ field: 'Criticality', before: fromC.criticality, after: toC.criticality });
      if (fromC.review_status !== toC.review_status) fieldChanges.push({ field: 'Review Status', before: fromC.review_status, after: toC.review_status });
      if (fieldChanges.length > 0) {
        entries.push({
          controlId: toC.control_id,
          title: toC.title,
          changeType: 'modified',
          criticality: toC.criticality,
          fieldChanges,
        });
      }
    }

    return entries;
  };

  const openDiff = (fromIdx: number) => {
    if (fromIdx <= 0 || fromIdx >= versions.length) return;
    const toVer = versions[0];
    const fromVer = versions[fromIdx];
    const entries = buildDiff(fromVer, toVer);
    setDiffModal({ open: true, fromVersion: fromVer.version, toVersion: toVer.version, entries });
  };

  const openSideBySide = (fromIdx: number) => {
    if (fromIdx <= 0 || fromIdx >= versions.length) return;
    const toVer = versions[0];
    const fromVer = versions[fromIdx];
    setSideBySide({
      open: true,
      left: { version: fromVer.version, controls: fromVer.controls_snapshot || [] },
      right: { version: toVer.version, controls: toVer.controls_snapshot || [] },
    });
  };

  return (
    <div className="p-6 lg:p-8 max-w-5xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.history.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.history.subtitle}</p>
        </div>
        <HelpButton section="history" />
      </div>

      {/* Project selector */}
      <div className="max-w-md">
        <label className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-1.5 block">Project</label>
        <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
          <SelectTrigger className="h-9">
            <SelectValue placeholder="Select a project" />
          </SelectTrigger>
          <SelectContent>
            {projects.map(p => (
              <SelectItem key={p.id} value={p.id}>
                {p.name} — {p.technology}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div className="relative">
        <div className="absolute left-[19px] top-0 bottom-0 w-px bg-border" />
        <div className="space-y-6">
          {loading ? (
            Array.from({ length: 3 }).map((_, i) => <TimelineEntrySkeleton key={i} />)
          ) : versions.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground ml-14">
              <HistoryIcon className="h-8 w-8 mx-auto mb-3 opacity-30" />
              <p className="text-sm">No version history yet. Generate controls in the AI Workspace to create the first version.</p>
            </div>
          ) : (
            versions.map((ver, i) => (
              <motion.div
                key={ver.id}
                initial={{ opacity: 0, x: -12 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: i * 0.1 }}
                className="flex gap-4"
              >
                <div className="relative z-10">
                  <div className={`h-10 w-10 rounded-full flex items-center justify-center border-2 ${
                    i === 0 ? 'gold-gradient border-primary/30' : 'bg-card border-border'
                  }`}>
                    {i === 0 ? <Clock className="h-4 w-4 text-primary-foreground" /> : <HistoryIcon className="h-4 w-4 text-muted-foreground" />}
                  </div>
                </div>
                <div className="flex-1 bg-card border border-border rounded-lg p-5 shadow-premium">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-3">
                      <span className="text-sm font-semibold text-foreground">{t.history.version} {ver.version}</span>
                      {i === 0 && <span className="text-[10px] px-2 py-0.5 gold-gradient text-primary-foreground rounded-full font-medium">{t.history.current}</span>}
                      <StatusBadge status={ver.status} type="project" />
                    </div>
                    <span className="text-xs text-muted-foreground">{new Date(ver.created_at).toLocaleString()}</span>
                  </div>
                  <p className="text-xs text-muted-foreground mb-3">{ver.changes_summary}</p>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>{ver.control_count} controls</span>
                    </div>
                    <div className="flex gap-2">
                      {i > 0 && (
                        <>
                          <Button variant="outline" size="sm" onClick={() => openSideBySide(i)}>
                            <Columns3 className="h-3.5 w-3.5 mr-1" />{t.history.sideBySide.compareSideBySide}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => openDiff(i)}>
                            <GitCompare className="h-3.5 w-3.5 mr-1" />{t.history.compare}
                          </Button>
                          <Button variant="outline" size="sm" onClick={() => setRestoreModal({ open: true, versionId: ver.id, version: String(ver.version) })}>
                            <RotateCcw className="h-3.5 w-3.5 mr-1" />{t.history.restore}
                          </Button>
                        </>
                      )}
                    </div>
                  </div>
                </div>
              </motion.div>
            ))
          )}
        </div>
      </div>

      <ConfirmationModal
        open={restoreModal.open}
        onOpenChange={(open) => setRestoreModal(prev => ({ ...prev, open }))}
        variant="restore"
        title={t.confirmModal.restoreTitle}
        description={t.confirmModal.restoreDesc}
        itemLabel={restoreModal.version ? `${t.history.version} ${restoreModal.version}` : undefined}
        confirmLabel={restoring ? 'Restoring...' : t.history.restore}
        cancelLabel={t.common.cancel}
        onConfirm={async () => {
          if (!restoreModal.versionId || !selectedProjectId || restoring) return;
          setRestoring(true);
          try {
            const { data, error } = await supabase.functions.invoke('restore-baseline', {
              body: { versionId: restoreModal.versionId, projectId: selectedProjectId },
            });
            if (error) throw error;
            if (data?.error) throw new Error(data.error);

            queryClient.invalidateQueries({ queryKey: ['baseline-versions'] });
            queryClient.invalidateQueries({ queryKey: ['export-projects'] });
            queryClient.invalidateQueries({ queryKey: ['history-projects'] });
            toast({
              title: `🔄 ${t.toasts.restored}`,
              description: `Baseline restored to Version ${restoreModal.version} (${data.controlCount} controls). New Version ${data.newVersion} created.`,
            });
          } catch (err) {
            console.error('Restore error:', err);
            toast({ title: '❌ Restore failed', description: 'Could not restore the baseline. Please try again.', variant: 'destructive' });
          } finally {
            setRestoring(false);
            setRestoreModal({ open: false });
          }
        }}
      />

      <VersionDiffModal
        open={diffModal.open}
        onOpenChange={(open) => setDiffModal(prev => ({ ...prev, open }))}
        fromVersion={diffModal.fromVersion}
        toVersion={diffModal.toVersion}
        diffEntries={diffModal.entries}
      />

      <SideBySideCompare
        open={sideBySide.open}
        onOpenChange={(open) => setSideBySide(prev => ({ ...prev, open }))}
        leftVersion={sideBySide.left}
        rightVersion={sideBySide.right}
      />
    </div>
  );
};

export default History;
