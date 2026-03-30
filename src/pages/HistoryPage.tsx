import React, { useState, useMemo } from 'react';
import { format } from 'date-fns';
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
import { Calendar } from '@/components/ui/calendar';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { History as HistoryIcon, GitCompare, RotateCcw, Clock, Loader2, Columns3, Shield, Rocket, CalendarIcon, X, Download } from 'lucide-react';

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
  const [auditActionFilter, setAuditActionFilter] = useState<string>('all');
  const [auditDateFrom, setAuditDateFrom] = useState<Date | undefined>();
  const [auditDateTo, setAuditDateTo] = useState<Date | undefined>();

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

      {/* Audit Log Section */}
      {selectedProjectId && auditLogs.length > 0 && (() => {
        const filteredLogs = auditLogs.filter((log: any) => {
          if (auditActionFilter !== 'all' && log.action !== auditActionFilter) return false;
          const logDate = new Date(log.created_at);
          if (auditDateFrom && logDate < auditDateFrom) return false;
          if (auditDateTo) {
            const endOfDay = new Date(auditDateTo);
            endOfDay.setHours(23, 59, 59, 999);
            if (logDate > endOfDay) return false;
          }
          return true;
        });
        const hasActiveFilters = auditActionFilter !== 'all' || auditDateFrom || auditDateTo;

        return (
        <div className="space-y-4">
          <div className="flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" />
            <h2 className="text-lg font-display font-semibold text-foreground">{t.history.audit.title}</h2>
          </div>

          {/* Audit Filters */}
          <div className="flex flex-wrap items-center gap-3">
            <Select value={auditActionFilter} onValueChange={setAuditActionFilter}>
              <SelectTrigger className="h-8 w-[140px] text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All actions</SelectItem>
                <SelectItem value="publish">Publish</SelectItem>
                <SelectItem value="restore">Restore</SelectItem>
              </SelectContent>
            </Select>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5", !auditDateFrom && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {auditDateFrom ? format(auditDateFrom, 'PP') : 'From date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={auditDateFrom} onSelect={setAuditDateFrom} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>

            <Popover>
              <PopoverTrigger asChild>
                <Button variant="outline" size="sm" className={cn("h-8 text-xs gap-1.5", !auditDateTo && "text-muted-foreground")}>
                  <CalendarIcon className="h-3.5 w-3.5" />
                  {auditDateTo ? format(auditDateTo, 'PP') : 'To date'}
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-auto p-0" align="start">
                <Calendar mode="single" selected={auditDateTo} onSelect={setAuditDateTo} initialFocus className={cn("p-3 pointer-events-auto")} />
              </PopoverContent>
            </Popover>

            {hasActiveFilters && (
              <Button variant="ghost" size="sm" className="h-8 text-xs gap-1" onClick={() => { setAuditActionFilter('all'); setAuditDateFrom(undefined); setAuditDateTo(undefined); }}>
                <X className="h-3 w-3" /> Clear
              </Button>
            )}

            <span className="text-[10px] text-muted-foreground ml-auto">
              {filteredLogs.length} / {auditLogs.length} entries
            </span>
          </div>

          <div className="border border-border rounded-lg overflow-hidden">
            <div className="grid grid-cols-[100px_80px_1fr_180px] gap-0 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/30 px-4 py-2.5 border-b border-border">
              <span>{t.history.audit.version}</span>
              <span>Action</span>
              <span>Details</span>
              <span>{t.history.date}</span>
            </div>
            {filteredLogs.length === 0 ? (
              <div className="px-4 py-6 text-center text-xs text-muted-foreground">No audit entries match the selected filters.</div>
            ) : (
            filteredLogs.map((log: any) => {
              const isPublish = log.action === 'publish';
              const details = log.details || {};
              return (
                <div key={log.id} className="grid grid-cols-[100px_80px_1fr_180px] gap-0 px-4 py-3 border-b border-border/50 last:border-b-0 hover:bg-muted/10 transition-colors">
                  <span className="text-sm font-mono font-medium text-foreground">
                    v{log.version_number}
                  </span>
                  <span className={`text-xs font-medium flex items-center gap-1 ${isPublish ? 'text-success' : 'text-warning'}`}>
                    {isPublish ? <Rocket className="h-3 w-3" /> : <RotateCcw className="h-3 w-3" />}
                    {isPublish ? t.history.audit.publish : t.history.audit.restore}
                  </span>
                  <span className="text-xs text-muted-foreground truncate">
                    {details.changes_summary || (isPublish
                      ? `${details.control_count || '?'} ${t.history.audit.controls}, ${details.source_count || '?'} ${t.history.audit.sources}`
                      : `${t.history.audit.from} v${log.from_version} · ${details.added || 0} added, ${details.removed || 0} removed, ${details.modified || 0} modified`
                    )}
                  </span>
                  <span className="text-xs text-muted-foreground text-right">
                    {new Date(log.created_at).toLocaleString()}
                  </span>
                </div>
              );
            })
            )}
          </div>
        </div>
        );
      })()}

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
