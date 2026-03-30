import React from 'react';
import { motion } from 'framer-motion';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { X, ArrowLeftRight, Equal, Minus, Plus } from 'lucide-react';
import { TemplateVersion } from '@/hooks/useTemplateVersions';
import { format } from 'date-fns';

interface RuleMeta {
  id: string;
  icon: React.ElementType;
  labelKey: string;
}

interface VersionComparePanelProps {
  versionA: TemplateVersion;
  versionB: TemplateVersion;
  sections: RuleMeta[];
  labels: Record<string, string>;
  defaults: Record<string, string>;
  onClose: () => void;
}

const VersionComparePanel: React.FC<VersionComparePanelProps> = ({
  versionA,
  versionB,
  sections,
  labels,
  defaults,
  onClose,
}) => {
  const allKeys = sections.map(s => s.id);
  const diffs = allKeys.filter(
    k => (versionA.snapshot[k] ?? defaults[k]) !== (versionB.snapshot[k] ?? defaults[k])
  );
  const same = allKeys.filter(
    k => (versionA.snapshot[k] ?? defaults[k]) === (versionB.snapshot[k] ?? defaults[k])
  );

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.2 }}
      className="overflow-hidden mb-6"
    >
      <div className="bg-card border border-border rounded-xl shadow-premium overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-border/50 bg-muted/20">
          <div className="flex items-center gap-3">
            <ArrowLeftRight className="h-4 w-4 text-primary" />
            <h3 className="text-sm font-semibold text-foreground">Version Comparison</h3>
            <Badge variant="secondary" className="text-[10px]">
              {diffs.length} difference{diffs.length !== 1 ? 's' : ''}
            </Badge>
          </div>
          <Button variant="ghost" size="sm" onClick={onClose} className="h-7 w-7 p-0">
            <X className="h-4 w-4" />
          </Button>
        </div>

        {/* Column Headers */}
        <div className="grid grid-cols-[180px_1fr_1fr] border-b border-border/50 bg-muted/10">
          <div className="px-4 py-3 text-xs font-semibold text-muted-foreground uppercase tracking-wider">
            Rule
          </div>
          <div className="px-4 py-3 text-xs font-semibold text-primary border-l border-border/30 truncate" title={versionA.label}>
            {versionA.label}
            <span className="block text-[10px] text-muted-foreground font-normal">
              {format(new Date(versionA.created_at), 'MMM d, yyyy HH:mm')}
            </span>
          </div>
          <div className="px-4 py-3 text-xs font-semibold text-primary border-l border-border/30 truncate" title={versionB.label}>
            {versionB.label}
            <span className="block text-[10px] text-muted-foreground font-normal">
              {format(new Date(versionB.created_at), 'MMM d, yyyy HH:mm')}
            </span>
          </div>
        </div>

        {/* Diff rows */}
        <div className="max-h-[400px] overflow-y-auto divide-y divide-border/30">
          {diffs.length === 0 && (
            <div className="flex items-center justify-center py-8 text-sm text-muted-foreground gap-2">
              <Equal className="h-4 w-4" /> Both versions are identical
            </div>
          )}
          {diffs.map(ruleId => {
            const section = sections.find(s => s.id === ruleId);
            if (!section) return null;
            const Icon = section.icon;
            const valA = versionA.snapshot[ruleId] ?? defaults[ruleId];
            const valB = versionB.snapshot[ruleId] ?? defaults[ruleId];
            const isDefaultA = valA === defaults[ruleId];
            const isDefaultB = valB === defaults[ruleId];

            return (
              <div key={ruleId} className="grid grid-cols-[180px_1fr_1fr] hover:bg-muted/20 transition-colors">
                <div className="px-4 py-3 flex items-start gap-2">
                  <Icon className="h-3.5 w-3.5 text-primary shrink-0 mt-0.5" />
                  <span className="text-xs font-medium text-foreground leading-tight">
                    {labels[section.labelKey] || section.labelKey}
                  </span>
                </div>
                <div className="px-4 py-3 border-l border-border/30">
                  <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {valA}
                  </div>
                  {isDefaultA && (
                    <Badge variant="outline" className="text-[9px] mt-1.5 bg-muted/30 text-muted-foreground border-border/50">default</Badge>
                  )}
                </div>
                <div className="px-4 py-3 border-l border-border/30">
                  <div className="text-xs text-foreground leading-relaxed whitespace-pre-wrap line-clamp-4">
                    {valB}
                  </div>
                  {isDefaultB && (
                    <Badge variant="outline" className="text-[9px] mt-1.5 bg-muted/30 text-muted-foreground border-border/50">default</Badge>
                  )}
                </div>
              </div>
            );
          })}

          {/* Identical rules (collapsed) */}
          {same.length > 0 && diffs.length > 0 && (
            <details className="group">
              <summary className="px-4 py-3 text-xs text-muted-foreground cursor-pointer hover:text-foreground transition-colors flex items-center gap-2">
                <Equal className="h-3.5 w-3.5" />
                {same.length} identical rule{same.length !== 1 ? 's' : ''}
              </summary>
              {same.map(ruleId => {
                const section = sections.find(s => s.id === ruleId);
                if (!section) return null;
                const Icon = section.icon;
                const val = versionA.snapshot[ruleId] ?? defaults[ruleId];
                return (
                  <div key={ruleId} className="grid grid-cols-[180px_1fr_1fr] opacity-50">
                    <div className="px-4 py-2 flex items-start gap-2">
                      <Icon className="h-3.5 w-3.5 text-muted-foreground shrink-0 mt-0.5" />
                      <span className="text-xs text-muted-foreground leading-tight">
                        {labels[section.labelKey] || section.labelKey}
                      </span>
                    </div>
                    <div className="px-4 py-2 border-l border-border/30 text-xs text-muted-foreground line-clamp-2">
                      {val}
                    </div>
                    <div className="px-4 py-2 border-l border-border/30 text-xs text-muted-foreground line-clamp-2">
                      {val}
                    </div>
                  </div>
                );
              })}
            </details>
          )}
        </div>
      </div>
    </motion.div>
  );
};

export default VersionComparePanel;
