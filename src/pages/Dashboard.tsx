import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/integrations/supabase/client';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import StatusBadge from '@/components/StatusBadge';
import ConfidenceScore from '@/components/ConfidenceScore';
import { KPICardSkeleton, TableSkeleton } from '@/components/skeletons/SkeletonPremium';
import { Plus, Download, Shield, BarChart3, Layers, TrendingUp, CheckCircle2, XCircle, Eye, Edit3, FolderPlus, RotateCcw, FileDown, MessageSquare, Image, FileSpreadsheet, MoreVertical, AlertTriangle, Filter, FileText, Trash2 } from 'lucide-react';
import HelpButton from '@/components/HelpButton';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell, PieChart, Pie } from 'recharts';
import { useToast } from '@/hooks/use-toast';
import ConfirmationModal from '@/components/ConfirmationModal';
import type { StrideCategory } from '@/types';

const fadeIn = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

// --- Sparkline data for each KPI ---
const sparkProjects = [
  { d: 'Mon', v: 3 }, { d: 'Tue', v: 3 }, { d: 'Wed', v: 3 }, { d: 'Thu', v: 4 }, { d: 'Fri', v: 4 }, { d: 'Sat', v: 5 }, { d: 'Sun', v: 5 },
];
const sparkBaselines = [
  { d: 'Mon', v: 1 }, { d: 'Tue', v: 2 }, { d: 'Wed', v: 2 }, { d: 'Thu', v: 2 }, { d: 'Fri', v: 3 }, { d: 'Sat', v: 3 }, { d: 'Sun', v: 3 },
];
const sparkControls = [
  { d: 'Mon', v: 112 }, { d: 'Tue', v: 124 }, { d: 'Wed', v: 138 }, { d: 'Thu', v: 149 }, { d: 'Fri', v: 160 }, { d: 'Sat', v: 172 }, { d: 'Sun', v: 181 },
];
const sparkConfidence = [
  { d: 'Mon', v: 84 }, { d: 'Tue', v: 85 }, { d: 'Wed', v: 87 }, { d: 'Thu', v: 88 }, { d: 'Fri', v: 89 }, { d: 'Sat', v: 90 }, { d: 'Sun', v: 91 },
];
const sparkThreats = [
  { d: 'Mon', v: 15 }, { d: 'Tue', v: 17 }, { d: 'Wed', v: 19 }, { d: 'Thu', v: 21 }, { d: 'Fri', v: 22 }, { d: 'Sat', v: 24 }, { d: 'Sun', v: 25 },
];

// --- Generate trend data for various periods ---
function generateTrendData(days: number): typeof trendData7d {
  const result = [];
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const label = d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const progress = (days - i) / days;
    const base = 80 + Math.floor(progress * 100);
    const approved = Math.floor(30 + progress * 80 + Math.sin(i * 0.5) * 8);
    const pending = Math.floor(55 - progress * 18 + Math.cos(i * 0.7) * 5);
    const rejected = Math.floor(20 + progress * 14 + Math.sin(i * 0.3) * 4);
    const confidence = Math.min(95, Math.floor(83 + progress * 10 + Math.sin(i * 0.4) * 2));
    result.push({ day: label, controls: approved + pending + rejected, confidence, approved, pending, rejected });
  }
  return result;
}

const trendData7d = [
  { day: 'Mar 19', controls: 112, confidence: 84, approved: 38, pending: 52, rejected: 22 },
  { day: 'Mar 20', controls: 124, confidence: 85, approved: 45, pending: 54, rejected: 25 },
  { day: 'Mar 21', controls: 138, confidence: 87, approved: 56, pending: 55, rejected: 27 },
  { day: 'Mar 22', controls: 149, confidence: 88, approved: 68, pending: 50, rejected: 31 },
  { day: 'Mar 23', controls: 160, confidence: 89, approved: 82, pending: 47, rejected: 31 },
  { day: 'Mar 24', controls: 172, confidence: 90, approved: 96, pending: 43, rejected: 33 },
  { day: 'Mar 25', controls: 181, confidence: 91, approved: 108, pending: 40, rejected: 33 },
];
const trendData30d = generateTrendData(30);
const trendData90d = generateTrendData(90);

type TrendPeriod = '7d' | '30d' | '90d';
const trendDataMap: Record<TrendPeriod, typeof trendData7d> = { '7d': trendData7d, '30d': trendData30d, '90d': trendData90d };

// --- Activity types ---
type ActivityAction = 'approved' | 'rejected' | 'reviewed' | 'adjusted' | 'created' | 'restored' | 'exported' | 'commented';

interface ActivityEntry {
  id: string;
  user: { name: string; initials: string; color: string };
  action: ActivityAction;
  target: string;
  timestamp: Date;
}

const mockActivities: ActivityEntry[] = [
  { id: 'act-1', user: { name: 'Helena Vasquez', initials: 'HV', color: 'bg-primary' }, action: 'approved', target: 'S3-SEC-001', timestamp: new Date(Date.now() - 3 * 60000) },
  { id: 'act-2', user: { name: 'Marcus Chen', initials: 'MC', color: 'bg-emerald-600' }, action: 'commented', target: 'S3-SEC-006', timestamp: new Date(Date.now() - 18 * 60000) },
  { id: 'act-3', user: { name: 'Helena Vasquez', initials: 'HV', color: 'bg-primary' }, action: 'rejected', target: 'S3-SEC-003', timestamp: new Date(Date.now() - 42 * 60000) },
  { id: 'act-4', user: { name: 'Rafael Oliveira', initials: 'RO', color: 'bg-violet-600' }, action: 'exported', target: 'AWS S3 Baseline v2.1', timestamp: new Date(Date.now() - 90 * 60000) },
  { id: 'act-5', user: { name: 'Marcus Chen', initials: 'MC', color: 'bg-emerald-600' }, action: 'adjusted', target: 'S3-SEC-002', timestamp: new Date(Date.now() - 2.5 * 3600000) },
  { id: 'act-6', user: { name: 'Aisha Patel', initials: 'AP', color: 'bg-rose-600' }, action: 'reviewed', target: 'S3-SEC-005', timestamp: new Date(Date.now() - 3.2 * 3600000) },
  { id: 'act-7', user: { name: 'Helena Vasquez', initials: 'HV', color: 'bg-primary' }, action: 'restored', target: 'Version 2', timestamp: new Date(Date.now() - 5 * 3600000) },
  { id: 'act-8', user: { name: 'Rafael Oliveira', initials: 'RO', color: 'bg-violet-600' }, action: 'created', target: 'PostgreSQL Security Baseline', timestamp: new Date(Date.now() - 8 * 3600000) },
];

const actionIcons: Record<ActivityAction, { icon: React.ElementType; class: string }> = {
  approved: { icon: CheckCircle2, class: 'text-emerald-500' },
  rejected: { icon: XCircle, class: 'text-destructive' },
  reviewed: { icon: Eye, class: 'text-sky-500' },
  adjusted: { icon: Edit3, class: 'text-amber-500' },
  created: { icon: FolderPlus, class: 'text-primary' },
  restored: { icon: RotateCcw, class: 'text-amber-500' },
  exported: { icon: FileDown, class: 'text-sky-500' },
  commented: { icon: MessageSquare, class: 'text-muted-foreground' },
};

function formatTimeAgo(date: Date, t: any): string {
  const diff = Date.now() - date.getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return t.dashboard.activity.justNow;
  if (mins < 60) return `${mins} ${t.dashboard.activity.minutesAgo}`;
  const hours = Math.floor(mins / 60);
  return `${hours} ${t.dashboard.activity.hoursAgo}`;
}

const ActivityTimelineSkeleton: React.FC = () => (
  <div className="space-y-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="flex items-start gap-3">
        <Skeleton className="h-8 w-8 rounded-full shrink-0" />
        <div className="flex-1 space-y-1.5">
          <Skeleton className="h-3 w-3/4" />
          <Skeleton className="h-2.5 w-1/3" />
        </div>
      </div>
    ))}
  </div>
);

const TrendChartSkeleton: React.FC = () => (
  <div className="bg-card border border-border rounded-lg p-5 shadow-premium space-y-4">
    <Skeleton className="h-5 w-40" />
    <Skeleton className="h-[200px] w-full rounded-md" />
  </div>
);

// Sparkline mini chart inside KPI cards
const Sparkline: React.FC<{ data: { d: string; v: number }[]; color: string; type?: 'area' | 'bar' }> = ({ data, color, type = 'area' }) => (
  <div className="h-10 w-full mt-2">
    <ResponsiveContainer width="100%" height="100%">
      {type === 'bar' ? (
        <BarChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <Bar dataKey="v" fill={color} radius={[2, 2, 0, 0]} opacity={0.7} />
        </BarChart>
      ) : (
        <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 0 }}>
          <defs>
            <linearGradient id={`spark-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={color} stopOpacity={0.3} />
              <stop offset="100%" stopColor={color} stopOpacity={0} />
            </linearGradient>
          </defs>
          <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5} fill={`url(#spark-${color.replace('#', '')})`} dot={false} />
        </AreaChart>
      )}
    </ResponsiveContainer>
  </div>
);

// Custom tooltip for the main trend chart
const CustomTooltip = ({ active, payload, label }: any) => {
  if (!active || !payload?.length) return null;
  return (
    <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-premium text-xs">
      <p className="font-semibold text-foreground mb-1">{label}</p>
      {payload.map((entry: any) => (
        <p key={entry.name} className="text-muted-foreground">
          <span className="inline-block w-2 h-2 rounded-full mr-1.5" style={{ backgroundColor: entry.color }} />
          {entry.name}: <span className="text-foreground font-medium">{entry.value}{entry.name === 'Confidence' ? '%' : ''}</span>
        </p>
      ))}
    </div>
  );
};

// --- STRIDE threat distribution data ---
const STRIDE_COLORS: Record<StrideCategory, string> = {
  spoofing: '#8b5cf6',
  tampering: '#f59e0b',
  repudiation: '#6366f1',
  information_disclosure: '#ef4444',
  denial_of_service: '#ec4899',
  elevation_of_privilege: '#14b8a6',
};

const STRIDE_ORDER: StrideCategory[] = ['spoofing', 'tampering', 'repudiation', 'information_disclosure', 'denial_of_service', 'elevation_of_privilege'];

function computeStrideData(t: any, controls: any[]) {
  const counts: Record<StrideCategory, number> = {
    spoofing: 0, tampering: 0, repudiation: 0,
    information_disclosure: 0, denial_of_service: 0, elevation_of_privilege: 0,
  };
  for (const ctrl of controls) {
    const scenarios = Array.isArray(ctrl.threat_scenarios) ? ctrl.threat_scenarios : (Array.isArray(ctrl.threatScenarios) ? ctrl.threatScenarios : []);
    for (const ts of scenarios) {
      const cat = (ts.strideCategory || ts.stride_category) as StrideCategory;
      if (cat && counts[cat] !== undefined) counts[cat]++;
    }
  }
  return STRIDE_ORDER.map(cat => ({
    category: cat,
    label: (t.dashboard.stride as any)?.[cat] ?? cat.replace(/_/g, ' '),
    count: counts[cat],
    color: STRIDE_COLORS[cat],
  }));
}

const Dashboard: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const { user } = useAuth();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [controlsPeriod, setControlsPeriod] = useState<TrendPeriod>('7d');
  const [confidencePeriod, setConfidencePeriod] = useState<TrendPeriod>('7d');
  const [visibleSeries, setVisibleSeries] = useState({ approved: true, pending: true, rejected: true });
  const [selectedProjectId, setSelectedProjectId] = useState<string>('all');
  const [deleteTarget, setDeleteTarget] = useState<{ id: string; name: string } | null>(null);
  const controlsChartRef = useRef<HTMLDivElement>(null);
  const confidenceChartRef = useRef<HTMLDivElement>(null);

  const deleteProject = useMutation({
    mutationFn: async (projectId: string) => {
      // Delete related data first, then the project
      await supabase.from('controls').delete().eq('project_id', projectId);
      await supabase.from('sources').delete().eq('project_id', projectId);
      await supabase.from('baseline_versions').delete().eq('project_id', projectId);
      await supabase.from('notifications').delete().eq('project_id', projectId);
      const { error } = await supabase.from('projects').delete().eq('id', projectId);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['dashboard-projects'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-controls'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard-versions'] });
      toast({ title: 'Project deleted', description: 'The project and all related data have been removed.' });
      if (selectedProjectId === deleteTarget?.id) setSelectedProjectId('all');
    },
    onError: () => {
      toast({ title: 'Error', description: 'Failed to delete project.', variant: 'destructive' });
    },
  });

  // Fetch real projects
  const { data: projects = [], isLoading: projectsLoading } = useQuery({
    queryKey: ['dashboard-projects', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('projects')
        .select('*')
        .order('updated_at', { ascending: false });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch real controls
  const { data: controls = [], isLoading: controlsLoading } = useQuery({
    queryKey: ['dashboard-controls', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('controls')
        .select('*');
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  // Fetch baseline versions for confidence evolution
  const { data: baselineVersions = [], isLoading: versionsLoading } = useQuery({
    queryKey: ['dashboard-versions', user?.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('baseline_versions')
        .select('*')
        .order('version', { ascending: true });
      if (error) throw error;
      return data || [];
    },
    enabled: !!user,
  });

  const loading = projectsLoading || controlsLoading;

  const filteredControls = useMemo(() => {
    if (selectedProjectId === 'all') return controls;
    return controls.filter(c => c.project_id === selectedProjectId);
  }, [controls, selectedProjectId]);

  const filteredProjects = useMemo(() => {
    if (selectedProjectId === 'all') return projects;
    return projects.filter(p => p.id === selectedProjectId);
  }, [projects, selectedProjectId]);

  const userName = useMemo(() => {
    if (!user) return '';
    return user.user_metadata?.full_name || user.email?.split('@')[0] || '';
  }, [user]);

  const handleStrideClick = useCallback((category: string) => {
    navigate(`/editor?stride=${category}`);
  }, [navigate]);

  const toggleSeries = (key: 'approved' | 'pending' | 'rejected') => {
    setVisibleSeries(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const exportChartAsPng = useCallback(async (ref: React.RefObject<HTMLDivElement | null>, filename: string) => {
    const container = ref.current;
    if (!container) return;
    const svg = container.querySelector('svg.recharts-surface') as SVGSVGElement | null;
    if (!svg) return;
    const svgData = new XMLSerializer().serializeToString(svg);
    const { width, height } = svg.getBoundingClientRect();
    const canvas = document.createElement('canvas');
    const scale = 2;
    canvas.width = width * scale;
    canvas.height = height * scale;
    const ctx = canvas.getContext('2d')!;
    ctx.scale(scale, scale);
    const bg = getComputedStyle(document.documentElement).getPropertyValue('--background').trim();
    ctx.fillStyle = bg ? `hsl(${bg})` : '#1a1a2e';
    ctx.fillRect(0, 0, width, height);
    const img = new window.Image();
    const blob = new Blob([svgData], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    img.onload = () => {
      ctx.drawImage(img, 0, 0, width, height);
      URL.revokeObjectURL(url);
      const a = document.createElement('a');
      a.download = `${filename}.png`;
      a.href = canvas.toDataURL('image/png');
      a.click();
      toast({ title: '📊 PNG Exported', description: filename });
    };
    img.src = url;
  }, [toast]);

  const exportChartAsCsv = useCallback((data: typeof trendData7d, columns: string[], filename: string) => {
    const header = columns.join(',');
    const rows = data.map(row => columns.map(c => (row as any)[c] ?? '').join(','));
    const csv = [header, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const a = document.createElement('a');
    a.download = `${filename}.csv`;
    a.href = URL.createObjectURL(blob);
    a.click();
    URL.revokeObjectURL(a.href);
    toast({ title: '📄 CSV Exported', description: filename });
  }, [toast]);



  // Compute KPIs from real data
  const totalThreats = useMemo(() => {
    let count = 0;
    for (const c of filteredControls) {
      const scenarios = Array.isArray(c.threat_scenarios) ? c.threat_scenarios : [];
      count += scenarios.length;
    }
    return count;
  }, [filteredControls]);

  const avgConfidence = useMemo(() => {
    if (filteredControls.length === 0) return 0;
    const sum = filteredControls.reduce((acc, c) => acc + (Number(c.confidence_score) || 0), 0);
    return Math.round(sum / filteredControls.length);
  }, [filteredControls]);

  const approvedBaselines = useMemo(() => {
    return filteredProjects.filter(p => p.status === 'approved' || p.status === 'in_progress').length;
  }, [filteredProjects]);

  const strideData = useMemo(() => computeStrideData(t, filteredControls), [t, filteredControls]);

  const reviewStatusData = useMemo(() => {
    const counts = { approved: 0, pending: 0, rejected: 0 };
    for (const c of filteredControls) {
      const s = c.review_status as keyof typeof counts;
      if (counts[s] !== undefined) counts[s]++;
      else counts.pending++;
    }
    return [
      { name: 'Approved', value: counts.approved, color: '#10b981' },
      { name: 'Pending', value: counts.pending, color: '#f59e0b' },
      { name: 'Rejected', value: counts.rejected, color: '#ef4444' },
    ];
  }, [filteredControls]);

  // Confidence evolution across baseline versions
  const confidenceEvolutionData = useMemo(() => {
    const relevantVersions = selectedProjectId === 'all'
      ? baselineVersions
      : baselineVersions.filter(v => v.project_id === selectedProjectId);

    // Group by project, then flatten with version labels
    const byProject = new Map<string, typeof relevantVersions>();
    for (const v of relevantVersions) {
      const arr = byProject.get(v.project_id) || [];
      arr.push(v);
      byProject.set(v.project_id, arr);
    }

    // If single project, show per-version confidence
    if (selectedProjectId !== 'all' || byProject.size <= 1) {
      return relevantVersions.map(v => {
        const snapshot = Array.isArray(v.controls_snapshot) ? v.controls_snapshot as any[] : [];
        const avgConf = snapshot.length > 0
          ? Math.round(snapshot.reduce((s, c) => s + (Number(c.confidence_score || c.confidenceScore) || 0), 0) / snapshot.length * 100)
          : 0;
        const projectName = projects.find(p => p.id === v.project_id)?.name || 'Project';
        return {
          label: `v${v.version}`,
          confidence: avgConf,
          controls: v.control_count,
          project: projectName,
          date: new Date(v.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
        };
      });
    }

    // Multiple projects: show latest version per project
    return Array.from(byProject.entries()).map(([projectId, versions]) => {
      const latest = versions[versions.length - 1];
      const snapshot = Array.isArray(latest.controls_snapshot) ? latest.controls_snapshot as any[] : [];
      const avgConf = snapshot.length > 0
        ? Math.round(snapshot.reduce((s, c) => s + (Number(c.confidence_score || c.confidenceScore) || 0), 0) / snapshot.length * 100)
        : 0;
      const projectName = projects.find(p => p.id === projectId)?.name || 'Project';
      return {
        label: projectName.length > 18 ? projectName.slice(0, 18) + '…' : projectName,
        confidence: avgConf,
        controls: latest.control_count,
        project: projectName,
        date: new Date(latest.created_at).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      };
    });
  }, [baselineVersions, selectedProjectId, projects]);

  const kpis = [
    { label: t.dashboard.totalProjects, value: String(filteredProjects.length), icon: Layers, change: filteredProjects.length > 0 ? `+${filteredProjects.length}` : '0', spark: sparkProjects, color: 'hsl(var(--primary))', sparkType: 'bar' as const },
    { label: t.dashboard.activeBaselines, value: String(approvedBaselines), icon: Shield, change: approvedBaselines > 0 ? `+${approvedBaselines}` : '0', spark: sparkBaselines, color: '#10b981', sparkType: 'area' as const },
    { label: t.dashboard.controlsGenerated, value: String(filteredControls.length), icon: BarChart3, change: filteredControls.length > 0 ? `+${filteredControls.length}` : '0', spark: sparkControls, color: '#3b82f6', sparkType: 'area' as const },
    { label: t.dashboard.avgConfidence, value: `${avgConfidence}%`, icon: TrendingUp, change: avgConfidence > 0 ? `${avgConfidence}%` : '0%', spark: sparkConfidence, color: '#f59e0b', sparkType: 'area' as const },
    { label: t.dashboard.activeThreats, value: String(totalThreats), icon: AlertTriangle, change: totalThreats > 0 ? `+${totalThreats}` : '0', spark: sparkThreats, color: '#ef4444', sparkType: 'area' as const },
  ];

  const exportDashboardPdf = useCallback(() => {
    const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const projectLabel = selectedProjectId === 'all' ? 'All Projects' : filteredProjects[0]?.name || 'Project';
    let html = `<html><head><style>*{margin:0;padding:0;box-sizing:border-box}body{font-family:Arial,sans-serif;color:#1a1a2e;padding:40px}h1{font-size:22px;margin-bottom:4px}.subtitle{font-size:12px;color:#666;margin-bottom:28px}.kpi-grid{display:grid;grid-template-columns:repeat(5,1fr);gap:12px;margin-bottom:28px}.kpi{border:1px solid #e2e8f0;border-radius:8px;padding:16px;text-align:center}.kpi-value{font-size:24px;font-weight:700;color:#6d28d9}.kpi-label{font-size:10px;color:#888;text-transform:uppercase;letter-spacing:.5px;margin-top:4px}.section{border:1px solid #e2e8f0;border-radius:8px;padding:16px;margin-bottom:16px;page-break-inside:avoid}.section-title{font-size:14px;font-weight:600;margin-bottom:12px}table{width:100%;border-collapse:collapse;font-size:11px}th{text-align:left;padding:8px;border-bottom:2px solid #e2e8f0;color:#666;text-transform:uppercase;font-size:9px;letter-spacing:.5px}td{padding:8px;border-bottom:1px solid #f1f5f9}.bar-row{display:flex;align-items:center;gap:8px;margin-bottom:8px}.bar-label{font-size:11px;width:80px;font-weight:500}.bar-track{flex:1;height:10px;background:#f1f5f9;border-radius:5px;overflow:hidden}.bar-fill{height:100%;border-radius:5px}.bar-value{font-size:10px;color:#666;width:60px;text-align:right}.stride-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:8px}.stride-item{display:flex;align-items:center;gap:8px;padding:8px;border:1px solid #f1f5f9;border-radius:6px}.stride-dot{width:10px;height:10px;border-radius:50%}.stride-name{font-size:11px}.stride-count{font-size:14px;font-weight:700;margin-left:auto}@media print{body{padding:20px}.section{break-inside:avoid}}</style></head><body>`;
    html += `<h1>Dashboard Report — ${projectLabel}</h1><p class="subtitle">Generated on ${now} · ${filteredProjects.length} project(s) · ${filteredControls.length} controls</p>`;
    html += `<div class="kpi-grid">`;
    for (const kpi of kpis) html += `<div class="kpi"><div class="kpi-value">${kpi.value}</div><div class="kpi-label">${kpi.label}</div></div>`;
    html += `</div><div class="section"><div class="section-title">Review Status Breakdown</div>`;
    for (const item of reviewStatusData) {
      const pct = filteredControls.length > 0 ? Math.round((item.value / filteredControls.length) * 100) : 0;
      html += `<div class="bar-row"><span class="bar-label">${item.name}</span><div class="bar-track"><div class="bar-fill" style="width:${pct}%;background:${item.color}"></div></div><span class="bar-value">${item.value} (${pct}%)</span></div>`;
    }
    html += `</div><div class="section"><div class="section-title">Threat Distribution by STRIDE</div><div class="stride-grid">`;
    for (const s of strideData) html += `<div class="stride-item"><span class="stride-dot" style="background:${s.color}"></span><span class="stride-name">${s.label}</span><span class="stride-count">${s.count}</span></div>`;
    html += `</div></div><div class="section"><div class="section-title">Projects</div><table><thead><tr><th>Name</th><th>Technology</th><th>Status</th><th>Controls</th><th>Confidence</th><th>Updated</th></tr></thead><tbody>`;
    for (const p of filteredProjects) html += `<tr><td style="font-weight:500">${p.name}</td><td>${p.technology}</td><td>${p.status}</td><td>${p.control_count || 0}</td><td>${p.avg_confidence ? `${p.avg_confidence}%` : '—'}</td><td>${new Date(p.updated_at).toLocaleDateString()}</td></tr>`;
    html += `</tbody></table></div></body></html>`;
    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.onload = () => w.print(); }
    toast({ title: '📄 PDF Export', description: 'Print dialog opened with dashboard report' });
  }, [filteredProjects, filteredControls, kpis, reviewStatusData, strideData, selectedProjectId, toast]);

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn} transition={{ duration: 0.5 }} className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-4">
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-3xl lg:text-4xl font-display font-semibold tracking-tight text-foreground">
              {t.dashboard.welcome}, <span className="gold-gradient-text">{userName}</span>
            </h1>
            <p className="text-sm text-muted-foreground mt-1">{t.dashboard.subtitle}</p>
          </div>
          <HelpButton section="dashboard" />
        </div>
        {!loading && projects.length > 1 && (
          <div className="flex items-center gap-2 bg-card border border-border rounded-lg px-3 py-2 shadow-sm">
            <Filter className="h-4 w-4 text-muted-foreground shrink-0" />
            <select
              value={selectedProjectId}
              onChange={(e) => setSelectedProjectId(e.target.value)}
              className="bg-transparent text-sm text-foreground border-none outline-none cursor-pointer appearance-none pr-6"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='12' height='12' viewBox='0 0 24 24' fill='none' stroke='%239ca3af' stroke-width='2'%3E%3Cpath d='m6 9 6 6 6-6'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 0 center' }}
            >
              <option value="all">All Projects</option>
              {projects.map(p => (
                <option key={p.id} value={p.id}>{p.name}</option>
              ))}
            </select>
          </div>
        )}
      </motion.div>

      {/* KPIs with sparklines */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
          {[1, 2, 3, 4, 5].map(i => <KPICardSkeleton key={i} />)}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4"
          initial="hidden" animate="visible" variants={{ visible: { transition: { staggerChildren: 0.08 } } }}
        >
          {kpis.map((kpi) => (
            <motion.div
              key={kpi.label}
              variants={fadeIn}
              className="bg-card border border-border rounded-lg p-5 shadow-premium hover:shadow-premium-lg transition-shadow duration-300 overflow-hidden"
            >
              <div className="flex items-center justify-between mb-1">
                <kpi.icon className="h-5 w-5 text-primary/70" />
                <span className="text-[11px] font-medium text-success tracking-wide">{kpi.change}</span>
              </div>
              <p className="text-2xl font-display font-semibold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground">{kpi.label}</p>
              <Sparkline data={kpi.spark} color={kpi.color} type={kpi.sparkType} />
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Quick actions */}
      <div className="flex gap-3 flex-wrap">
        <Button asChild className="gold-gradient text-primary-foreground hover:opacity-90 transition-opacity">
          <Link to="/new-project"><Plus className="h-4 w-4 mr-2" />{t.dashboard.createBaseline}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/export-import"><Download className="h-4 w-4 mr-2" />{t.dashboard.importProject}</Link>
        </Button>
        <Button variant="outline" onClick={exportDashboardPdf}>
          <FileText className="h-4 w-4 mr-2" />Export PDF
        </Button>
      </div>

      {/* Trend Charts */}
      {loading ? (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          <TrendChartSkeleton />
          <TrendChartSkeleton />
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 lg:grid-cols-2 gap-6"
          initial="hidden" animate="visible" variants={fadeIn} transition={{ delay: 0.25 }}
        >
          {/* Controls Evolution */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-premium">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-sm font-display font-semibold text-foreground">{t.dashboard.trends.controls}</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
                  {(['7d', '30d', '90d'] as TrendPeriod[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setControlsPeriod(p)}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded transition-all ${controlsPeriod === p ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {t.dashboard.trends[`period${p.toUpperCase()}` as 'period7d' | 'period30d' | 'period90d']}
                    </button>
                  ))}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[160px]">
                    <DropdownMenuItem onClick={() => exportChartAsPng(controlsChartRef, `controls-trend-${controlsPeriod}`)}>
                      <Image className="h-3.5 w-3.5 mr-2" />{t.dashboard.trends.exportPng}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportChartAsCsv(trendDataMap[controlsPeriod], ['day', 'approved', 'pending', 'rejected'], `controls-trend-${controlsPeriod}`)}>
                      <FileSpreadsheet className="h-3.5 w-3.5 mr-2" />{t.dashboard.trends.exportCsv}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            {/* Series toggles */}
            <div className="flex items-center gap-3 mb-3">
              {([
                { key: 'approved' as const, color: '#10b981', label: t.dashboard.trends.showApproved },
                { key: 'pending' as const, color: '#f59e0b', label: t.dashboard.trends.showPending },
                { key: 'rejected' as const, color: '#ef4444', label: t.dashboard.trends.showRejected },
              ]).map(s => (
                <button
                  key={s.key}
                  onClick={() => toggleSeries(s.key)}
                  className={`flex items-center gap-1.5 text-[10px] font-medium transition-all ${visibleSeries[s.key] ? 'text-foreground' : 'text-muted-foreground/40'}`}
                >
                  <span className="inline-block w-2 h-2 rounded-full shrink-0 transition-opacity" style={{ backgroundColor: s.color, opacity: visibleSeries[s.key] ? 1 : 0.25 }} />
                  {s.label}
                </button>
              ))}
            </div>
            <div className="h-[200px]" ref={controlsChartRef}>
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={trendDataMap[controlsPeriod]} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="gradApproved" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#10b981" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#10b981" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradPending" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#f59e0b" stopOpacity={0.3} />
                      <stop offset="100%" stopColor="#f59e0b" stopOpacity={0} />
                    </linearGradient>
                    <linearGradient id="gradRejected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="0%" stopColor="#ef4444" stopOpacity={0.2} />
                      <stop offset="100%" stopColor="#ef4444" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={controlsPeriod === '90d' ? 13 : controlsPeriod === '30d' ? 4 : 0} />
                  <YAxis tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                  <Tooltip content={<CustomTooltip />} />
                  {visibleSeries.approved && <Area type="monotone" dataKey="approved" name={t.dashboard.trends.showApproved} stroke="#10b981" strokeWidth={2} fill="url(#gradApproved)" dot={false} />}
                  {visibleSeries.pending && <Area type="monotone" dataKey="pending" name={t.dashboard.trends.showPending} stroke="#f59e0b" strokeWidth={1.5} fill="url(#gradPending)" dot={false} />}
                  {visibleSeries.rejected && <Area type="monotone" dataKey="rejected" name={t.dashboard.trends.showRejected} stroke="#ef4444" strokeWidth={1.5} fill="url(#gradRejected)" dot={false} />}
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Confidence Trend */}
          <div className="bg-card border border-border rounded-lg p-5 shadow-premium">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-sm font-display font-semibold text-foreground">{t.dashboard.trends.confidence}</h3>
              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-muted/50 rounded-md p-0.5">
                  {(['7d', '30d', '90d'] as TrendPeriod[]).map(p => (
                    <button
                      key={p}
                      onClick={() => setConfidencePeriod(p)}
                      className={`px-2.5 py-1 text-[10px] font-medium rounded transition-all ${confidencePeriod === p ? 'bg-primary text-primary-foreground shadow-sm' : 'text-muted-foreground hover:text-foreground'}`}
                    >
                      {t.dashboard.trends[`period${p.toUpperCase()}` as 'period7d' | 'period30d' | 'period90d']}
                    </button>
                  ))}
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-1 rounded hover:bg-muted/50 text-muted-foreground hover:text-foreground transition-colors">
                      <MoreVertical className="h-3.5 w-3.5" />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="min-w-[160px]">
                    <DropdownMenuItem onClick={() => exportChartAsPng(confidenceChartRef, `confidence-trend-${confidencePeriod}`)}>
                      <Image className="h-3.5 w-3.5 mr-2" />{t.dashboard.trends.exportPng}
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => exportChartAsCsv(trendDataMap[confidencePeriod], ['day', 'confidence'], `confidence-trend-${confidencePeriod}`)}>
                      <FileSpreadsheet className="h-3.5 w-3.5 mr-2" />{t.dashboard.trends.exportCsv}
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>
            </div>
            <div className="h-[200px]" ref={confidenceChartRef}>
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={trendDataMap[confidencePeriod]} margin={{ top: 5, right: 5, left: -20, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                  <XAxis dataKey="day" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} interval={confidencePeriod === '90d' ? 13 : confidencePeriod === '30d' ? 4 : 0} />
                  <YAxis domain={[78, 96]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                  <Tooltip content={<CustomTooltip />} />
                  <Line type="monotone" dataKey="confidence" name={t.dashboard.trends.confidence} stroke="hsl(var(--primary))" strokeWidth={2.5} dot={confidencePeriod === '7d' ? { r: 3, fill: 'hsl(var(--primary))', strokeWidth: 0 } : false} activeDot={{ r: 5, fill: 'hsl(var(--primary))', strokeWidth: 2, stroke: 'hsl(var(--background))' }} />
                </LineChart>
              </ResponsiveContainer>
            </div>
          </div>
        </motion.div>
      )}

      {/* STRIDE Threat Distribution */}
      {!loading && (
        <motion.div initial="hidden" animate="visible" variants={fadeIn} transition={{ delay: 0.35 }}>
          <div className="bg-card border border-border rounded-lg p-5 shadow-premium">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-display font-semibold text-foreground">{t.dashboard.stride.title}</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {t.dashboard.stride.totalThreats}: {totalThreats}
                </p>
              </div>
              <p className="text-[10px] text-muted-foreground/60 italic">Click a category to filter in Baseline Editor</p>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="h-[220px] cursor-pointer">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={strideData} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} horizontal={false} />
                    <XAxis type="number" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis type="category" dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} width={110} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-premium text-xs">
                            <p className="font-semibold text-foreground">{d.label}</p>
                            <p className="text-muted-foreground">{d.count} threats</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18} className="cursor-pointer" onClick={(data: any) => { if (data?.category) handleStrideClick(data.category); }}>
                      {strideData.map((entry) => (
                        <Cell key={entry.category} fill={entry.color} fillOpacity={0.85} className="cursor-pointer hover:opacity-80 transition-opacity" />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Radar Chart */}
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={strideData} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="hsl(var(--border))" opacity={0.5} />
                    <PolarAngleAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))', cursor: 'pointer' }} onClick={(e: any) => { const match = strideData.find(d => d.label === e?.value); if (match) handleStrideClick(match.category); }} />
                    <PolarRadiusAxis tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} />
                    <Radar dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} dot={{ r: 4, fill: 'hsl(var(--primary))', cursor: 'pointer' }} activeDot={{ r: 6, fill: 'hsl(var(--primary))', cursor: 'pointer', onClick: (e: any, payload: any) => { if (payload?.payload?.category) handleStrideClick(payload.payload.category); } }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Review Status Breakdown */}
      {!loading && filteredControls.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeIn} transition={{ delay: 0.4 }}>
          <div className="bg-card border border-border rounded-lg p-5 shadow-premium">
            <h3 className="text-sm font-display font-semibold text-foreground mb-4">Review Status Breakdown</h3>
            <div className="grid grid-cols-1 lg:grid-cols-[240px_1fr] gap-6 items-center">
              <div className="h-[200px]">
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={reviewStatusData}
                      cx="50%"
                      cy="50%"
                      innerRadius={55}
                      outerRadius={85}
                      paddingAngle={3}
                      dataKey="value"
                      strokeWidth={0}
                    >
                      {reviewStatusData.map((entry) => (
                        <Cell key={entry.name} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-premium text-xs">
                            <p className="font-semibold text-foreground">{d.name}</p>
                            <p className="text-muted-foreground">{d.value} controls ({filteredControls.length > 0 ? Math.round((d.value / filteredControls.length) * 100) : 0}%)</p>
                          </div>
                        );
                      }}
                    />
                  </PieChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {reviewStatusData.map((item) => {
                  const pct = filteredControls.length > 0 ? Math.round((item.value / filteredControls.length) * 100) : 0;
                  return (
                    <div key={item.name} className="flex items-center gap-3">
                      <span className="inline-block w-3 h-3 rounded-full shrink-0" style={{ backgroundColor: item.color }} />
                      <span className="text-sm text-foreground font-medium w-20">{item.name}</span>
                      <div className="flex-1 h-2 bg-muted/50 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-700" style={{ width: `${pct}%`, backgroundColor: item.color }} />
                      </div>
                      <span className="text-xs text-muted-foreground tabular-nums w-16 text-right">{item.value} ({pct}%)</span>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Confidence Evolution Across Baseline Versions */}
      {!loading && confidenceEvolutionData.length > 0 && (
        <motion.div initial="hidden" animate="visible" variants={fadeIn} transition={{ delay: 0.45 }}>
          <div className="bg-card border border-border rounded-lg p-5 shadow-premium">
            <div className="flex items-center justify-between mb-4">
              <div>
                <h3 className="text-sm font-display font-semibold text-foreground">Confidence Evolution Across Versions</h3>
                <p className="text-[10px] text-muted-foreground mt-0.5">
                  {selectedProjectId === 'all' ? 'Latest version per project' : 'Average confidence per baseline version'}
                  {' · '}{confidenceEvolutionData.length} data points
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-[1fr_200px] gap-6 items-center">
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={confidenceEvolutionData} margin={{ top: 5, right: 20, left: -10, bottom: 0 }}>
                    <defs>
                      <linearGradient id="gradConfEvo" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="hsl(var(--primary))" stopOpacity={0.9} />
                        <stop offset="100%" stopColor="hsl(var(--primary))" stopOpacity={0.4} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" opacity={0.5} />
                    <XAxis dataKey="label" tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} />
                    <YAxis domain={[0, 100]} tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} tickLine={false} tickFormatter={(v) => `${v}%`} />
                    <Tooltip
                      content={({ active, payload }) => {
                        if (!active || !payload?.length) return null;
                        const d = payload[0].payload;
                        return (
                          <div className="bg-popover border border-border rounded-lg px-3 py-2 shadow-premium text-xs">
                            <p className="font-semibold text-foreground">{d.project}</p>
                            <p className="text-muted-foreground">{d.label} · {d.date}</p>
                            <p className="text-primary font-semibold mt-1">{d.confidence}% confidence</p>
                            <p className="text-muted-foreground">{d.controls} controls</p>
                          </div>
                        );
                      }}
                    />
                    <Bar dataKey="confidence" fill="url(#gradConfEvo)" radius={[4, 4, 0, 0]} barSize={32} />
                  </BarChart>
                </ResponsiveContainer>
              </div>
              <div className="space-y-3">
                {confidenceEvolutionData.map((d, i) => (
                  <div key={i} className="flex items-center gap-2">
                    <span className="text-xs font-mono text-primary font-semibold w-8">{d.label}</span>
                    <div className="flex-1 h-1.5 bg-muted/50 rounded-full overflow-hidden">
                      <div className="h-full rounded-full bg-primary transition-all duration-700" style={{ width: `${d.confidence}%` }} />
                    </div>
                    <span className="text-[10px] text-muted-foreground tabular-nums w-10 text-right">{d.confidence}%</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-[1fr_340px] gap-6">
        {/* Recent Projects */}
        {loading ? (
          <div className="space-y-4">
            <h2 className="text-lg font-display font-semibold text-foreground">{t.dashboard.recentProjects}</h2>
            <TableSkeleton rows={5} columns={6} />
          </div>
        ) : (
          <motion.div initial="hidden" animate="visible" variants={fadeIn} transition={{ delay: 0.3 }}>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-lg font-display font-semibold text-foreground">{t.dashboard.recentProjects}</h2>
              <Link to="/sources" className="text-xs text-primary hover:underline">{t.dashboard.viewAll}</Link>
            </div>

            <div className="bg-card border border-border rounded-lg overflow-hidden shadow-premium">
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b border-border bg-muted/30">
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.project.name}</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.dashboard.technology}</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.dashboard.status}</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.dashboard.controls}</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.dashboard.confidence}</th>
                      <th className="text-left py-3 px-4 text-xs font-medium text-muted-foreground uppercase tracking-wider">{t.dashboard.lastUpdated}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredProjects.map((proj) => (
                      <tr key={proj.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer">
                        <td className="py-3 px-4 font-medium text-foreground">{proj.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{proj.technology}</td>
                        <td className="py-3 px-4"><StatusBadge status={proj.status as any} type="project" /></td>
                        <td className="py-3 px-4 text-muted-foreground tabular-nums">{proj.control_count || 0}</td>
                        <td className="py-3 px-4">{(proj.avg_confidence || 0) > 0 ? <ConfidenceScore score={proj.avg_confidence || 0} /> : <span className="text-muted-foreground text-xs">—</span>}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{new Date(proj.updated_at).toLocaleDateString()}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </motion.div>
        )}

        {/* Activity Timeline */}
        <div>
          <h2 className="text-lg font-display font-semibold text-foreground mb-4">{t.dashboard.recentActivity}</h2>
          <div className="bg-card border border-border rounded-lg p-5 shadow-premium">
            {loading ? (
              <ActivityTimelineSkeleton />
            ) : (
              <div className="relative">
                <div className="absolute left-[15px] top-2 bottom-2 w-px bg-border" />
                <div className="space-y-5">
                  {mockActivities.map((activity, i) => {
                    const actionCfg = actionIcons[activity.action];
                    const ActionIcon = actionCfg.icon;
                    return (
                      <motion.div
                        key={activity.id}
                        initial={{ opacity: 0, x: -8 }}
                        animate={{ opacity: 1, x: 0 }}
                        transition={{ delay: 0.4 + i * 0.05 }}
                        className="flex items-start gap-3 relative"
                      >
                        <Avatar className="h-8 w-8 shrink-0 relative z-10 border-2 border-background">
                          <AvatarFallback className={`${activity.user.color} text-white text-[10px] font-semibold`}>
                            {activity.user.initials}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs leading-relaxed">
                            <span className="font-semibold text-foreground">{activity.user.name}</span>{' '}
                            <span className="text-muted-foreground">{t.dashboard.activity[activity.action]}</span>{' '}
                            <span className="font-medium text-foreground/80">{activity.target}</span>
                          </p>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            <ActionIcon className={`h-3 w-3 ${actionCfg.class}`} />
                            <span className="text-[10px] text-muted-foreground/70">
                              {formatTimeAgo(activity.timestamp, t)}
                            </span>
                          </div>
                        </div>
                      </motion.div>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
