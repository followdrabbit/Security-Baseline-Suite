import React, { useState, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import StatusBadge from '@/components/StatusBadge';
import { useI18n } from '@/contexts/I18nContext';
import {
  GitCompare, ArrowRight, Plus, Minus, ArrowLeftRight, ChevronDown, ChevronRight,
  Filter, Search,
} from 'lucide-react';
import { Input } from '@/components/ui/input';
import { motion, AnimatePresence } from 'framer-motion';

interface VersionEntry {
  id: string;
  version: number;
  published_at: string | null;
  control_count: number;
  controls_snapshot: any[];
}

interface ControlSnap {
  control_id: string;
  title: string;
  description?: string;
  criticality?: string;
  review_status?: string;
  category?: string;
  applicability?: string;
  security_risk?: string;
  automation?: string;
  default_behavior_limitations?: string;
  framework_mappings?: string[];
  references?: string[];
  reviewer_notes?: string;
  confidence_score?: number;
}

type ChangeType = 'added' | 'removed' | 'modified';

interface ControlDiff {
  controlId: string;
  title: string;
  changeType: ChangeType;
  criticality?: string;
  fieldChanges?: { field: string; before: string; after: string }[];
}

const COMPARE_FIELDS: { key: keyof ControlSnap; label: string }[] = [
  { key: 'title', label: 'Title' },
  { key: 'description', label: 'Description' },
  { key: 'criticality', label: 'Criticality' },
  { key: 'review_status', label: 'Review Status' },
  { key: 'applicability', label: 'Applicability' },
  { key: 'security_risk', label: 'Security Risk' },
  { key: 'automation', label: 'Automation' },
  { key: 'default_behavior_limitations', label: 'Default Behavior' },
  { key: 'reviewer_notes', label: 'Reviewer Notes' },
];

function computeVersionDiff(oldControls: ControlSnap[], newControls: ControlSnap[]): ControlDiff[] {
  const oldMap = new Map(oldControls.map(c => [c.control_id, c]));
  const newMap = new Map(newControls.map(c => [c.control_id, c]));
  const diffs: ControlDiff[] = [];

  // Added
  for (const [cid, ctrl] of newMap) {
    if (!oldMap.has(cid)) {
      diffs.push({ controlId: cid, title: ctrl.title, changeType: 'added', criticality: ctrl.criticality });
    }
  }

  // Removed
  for (const [cid, ctrl] of oldMap) {
    if (!newMap.has(cid)) {
      diffs.push({ controlId: cid, title: ctrl.title, changeType: 'removed', criticality: ctrl.criticality });
    }
  }

  // Modified
  for (const [cid, newCtrl] of newMap) {
    const oldCtrl = oldMap.get(cid);
    if (!oldCtrl) continue;

    const fieldChanges: { field: string; before: string; after: string }[] = [];
    for (const { key, label } of COMPARE_FIELDS) {
      const oldVal = String(oldCtrl[key] || '');
      const newVal = String(newCtrl[key] || '');
      if (oldVal !== newVal) {
        fieldChanges.push({ field: label, before: oldVal, after: newVal });
      }
    }

    // Compare framework mappings
    const oldFm = (oldCtrl.framework_mappings || []).join(', ');
    const newFm = (newCtrl.framework_mappings || []).join(', ');
    if (oldFm !== newFm) {
      fieldChanges.push({ field: 'Framework Mappings', before: oldFm, after: newFm });
    }

    if (fieldChanges.length > 0) {
      diffs.push({ controlId: cid, title: newCtrl.title, changeType: 'modified', criticality: newCtrl.criticality, fieldChanges });
    }
  }

  return diffs;
}

const changeConfig: Record<ChangeType, { icon: React.ElementType; color: string; bg: string; border: string }> = {
  added: { icon: Plus, color: 'text-success', bg: 'bg-success/10', border: 'border-success/20' },
  removed: { icon: Minus, color: 'text-destructive', bg: 'bg-destructive/10', border: 'border-destructive/20' },
  modified: { icon: ArrowLeftRight, color: 'text-warning', bg: 'bg-warning/10', border: 'border-warning/20' },
};

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  versions: VersionEntry[];
  liveControls?: any[];
}

const VersionCompareModal: React.FC<Props> = ({ open, onOpenChange, versions, liveControls }) => {
  const { t } = useI18n();
  const [leftId, setLeftId] = useState<string>('');
  const [rightId, setRightId] = useState<string>('');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [filterType, setFilterType] = useState<'all' | ChangeType>('all');
  const [searchText, setSearchText] = useState('');

  // Build entries including Live option
  const allEntries: VersionEntry[] = useMemo(() => {
    const live: VersionEntry | null = liveControls ? {
      id: '__live__',
      version: 0,
      published_at: null,
      control_count: liveControls.length,
      controls_snapshot: liveControls.map((c: any) => ({
        control_id: c.controlId || c.control_id,
        title: c.title,
        description: c.description,
        criticality: c.criticality,
        review_status: c.reviewStatus || c.review_status,
        category: c.category,
        applicability: c.applicability,
        security_risk: c.securityRisk || c.security_risk,
        automation: c.automation,
        default_behavior_limitations: c.defaultBehaviorLimitations || c.default_behavior_limitations,
        framework_mappings: c.frameworkMappings || c.framework_mappings,
        references: c.references,
        reviewer_notes: c.reviewerNotes || c.reviewer_notes,
        confidence_score: c.confidenceScore || c.confidence_score,
      })),
    } : null;
    return live ? [...versions, live] : [...versions];
  }, [versions, liveControls]);

  // Auto-select
  React.useEffect(() => {
    if (allEntries.length >= 2 && !leftId && !rightId) {
      const published = allEntries.filter(v => v.id !== '__live__');
      if (published.length >= 1) {
        setLeftId(published[published.length - 1].id);
        setRightId(allEntries[0].id === '__live__' ? '__live__' : published[0].id);
      }
    }
  }, [allEntries, leftId, rightId]);

  const leftVersion = allEntries.find(v => v.id === leftId);
  const rightVersion = allEntries.find(v => v.id === rightId);

  const diffs = useMemo(() => {
    if (!leftVersion || !rightVersion) return [];
    const oldControls = (Array.isArray(leftVersion.controls_snapshot) ? leftVersion.controls_snapshot : []) as ControlSnap[];
    const newControls = (Array.isArray(rightVersion.controls_snapshot) ? rightVersion.controls_snapshot : []) as ControlSnap[];
    return computeVersionDiff(oldControls, newControls);
  }, [leftVersion, rightVersion]);

  const filteredDiffs = useMemo(() => {
    return diffs.filter(d => {
      if (filterType !== 'all' && d.changeType !== filterType) return false;
      if (searchText && !d.title.toLowerCase().includes(searchText.toLowerCase()) && !d.controlId.toLowerCase().includes(searchText.toLowerCase())) return false;
      return true;
    });
  }, [diffs, filterType, searchText]);

  const counts = useMemo(() => ({
    added: diffs.filter(d => d.changeType === 'added').length,
    removed: diffs.filter(d => d.changeType === 'removed').length,
    modified: diffs.filter(d => d.changeType === 'modified').length,
  }), [diffs]);

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[85vh] p-0 overflow-hidden border-border/50 shadow-2xl">
        {/* Header */}
        <div className="p-6 pb-4 border-b border-border/50 space-y-4">
          <DialogHeader>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full gold-gradient flex items-center justify-center">
                <GitCompare className="h-5 w-5 text-primary-foreground" />
              </div>
              <div>
                <DialogTitle className="text-lg font-display font-semibold">
                  {t.versioning.compareTitle}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {t.versioning.compareDesc}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          {/* Version selectors */}
          <div className="flex items-center gap-3">
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t.versioning.compareFrom}</p>
              <Select value={leftId} onValueChange={setLeftId}>
                <SelectTrigger>
                  <SelectValue placeholder={t.versioning.selectVersion} />
                </SelectTrigger>
                <SelectContent>
                  {allEntries.map(v => (
                    <SelectItem key={v.id} value={v.id} disabled={v.id === rightId}>
                      {v.id === '__live__' ? `Live (${v.control_count} ${t.versioning.controlsCount})` : `v${v.version} — ${v.published_at ? new Date(v.published_at).toLocaleDateString() : ''} (${v.control_count} ${t.versioning.controlsCount})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <ArrowRight className="h-5 w-5 text-primary shrink-0 mt-4" />
            <div className="flex-1">
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground mb-1">{t.versioning.compareTo}</p>
              <Select value={rightId} onValueChange={setRightId}>
                <SelectTrigger>
                  <SelectValue placeholder={t.versioning.selectVersion} />
                </SelectTrigger>
                <SelectContent>
                  {allEntries.map(v => (
                    <SelectItem key={v.id} value={v.id} disabled={v.id === leftId}>
                      {v.id === '__live__' ? `Live (${v.control_count} ${t.versioning.controlsCount})` : `v${v.version} — ${v.published_at ? new Date(v.published_at).toLocaleDateString() : ''} (${v.control_count} ${t.versioning.controlsCount})`}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Summary badges + filters */}
          {leftVersion && rightVersion && (
            <div className="flex items-center gap-3 flex-wrap">
              {(['added', 'removed', 'modified'] as const).map(type => {
                const cfg = changeConfig[type];
                const Icon = cfg.icon;
                const isActive = filterType === type;
                return (
                  <button
                    key={type}
                    onClick={() => setFilterType(prev => prev === type ? 'all' : type)}
                    className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border transition-all ${
                      isActive ? `${cfg.bg} ${cfg.border} ring-1 ring-current/20` : `${cfg.bg} ${cfg.border} opacity-70 hover:opacity-100`
                    }`}
                  >
                    <Icon className={`h-3 w-3 ${cfg.color}`} />
                    <span className={`text-xs font-medium ${cfg.color}`}>
                      {counts[type]} {t.versioning[`compare${type.charAt(0).toUpperCase() + type.slice(1)}` as keyof typeof t.versioning] as string}
                    </span>
                  </button>
                );
              })}
              <div className="relative ml-auto">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
                <Input
                  placeholder={t.versioning.compareSearch}
                  value={searchText}
                  onChange={e => setSearchText(e.target.value)}
                  className="h-8 pl-8 w-[200px] text-xs"
                />
              </div>
            </div>
          )}
        </div>

        {/* Diff entries */}
        <ScrollArea className="max-h-[calc(85vh-280px)]">
          <div className="p-4 space-y-2">
            {!leftVersion || !rightVersion ? (
              <div className="text-center py-12 text-sm text-muted-foreground">
                {t.versioning.compareSelectBoth}
              </div>
            ) : filteredDiffs.length === 0 ? (
              <div className="text-center py-12">
                <GitCompare className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
                <p className="text-sm text-muted-foreground">{t.versioning.compareNoChanges}</p>
              </div>
            ) : (
              filteredDiffs.map((entry, i) => {
                const cfg = changeConfig[entry.changeType];
                const Icon = cfg.icon;
                const isExpanded = expandedIds.includes(entry.controlId);
                const hasDetails = entry.changeType === 'modified' && entry.fieldChanges && entry.fieldChanges.length > 0;

                return (
                  <motion.div
                    key={entry.controlId}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: i * 0.02 }}
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
                        {t.versioning[`compare${entry.changeType.charAt(0).toUpperCase() + entry.changeType.slice(1)}` as keyof typeof t.versioning] as string}
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
                          <div className="p-4">
                            <div className="rounded-md border border-border/30 overflow-hidden">
                              <div className="grid grid-cols-[140px_1fr_1fr] gap-0 text-[10px] uppercase tracking-wider text-muted-foreground bg-muted/20 px-3 py-2 border-b border-border/30">
                                <span>{t.versioning.compareField}</span>
                                <span>{leftVersion.id === '__live__' ? 'Live' : `v${leftVersion.version}`} ({t.versioning.compareFrom})</span>
                                <span>{rightVersion.id === '__live__' ? 'Live' : `v${rightVersion.version}`} ({t.versioning.compareTo})</span>
                              </div>
                              {entry.fieldChanges!.map((fc, j) => (
                                <div key={j} className="grid grid-cols-[140px_1fr_1fr] gap-0 px-3 py-2.5 border-b border-border/20 last:border-b-0">
                                  <span className="text-xs font-medium text-muted-foreground">{fc.field}</span>
                                  <span className="text-xs text-destructive/80 pr-2 break-words">
                                    {fc.before || '—'}
                                  </span>
                                  <span className="text-xs text-success/90 break-words">
                                    {fc.after || '—'}
                                  </span>
                                </div>
                              ))}
                            </div>
                          </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </motion.div>
                );
              })
            )}
          </div>
        </ScrollArea>
      </DialogContent>
    </Dialog>
  );
};

export default VersionCompareModal;
