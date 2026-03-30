import React, { useMemo, useState, useCallback } from 'react';
import { subDays, format } from 'date-fns';
import { toast } from 'sonner';
import { Link, useSearchParams, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery } from '@tanstack/react-query';
import HelpButton from '@/components/HelpButton';
import { KPICardSkeleton } from '@/components/skeletons/SkeletonPremium';
import {
  Shield, CheckCircle2, Clock, Rocket, RotateCcw, GitBranch,
  History, ArrowUpDown, AlertTriangle, TrendingUp, FileText, BarChart3, Filter, Download, Loader2, CalendarDays, ArrowUpRight, ArrowDownRight, Minus, GitCompareArrows,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { Calendar } from '@/components/ui/calendar';
import { Separator } from '@/components/ui/separator';
import { cn } from '@/lib/utils';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  PieChart, Pie, Cell, AreaChart, Area, Legend, LineChart, Line, ReferenceLine,
  RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis,
} from 'recharts';
import { exportAuditPdf } from '@/components/audit/exportAuditPdf';
import { exportAuditCsv } from '@/components/audit/exportAuditCsv';

const DeltaBadge: React.FC<{ delta: number | null; suffix?: string; invert?: boolean }> = ({ delta, suffix = '', invert = false }) => {
  if (delta === null || delta === undefined) return null;
  const isPositive = invert ? delta < 0 : delta > 0;
  const isNegative = invert ? delta > 0 : delta < 0;
  const isZero = delta === 0;
  return (
    <span className={cn(
      "inline-flex items-center gap-0.5 text-[10px] font-medium px-1.5 py-0.5 rounded-full",
      isPositive && "bg-success/10 text-success",
      isNegative && "bg-destructive/10 text-destructive",
      isZero && "bg-muted text-muted-foreground",
    )}>
      {delta > 0 ? <ArrowUpRight className="h-2.5 w-2.5" /> : delta < 0 ? <ArrowDownRight className="h-2.5 w-2.5" /> : <Minus className="h-2.5 w-2.5" />}
      {Math.abs(delta)}{suffix}
    </span>
  );
};

const AuditDashboard: React.FC = () => {
  const { t } = useI18n();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams, setSearchParams] = useSearchParams();
  const selectedProjectId = searchParams.get('project') || 'all';
  const selectedPeriod = searchParams.get('period') || 'all';
  const [customDateRange, setCustomDateRange] = useState<{ from?: Date; to?: Date }>({});
  const [datePickerOpen, setDatePickerOpen] = useState(false);
  const [compareEnabled, setCompareEnabled] = useState(false);

  const setSelectedProjectId = useCallback((value: string) => {
    const params: Record<string, string> = {};
    if (value !== 'all') params.project = value;
    if (selectedPeriod !== 'all') params.period = selectedPeriod;
    setSearchParams(params, { replace: true });
  }, [setSearchParams, selectedPeriod]);

  const setSelectedPeriod = useCallback((value: string) => {
    const params: Record<string, string> = {};
    if (selectedProjectId !== 'all') params.project = selectedProjectId;
    if (value !== 'all') params.period = value;
    setSearchParams(params, { replace: true });
    if (value !== 'custom') setCustomDateRange({});
  }, [setSearchParams, selectedProjectId]);

  const periodCutoff = useMemo(() => {
    if (selectedPeriod === '7') return subDays(new Date(), 7);
    if (selectedPeriod === '30') return subDays(new Date(), 30);
    if (selectedPeriod === '90') return subDays(new Date(), 90);
    if (selectedPeriod === 'custom' && customDateRange.from) return customDateRange.from;
    return null;
  }, [selectedPeriod, customDateRange.from]);

  const periodEnd = useMemo(() => {
    if (selectedPeriod === 'custom' && customDateRange.to) {
      const end = new Date(customDateRange.to);
      end.setHours(23, 59, 59, 999);
      return end;
    }
    return null;
  }, [selectedPeriod, customDateRange.to]);

  const periodLabel = useMemo(() => {
    if (selectedPeriod === '7') return 'Last 7 days';
    if (selectedPeriod === '30') return 'Last 30 days';
    if (selectedPeriod === '90') return 'Last 90 days';
    if (selectedPeriod === 'custom' && customDateRange.from) {
      const from = format(customDateRange.from, 'MMM d');
      const to = customDateRange.to ? format(customDateRange.to, 'MMM d') : '…';
      return `${from} – ${to}`;
    }
    return 'All Time';
  }, [selectedPeriod, customDateRange]);

  // Previous period for comparison
  const previousPeriod = useMemo(() => {
    if (!compareEnabled || selectedPeriod === 'all') return null;
    const now = new Date();
    if (selectedPeriod === '7') return { from: subDays(now, 14), to: subDays(now, 7) };
    if (selectedPeriod === '30') return { from: subDays(now, 60), to: subDays(now, 30) };
    if (selectedPeriod === '90') return { from: subDays(now, 180), to: subDays(now, 90) };
    if (selectedPeriod === 'custom' && customDateRange.from) {
      const from = customDateRange.from;
      const to = customDateRange.to || now;
      const duration = to.getTime() - from.getTime();
      const prevTo = new Date(from.getTime() - 1);
      const prevFrom = new Date(prevTo.getTime() - duration);
      return { from: prevFrom, to: prevTo };
    }
    return null;
  }, [compareEnabled, selectedPeriod, customDateRange]);

  const previousPeriodLabel = useMemo(() => {
    if (!previousPeriod) return '';
    return `${format(previousPeriod.from, 'MMM d')} – ${format(previousPeriod.to, 'MMM d')}`;
  }, [previousPeriod]);

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
        .select('id, project_id, version, status, control_count, changes_summary, created_at, published_at, controls_snapshot')
        .eq('user_id', user.id)
        .order('created_at', { ascending: true });
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
        .select('id, review_status, criticality, project_id, framework_mappings, created_at')
        .eq('user_id', user.id);
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const loading = loadingProjects || loadingVersions || loadingLogs;

  // Filter data by selected project and period
  const isInPeriod = useCallback((dateStr: string) => {
    const d = new Date(dateStr);
    if (periodCutoff && d < periodCutoff) return false;
    if (periodEnd && d > periodEnd) return false;
    return true;
  }, [periodCutoff, periodEnd]);

  const filteredVersions = useMemo(() => {
    let result = selectedProjectId === 'all' ? versions : versions.filter(v => v.project_id === selectedProjectId);
    if (periodCutoff) result = result.filter(v => isInPeriod(v.created_at));
    return result;
  }, [versions, selectedProjectId, periodCutoff, periodEnd, isInPeriod]);
  const filteredAuditLogs = useMemo(() => {
    let result = selectedProjectId === 'all' ? auditLogs : auditLogs.filter(l => l.project_id === selectedProjectId);
    if (periodCutoff) result = result.filter(l => isInPeriod(l.created_at));
    return result;
  }, [auditLogs, selectedProjectId, periodCutoff, periodEnd, isInPeriod]);
  const filteredControls = useMemo(() => {
    let result = selectedProjectId === 'all' ? controls : controls.filter(c => c.project_id === selectedProjectId);
    if (periodCutoff) result = result.filter(c => isInPeriod(c.created_at));
    return result;
  }, [controls, selectedProjectId, periodCutoff, periodEnd, isInPeriod]);
  const filteredProjects = useMemo(() =>
    selectedProjectId === 'all' ? projects : projects.filter(p => p.id === selectedProjectId),
    [projects, selectedProjectId]
  );

  // Compute metrics
  const metrics = useMemo(() => {
    const publishedVersions = filteredVersions.filter(v => v.status === 'published');
    const draftVersions = filteredVersions.filter(v => v.status === 'draft');
    const totalControls = filteredControls.length;
    const approvedControls = filteredControls.filter(c => c.review_status === 'approved').length;
    const pendingControls = filteredControls.filter(c => c.review_status === 'pending').length;
    const rejectedControls = filteredControls.filter(c => c.review_status === 'rejected').length;
    const reviewRate = totalControls > 0 ? Math.round((approvedControls / totalControls) * 100) : 0;

    return {
      totalProjects: filteredProjects.length,
      publishedVersions: publishedVersions.length,
      draftVersions: draftVersions.length,
      totalAuditActions: filteredAuditLogs.length,
      totalControls,
      approvedControls,
      pendingControls,
      rejectedControls,
      reviewRate,
      avgConfidence: filteredProjects.length > 0
        ? Math.round(filteredProjects.reduce((sum, p) => sum + (Number(p.avg_confidence) || 0), 0) / filteredProjects.length)
        : 0,
    };
  }, [filteredProjects, filteredVersions, filteredAuditLogs, filteredControls]);

  // Previous period metrics for comparison
  const prevMetrics = useMemo(() => {
    if (!previousPeriod || !compareEnabled) return null;
    const isInPrev = (dateStr: string) => {
      const d = new Date(dateStr);
      return d >= previousPeriod.from && d <= previousPeriod.to;
    };
    const projectFilter = (items: any[], key = 'project_id') =>
      selectedProjectId === 'all' ? items : items.filter((i: any) => i[key] === selectedProjectId);

    const pVersions = projectFilter(versions).filter(v => isInPrev(v.created_at));
    const pLogs = projectFilter(auditLogs).filter(l => isInPrev(l.created_at));
    const pControls = projectFilter(controls).filter(c => isInPrev(c.created_at));

    const publishedVersions = pVersions.filter(v => v.status === 'published').length;
    const totalControls = pControls.length;
    const approvedControls = pControls.filter((c: any) => c.review_status === 'approved').length;
    const pendingControls = pControls.filter((c: any) => c.review_status === 'pending').length;
    const reviewRate = totalControls > 0 ? Math.round((approvedControls / totalControls) * 100) : 0;

    return { publishedVersions, reviewRate, pendingControls, avgConfidence: 0, totalAuditActions: pLogs.length };
  }, [previousPeriod, compareEnabled, versions, auditLogs, controls, selectedProjectId]);

  const getDelta = (current: number, previous: number | undefined) => {
    if (previous === undefined || previous === null) return null;
    return current - previous;
  };

  // Review status pie chart data
  const reviewPieData = useMemo(() => [
    { name: 'Approved', value: metrics.approvedControls, color: 'hsl(var(--success))' },
    { name: 'Pending', value: metrics.pendingControls, color: 'hsl(var(--warning))' },
    { name: 'Rejected', value: metrics.rejectedControls, color: 'hsl(var(--destructive))' },
  ].filter(d => d.value > 0), [metrics]);

  // Versions per project bar chart
  const versionsPerProject = useMemo(() => {
    const map = new Map<string, { name: string; published: number; draft: number }>();
    for (const p of filteredProjects) {
      map.set(p.id, { name: p.name.length > 18 ? p.name.slice(0, 18) + '…' : p.name, published: 0, draft: 0 });
    }
    for (const v of filteredVersions) {
      const entry = map.get(v.project_id);
      if (entry) {
        if (v.status === 'published') entry.published++;
        else entry.draft++;
      }
    }
    return Array.from(map.values());
  }, [filteredProjects, filteredVersions]);

  // Activity timeline data (grouped by month)
  const timelineData = useMemo(() => {
    const map = new Map<string, { month: string; publish: number; restore: number }>();
    for (const log of filteredAuditLogs) {
      const d = new Date(log.created_at);
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
      const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
      if (!map.has(key)) map.set(key, { month: label, publish: 0, restore: 0 });
      const entry = map.get(key)!;
      if (log.action === 'publish') entry.publish++;
      else entry.restore++;
    }
    // Also scan published_at from versions for richer data
    for (const v of filteredVersions) {
      if (v.status === 'published' && v.published_at) {
        const d = new Date(v.published_at);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        const label = d.toLocaleDateString('en-US', { month: 'short', year: '2-digit' });
        if (!map.has(key)) map.set(key, { month: label, publish: 0, restore: 0 });
      }
    }
    return Array.from(map.entries())
      .sort(([a], [b]) => a.localeCompare(b))
      .map(([, v]) => v);
  }, [filteredAuditLogs, filteredVersions]);

  // Compliance score trend from published versions
  const complianceTrend = useMemo(() => {
    const published = filteredVersions
      .filter(v => v.status === 'published' && v.published_at)
      .sort((a, b) => new Date(a.published_at!).getTime() - new Date(b.published_at!).getTime());

    return published.map(v => {
      const snapshot = Array.isArray(v.controls_snapshot) ? v.controls_snapshot as any[] : [];
      const scores = snapshot
        .map((c: any) => Number(c.confidence_score) || 0)
        .filter((s: number) => s > 0);
      const avgConf = scores.length > 0
        ? Math.round(scores.reduce((sum: number, s: number) => sum + s, 0) / scores.length)
        : 0;
      const approved = snapshot.filter((c: any) => c.review_status === 'approved').length;
      const reviewRate = snapshot.length > 0 ? Math.round((approved / snapshot.length) * 100) : 0;
      const d = new Date(v.published_at!);
      return {
        label: `v${v.version}`,
        date: d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        confidence: avgConf,
        reviewRate,
        controls: snapshot.length,
      };
    });
  }, [filteredVersions]);

  // Criticality breakdown
  const criticalityData = useMemo(() => {
    const counts = { critical: 0, high: 0, medium: 0, low: 0 };
    for (const c of filteredControls) {
      const crit = (c.criticality || 'medium').toLowerCase();
      if (crit in counts) counts[crit as keyof typeof counts]++;
    }
    return [
      { name: 'Critical', value: counts.critical, color: '#ef4444' },
      { name: 'High', value: counts.high, color: '#f97316' },
      { name: 'Medium', value: counts.medium, color: '#eab308' },
      { name: 'Low', value: counts.low, color: '#22c55e' },
    ].filter(d => d.value > 0);
  }, [filteredControls]);

  // Framework coverage radar data
  const frameworkRadarData = useMemo(() => {
    const frameworks = ['NIST', 'CIS', 'ISO', 'SOC', 'PCI'];
    const total = filteredControls.length;
    if (total === 0) return [];
    return frameworks.map(fw => {
      const mapped = filteredControls.filter(c =>
        Array.isArray(c.framework_mappings) && c.framework_mappings.some((m: string) => m.toUpperCase().includes(fw))
      ).length;
      return { framework: fw, coverage: Math.round((mapped / total) * 100), controls: mapped };
    });
  }, [filteredControls]);

  const projectName = (id: string) => projects.find(p => p.id === id)?.name || 'Unknown';

  const [exporting, setExporting] = useState(false);
  const [activeCriticality, setActiveCriticality] = useState<string | null>(null);

  const buildExportData = () => {
    const filterLabel = selectedProjectId === 'all'
      ? `All Projects (${filteredProjects.length})`
      : filteredProjects[0]?.name || 'Unknown';
    return {
      filterLabel,
      metrics,
      criticalityData,
      complianceTrend,
      frameworkRadarData,
      projects: filteredProjects.map(p => ({
        name: p.name, technology: p.technology, current_version: p.current_version,
        control_count: p.control_count, avg_confidence: p.avg_confidence, status: p.status,
      })),
      auditLogs: filteredAuditLogs.map(l => ({
        action: l.action, version_number: l.version_number, from_version: l.from_version,
        created_at: l.created_at, projectName: projectName(l.project_id), details: l.details,
      })),
    };
  };

  const handleExportPdf = async () => {
    setExporting(true);
    await new Promise(r => setTimeout(r, 100));
    try {
      exportAuditPdf(buildExportData());
      toast.success('PDF report downloaded successfully');
    } finally {
      setExporting(false);
    }
  };

  const handleExportCsv = async () => {
    setExporting(true);
    await new Promise(r => setTimeout(r, 100));
    try {
      exportAuditCsv(buildExportData());
      toast.success('CSV report downloaded successfully');
    } finally {
      setExporting(false);
    }
  };

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
        <div className="flex items-center gap-2 flex-wrap">
          <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
            <SelectTrigger className="w-[220px] h-9 text-xs">
              <Filter className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
              <SelectValue placeholder="All Projects" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Projects</SelectItem>
              {projects.map(p => (
                <SelectItem key={p.id} value={p.id}>{p.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Popover open={datePickerOpen} onOpenChange={setDatePickerOpen}>
            <PopoverTrigger asChild>
              <Button variant="outline" size="sm" className={cn("h-9 text-xs gap-1.5 min-w-[160px] justify-start font-normal", selectedPeriod !== 'all' && "text-foreground")}>
                <CalendarDays className="h-3.5 w-3.5 text-muted-foreground" />
                {periodLabel}
              </Button>
            </PopoverTrigger>
            <PopoverContent className="w-auto p-0" align="end">
              <div className="flex flex-col">
                <div className="flex flex-col gap-0.5 p-2">
                  {[
                    { value: 'all', label: 'All Time' },
                    { value: '7', label: 'Last 7 days' },
                    { value: '30', label: 'Last 30 days' },
                    { value: '90', label: 'Last 90 days' },
                  ].map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => { setSelectedPeriod(opt.value); setDatePickerOpen(false); }}
                      className={cn(
                        "text-xs px-3 py-1.5 rounded-md text-left hover:bg-accent transition-colors",
                        selectedPeriod === opt.value && "bg-accent font-medium"
                      )}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
                <Separator />
                <div className="p-2">
                  <p className="text-[10px] uppercase tracking-wider text-muted-foreground font-medium px-1 mb-1">Custom Range</p>
                  <Calendar
                    mode="range"
                    selected={customDateRange.from ? { from: customDateRange.from, to: customDateRange.to } : undefined}
                    onSelect={(range) => {
                      setCustomDateRange({ from: range?.from, to: range?.to });
                      if (range?.from) {
                        setSelectedPeriod('custom');
                        if (range?.to) setDatePickerOpen(false);
                      }
                    }}
                    disabled={(date) => date > new Date()}
                    numberOfMonths={2}
                    className={cn("p-2 pointer-events-auto")}
                  />
                </div>
              </div>
            </PopoverContent>
          </Popover>
          <Button
            variant={compareEnabled ? "default" : "outline"}
            size="sm"
            className="h-9 text-xs gap-1.5"
            onClick={() => setCompareEnabled(prev => !prev)}
            disabled={selectedPeriod === 'all'}
            title={selectedPeriod === 'all' ? 'Select a time period first to compare' : 'Compare with previous period'}
          >
            <GitCompareArrows className="h-3.5 w-3.5" />
            Compare
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={loading || exporting}>
                {exporting
                  ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />
                  : <Download className="h-3.5 w-3.5 mr-1.5" />}
                {exporting ? 'Exporting…' : 'Export'}
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              <DropdownMenuItem onClick={handleExportPdf}>
                <FileText className="h-3.5 w-3.5 mr-2" />Export PDF
              </DropdownMenuItem>
              <DropdownMenuItem onClick={handleExportCsv}>
                <BarChart3 className="h-3.5 w-3.5 mr-2" />Export CSV
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" asChild>
            <Link to="/history"><History className="h-3.5 w-3.5 mr-1.5" />Version History</Link>
          </Button>
          <Button variant="outline" size="sm" asChild>
            <Link to="/traceability"><GitBranch className="h-3.5 w-3.5 mr-1.5" />Traceability</Link>
          </Button>
        </div>
      </div>

      {/* Comparison banner */}
      {compareEnabled && prevMetrics && previousPeriodLabel && (
        <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} exit={{ opacity: 0, height: 0 }}
          className="bg-primary/5 border border-primary/20 rounded-lg px-4 py-2 flex items-center gap-2 text-xs text-muted-foreground">
          <GitCompareArrows className="h-3.5 w-3.5 text-primary" />
          Comparing <span className="font-medium text-foreground">{periodLabel}</span> vs
          <span className="font-medium text-foreground">{previousPeriodLabel}</span>
          <button onClick={() => setCompareEnabled(false)} className="ml-auto text-muted-foreground hover:text-foreground text-xs underline">
            Disable
          </button>
        </motion.div>
      )}

      {/* KPI Cards */}
      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => <KPICardSkeleton key={i} />)}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0 }}
            onClick={() => navigate('/history')}
            className="bg-card border border-border rounded-xl p-5 shadow-premium cursor-pointer hover:border-primary/40 transition-colors group">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <Rocket className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Published Versions</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-display font-bold text-foreground">{metrics.publishedVersions}</p>
              <DeltaBadge delta={getDelta(metrics.publishedVersions, prevMetrics?.publishedVersions)} />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{metrics.draftVersions} drafts across {metrics.totalProjects} projects</p>
            <p className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-1">View version history →</p>
          </motion.div>

          <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.05 }}
            onClick={() => navigate('/editor?review=approved')}
            className="bg-card border border-border rounded-xl p-5 shadow-premium cursor-pointer hover:border-success/40 transition-colors group">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-success/10 flex items-center justify-center">
                <CheckCircle2 className="h-4 w-4 text-success" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Review Completion</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-display font-bold text-foreground">{metrics.reviewRate}%</p>
              <DeltaBadge delta={getDelta(metrics.reviewRate, prevMetrics?.reviewRate)} suffix="pp" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{metrics.approvedControls} of {metrics.totalControls} controls approved</p>
            <p className="text-[10px] text-success opacity-0 group-hover:opacity-100 transition-opacity mt-1">View approved controls →</p>
          </motion.div>

          <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.1 }}
            onClick={() => navigate('/editor?review=pending')}
            className="bg-card border border-border rounded-xl p-5 shadow-premium cursor-pointer hover:border-warning/40 transition-colors group">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-warning/10 flex items-center justify-center">
                <AlertTriangle className="h-4 w-4 text-warning" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Pending Review</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-display font-bold text-foreground">{metrics.pendingControls}</p>
              <DeltaBadge delta={getDelta(metrics.pendingControls, prevMetrics?.pendingControls)} invert />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{metrics.rejectedControls} rejected controls</p>
            <p className="text-[10px] text-warning opacity-0 group-hover:opacity-100 transition-opacity mt-1">View pending controls →</p>
          </motion.div>

          <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.15 }}
            onClick={() => navigate('/traceability')}
            className="bg-card border border-border rounded-xl p-5 shadow-premium cursor-pointer hover:border-primary/40 transition-colors group">
            <div className="flex items-center gap-2 mb-2">
              <div className="h-8 w-8 rounded-lg bg-primary/10 flex items-center justify-center">
                <TrendingUp className="h-4 w-4 text-primary" />
              </div>
              <span className="text-[10px] uppercase tracking-wider text-muted-foreground">Avg. Confidence</span>
            </div>
            <div className="flex items-baseline gap-2">
              <p className="text-2xl font-display font-bold text-foreground">{metrics.avgConfidence}%</p>
              <DeltaBadge delta={getDelta(metrics.avgConfidence, prevMetrics?.avgConfidence)} suffix="pp" />
            </div>
            <p className="text-[10px] text-muted-foreground mt-1">{metrics.totalAuditActions} audit actions logged</p>
            <p className="text-[10px] text-primary opacity-0 group-hover:opacity-100 transition-opacity mt-1">View traceability →</p>
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

        {/* Criticality Breakdown Pie — Interactive */}
        <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.25 }}
          className="bg-card border border-border rounded-xl p-5 shadow-premium">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
              <AlertTriangle className="h-4 w-4 text-warning" /> Criticality Breakdown
            </h3>
            {activeCriticality && (
              <button onClick={() => setActiveCriticality(null)} className="text-[10px] text-primary hover:underline">Clear filter</button>
            )}
          </div>
          {criticalityData.length === 0 ? (
            <p className="text-xs text-muted-foreground text-center py-8">No controls yet</p>
          ) : (
            <>
              <ResponsiveContainer width="100%" height={200}>
                <PieChart>
                  <Pie
                    data={criticalityData}
                    dataKey="value"
                    nameKey="name"
                    cx="50%"
                    cy="50%"
                    innerRadius={50}
                    outerRadius={80}
                    paddingAngle={3}
                    onClick={(entry) => setActiveCriticality(prev => prev === entry.name ? null : entry.name)}
                    style={{ cursor: 'pointer' }}
                    label={({ name, percent }) => `${Math.round(percent * 100)}%`}
                    labelLine={false}
                  >
                    {criticalityData.map((entry, i) => (
                      <Cell
                        key={i}
                        fill={entry.color}
                        stroke={activeCriticality === entry.name ? 'hsl(var(--foreground))' : 'transparent'}
                        strokeWidth={activeCriticality === entry.name ? 2.5 : 0}
                        opacity={activeCriticality && activeCriticality !== entry.name ? 0.3 : 1}
                      />
                    ))}
                  </Pie>
                  <Tooltip
                    contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                    formatter={(value: number) => {
                      const total = criticalityData.reduce((s, d) => s + d.value, 0);
                      return [`${value} controls (${Math.round((value / total) * 100)}%)`, ''];
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              <div className="flex justify-center gap-3 mt-2 flex-wrap">
                {criticalityData.map(d => (
                  <button
                    key={d.name}
                    onClick={() => setActiveCriticality(prev => prev === d.name ? null : d.name)}
                    className={`flex items-center gap-1.5 text-[10px] px-2 py-1 rounded-full border transition-all ${
                      activeCriticality === d.name
                        ? 'border-foreground/40 bg-muted font-semibold text-foreground'
                        : 'border-transparent text-muted-foreground hover:text-foreground'
                    }`}
                  >
                    <div className="h-2 w-2 rounded-full" style={{ backgroundColor: d.color }} />
                    {d.name} ({d.value})
                  </button>
                ))}
              </div>
              {activeCriticality && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: 'auto' }} className="mt-3 pt-3 border-t border-border">
                  <p className="text-[11px] text-foreground font-medium mb-1">
                    {activeCriticality} controls: {criticalityData.find(d => d.name === activeCriticality)?.value || 0} of {filteredControls.length}
                  </p>
                  <p className="text-[10px] text-muted-foreground">
                    {Math.round(((criticalityData.find(d => d.name === activeCriticality)?.value || 0) / filteredControls.length) * 100)}% of total controls
                  </p>
                </motion.div>
              )}
            </>
          )}
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

      {/* Activity Timeline */}
      <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.32 }}
        className="bg-card border border-border rounded-xl p-5 shadow-premium">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-primary" /> Activity Timeline
        </h3>
        {timelineData.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No activity recorded yet. Publish or restore versions to populate the timeline.</p>
        ) : (
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={timelineData}>
              <defs>
                <linearGradient id="fillPublish" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="fillRestore" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="month" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis allowDecimals={false} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <Tooltip contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }} />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <Area type="monotone" dataKey="publish" name="Publications" stroke="hsl(var(--primary))" fill="url(#fillPublish)" strokeWidth={2} dot={{ r: 3 }} />
              <Area type="monotone" dataKey="restore" name="Restorations" stroke="hsl(var(--warning))" fill="url(#fillRestore)" strokeWidth={2} dot={{ r: 3 }} />
            </AreaChart>
          </ResponsiveContainer>
        )}
      </motion.div>

      {/* Framework Coverage Radar */}
      <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.325 }}
        className="bg-card border border-border rounded-xl p-5 shadow-premium">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-sm font-semibold text-foreground flex items-center gap-2">
            <Shield className="h-4 w-4 text-primary" /> Framework Coverage
          </h3>
          <Button variant="ghost" size="sm" className="text-xs" asChild>
            <Link to="/traceability">Full view →</Link>
          </Button>
        </div>
        {frameworkRadarData.length === 0 || frameworkRadarData.every(d => d.controls === 0) ? (
          <p className="text-xs text-muted-foreground text-center py-8">No framework mappings found. Add mappings to controls to see coverage.</p>
        ) : (
          <div className="flex flex-col lg:flex-row items-center gap-6">
            <ResponsiveContainer width="100%" height={260}>
              <RadarChart data={frameworkRadarData} cx="50%" cy="50%" outerRadius="75%">
                <PolarGrid stroke="hsl(var(--border))" />
                <PolarAngleAxis dataKey="framework" tick={{ fontSize: 11, fill: 'hsl(var(--foreground))' }} />
                <PolarRadiusAxis angle={90} domain={[0, 100]} tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} tickFormatter={(v) => `${v}%`} />
                <Radar name="Coverage" dataKey="coverage" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))' }} />
                <Tooltip
                  contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                  formatter={(value: number, _name: string, entry: any) => [
                    `${value}% (${entry.payload.controls} of ${filteredControls.length} controls)`,
                    'Coverage',
                  ]}
                />
              </RadarChart>
            </ResponsiveContainer>
            <div className="grid grid-cols-2 sm:grid-cols-5 lg:grid-cols-1 gap-2 w-full lg:w-auto lg:min-w-[140px]">
              {frameworkRadarData.map(d => (
                <div key={d.framework} className="flex items-center gap-2 px-3 py-2 rounded-lg bg-muted/30 border border-border/50">
                  <span className="text-xs font-semibold text-foreground w-10">{d.framework}</span>
                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden">
                    <div className="h-full rounded-full bg-primary transition-all" style={{ width: `${d.coverage}%` }} />
                  </div>
                  <span className="text-[10px] font-mono text-muted-foreground w-8 text-right">{d.coverage}%</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </motion.div>
      <motion.div variants={fadeIn} initial="hidden" animate="visible" transition={{ delay: 0.33 }}
        className="bg-card border border-border rounded-xl p-5 shadow-premium">
        <h3 className="text-sm font-semibold text-foreground mb-4 flex items-center gap-2">
          <TrendingUp className="h-4 w-4 text-success" /> Compliance Score Trend
        </h3>
        {complianceTrend.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-8">No published versions yet. Publish a version to start tracking compliance evolution.</p>
        ) : (
          <ResponsiveContainer width="100%" height={240}>
            <LineChart data={complianceTrend}>
              <defs>
                <linearGradient id="fillConfidence" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.15} />
                  <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
              <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} />
              <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} unit="%" />
              <Tooltip
                contentStyle={{ background: 'hsl(var(--card))', border: '1px solid hsl(var(--border))', borderRadius: 8, fontSize: 12 }}
                formatter={(value: number, name: string) => [`${value}%`, name]}
                labelFormatter={(label) => {
                  const point = complianceTrend.find(p => p.label === label);
                  return point ? `${label} — ${point.date} (${point.controls} controls)` : label;
                }}
              />
              <Legend wrapperStyle={{ fontSize: 11 }} />
              <ReferenceLine y={80} stroke="hsl(var(--success))" strokeDasharray="6 3" strokeOpacity={0.5} label={{ value: '80% target', position: 'right', fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
              <Line type="monotone" dataKey="confidence" name="Avg. Confidence" stroke="hsl(var(--primary))" strokeWidth={2.5} dot={{ r: 4, fill: 'hsl(var(--primary))' }} activeDot={{ r: 6 }} />
              <Line type="monotone" dataKey="reviewRate" name="Review Rate" stroke="hsl(var(--success))" strokeWidth={2} strokeDasharray="5 3" dot={{ r: 3, fill: 'hsl(var(--success))' }} />
            </LineChart>
          </ResponsiveContainer>
        )}
      </motion.div>

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
        {filteredAuditLogs.length === 0 ? (
          <p className="text-xs text-muted-foreground text-center py-6">No audit activity yet. Publish or restore a version to generate entries.</p>
        ) : (
          <div className="space-y-3">
            {filteredAuditLogs.slice(0, 8).map((log) => {
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
              {filteredProjects.length === 0 ? (
                <tr><td colSpan={6} className="text-center py-6 text-muted-foreground">No projects found</td></tr>
              ) : (
                filteredProjects.map(p => (
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
