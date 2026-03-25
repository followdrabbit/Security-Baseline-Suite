import React, { useState, useEffect, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { mockControls } from '@/data/mockData';
import ConfidenceScore from '@/components/ConfidenceScore';
import InfoTooltip from '@/components/InfoTooltip';
import { TraceabilityCardSkeleton } from '@/components/skeletons/SkeletonPremium';
import { GitBranch, FileText, Globe, Link2, X, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Tooltip,
} from 'recharts';

// Extract unique framework prefixes from all controls
const FRAMEWORK_COLORS: Record<string, string> = {
  'CIS': '#8b5cf6',
  'NIST': '#3b82f6',
  'ISO': '#10b981',
  'SOC': '#f59e0b',
  'PCI': '#ef4444',
  'Other': '#6b7280',
};

const getFrameworkPrefix = (mapping: string): string => {
  if (mapping.startsWith('CIS')) return 'CIS';
  if (mapping.startsWith('NIST')) return 'NIST';
  if (mapping.startsWith('ISO')) return 'ISO';
  if (mapping.startsWith('SOC')) return 'SOC';
  if (mapping.startsWith('PCI')) return 'PCI';
  return 'Other';
};

const Traceability: React.FC = () => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [selectedFramework, setSelectedFramework] = useState<string | null>(null);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1400);
    return () => clearTimeout(timer);
  }, []);

  // Compute framework coverage data for radar chart
  const frameworkData = useMemo(() => {
    const counts: Record<string, Set<string>> = {};
    for (const control of mockControls) {
      for (const mapping of control.frameworkMappings) {
        const prefix = getFrameworkPrefix(mapping);
        if (!counts[prefix]) counts[prefix] = new Set();
        counts[prefix].add(control.id);
      }
    }
    return Object.entries(counts)
      .map(([framework, controlSet]) => ({
        framework,
        controls: controlSet.size,
        fullMark: mockControls.length,
        color: FRAMEWORK_COLORS[framework] || FRAMEWORK_COLORS['Other'],
      }))
      .sort((a, b) => b.controls - a.controls);
  }, []);

  // Filter controls by selected framework
  const filteredControls = useMemo(() => {
    if (!selectedFramework) return mockControls;
    return mockControls.filter(c =>
      c.frameworkMappings.some(m => getFrameworkPrefix(m) === selectedFramework)
    );
  }, [selectedFramework]);

  const handleFrameworkClick = (framework: string) => {
    setSelectedFramework(prev => prev === framework ? null : framework);
  };

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.traceabilityPage.title}</h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
          {t.traceabilityPage.subtitle} <InfoTooltip content={t.tooltips.traceability} />
        </p>
      </div>

      {/* Framework Coverage Radar Chart */}
      {!loading && (
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="bg-card border border-border rounded-lg p-5 shadow-premium"
        >
          <div className="flex items-center justify-between mb-4">
            <div>
              <h3 className="text-sm font-display font-semibold text-foreground">
                {t.traceabilityPage.frameworkCoverage}
              </h3>
              <p className="text-[10px] text-muted-foreground mt-0.5">
                {t.traceabilityPage.frameworkCoverageDesc}
              </p>
            </div>
            <p className="text-[10px] text-muted-foreground/60 italic">
              {t.traceabilityPage.clickToFilter}
            </p>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Radar Chart */}
            <div className="h-[280px]">
              <ResponsiveContainer width="100%" height="100%">
                <RadarChart data={frameworkData} cx="50%" cy="50%" outerRadius="70%">
                  <PolarGrid stroke="hsl(var(--border))" opacity={0.5} />
                  <PolarAngleAxis
                    dataKey="framework"
                    tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))', cursor: 'pointer' }}
                    onClick={(e: any) => {
                      const match = frameworkData.find(d => d.framework === e?.value);
                      if (match) handleFrameworkClick(match.framework);
                    }}
                  />
                  <PolarRadiusAxis
                    tick={{ fontSize: 8, fill: 'hsl(var(--muted-foreground))' }}
                    axisLine={false}
                    domain={[0, mockControls.length]}
                  />
                  <Radar
                    dataKey="controls"
                    stroke="hsl(var(--primary))"
                    fill="hsl(var(--primary))"
                    fillOpacity={0.2}
                    strokeWidth={2}
                    dot={{
                      r: 5,
                      fill: 'hsl(var(--primary))',
                      cursor: 'pointer',
                    }}
                    activeDot={{
                      r: 7,
                      fill: 'hsl(var(--primary))',
                      cursor: 'pointer',
                      onClick: (_e: any, payload: any) => {
                        if (payload?.payload?.framework) handleFrameworkClick(payload.payload.framework);
                      },
                    }}
                  />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (!active || !payload?.length) return null;
                      const d = payload[0].payload;
                      const pct = Math.round((d.controls / mockControls.length) * 100);
                      const relatedControls = mockControls.filter(c =>
                        c.frameworkMappings.some(m => getFrameworkPrefix(m) === d.framework)
                      );
                      const avgConfidence = relatedControls.length
                        ? Math.round(relatedControls.reduce((sum, c) => sum + c.confidenceScore, 0) / relatedControls.length * 100)
                        : 0;
                      return (
                        <div className="bg-popover border border-border rounded-lg px-3.5 py-3 shadow-premium text-xs min-w-[200px]">
                          <div className="flex items-center gap-2 mb-2">
                            <div className="h-2.5 w-2.5 rounded-full shrink-0" style={{ backgroundColor: d.color }} />
                            <p className="font-semibold text-foreground text-sm">{d.framework}</p>
                          </div>
                          <div className="space-y-1.5 mb-2.5">
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">{t.traceabilityPage.controlsMapped}</span>
                              <span className="font-semibold text-foreground">{d.controls} / {mockControls.length}</span>
                            </div>
                            <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                              <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: d.color }} />
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Coverage</span>
                              <span className="font-semibold text-foreground">{pct}%</span>
                            </div>
                            <div className="flex justify-between">
                              <span className="text-muted-foreground">Avg. Confidence</span>
                              <span className="font-semibold text-foreground">{avgConfidence}%</span>
                            </div>
                          </div>
                          <div className="border-t border-border pt-2">
                            <p className="text-[10px] text-muted-foreground mb-1 font-medium">Top controls:</p>
                            <div className="space-y-0.5">
                              {relatedControls.slice(0, 3).map(c => (
                                <div key={c.id} className="flex items-center gap-1.5">
                                  <span className="text-[10px] font-mono text-primary/70">{c.controlId}</span>
                                  <span className="text-[10px] text-foreground/70 truncate">{c.title}</span>
                                </div>
                              ))}
                              {relatedControls.length > 3 && (
                                <span className="text-[10px] text-muted-foreground/60">+{relatedControls.length - 3} more</span>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    }}
                  />
                </RadarChart>
              </ResponsiveContainer>
            </div>

            {/* Framework Legend / Stats */}
            <div className="flex flex-col justify-center space-y-3">
              {frameworkData.map((fw) => (
                <button
                  key={fw.framework}
                  onClick={() => handleFrameworkClick(fw.framework)}
                  className={`flex items-center gap-3 px-4 py-2.5 rounded-lg border transition-all text-left ${
                    selectedFramework === fw.framework
                      ? 'border-primary/40 bg-primary/10'
                      : 'border-border/50 bg-muted/20 hover:bg-muted/40'
                  }`}
                >
                  <div
                    className="h-3 w-3 rounded-full shrink-0"
                    style={{ backgroundColor: fw.color }}
                  />
                  <span className="text-sm font-semibold text-foreground flex-1">{fw.framework}</span>
                  <span className="text-xs text-muted-foreground">
                    {fw.controls} / {mockControls.length}
                  </span>
                  <div className="w-16 h-1.5 bg-muted rounded-full overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{
                        width: `${(fw.controls / mockControls.length) * 100}%`,
                        backgroundColor: fw.color,
                      }}
                    />
                  </div>
                </button>
              ))}
              <div className="text-[10px] text-muted-foreground/50 pt-1">
                {t.traceabilityPage.totalControls}: {mockControls.length}
              </div>
            </div>
          </div>
        </motion.div>
      )}

      {/* Active filter indicator */}
      <AnimatePresence>
        {selectedFramework && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="flex items-center gap-3 px-4 py-2.5 rounded-lg border border-primary/20 bg-primary/5"
          >
            <Shield className="h-4 w-4 text-primary/60" />
            <span className="text-sm text-foreground">
              {t.traceabilityPage.filteringBy}:{' '}
              <strong>{selectedFramework}</strong>
            </span>
            <span className="text-xs text-muted-foreground">
              ({filteredControls.length} {t.traceabilityPage.controlsMapped})
            </span>
            <Button
              variant="ghost"
              size="sm"
              className="h-7 px-2.5 text-xs text-muted-foreground hover:text-foreground ml-auto"
              onClick={() => setSelectedFramework(null)}
            >
              <X className="h-3.5 w-3.5 mr-1" />
              {t.traceabilityPage.clearFilter}
            </Button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Control Traceability Cards */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 4 }).map((_, i) => <TraceabilityCardSkeleton key={i} />)
        ) : (
          filteredControls.map((control, i) => (
            <motion.div
              key={control.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.05 }}
              layout
              className="bg-card border border-border rounded-lg p-5 shadow-premium"
            >
              <div className="flex items-start justify-between mb-4">
                <div>
                  <span className="text-xs font-mono text-primary/70">{control.controlId}</span>
                  <h3 className="text-sm font-semibold text-foreground mt-0.5">{control.title}</h3>
                </div>
                <ConfidenceScore score={control.confidenceScore} size="md" />
              </div>

              {/* Framework Mappings */}
              <div className="flex flex-wrap gap-1.5 mb-3">
                {control.frameworkMappings.map((mapping) => {
                  const prefix = getFrameworkPrefix(mapping);
                  const color = FRAMEWORK_COLORS[prefix] || FRAMEWORK_COLORS['Other'];
                  return (
                    <span
                      key={mapping}
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full border"
                      style={{
                        color,
                        borderColor: `${color}33`,
                        backgroundColor: `${color}10`,
                      }}
                    >
                      {mapping}
                    </span>
                  );
                })}
              </div>

              <div className="space-y-2.5">
                {control.sourceTraceability.map((trace) => (
                  <div key={trace.sourceId} className="flex items-start gap-3 bg-muted/20 rounded-lg p-3 border border-border/50">
                    <div className="h-7 w-7 rounded-md bg-accent flex items-center justify-center shrink-0 mt-0.5">
                      {trace.sourceType === 'url' ? <Globe className="h-3.5 w-3.5 text-accent-foreground" /> : <FileText className="h-3.5 w-3.5 text-accent-foreground" />}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-foreground">{trace.sourceName}</span>
                        <ConfidenceScore score={trace.confidence} />
                      </div>
                      <p className="text-xs text-muted-foreground italic leading-relaxed">"{trace.excerpt}"</p>
                      <div className="flex items-center gap-2 mt-1.5">
                        <span className="text-[10px] uppercase text-muted-foreground/60 tracking-wider">{trace.sourceType}</span>
                        <Link2 className="h-3 w-3 text-muted-foreground/40" />
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
                <GitBranch className="h-3.5 w-3.5" />
                <span>{control.sourceTraceability.length} {t.traceabilityPage.correlatedSources}</span>
              </div>
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default Traceability;
