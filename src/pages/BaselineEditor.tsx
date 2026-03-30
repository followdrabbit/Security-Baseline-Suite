import React, { useState, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StatusBadge from '@/components/StatusBadge';
import ConfidenceScore from '@/components/ConfidenceScore';
import InfoTooltip from '@/components/InfoTooltip';
import ConfirmationModal from '@/components/ConfirmationModal';
import VersionCompareModal from '@/components/VersionCompareModal';
import BaselineMindMap from '@/components/BaselineMindMap';
import { ControlCardSkeleton } from '@/components/skeletons/SkeletonPremium';
import HelpButton from '@/components/HelpButton';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronDown, ChevronRight, CheckCircle2, XCircle, Edit3, Eye, FileText, Shield, Layers, List, Network, Crosshair, AlertTriangle, Zap, Target, X, ArrowLeft, Rocket, History, Lock, ArrowRight, GitCompare, RotateCcw } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import type { ControlItem, StrideCategory, ThreatLikelihood, ThreatScenario, SourceTraceability, Criticality, ReviewStatus } from '@/types';
import type { Json } from '@/integrations/supabase/types';

const CATEGORY_LABELS: Record<string, { en: string; pt: string; es: string }> = {
  identity: { en: 'Identity & Access', pt: 'Identidade e Acesso', es: 'Identidad y Acceso' },
  encryption: { en: 'Encryption & Data Protection', pt: 'Criptografia e Proteção de Dados', es: 'Cifrado y Protección de Datos' },
  logging: { en: 'Logging & Monitoring', pt: 'Logs e Monitoramento', es: 'Logs y Monitoreo' },
  network: { en: 'Network Security', pt: 'Segurança de Rede', es: 'Seguridad de Red' },
  storage: { en: 'Storage & Resilience', pt: 'Armazenamento e Resiliência', es: 'Almacenamiento y Resiliencia' },
  runtime: { en: 'Runtime Security', pt: 'Segurança em Tempo de Execução', es: 'Seguridad en Tiempo de Ejecución' },
  cicd: { en: 'CI/CD & Supply Chain', pt: 'CI/CD e Cadeia de Suprimentos', es: 'CI/CD y Cadena de Suministro' },
};

const CATEGORY_ORDER = ['identity', 'encryption', 'network', 'logging', 'storage', 'runtime', 'cicd'];

function mapDbControlToControlItem(row: any): ControlItem {
  const threats = (Array.isArray(row.threat_scenarios) ? row.threat_scenarios : []) as any[];
  const traces = (Array.isArray(row.source_traceability) ? row.source_traceability : []) as any[];

  return {
    id: row.id,
    projectId: row.project_id,
    controlId: row.control_id,
    title: row.title,
    description: row.description || '',
    applicability: row.applicability || '',
    securityRisk: row.security_risk || '',
    criticality: (row.criticality || 'medium') as Criticality,
    defaultBehaviorLimitations: row.default_behavior_limitations || '',
    automation: row.automation || '',
    references: row.references || [],
    frameworkMappings: row.framework_mappings || [],
    threatScenarios: threats.map((t: any, i: number) => ({
      id: t.id || `threat-${i}`,
      threatName: t.threatName || '',
      strideCategory: (t.strideCategory || 'tampering') as StrideCategory,
      attackVector: t.attackVector || '',
      threatAgent: t.threatAgent || '',
      preconditions: t.preconditions || '',
      impact: t.impact || '',
      likelihood: (t.likelihood || 'medium') as ThreatLikelihood,
      mitigations: t.mitigations || [],
      residualRisk: t.residualRisk || '',
    })),
    sourceTraceability: traces.map((s: any) => ({
      sourceId: s.sourceId || s.sourceName || '',
      sourceName: s.sourceName || '',
      excerpt: s.excerpt || '',
      sourceType: s.sourceType === 'document' ? 'document' : 'url',
      confidence: s.confidence || 0,
    })),
    confidenceScore: Number(row.confidence_score) || 0,
    reviewStatus: (row.review_status || 'pending') as ReviewStatus,
    reviewerNotes: row.reviewer_notes || '',
    version: row.version || 1,
    category: row.category || 'other',
  };
}

const BaselineEditor: React.FC = () => {
  const { t, locale } = useI18n();
  const { user } = useAuth();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState('');
  const [critFilter, setCritFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [strideFromUrl] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    return params.get('stride') || null;
  });
  const [strideFilter, setStrideFilter] = useState(strideFromUrl || 'all');
  const [likelihoodFilter, setLikelihoodFilter] = useState('all');
  const [selectedProject, setSelectedProject] = useState('all');
  const [viewMode, setViewMode] = useState<'list' | 'mindmap'>('list');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [collapsedCategories, setCollapsedCategories] = useState<string[]>([]);
  const [confirmModal, setConfirmModal] = useState<{
    open: boolean;
    variant: 'approve' | 'reject' | 'restore' | 'approveAll' | 'publish';
    controlId?: string;
    controlLabel?: string;
  }>({ open: false, variant: 'approve' });
  const [viewingVersionId, setViewingVersionId] = useState<string | null>(null);
  const [compareOpen, setCompareOpen] = useState(false);

  // Fetch projects with controls
  const { data: projects = [] } = useQuery({
    queryKey: ['baseline-projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, technology, status, control_count, current_version')
        .gt('control_count', 0)
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data;
    },
    enabled: !!user,
  });

  // Fetch sources for the selected project (for snapshot)
  const { data: projectSources = [] } = useQuery({
    queryKey: ['baseline-sources', user?.id, selectedProject],
    queryFn: async () => {
      if (selectedProject === 'all') return [];
      const { data, error } = await supabase
        .from('sources')
        .select('*')
        .eq('project_id', selectedProject);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && selectedProject !== 'all',
  });

  // Fetch controls
  const { data: controls = [], isLoading: loading } = useQuery({
    queryKey: ['baseline-controls', user?.id, selectedProject],
    queryFn: async () => {
      let query = supabase
        .from('controls')
        .select('*')
        .order('created_at', { ascending: true });

      if (selectedProject !== 'all') {
        query = query.eq('project_id', selectedProject);
      }

      const { data, error } = await query;
      if (error) throw error;
      return (data || []).map(mapDbControlToControlItem);
    },
    enabled: !!user,
  });

  // Fetch published versions for version history
  const { data: publishedVersions = [] } = useQuery({
    queryKey: ['baseline-versions', user?.id, selectedProject],
    queryFn: async () => {
      if (selectedProject === 'all') return [];
      const { data, error } = await supabase
        .from('baseline_versions')
        .select('id, version, published_at, control_count, status, controls_snapshot, sources_snapshot, project_snapshot, changes_summary')
        .eq('project_id', selectedProject)
        .eq('status', 'published')
        .order('version', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user && selectedProject !== 'all',
  });

  // Get the snapshot controls when viewing a published version
  const viewingVersion = publishedVersions.find((v: any) => v.id === viewingVersionId);
  const snapshotControls = useMemo(() => {
    if (!viewingVersion) return null;
    const snapshot = viewingVersion.controls_snapshot as any[];
    if (!Array.isArray(snapshot)) return [];
    return snapshot.map(mapDbControlToControlItem);
  }, [viewingVersion]);

  const isViewingSnapshot = viewingVersionId !== null && snapshotControls !== null;

  // Use snapshot controls when viewing a version, otherwise live controls
  const activeControls = isViewingSnapshot ? snapshotControls : controls;

  // Update review status mutation
  const updateStatusMutation = useMutation({
    mutationFn: async ({ id, status }: { id: string; status: string }) => {
      const { error } = await supabase
        .from('controls')
        .update({ review_status: status })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baseline-controls'] });
    },
  });

  // Bulk approve mutation
  const bulkApproveMutation = useMutation({
    mutationFn: async () => {
      const reviewedIds = controls
        .filter(c => c.reviewStatus === 'reviewed')
        .map(c => c.id);
      if (reviewedIds.length === 0) return;

      for (const id of reviewedIds) {
        const { error } = await supabase
          .from('controls')
          .update({ review_status: 'approved' })
          .eq('id', id);
        if (error) throw error;
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baseline-controls'] });
    },
  });

  // Update reviewer notes mutation
  const updateNotesMutation = useMutation({
    mutationFn: async ({ id, notes }: { id: string; notes: string }) => {
      const { error } = await supabase
        .from('controls')
        .update({ reviewer_notes: notes })
        .eq('id', id);
      if (error) throw error;
    },
  });

  const filtered = useMemo(() => activeControls.filter(c => {
    if (selectedProject !== 'all' && c.projectId !== selectedProject) return false;
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.controlId.toLowerCase().includes(search.toLowerCase())) return false;
    if (critFilter !== 'all' && c.criticality !== critFilter) return false;
    if (statusFilter !== 'all' && c.reviewStatus !== statusFilter) return false;
    if (strideFilter !== 'all') {
      if (!c.threatScenarios?.some(ts => ts.strideCategory === strideFilter)) return false;
    }
    if (likelihoodFilter !== 'all') {
      if (!c.threatScenarios?.some(ts => ts.likelihood === likelihoodFilter)) return false;
    }
    return true;
  }), [activeControls, selectedProject, search, critFilter, statusFilter, strideFilter, likelihoodFilter]);

  const groupedByCategory = useMemo(() => {
    const groups: Record<string, ControlItem[]> = {};
    for (const c of filtered) {
      const cat = c.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(c);
    }
    return CATEGORY_ORDER
      .filter(cat => groups[cat]?.length)
      .map(cat => ({ category: cat, controls: groups[cat] }))
      .concat(
        Object.keys(groups)
          .filter(cat => !CATEGORY_ORDER.includes(cat))
          .map(cat => ({ category: cat, controls: groups[cat] }))
      );
  }, [filtered]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const toggleCategory = (cat: string) => {
    setCollapsedCategories(prev => prev.includes(cat) ? prev.filter(x => x !== cat) : [...prev, cat]);
  };

  const expandAll = () => setExpandedIds(filtered.map(c => c.id));
  const collapseAll = () => { setExpandedIds([]); setCollapsedCategories([]); };

  const updateStatus = (id: string, status: ControlItem['reviewStatus']) => {
    updateStatusMutation.mutate({ id, status });
  };

  const requestConfirm = (variant: 'approve' | 'reject' | 'approveAll' | 'publish', controlId?: string) => {
    const control = controlId ? controls.find(c => c.id === controlId) : undefined;
    setConfirmModal({
      open: true,
      variant,
      controlId,
      controlLabel: variant === 'publish' 
        ? `${(selectedProjectObj as any)?.name} — v${((selectedProjectObj as any)?.current_version || 0) + 1}`
        : control ? `${control.controlId} — ${control.title}` : undefined,
    });
  };

  // Publish version mutation
  const publishMutation = useMutation({
    mutationFn: async () => {
      if (!user || selectedProject === 'all') throw new Error('Select a project');
      const proj = projects.find((p: any) => p.id === selectedProject) as any;
      const newVersion = (proj?.current_version || 0) + 1;

      // Get full controls for snapshot
      const { data: controlsData } = await supabase
        .from('controls')
        .select('*')
        .eq('project_id', selectedProject);

      // Get full sources for snapshot
      const { data: sourcesData } = await supabase
        .from('sources')
        .select('*')
        .eq('project_id', selectedProject);

      // Deduplicate controls
      const seen = new Set<string>();
      const deduped = (controlsData || []).filter((c: any) => {
        if (seen.has(c.control_id)) return false;
        seen.add(c.control_id);
        return true;
      });

      // Compute diff summary against previous version
      let changesSummary = '';
      const prevVersion = publishedVersions.length > 0 ? publishedVersions[0] : null;
      if (prevVersion && Array.isArray(prevVersion.controls_snapshot)) {
        const oldMap = new Map<string, any>();
        for (const c of prevVersion.controls_snapshot as any[]) {
          if (!oldMap.has(c.control_id)) oldMap.set(c.control_id, c);
        }
        const newMap = new Map<string, any>();
        for (const c of deduped) {
          if (!newMap.has(c.control_id)) newMap.set(c.control_id, c);
        }

        const added: string[] = [];
        const removed: string[] = [];
        const modified: string[] = [];

        for (const [cid, ctrl] of newMap) {
          if (!oldMap.has(cid)) {
            added.push(`${cid} (${ctrl.title})`);
          }
        }
        for (const [cid, ctrl] of oldMap) {
          if (!newMap.has(cid)) {
            removed.push(`${cid} (${ctrl.title})`);
          }
        }
        for (const [cid, newCtrl] of newMap) {
          const oldCtrl = oldMap.get(cid);
          if (!oldCtrl) continue;
          const fields = ['title', 'description', 'criticality', 'review_status', 'applicability', 'security_risk', 'automation', 'default_behavior_limitations', 'reviewer_notes'];
          const changedFields: string[] = [];
          for (const f of fields) {
            if (String(oldCtrl[f] || '') !== String(newCtrl[f] || '')) changedFields.push(f);
          }
          if (changedFields.length > 0) {
            modified.push(`${cid}: ${changedFields.join(', ')}`);
          }
        }

        const parts: string[] = [];
        if (added.length) parts.push(`Added ${added.length}: ${added.join('; ')}`);
        if (removed.length) parts.push(`Removed ${removed.length}: ${removed.join('; ')}`);
        if (modified.length) parts.push(`Modified ${modified.length}: ${modified.join('; ')}`);
        changesSummary = parts.length > 0
          ? `v${newVersion} (from v${prevVersion.version}): ${parts.join('. ')}`
          : `v${newVersion}: No changes from v${prevVersion.version}`;
      } else {
        changesSummary = `v${newVersion}: Initial publication with ${deduped.length} controls and ${sourcesData?.length || 0} sources`;
      }

      // Create the version snapshot
      const { error: versionError } = await supabase
        .from('baseline_versions')
        .insert({
          project_id: selectedProject,
          user_id: user.id,
          version: newVersion,
          control_count: deduped.length,
          controls_snapshot: deduped as any,
          sources_snapshot: (sourcesData || []) as any,
          project_snapshot: proj as any,
          status: 'published',
          changes_summary: changesSummary,
          published_at: new Date().toISOString(),
        });
      if (versionError) throw versionError;

      // Audit log
      await supabase.from('version_audit_logs' as any).insert({
        user_id: user.id,
        project_id: selectedProject,
        action: 'publish',
        version_number: newVersion,
        from_version: prevVersion?.version || null,
        details: {
          control_count: deduped.length,
          source_count: sourcesData?.length || 0,
          changes_summary: changesSummary,
        },
      });

      // Update project current_version
      const { error: projError } = await supabase
        .from('projects')
        .update({ current_version: newVersion, status: 'approved' })
        .eq('id', selectedProject);
      if (projError) throw projError;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['baseline-projects'] });
      queryClient.invalidateQueries({ queryKey: ['baseline-controls'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-versions'] });
      const proj = projects.find((p: any) => p.id === selectedProject) as any;
      const ver = (proj?.current_version || 0) + 1;
      toast({ title: `🚀 ${t.toasts.published}`, description: `v${ver} ${t.toasts.publishedDesc}` });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to publish version.', variant: 'destructive' });
    },
  });

  // Restore version mutation
  const restoreMutation = useMutation({
    mutationFn: async (versionId: string) => {
      if (!user || selectedProject === 'all') throw new Error('Select a project');
      const { data, error } = await supabase.functions.invoke('restore-baseline', {
        body: { versionId, projectId: selectedProject },
      });
      if (error) throw error;
      return data;
    },
    onSuccess: (data) => {
      queryClient.invalidateQueries({ queryKey: ['baseline-projects'] });
      queryClient.invalidateQueries({ queryKey: ['baseline-controls'] });
      queryClient.invalidateQueries({ queryKey: ['baseline-versions'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
      setViewingVersionId(null);
      toast({
        title: `🔄 ${t.toasts.restored}`,
        description: `${t.toasts.restoredDesc} v${data?.restoredVersion || '?'}`,
      });
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to restore version.', variant: 'destructive' });
    },
  });

  const handleConfirm = () => {
    if (confirmModal.variant === 'publish') {
      publishMutation.mutate();
    } else if (confirmModal.variant === 'restore') {
      if (viewingVersionId) restoreMutation.mutate(viewingVersionId);
    } else if (confirmModal.variant === 'approveAll') {
      bulkApproveMutation.mutate();
      toast({ title: `✅ ${t.toasts.approvedAll}`, description: t.toasts.approvedAllDesc });
    } else if (confirmModal.controlId) {
      const isApprove = confirmModal.variant === 'approve';
      updateStatus(confirmModal.controlId, isApprove ? 'approved' : 'rejected');
      const label = confirmModal.controlLabel || confirmModal.controlId;
      toast({
        title: isApprove ? `✅ ${t.toasts.approved}` : `❌ ${t.toasts.rejected}`,
        description: `${label} ${isApprove ? t.toasts.approvedDesc : t.toasts.rejectedDesc}`,
      });
    }
    setConfirmModal(prev => ({ ...prev, open: false }));
  };

  const selectedProjectObj = projects.find((p: any) => p.id === selectedProject);
  const lang = locale === 'pt' ? 'pt' : locale === 'es' ? 'es' : 'en';

  // Compute review readiness
  const pendingCount = useMemo(() => {
    if (selectedProject === 'all') return -1;
    return filtered.filter(c => c.reviewStatus === 'pending').length;
  }, [filtered, selectedProject]);

  const currentVersion = (selectedProjectObj as any)?.current_version || 0;
  const canPublish = selectedProject !== 'all' && pendingCount === 0 && filtered.length > 0;

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.editor.title}</h1>
            <p className="text-sm text-muted-foreground mt-1">
              {selectedProjectObj
                ? `${filtered.length} ${t.editor.controlsIn} ${(selectedProjectObj as any).name}`
                : t.editor.subtitle}
            </p>
          </div>
          <HelpButton section="editor" />
        </div>
        <div className="flex items-center gap-3">
          {/* Version selector */}
          {selectedProject !== 'all' && publishedVersions.length > 0 && (
            <Select
              value={viewingVersionId || 'live'}
              onValueChange={(val) => setViewingVersionId(val === 'live' ? null : val)}
            >
              <SelectTrigger className="w-[180px]">
                <History className="h-3.5 w-3.5 mr-1.5 text-primary/70" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="live">
                  {t.versioning.liveVersion}
                </SelectItem>
                {publishedVersions.map((v: any) => (
                  <SelectItem key={v.id} value={v.id}>
                    v{v.version} — {v.published_at ? new Date(v.published_at).toLocaleDateString() : ''}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
          {/* Compare button */}
          {selectedProject !== 'all' && publishedVersions.length >= 1 && (
            <Button size="sm" variant="outline" onClick={() => setCompareOpen(true)}>
              <GitCompare className="h-3.5 w-3.5 mr-1.5" />
              {t.versioning.compareVersions}
            </Button>
          )}

          {/* Version indicator */}
          {selectedProject !== 'all' && !isViewingSnapshot && (
            <div className="flex items-center gap-2">
              <span className="text-xs font-mono px-2.5 py-1 rounded-full bg-muted/60 border border-border text-muted-foreground">
                v{currentVersion > 0 ? currentVersion : '—'}
              </span>
              {currentVersion > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
                  {t.versioning.published}
                </span>
              )}
              {pendingCount > 0 && (
                <span className="text-[10px] px-2 py-0.5 rounded-full bg-amber-500/10 text-amber-500 border border-amber-500/20 font-medium">
                  {pendingCount} {t.versioning.pendingControls}
                </span>
              )}
            </div>
          )}
          {!isViewingSnapshot && (
            <>
              <Button size="sm" variant="outline" onClick={() => requestConfirm('approveAll')}>
                <CheckCircle2 className="h-4 w-4 mr-1.5" />{t.editor.approveAll}
              </Button>
              <Button
                size="sm"
                className="gold-gradient text-primary-foreground hover:opacity-90"
                disabled={!canPublish || publishMutation.isPending}
                onClick={() => requestConfirm('publish')}
              >
                <Rocket className="h-4 w-4 mr-1.5" />
                {t.versioning.publishVersion}
              </Button>
            </>
          )}
        </div>
      </div>

      {/* STRIDE filter breadcrumb from Dashboard */}
      {strideFromUrl && strideFilter !== 'all' && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -8 }}
          className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5"
        >
          <ArrowLeft className="h-4 w-4 text-primary/60" />
          <div className="flex items-center gap-2 flex-1">
            <Target className="h-4 w-4 text-destructive" />
            <span className="text-sm font-medium text-foreground">
              {t.editor.strideFilterActive}:
            </span>
            <span className="text-xs font-semibold uppercase px-2 py-0.5 rounded-full bg-destructive/10 text-destructive border border-destructive/20">
              {strideFilter.replace(/_/g, ' ')}
            </span>
            <span className="text-xs text-muted-foreground">({t.editor.fromDashboard})</span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground"
            onClick={() => setStrideFilter('all')}
          >
            <X className="h-3.5 w-3.5 mr-1" />
            {t.editor.clearFilter}
          </Button>
        </motion.div>
      )}

      {/* Read-only snapshot banner */}
      {isViewingSnapshot && viewingVersion && (
        <motion.div
          initial={{ opacity: 0, y: -8 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex items-center gap-3 px-4 py-3 rounded-lg border border-primary/30 bg-primary/5"
        >
          <Lock className="h-4 w-4 text-primary" />
          <div className="flex items-center gap-2 flex-1">
            <span className="text-sm font-semibold text-foreground">
              v{viewingVersion.version}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-primary/10 text-primary border border-primary/20 font-medium">
              {t.versioning.readOnly}
            </span>
            <span className="text-xs text-muted-foreground">
              {t.versioning.viewingSnapshot} — {t.versioning.publishedOn} {viewingVersion.published_at ? new Date(viewingVersion.published_at).toLocaleString() : ''}
            </span>
            <span className="text-[10px] px-2 py-0.5 rounded-full bg-muted/60 border border-border text-muted-foreground">
              {viewingVersion.control_count} {t.versioning.controlsCount}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs gap-1.5 text-warning border-warning/30 hover:bg-warning/10"
              onClick={() => {
                setConfirmModal({
                  open: true,
                  variant: 'restore',
                  controlLabel: `v${viewingVersion.version}`,
                });
              }}
              disabled={restoreMutation.isPending}
            >
              <RotateCcw className="h-3.5 w-3.5" />
              {t.versioning.restoreVersion}
            </Button>
            <Button
              variant="outline"
              size="sm"
              className="h-7 px-3 text-xs"
              onClick={() => setViewingVersionId(null)}
            >
              <ArrowRight className="h-3.5 w-3.5 mr-1" />
              {t.versioning.backToLive}
            </Button>
          </div>
        </motion.div>
      )}

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <Select value={selectedProject} onValueChange={(v) => { setSelectedProject(v); setViewingVersionId(null); }}>
          <SelectTrigger className="w-[220px]">
            <Layers className="h-3.5 w-3.5 mr-1.5 text-primary/70" />
            <SelectValue placeholder={t.editor.selectBaseline} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.editor.allBaselines}</SelectItem>
            {projects.map((p: any) => (
              <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
            ))}
          </SelectContent>
        </Select>
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t.editor.search} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={critFilter} onValueChange={setCritFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder={t.editor.filterCriticality} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.editor.filterCriticality}</SelectItem>
            <SelectItem value="critical">{t.common.critical}</SelectItem>
            <SelectItem value="high">{t.common.high}</SelectItem>
            <SelectItem value="medium">{t.common.medium}</SelectItem>
            <SelectItem value="low">{t.common.low}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder={t.editor.filterStatus} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.editor.filterStatus}</SelectItem>
            <SelectItem value="pending">{t.common.pending}</SelectItem>
            <SelectItem value="reviewed">{t.common.reviewed}</SelectItem>
            <SelectItem value="approved">{t.common.approved}</SelectItem>
            <SelectItem value="rejected">{t.common.rejected}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={strideFilter} onValueChange={setStrideFilter}>
          <SelectTrigger className="w-[170px]">
            <Target className="h-3.5 w-3.5 mr-1.5 text-destructive/70" />
            <SelectValue placeholder={t.editor.filterStride} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.editor.filterStride}</SelectItem>
            <SelectItem value="spoofing">Spoofing</SelectItem>
            <SelectItem value="tampering">Tampering</SelectItem>
            <SelectItem value="repudiation">Repudiation</SelectItem>
            <SelectItem value="information_disclosure">Information Disclosure</SelectItem>
            <SelectItem value="denial_of_service">Denial of Service</SelectItem>
            <SelectItem value="elevation_of_privilege">Elevation of Privilege</SelectItem>
          </SelectContent>
        </Select>
        <Select value={likelihoodFilter} onValueChange={setLikelihoodFilter}>
          <SelectTrigger className="w-[155px]">
            <AlertTriangle className="h-3.5 w-3.5 mr-1.5 text-warning/70" />
            <SelectValue placeholder={t.editor.filterLikelihood} />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.editor.filterLikelihood}</SelectItem>
            <SelectItem value="very_high">{t.editor.veryHigh}</SelectItem>
            <SelectItem value="high">{t.common.high}</SelectItem>
            <SelectItem value="medium">{t.common.medium}</SelectItem>
            <SelectItem value="low">{t.common.low}</SelectItem>
            <SelectItem value="very_low">{t.editor.veryLow}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto">
          <div className="flex items-center bg-muted/50 rounded-md p-0.5">
            <button
              onClick={() => setViewMode('list')}
              className={`p-1.5 rounded transition-all ${viewMode === 'list' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="List View"
            >
              <List className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => setViewMode('mindmap')}
              className={`p-1.5 rounded transition-all ${viewMode === 'mindmap' ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
              title="Mind Map"
            >
              <Network className="h-3.5 w-3.5" />
            </button>
          </div>
          {viewMode === 'list' && (
            <>
              <Button variant="outline" size="sm" onClick={expandAll}><Eye className="h-3.5 w-3.5 mr-1" />{t.editor.expandAll}</Button>
              <Button variant="outline" size="sm" onClick={collapseAll}>{t.editor.collapseAll}</Button>
            </>
          )}
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} {t.common.items}</p>

      {/* Mind Map View */}
      {viewMode === 'mindmap' && !loading && filtered.length > 0 && (
        <BaselineMindMap
          technologyName={(selectedProjectObj as any)?.technology || t.editor.allBaselines}
          controls={filtered}
          categoryLabels={Object.fromEntries(
            Object.entries(CATEGORY_LABELS).map(([k, v]) => [k, v[lang]])
          )}
        />
      )}

      {/* Controls grouped by category (List View) */}
      {viewMode === 'list' && (
      <div className="space-y-6">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <ControlCardSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center shadow-premium">
            <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">{t.editor.noControls}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">{t.editor.noControlsDesc}</p>
          </div>
        ) : (
          groupedByCategory.map(({ category, controls: catControls }) => {
            const isCatCollapsed = collapsedCategories.includes(category);
            const catLabel = CATEGORY_LABELS[category]?.[lang] || category;
            return (
              <div key={category}>
                <button
                  onClick={() => toggleCategory(category)}
                  className="flex items-center gap-2 mb-3 group w-full text-left"
                >
                  {isCatCollapsed
                    ? <ChevronRight className="h-4 w-4 text-primary/70" />
                    : <ChevronDown className="h-4 w-4 text-primary/70" />
                  }
                  <h3 className="text-xs font-display font-semibold uppercase tracking-wider text-primary/80">
                    {catLabel}
                  </h3>
                  <span className="text-[10px] text-muted-foreground bg-muted/50 px-2 py-0.5 rounded-full">
                    {catControls.length}
                  </span>
                  <div className="flex-1 h-px bg-border/50 ml-2" />
                </button>

                <AnimatePresence initial={false}>
                  {!isCatCollapsed && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="space-y-3 overflow-hidden"
                    >
                      {catControls.map((control) => (
                        <ControlCard
                          key={control.id}
                          control={control}
                          isExpanded={expandedIds.includes(control.id)}
                          readOnly={isViewingSnapshot}
                          onToggle={() => toggleExpand(control.id)}
                          onApprove={() => requestConfirm('approve', control.id)}
                          onReject={() => requestConfirm('reject', control.id)}
                          onAdjust={() => updateStatus(control.id, 'adjusted')}
                          onMarkReviewed={() => updateStatus(control.id, 'reviewed')}
                          onSaveNotes={(notes) => updateNotesMutation.mutate({ id: control.id, notes })}
                          t={t}
                        />
                      ))}
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })
        )}
      </div>
      )}

      <ConfirmationModal
        open={confirmModal.open}
        onOpenChange={(open) => setConfirmModal(prev => ({ ...prev, open }))}
        variant={confirmModal.variant}
        title={t.confirmModal[`${confirmModal.variant}Title`]}
        description={t.confirmModal[`${confirmModal.variant}Desc`]}
        itemLabel={confirmModal.controlLabel}
        confirmLabel={t.common.confirm}
        cancelLabel={t.common.cancel}
        onConfirm={handleConfirm}
      />

      {publishedVersions.length >= 1 && (
        <VersionCompareModal
          open={compareOpen}
          onOpenChange={setCompareOpen}
          versions={publishedVersions as any}
          liveControls={controls}
        />
      )}
    </div>
  );
};

/* ─── Control Card Component ─── */
interface ControlCardProps {
  control: ControlItem;
  isExpanded: boolean;
  readOnly?: boolean;
  onToggle: () => void;
  onApprove: () => void;
  onReject: () => void;
  onAdjust: () => void;
  onMarkReviewed: () => void;
  onSaveNotes: (notes: string) => void;
  t: any;
}

const ControlCard: React.FC<ControlCardProps> = ({
  control, isExpanded, readOnly, onToggle, onApprove, onReject, onAdjust, onMarkReviewed, onSaveNotes, t,
}) => (
  <motion.div layout className="bg-card border border-border rounded-lg shadow-premium overflow-hidden">
    <button
      className="w-full flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors text-left"
      onClick={onToggle}
    >
      {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
      <span className="text-xs font-mono text-primary/70 shrink-0 w-24">{control.controlId}</span>
      <span className="text-sm font-medium text-foreground flex-1 truncate">{control.title}</span>
      <StatusBadge status={control.criticality} type="criticality" />
      <StatusBadge status={control.reviewStatus} type="review" />
      <ConfidenceScore score={control.confidenceScore} />
    </button>

    <AnimatePresence>
      {isExpanded && (
        <motion.div
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="border-t border-border"
        >
          <div className="p-5 space-y-4">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              <Field label={t.editor.description} value={control.description} />
              <Field label={<span className="flex items-center gap-1">{t.editor.applicability} <InfoTooltip content={t.tooltips.applicability} /></span>} value={control.applicability} />
              <Field label={t.editor.securityRisk} value={control.securityRisk} />
              <Field label={t.editor.defaultBehavior} value={control.defaultBehaviorLimitations} />
              <Field label={t.editor.automation} value={control.automation} />
              <div>
                <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                  {t.editor.frameworkMappings} <InfoTooltip content={t.tooltips.frameworkMapping} />
                </label>
                <div className="flex flex-wrap gap-1">
                  {control.frameworkMappings.map(m => (
                    <span key={m} className="px-2 py-0.5 bg-accent text-accent-foreground rounded text-[10px] font-medium">{m}</span>
                  ))}
                </div>
              </div>
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.editor.references}</label>
                <ul className="space-y-0.5">
                  {control.references.map((ref, i) => (
                    <li key={i} className="text-xs text-foreground/70 flex items-start gap-1.5">
                      <FileText className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />{ref}
                    </li>
                  ))}
                </ul>
              </div>
              {control.sourceTraceability.length > 0 && (
                <div>
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                    {t.editor.traceability} <InfoTooltip content={t.tooltips.traceability} />
                  </label>
                  <div className="space-y-2">
                    {control.sourceTraceability.map((st, i) => (
                      <div key={st.sourceId || i} className="bg-muted/30 rounded p-2.5 text-xs border border-border/50">
                        <div className="flex items-center justify-between mb-1">
                          <span className="font-medium text-foreground">{st.sourceName}</span>
                          <ConfidenceScore score={st.confidence} />
                        </div>
                        <p className="text-muted-foreground italic">"{st.excerpt}"</p>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Threat Modeling Section */}
              {control.threatScenarios && control.threatScenarios.length > 0 ? (
                <div className="lg:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-2">
                    <Crosshair className="h-3.5 w-3.5 text-destructive/70" />
                    {t.editor.threatModeling}
                    <InfoTooltip content={(t.tooltips as Record<string, string>).threatModeling || ''} />
                    <span className="ml-auto text-[10px] bg-destructive/10 text-destructive px-2 py-0.5 rounded-full font-semibold">
                      {control.threatScenarios.length} {control.threatScenarios.length === 1 ? 'threat' : 'threats'}
                    </span>
                  </label>
                  <div className="space-y-3">
                    {control.threatScenarios.map((threat) => (
                      <div key={threat.id} className="bg-muted/20 rounded-lg border border-border/50 overflow-hidden">
                        <div className="flex items-center gap-2 px-3 py-2 bg-muted/30 border-b border-border/30">
                          <AlertTriangle className="h-3.5 w-3.5 text-warning shrink-0" />
                          <span className="text-xs font-semibold text-foreground flex-1">{threat.threatName}</span>
                          <span className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded-full ${
                            threat.likelihood === 'very_high' || threat.likelihood === 'high'
                              ? 'bg-destructive/10 text-destructive'
                              : threat.likelihood === 'medium'
                              ? 'bg-warning/10 text-warning'
                              : 'bg-success/10 text-success'
                          }`}>
                            {threat.likelihood.replace('_', ' ')}
                          </span>
                          <span className="text-[10px] font-medium uppercase px-2 py-0.5 rounded bg-accent text-accent-foreground">
                            {threat.strideCategory.replace('_', ' ')}
                          </span>
                        </div>
                        <div className="p-3 grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                          <div>
                            <span className="font-medium text-muted-foreground block mb-0.5">{t.editor.attackVector}</span>
                            <p className="text-foreground/80">{threat.attackVector}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground block mb-0.5">{t.editor.threatAgent}</span>
                            <p className="text-foreground/80">{threat.threatAgent}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground block mb-0.5">{t.editor.preconditions}</span>
                            <p className="text-foreground/80">{threat.preconditions}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground block mb-0.5">{t.editor.impact}</span>
                            <p className="text-foreground/80">{threat.impact}</p>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground block mb-0.5">{t.editor.mitigations}</span>
                            <ul className="space-y-0.5">
                              {threat.mitigations.map((m, i) => (
                                <li key={i} className="text-foreground/80 flex items-start gap-1.5">
                                  <Zap className="h-3 w-3 mt-0.5 text-primary/60 shrink-0" />{m}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <span className="font-medium text-muted-foreground block mb-0.5">{t.editor.residualRisk}</span>
                            <p className="text-foreground/80">{threat.residualRisk}</p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="lg:col-span-2">
                  <label className="text-xs font-medium text-muted-foreground flex items-center gap-1.5 mb-1">
                    <Crosshair className="h-3.5 w-3.5 text-muted-foreground/50" />
                    {t.editor.threatModeling}
                  </label>
                  <p className="text-xs text-muted-foreground/60 italic">{t.editor.noThreats}</p>
                </div>
              )}
            </div>

            {!readOnly && (
            <div>
              <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.editor.reviewerNotes}</label>
              <Textarea
                placeholder={t.editor.notesPlaceholder}
                defaultValue={control.reviewerNotes}
                rows={2}
                className="text-sm"
                onBlur={(e) => {
                  if (e.target.value !== control.reviewerNotes) {
                    onSaveNotes(e.target.value);
                  }
                }}
              />
            </div>
            )}

            {readOnly && control.reviewerNotes && (
              <div>
                <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.editor.reviewerNotes}</label>
                <p className="text-sm text-foreground/80 leading-relaxed bg-muted/30 rounded p-2.5 border border-border/50">{control.reviewerNotes}</p>
              </div>
            )}

            {!readOnly && (
            <div className="flex gap-2 pt-2 border-t border-border/50">
              <Button size="sm" variant="outline" onClick={onApprove} className="text-success border-success/30 hover:bg-success/10">
                <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{t.editor.approve}
              </Button>
              <Button size="sm" variant="outline" onClick={onReject} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                <XCircle className="h-3.5 w-3.5 mr-1" />{t.editor.reject}
              </Button>
              <Button size="sm" variant="outline" onClick={onAdjust}>
                <Edit3 className="h-3.5 w-3.5 mr-1" />{t.editor.adjust}
              </Button>
              <Button size="sm" variant="outline" onClick={onMarkReviewed}>
                {t.editor.markReviewed}
              </Button>
            </div>
            )}
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  </motion.div>
);

const Field: React.FC<{ label: React.ReactNode; value: string }> = ({ label, value }) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
    <p className="text-sm text-foreground/80 leading-relaxed">{value}</p>
  </div>
);

export default BaselineEditor;
