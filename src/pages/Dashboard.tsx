import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { mockProjects } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import ConfidenceScore from '@/components/ConfidenceScore';
import { KPICardSkeleton, TableSkeleton } from '@/components/skeletons/SkeletonPremium';
import { Plus, Download, Shield, BarChart3, Layers, TrendingUp, CheckCircle2, XCircle, Eye, Edit3, FolderPlus, RotateCcw, FileDown, MessageSquare } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';

const fadeIn = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

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

const Dashboard: React.FC = () => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  const kpis = [
    { label: t.dashboard.totalProjects, value: '5', icon: Layers, change: '+2' },
    { label: t.dashboard.activeBaselines, value: '3', icon: Shield, change: '+1' },
    { label: t.dashboard.controlsGenerated, value: '181', icon: BarChart3, change: '+47' },
    { label: t.dashboard.avgConfidence, value: '91%', icon: TrendingUp, change: '+3%' },
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

      {/* KPIs */}
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
              className="bg-card border border-border rounded-lg p-5 shadow-premium hover:shadow-premium-lg transition-shadow duration-300"
            >
              <div className="flex items-center justify-between mb-3">
                <kpi.icon className="h-5 w-5 text-primary/70" />
                <span className="text-[11px] font-medium text-success tracking-wide">{kpi.change}</span>
              </div>
              <p className="text-2xl font-display font-semibold text-foreground">{kpi.value}</p>
              <p className="text-xs text-muted-foreground mt-1">{kpi.label}</p>
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
