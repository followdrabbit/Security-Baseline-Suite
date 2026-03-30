import React, { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import HelpButton from '@/components/HelpButton';
import { KPICardSkeleton } from '@/components/skeletons/SkeletonPremium';
import {
  Shield, CheckCircle2, Clock, Rocket, RotateCcw, GitBranch,
  History, ArrowUpDown, AlertTriangle, TrendingUp, FileText, BarChart3, Filter,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell,
} from 'recharts';

const fadeIn = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

const AuditDashboard: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();

  // Fetch all projects
  const { data: projects = [], isLoading: loadingProjects } = useQuery({
    queryKey: ['audit-projects', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('projects')
        .select('id, name, technology, status, current_version, control_count, avg_confidence')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch all baseline versions
  const { data: versions = [], isLoading: loadingVersions } = useQuery({
    queryKey: ['audit-versions', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('baseline_versions')
        .select('id, project_id, version, status, control_count, changes_summary, created_at, published_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch audit logs
  const { data: auditLogs = [], isLoading: loadingLogs } = useQuery({
    queryKey: ['audit-logs-all', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('version_audit_logs')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
        .limit(20);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch controls for review status breakdown
  const { data: controls = [] } = useQuery({
    queryKey: ['audit-controls', user?.id],
    queryFn: async () => {
      if (!user) return [];
      const { data, error } = await supabase
        .from('controls')
        .select('id, review_status, criticality, project_id')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const loading = loadingProjects || loadingVersions || loadingLogs;

  // Compute metrics
  const metrics = useMemo(() => {
    const publishedVersions = versions.filter(v => v.status === 'published');
    const draftVersions = versions.filter(v => v.status === 'draft');
    const publishActions = auditLogs.filter(l => l.action === 'publish');
    const restoreActions = auditLogs.filter(l => l.action === 'restore');
    const totalControls = controls.length;
    const approvedControls = controls.filter(c => c.review_status === 'approved').length;
    const pendingControls = controls.filter(c => c.review_status === 'pending').length;
    const rejectedControls = controls.filter(c => c.review_status === 'rejected').length;
    const reviewRate = totalControls > 0 ? Math.round((approvedControls / totalControls) * 100) : 0;

    return {
      totalProjects: projects.length,
      publishedVersions: publishedVersions.length,
      draftVersions: draftVersions.length,
      totalAuditActions: auditLogs.length,
      publishActions: publishActions.length,
      restoreActions: restoreActions.length,
      totalControls,
      approvedControls,
      pendingControls,
      rejectedControls,
      reviewRate,
      avgConfidence: projects.length > 0
        ? Math.round(projects.reduce((sum, p) => sum + (Number(p.avg_confidence) || 0), 0) / projects.length)
        : 0,
    };
  }, [projects, versions, auditLogs, controls]);

  // Review status pie chart data
  const reviewPieData = useMemo(() => [
    { name: 'Approved', value: metrics.approvedControls, color: 'hsl(var(--success))' },
    { name: 'Pending', value: metrics.pendingControls, color: 'hsl(var(--warning))' },
    { name: 'Rejected', value: metrics.rejectedControls, color: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0), [metrics]);

  // Versions per project bar chart
  const versionsPerProject = useMemo(() => {
    const map = new Map<string, { name: string; published: number; draft: number }>();
    for (const p of projects) {
      map.set(p.id, { name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name, published: 0, draft: 0 });
    }
    for (const v of versions) {
      const entry = map.get(v.project_id);
      if (entry) {
        if (v.status === 'published') entry.published++;
        else entry.draft++;
      }
    }
    return Array.from(map.values());
  }, [projects, versions]);

  // Criticality breakdown
  const criticalityData = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const c of controls) {
      const crit = (c.criticality || 'medium').toLowerCase();
      if (crit in counts) counts[crit as keyof typeof counts]++;
    }
    return [
      { name: 'Critical', value: counts.critical, color: '#ef4444' },
      { name: 'High', value: counts.high, color: '#f97316' },
      { name: 'Medium', value: counts.medium, color: '#eab308' },
      { name: 'Low', value: counts.low, color: '#22c55e' },
    ].filter(d => d.value > 0);
  }, [controls]);

  // Find project name by id
  const projectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-6 w-6 text-primary" />
            Audit Dashboard
          </h1>
          <p className="text-sm text-muted-foreground mt-1">Consolidated compliance metrics, version governance and audit activity</p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" size="sm" asChild>
            <Link to="/history"><History className="h-3.5 w-3.5 mr-1.5" />Version History</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/traceability"><GitBranch className="h-3.5 w-3.5 mr-1.5" />Traceability</Link>
          </Button>
        </div>
      </div>

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0 }}
            className="bg-card border border-border rounded-xl p-5 shadow-premium">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Rocket className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Published Versions</span>
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{metrics.publishedVersions}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{metrics.draftVersions} drafts across {metrics.totalProjects} projects</p>
          </motion.div>

          <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.05 }}
            className="bg-card border border-border rounded-xl p-5 shadow-premium">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Review Completion</span>
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{metrics.reviewRate}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">{metrics.approvedControls} of {metrics.totalControls} controls approved</p>
          </motion.div>

          <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.1 }}
            className="bg-card border border-border rounded-xl p-5 shadow-premium">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending Review</span>
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{metrics.pendingControls}</p>
            <p className="text-[10px] text-muted-foreground mt-1">{metrics.rejectedControls} rejected controls</p>
          </motion.div>

          <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.15 }}
            className="bg-card border border-border rounded-xl p-5 shadow-premium">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg. Confidence</span>
            </div>
            <p className="text-2xl font-display font-bold text-foreground">{metrics.avgConfidence}%</p>
            <p className="text-[10px] text-muted-foreground mt-1">{metrics.totalAuditActions} audit actions logged</p>
          </motion.div>
        </div>
      )}

      {/* Charts row */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Review Status Pie */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.2 }}
          className="bg-card border border-border rounded-xl p-5 shadow-premium">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <CheckCircle2 className="h-4 w-4 text-primary" /> Review Status
          </h3>
          {reviewPieData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No controls yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={reviewPieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {reviewPieData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {reviewPieData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </motion.div>

        {/* Criticality Breakdown Pie */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-xl p-5 shadow-premium">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-warning" /> Criticality Breakdown
          </h3>
          {criticalityData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No controls yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <PieChart>
                <Pie data={criticalityData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                  {criticalityData.map((entry, i) => (
                    <Cell key={i} fill={entry.color} stroke="transparent" />
                  ))}
                </Pie>
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              </PieChart>
            </ResponsiveContainer>
          )}
          <div className="flex justify-center gap-4 mt-2">
            {criticalityData.map(d => (
              <div key={d.name} className="flex items-center gap-1.5 text-[10px] text-muted-foreground">
                <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                {d.name} ({d.value})
              </div>
            ))}
          </div>
        </motion.div>

        {/* Versions per Project Bar */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.3 }}
          className="bg-card border border-border rounded-xl p-5 shadow-premium">
          <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-primary" /> Versions per Project
          </h3>
          {versionsPerProject.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No versions yet</p>
          ) : (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={versionsPerProject} barGap={2}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="name" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
                <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
                <Bar dataKey="published" name="Published" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
                <Bar dataKey="draft" name="Draft" fill="hsl(var(--muted-foreground))" radius={[4, 4, 0, 0]} opacity={0.4} />
              </BarChart>
            </ResponsiveContainer>
          )}
        </motion.div>
      </div>

      {/* Recent Audit Activity */}
      <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.35 }}
        className="bg-card border border-border rounded-xl p-5 shadow-premium">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <FileText className="h-4 w-4 text-primary" /> Recent Audit Activity
          </h3>
          <Button variant="ghost" size="sm" className="text-xs" asChild>
            <Link to="/history">View all →</Link>
          </Button>
        </div>
        {auditLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No audit activity yet. Publish or restore a version to generate entries.</p>
        ) : (
          <div className="space-y-3">
            {auditLogs.slice(0, 8).map((log) => {
              const isPublish = log.action === 'publish';
              const details = (log.details as any) || {};
              return (
                <div key={log.id} className="flex items-center gap-3 py-2 px-3 rounded-lg hover:bg-muted/10 transition-colors">
                  <div className={`h-8 w-8 rounded-full flex items-center justify-center shrink-0 ${isPublish ? 'bg-success/10' : 'bg-warning/10'}`}>
                    {isPublish ? <Rocket className="h-3.5 w-3.5 text-success" /> : <RotateCcw className="h-3.5 w-3.5 text-warning" />}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-medium text-foreground">
                        {isPublish ? 'Published' : 'Restored'} v{log.version_number}
                      </span>
                      <span className="text-[10px] text-muted-foreground">— {projectName(log.project_id)}</span>
                    </div>
                    <p className="text-[10px] text-muted-foreground truncate">
                      {details.changes_summary || (isPublish
                        ? `${details.control_count || '?'} controls, ${details.source_count || '?'} sources`
                        : `From v${log.from_version}`
                      )}
                    </p>
                  </div>
                  <span className="text-[10px] text-muted-foreground shrink-0">
                    {new Date(log.created_at).toLocaleDateString()}
                  </span>
                </div>
              );
            })}
          </div>
        )}
      </motion.div>

      {/* Project Compliance Summary Table */}
      <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.4 }}
        className="bg-card border border-border rounded-xl p-5 shadow-premium">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <Shield className="h-4 w-4 text-primary" /> Project Compliance Summary
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="text-[10px] uppercase tracking-wider text-muted-foreground border-b border-border">
                <th className="text-left py-2 px-3">Project</th>
                <th className="text-left py-2 px-3">Technology</th>
                <th className="text-center py-2 px-3">Version</th>
                <th className="text-center py-2 px-3">Controls</th>
                <th className="text-center py-2 px-3">Confidence</th>
                <th className="text-center py-2 px-3">Status</th>
              </tr>
            </thead>
            <tbody>
              {projects.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No projects yet</td></tr>
              ) : (
                projects.map(p => (
                  <tr key={p.id} className="border-b border-border/50 last:border-b-0 hover:bg-muted/10 transition-colors">
                    <td className="py-2.5 px-3 font-medium text-foreground">{p.name}</td>
                    <td className="py-2.5 px-3 text-muted-foreground">{p.technology}</td>
                    <td className="py-2.5 px-3 text-center font-mono">v{p.current_version || 0}</td>
                    <td className="py-2.5 px-3 text-center">{p.control_count || 0}</td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`font-medium ${(Number(p.avg_confidence) || 0) >= 80 ? 'text-success' : (Number(p.avg_confidence) || 0) >= 50 ? 'text-warning' : 'text-destructive'}`}>
                        {Math.round(Number(p.avg_confidence) || 0)}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                        p.status === 'approved' ? 'bg-success/10 text-success' :
                        p.status === 'draft' ? 'bg-muted text-muted-foreground' :
                        'bg-warning/10 text-warning'
                      }`}>
                        {p.status}
                      </span>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </motion.div>
    </div>
  );
};

export default AuditDashboard;
