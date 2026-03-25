import React from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { mockControls } from '@/data/mockData';
import ConfidenceScore from '@/components/ConfidenceScore';
import InfoTooltip from '@/components/InfoTooltip';
import { GitBranch, FileText, Globe, Link2 } from 'lucide-react';

const Traceability: React.FC = () => {
  const { t } = useI18n();

  return (
    <div className="p-6 lg:p-8 max-w-6xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.nav.traceability}</h1>
        <p className="text-sm text-muted-foreground mt-1 flex items-center gap-1">
          {t.editor.traceability} <InfoTooltip content={t.tooltips.traceability} />
        </p>
      </div>

      <div className="space-y-4">
        {mockControls.map((control, i) => (
          <motion.div
            key={control.id}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.05 }}
            className="bg-card border border-border rounded-lg p-5 shadow-premium"
          >
            <div className="flex items-start justify-between mb-4">
              <div>
                <span className="text-xs font-mono text-primary/70">{control.controlId}</span>
                <h3 className="text-sm font-semibold text-foreground mt-0.5">{control.title}</h3>
              </div>
              <ConfidenceScore score={control.confidenceScore} size="md" />
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
              <span>{control.sourceTraceability.length} correlated sources</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default Traceability;
