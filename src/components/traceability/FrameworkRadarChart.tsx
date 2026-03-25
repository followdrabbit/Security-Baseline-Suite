import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { mockControls } from '@/data/mockData';
import {
  ResponsiveContainer, RadarChart, Radar, PolarGrid,
  PolarAngleAxis, PolarRadiusAxis, Tooltip,
} from 'recharts';
import { FrameworkDatum, getFrameworkPrefix } from './utils';

interface Props {
  frameworkData: FrameworkDatum[];
  selectedFramework: string | null;
  onFrameworkClick: (framework: string) => void;
}

const FrameworkRadarChart: React.FC<Props> = ({ frameworkData, selectedFramework, onFrameworkClick }) => {
  const { t } = useI18n();

  return (
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
                  if (match) onFrameworkClick(match.framework);
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
                dot={{ r: 5, fill: 'hsl(var(--primary))', cursor: 'pointer' }}
                activeDot={{
                  r: 7,
                  fill: 'hsl(var(--primary))',
                  cursor: 'pointer',
                  onClick: (_e: any, payload: any) => {
                    if (payload?.payload?.framework) onFrameworkClick(payload.payload.framework);
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
                    <motion.div
                      initial={{ opacity: 0, y: 6, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      transition={{ duration: 0.2, ease: 'easeOut' }}
                      className="bg-popover border border-border rounded-lg px-3.5 py-3 shadow-premium text-xs min-w-[200px]"
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <motion.div
                          initial={{ scale: 0 }}
                          animate={{ scale: 1 }}
                          transition={{ delay: 0.1, type: 'spring', stiffness: 400, damping: 15 }}
                          className="h-2.5 w-2.5 rounded-full shrink-0"
                          style={{ backgroundColor: d.color }}
                        />
                        <p className="font-semibold text-foreground text-sm">{d.framework}</p>
                      </div>
                      <div className="space-y-1.5 mb-2.5">
                        <div className="flex justify-between">
                          <span className="text-muted-foreground">{t.traceabilityPage.controlsMapped}</span>
                          <span className="font-semibold text-foreground">{d.controls} / {mockControls.length}</span>
                        </div>
                        <div className="w-full h-1.5 bg-muted rounded-full overflow-hidden">
                          <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: `${pct}%` }}
                            transition={{ duration: 0.5, ease: 'easeOut', delay: 0.1 }}
                            className="h-full rounded-full"
                            style={{ backgroundColor: d.color }}
                          />
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
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ delay: 0.15, duration: 0.2 }}
                        className="border-t border-border pt-2"
                      >
                        <p className="text-[10px] text-muted-foreground mb-1 font-medium">Top controls:</p>
                        <div className="space-y-0.5">
                          {relatedControls.slice(0, 3).map((c, idx) => (
                            <motion.div
                              key={c.id}
                              initial={{ opacity: 0, x: -8 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: 0.2 + idx * 0.05, duration: 0.15 }}
                              className="flex items-center gap-1.5"
                            >
                              <span className="text-[10px] font-mono text-primary/70">{c.controlId}</span>
                              <span className="text-[10px] text-foreground/70 truncate">{c.title}</span>
                            </motion.div>
                          ))}
                          {relatedControls.length > 3 && (
                            <span className="text-[10px] text-muted-foreground/60">+{relatedControls.length - 3} more</span>
                          )}
                        </div>
                      </motion.div>
                    </motion.div>
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
              onClick={() => onFrameworkClick(fw.framework)}
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
  );
};

export default FrameworkRadarChart;
