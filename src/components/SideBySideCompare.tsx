import React, { useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/StatusBadge';
import { useI18n } from '@/contexts/I18nContext';
import { Columns3, Plus, Minus, ArrowLeftRight, ArrowRight, FileText } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

interface ControlSnapshot {
  control_id: string;
  title: string;
  description?: string;
  criticality?: string;
  review_status?: string;
  category?: string;
  [key: string]: any;
}

interface VersionData {
  version: number;
  controls: ControlSnapshot[];
}

interface SideBySideCompareProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  leftVersion: VersionData;
  rightVersion: VersionData;
}

type FilterTab = 'all' | 'added' | 'removed' | 'modified' | 'unchanged';

const SideBySideCompare: React.FC<SideBySideCompareProps> = ({
  open,
  onOpenChange,
  leftVersion,
  rightVersion,
}) => {
  const { t } = useI18n();
  const [filter, setFilter] = useState<FilterTab>('all');

  const { allIds, leftMap, rightMap, added, removed, modified, unchanged } = useMemo(() => {
    const lMap = new Map(leftVersion.controls.map(c => [c.control_id, c]));
    const rMap = new Map(rightVersion.controls.map(c => [c.control_id, c]));
    const ids = new Set([...lMap.keys(), ...rMap.keys()]);

    const added: string[] = [];
    const removed: string[] = [];
    const modified: string[] = [];
    const unchanged: string[] = [];

    for (const id of ids) {
      const l = lMap.get(id);
      const r = rMap.get(id);
      if (!l && r) added.push(id);
      else if (l && !r) removed.push(id);
      else if (l && r) {
        const changed = l.title !== r.title || l.description !== r.description ||
          l.criticality !== r.criticality || l.review_status !== r.review_status;
        if (changed) modified.push(id);
        else unchanged.push(id);
      }
    }

    const allIds = [...removed, ...modified, ...unchanged, ...added];
    return { allIds, leftMap: lMap, rightMap: rMap, added, removed, modified, unchanged };
  }, [leftVersion, rightVersion]);

  const filteredIds = useMemo(() => {
    switch (filter) {
      case 'added': return added;
      case 'removed': return removed;
      case 'modified': return modified;
      case 'unchanged': return unchanged;
      default: return allIds;
    }
  }, [filter, allIds, added, removed, modified, unchanged]);

  const getChangeType = (id: string) => {
    if (added.includes(id)) return 'added';
    if (removed.includes(id)) return 'removed';
    if (modified.includes(id)) return 'modified';
    return 'unchanged';
  };

  const changeBorders: Record<string, string> = {
    added: 'border-l-emerald-500',
    removed: 'border-l-red-500',
    modified: 'border-l-amber-500',
    unchanged: 'border-l-border',
  };

  const changeBg: Record<string, string> = {
    added: 'bg-emerald-500/5',
    removed: 'bg-red-500/5',
    modified: 'bg-amber-500/5',
    unchanged: '',
  };

  const isFieldChanged = (left: ControlSnapshot | undefined, right: ControlSnapshot | undefined, field: string) => {
    if (!left || !right) return false;
    return left[field] !== right[field];
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden border-border/50 shadow-2xl">
        <div className="p-6 pb-4 border-b border-border/50">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-full gold-gradient flex items-center justify-center">
                <Columns3 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-lg font-display font-semibold">
                  {t.history.sideBySide.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {t.history.sideBySide.subtitle}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="flex items-center gap-3 mt-4">
            <div className="flex-1 bg-muted/30 rounded-lg p-3 border border-border/50 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">{t.history.sideBySide.leftVersion}</p>
              <p className="text-sm font-semibold text-foreground">{t.history.version} {leftVersion.version}</p>
              <p className="text-[10px] text-muted-foreground">{leftVersion.controls.length} controls</p>
            </div>
            <ArrowRight className="h-4 w-4 text-primary shrink-0" />
            <div className="flex-1 bg-muted/30 rounded-lg p-3 border border-primary/20 text-center">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground/60 mb-0.5">{t.history.sideBySide.rightVersion}</p>
              <p className="text-sm font-semibold text-foreground">{t.history.version} {rightVersion.version}</p>
              <p className="text-[10px] text-muted-foreground">{rightVersion.controls.length} controls</p>
            </div>
          </div>

          <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)} className="mt-4">
            <TabsList className="h-8">
              <TabsTrigger value="all" className="text-xs px-3 h-6">All ({allIds.length})</TabsTrigger>
              <TabsTrigger value="added" className="text-xs px-3 h-6">
                <Plus className="h-3 w-3 mr-1 text-emerald-500" />{t.history.diff.added} ({added.length})
              </TabsTrigger>
              <TabsTrigger value="removed" className="text-xs px-3 h-6">
                <Minus className="h-3 w-3 mr-1 text-red-500" />{t.history.diff.removed} ({removed.length})
              </TabsTrigger>
              <TabsTrigger value="modified" className="text-xs px-3 h-6">
                <ArrowLeftRight className="h-3 w-3 mr-1 text-amber-500" />{t.history.diff.modified} ({modified.length})
              </TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <ScrollArea className="max-h-[calc(90vh-260px)]">
          <div className="p-4 space-y-2">
            <div className="grid grid-cols-2 gap-3 mb-2">
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-3 font-medium">
                {t.history.version} {leftVersion.version}
              </div>
              <div className="text-[10px] uppercase tracking-wider text-muted-foreground/60 px-3 font-medium">
                {t.history.version} {rightVersion.version}
              </div>
            </div>

            {filteredIds.length === 0 && (
              <div className="text-center py-12 text-muted-foreground">
                <p className="text-sm">{t.history.diff.noChanges}</p>
              </div>
            )}

            {filteredIds.map((id, i) => {
              const left = leftMap.get(id);
              const right = rightMap.get(id);
              const changeType = getChangeType(id);

              return (
                <motion.div
                  key={id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.02 }}
                  className="grid grid-cols-2 gap-3"
                >
                  <div className={`rounded-lg border border-l-[3px] ${changeBorders[changeType]} p-3 ${
                    changeType === 'removed' ? changeBg.removed : changeType === 'modified' ? changeBg.modified : 'bg-card'
                  } ${!left ? 'opacity-30 border-dashed' : ''}`}>
                    {left ? (
                      <>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-mono text-muted-foreground">{left.control_id}</span>
                          {left.criticality && <StatusBadge status={left.criticality} type="criticality" />}
                        </div>
                        <p className={`text-xs font-medium mb-1 ${isFieldChanged(left, right, 'title') ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                          {left.title}
                        </p>
                        {left.description && (
                          <p className={`text-[11px] line-clamp-2 ${isFieldChanged(left, right, 'description') ? 'text-amber-500/80' : 'text-muted-foreground'}`}>
                            {left.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {left.review_status && (
                            <Badge variant="outline" className={`text-[9px] ${isFieldChanged(left, right, 'review_status') ? 'border-amber-500/50 text-amber-600' : ''}`}>
                              {left.review_status}
                            </Badge>
                          )}
                          {left.category && (
                            <span className="text-[9px] text-muted-foreground">{left.category}</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center py-4 text-[10px] text-muted-foreground italic">
                        —
                      </div>
                    )}
                  </div>

                  <div className={`rounded-lg border border-l-[3px] ${changeBorders[changeType]} p-3 ${
                    changeType === 'added' ? changeBg.added : changeType === 'modified' ? changeBg.modified : 'bg-card'
                  } ${!right ? 'opacity-30 border-dashed' : ''}`}>
                    {right ? (
                      <>
                        <div className="flex items-center gap-2 mb-1.5">
                          <span className="text-[10px] font-mono text-muted-foreground">{right.control_id}</span>
                          {right.criticality && <StatusBadge status={right.criticality} type="criticality" />}
                        </div>
                        <p className={`text-xs font-medium mb-1 ${isFieldChanged(left, right, 'title') ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                          {right.title}
                        </p>
                        {right.description && (
                          <p className={`text-[11px] line-clamp-2 ${isFieldChanged(left, right, 'description') ? 'text-emerald-500/80' : 'text-muted-foreground'}`}>
                            {right.description}
                          </p>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {right.review_status && (
                            <Badge variant="outline" className={`text-[9px] ${isFieldChanged(left, right, 'review_status') ? 'border-emerald-500/50 text-emerald-600' : ''}`}>
                              {right.review_status}
                            </Badge>
                          )}
                          {right.category && (
                            <span className="text-[9px] text-muted-foreground">{right.category}</span>
                          )}
                        </div>
                      </>
                    ) : (
                      <div className="flex items-center justify-center py-4 text-[10px] text-muted-foreground italic">
                        —
                      </div>
                    )}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default SideBySideCompare;
