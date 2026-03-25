import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import StatusBadge from '@/components/StatusBadge';
import { useI18n } from '@/contexts/I18nContext';
import {
  Plus, Minus, ArrowLeftRight, ChevronDown, ChevronRight,
  GitCompare, Shield, ArrowRight,
} from 'lucide-react';

export type DiffChangeType = 'added' | 'removed' | 'modified';

export interface FieldChange {
  field: string;
  before?: string;
  after?: string;
}

export interface DiffEntry {
  controlId: string;
  title: string;
  changeType: DiffChangeType;
  criticality?: string;
  fieldChanges?: FieldChange[];
}

interface VersionDiffModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  fromVersion: number;
  toVersion: number;
  diffEntries: DiffEntry[];
}

const changeTypeConfig: Record<DiffChangeType, {
  icon: React.ElementType;
  color: string;
  bg: string;
  border: string;
  label: 'added' | 'removed' | 'modified';
}> = {
  added: { icon: Plus, color: 'text-emerald-400', bg: 'bg-emerald-500/10', border: 'border-emerald-500/20', label: 'added' },
  removed: { icon: Minus, color: 'text-red-400', bg: 'bg-red-500/10', border: 'border-red-500/20', label: 'removed' },
  modified: { icon: ArrowLeftRight, color: 'text-amber-400', bg: 'bg-amber-500/10', border: 'border-amber-500/20', label: 'modified' },
};

const VersionDiffModal: React.FC<VersionDiffModalProps> = ({
  open,
  onOpenChange,
  fromVersion,
  toVersion,
  diffEntries,
}) => {
  const { t } = useI18n();
  const [expandedIds, setExpandedIds] = useState<string[]>([]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const counts = {
    added: diffEntries.filter(d => d.changeType === 'added').length,
    removed: diffEntries.filter(d => d.changeType === 'removed').length,
    modified: diffEntries.filter(d => d.changeType === 'modified').length,
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] p-0 overflow-hidden border-border/50 shadow-2xl">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/50">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-full gold-gradient flex items-center justify-center">
                <GitCompare className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-lg font-display font-semibold">
                  {t.history.diff.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {t.history.diff.subtitle}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Version indicators */}
          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t.history.diff.from}</p>
              <p className="text-sm font-semibold text-foreground">{t.history.version} {fromVersion}</p>
            </div>
            <ArrowRight className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 bg-muted/30 rounded-lg p-3 border border-primary/20 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-0.5">{t.history.diff.to}</p>
              <p className="text-sm font-semibold text-foreground">{t.history.version} {toVersion}</p>
            </div>
          </div>

          {/* Summary badges */}
          <div className="flex items-center gap-3 mt-4">
            <span className="text-xs text-muted-foreground">{t.history.diff.summary}:</span>
            {(['added', 'removed', 'modified'] as const).map(type => {
              const cfg = changeTypeConfig[type];
              const Icon = cfg.icon;
              return (
                <div key={type} className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full ${cfg.bg} border ${cfg.border}`}>
                  <Icon className={`h-3 w-3 ${cfg.color}`} />
                  <span className={`text-xs font-medium ${cfg.color}`}>
                    {counts[type]} {t.history.diff[cfg.label]}
                  </span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Diff entries */}
        <ScrollArea className="max-h-[calc(85vh-220px)]">
          <div className="p-4 space-y-2">
            {diffEntries.map((entry, i) => {
              const cfg = changeTypeConfig[entry.changeType];
              const Icon = cfg.icon;
              const isExpanded = expandedIds.includes(entry.controlId);
              const hasDetails = entry.changeType === 'modified' && entry.fieldChanges && entry.fieldChanges.length > 0;

              return (
                <motion.div
                  key={entry.controlId}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className={`rounded-lg border ${cfg.border} ${cfg.bg} overflow-hidden`}
                >
                  <button
                    className="w-full flex items-center gap-3 p-3.5 text-left hover:bg-background/5 transition-colors"
                    onClick={() => hasDetails && toggleExpand(entry.controlId)}
                  >
                    <div className={`h-7 w-7 rounded-full flex items-center justify-center ${cfg.bg} border ${cfg.border}`}>
                      <Icon className={`h-3.5 w-3.5 ${cfg.color}`} />
                    </div>
                    <span className="text-xs font-mono text-muted-foreground w-24 shrink-0">{entry.controlId}</span>
                    <span className="text-sm font-medium text-foreground flex-1 truncate">{entry.title}</span>
                    {entry.criticality && <StatusBadge status={entry.criticality} type="criticality" />}
                    <Badge variant="outline" className={`text-[10px] ${cfg.color} border-current/30`}>
                      {t.history.diff[cfg.label]}
                    </Badge>
                    {hasDetails && (
                      isExpanded
                        ? <ChevronDown className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                        : <ChevronRight className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                    )}
                  </button>

                  <AnimatePresence>
                    {isExpanded && hasDetails && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: 'auto', opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        transition={{ duration: 0.2 }}
                        className="border-t border-border/30"
                      >
                        <div className="p-4 space-y-2">
                          {/* Field changes table */}
                          <div className="rounded-md border border-border/30 overflow-hidden">
                            <div className="grid grid-cols-[140px_1fr_1fr] gap-0 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/20 px-3 py-2 border-b border-border/30">
                              <span>{t.history.diff.field}</span>
                              <span>{t.history.diff.before}</span>
                              <span>{t.history.diff.after}</span>
                            </div>
                            {entry.fieldChanges!.map((fc, j) => (
                              <div key={j} className="grid grid-cols-[140px_1fr_1fr] gap-0 px-3 py-2.5 border-b border-border/20 last:border-b-0">
                                <span className="text-xs font-medium text-muted-foreground">{fc.field}</span>
                                <span className="text-xs text-red-400/80 line-through pr-2">{fc.before || '—'}</span>
                                <span className="text-xs text-emerald-400/90">{fc.after || '—'}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default VersionDiffModal;
