import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import ConfidenceScore from '@/components/ConfidenceScore';
import { GitBranch, FileText, Globe, Link2 } from 'lucide-react';
import { FRAMEWORK_COLORS, getFrameworkPrefix } from './utils';

interface SourceTrace {
  sourceId: string;
  sourceName: string;
  sourceType: string;
  excerpt: string;
  confidence: number;
}

interface Control {
  id: string;
  controlId: string;
  title: string;
  confidenceScore: number;
  frameworkMappings: string[];
  sourceTraceability: SourceTrace[];
}

interface Props {
  control: Control;
  index: number;
}

const TraceabilityControlCard: React.FC<Props> = ({ control, index }) => {
  const { t } = useI18n();

  return (
    <motion.div
      key={control.id}
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: index * 0.05 }}
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
  );
};

export default TraceabilityControlCard;
