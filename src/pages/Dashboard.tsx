import React, { useState, useEffect, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { mockProjects, mockControls } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import ConfidenceScore from '@/components/ConfidenceScore';
import { KPICardSkeleton, TableSkeleton } from '@/components/skeletons/SkeletonPremium';
import { Plus, Download, Shield, BarChart3, Layers, TrendingUp, CheckCircle2, XCircle, Eye, Edit3, FolderPlus, RotateCcw, FileDown, MessageSquare, Image, FileSpreadsheet, MoreVertical } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { AreaChart, Area, LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, BarChart, Bar, RadarChart, Radar, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Cell } from 'recharts';
import { useToast } from '@/hooks/use-toast';
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

function computeStrideData(t: any) {
  const counts: Record<StrideCategory, number> = {
    spoofing: 0, tampering: 0, repudiation: 0,
    information_disclosure: 0, denial_of_service: 0, elevation_of_privilege: 0,
  };
  for (const ctrl of mockControls) {
    for (const ts of ctrl.threatScenarios) {
      counts[ts.strideCategory]++;
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
  const [loading, setLoading] = useState(true);
  const [controlsPeriod, setControlsPeriod] = useState<TrendPeriod>('7d');
  const [confidencePeriod, setConfidencePeriod] = useState<TrendPeriod>('7d');
  const [visibleSeries, setVisibleSeries] = useState({ approved: true, pending: true, rejected: true });
  const controlsChartRef = useRef<HTMLDivElement>(null);
  const confidenceChartRef = useRef<HTMLDivElement>(null);

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
    // Draw background
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

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const kpis = [
    { label: t.dashboard.totalProjects, value: '5', icon: Layers, change: '+2', spark: sparkProjects, color: 'hsl(var(--primary))', sparkType: 'bar' as const },
    { label: t.dashboard.activeBaselines, value: '3', icon: Shield, change: '+1', spark: sparkBaselines, color: '#10b981', sparkType: 'area' as const },
    { label: t.dashboard.controlsGenerated, value: '181', icon: BarChart3, change: '+47', spark: sparkControls, color: '#3b82f6', sparkType: 'area' as const },
    { label: t.dashboard.avgConfidence, value: '91%', icon: TrendingUp, change: '+3%', spark: sparkConfidence, color: '#f59e0b', sparkType: 'area' as const },
  ];

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-8">
      {/* Welcome */}
      <motion.div initial="hidden" animate="visible" variants={fadeIn} transition={{ duration: 0.5 }}>
        <h1 className="text-3xl lg:text-4xl font-display font-semibold tracking-tight text-foreground">
          {t.dashboard.welcome}, <span className="gold-gradient-text">Helena</span>
        </h1>
        <p className="text-sm text-muted-foreground mt-1">{t.dashboard.subtitle}</p>
      </motion.div>

      {/* KPIs with sparklines */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <KPICardSkeleton key={i} />)}
        </div>
      ) : (
        <motion.div
          className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
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
      <div className="flex gap-3">
        <Button asChild className="gold-gradient text-primary-foreground hover:opacity-90 transition-opacity">
          <Link to="/new-project"><Plus className="h-4 w-4 mr-2" />{t.dashboard.createBaseline}</Link>
        </Button>
        <Button variant="outline" asChild>
          <Link to="/export-import"><Download className="h-4 w-4 mr-2" />{t.dashboard.importProject}</Link>
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
                  {t.dashboard.stride.totalThreats}: {computeStrideData(t).reduce((sum, d) => sum + d.count, 0)}
                </p>
              </div>
            </div>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
              {/* Bar Chart */}
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={computeStrideData(t)} layout="vertical" margin={{ top: 0, right: 20, left: 10, bottom: 0 }}>
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
                    <Bar dataKey="count" radius={[0, 4, 4, 0]} barSize={18}>
                      {computeStrideData(t).map((entry) => (
                        <Cell key={entry.category} fill={entry.color} fillOpacity={0.85} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </div>
              {/* Radar Chart */}
              <div className="h-[220px]">
                <ResponsiveContainer width="100%" height="100%">
                  <RadarChart data={computeStrideData(t)} cx="50%" cy="50%" outerRadius="70%">
                    <PolarGrid stroke="hsl(var(--border))" opacity={0.5} />
                    <PolarAngleAxis dataKey="label" tick={{ fontSize: 9, fill: 'hsl(var(--muted-foreground))' }} />
                    <PolarRadiusAxis tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }} axisLine={false} />
                    <Radar dataKey="count" stroke="hsl(var(--primary))" fill="hsl(var(--primary))" fillOpacity={0.2} strokeWidth={2} dot={{ r: 3, fill: 'hsl(var(--primary))' }} />
                  </RadarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Two-column layout: Projects + Activity */}
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
                    {mockProjects.map((proj) => (
                      <tr key={proj.id} className="border-b border-border/50 hover:bg-muted/20 transition-colors cursor-pointer">
                        <td className="py-3 px-4 font-medium text-foreground">{proj.name}</td>
                        <td className="py-3 px-4 text-muted-foreground">{proj.technology}</td>
                        <td className="py-3 px-4"><StatusBadge status={proj.status} type="project" /></td>
                        <td className="py-3 px-4 text-muted-foreground tabular-nums">{proj.controlCount}</td>
                        <td className="py-3 px-4">{proj.avgConfidence > 0 ? <ConfidenceScore score={proj.avgConfidence} /> : <span className="text-muted-foreground text-xs">—</span>}</td>
                        <td className="py-3 px-4 text-xs text-muted-foreground">{new Date(proj.updatedAt).toLocaleDateString()}</td>
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
