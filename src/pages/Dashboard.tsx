import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { mockProjects } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import ConfidenceScore from '@/components/ConfidenceScore';
import { KPICardSkeleton, TableSkeleton } from '@/components/skeletons/SkeletonPremium';
import { Plus, Download, Shield, BarChart3, Layers, TrendingUp } from 'lucide-react';
import { Button } from '@/components/ui/button';

const fadeIn = { hidden: { opacity: 0, y: 12 }, visible: { opacity: 1, y: 0 } };

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

      {/* Recent Projects */}
      {loading ? (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-display font-semibold text-foreground">{t.dashboard.recentProjects}</h2>
          </div>
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
    </div>
  );
};

export default Dashboard;
