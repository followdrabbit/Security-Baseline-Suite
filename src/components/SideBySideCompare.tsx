import React, { useMemo, useState } from 'react';
import { PieChart, Pie, Cell, ResponsiveContainer, Tooltip as RechartsTooltip } from 'recharts';
import { motion } from 'framer-motion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription } from '@/components/ui/dialog';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import StatusBadge from '@/components/StatusBadge';
import { useI18n } from '@/contexts/I18nContext';
import { Columns3, Plus, Minus, ArrowLeftRight, ArrowRight, FileText, Search, Download, Shield } from 'lucide-react';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Input } from '@/components/ui/input';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

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
  const [search, setSearch] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState<string>('all');

  const exportPdf = () => {
    const now = new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' });
    const changeColors: Record<string, { border: string; bg: string; label: string }> = {
      added: { border: '#10b981', bg: '#ecfdf5', label: 'Added' },
      removed: { border: '#ef4444', bg: '#fef2f2', label: 'Removed' },
      modified: { border: '#f59e0b', bg: '#fffbeb', label: 'Modified' },
      unchanged: { border: '#e2e8f0', bg: '#ffffff', label: 'Unchanged' },
    };

    const renderControl = (c: ControlSnapshot | undefined, changeType: string, side: 'left' | 'right') => {
      if (!c) return `<td style="padding:8px;border:1px dashed #e2e8f0;color:#999;text-align:center;vertical-align:middle">—</td>`;
      const color = changeColors[changeType];
      const highlightField = (field: string) => {
        const other = side === 'left' ? rightMap.get(c.control_id) : leftMap.get(c.control_id);
        if (!other || !c) return '';
        return c[field] !== other[field] ? `color:${side === 'left' ? '#d97706' : '#059669'};font-weight:600` : '';
      };
      return `<td style="padding:10px;border-left:3px solid ${color.border};background:${color.bg};vertical-align:top">
        <div style="font-size:9px;color:#888;font-family:monospace;margin-bottom:2px">${c.control_id} ${c.criticality ? `· <strong>${c.criticality.toUpperCase()}</strong>` : ''}</div>
        <div style="font-size:12px;font-weight:600;margin-bottom:4px;${highlightField('title')}">${c.title}</div>
        ${c.description ? `<div style="font-size:10px;color:#666;margin-bottom:4px;${highlightField('description')}">${c.description}</div>` : ''}
        <div style="font-size:9px;color:#888">${c.review_status || ''} ${c.category ? `· ${c.category}` : ''}</div>
      </td>`;
    };

    let rows = '';
    for (const id of filteredIds) {
      const left = leftMap.get(id);
      const right = rightMap.get(id);
      const ct = getChangeType(id);
      rows += `<tr>${renderControl(left, ct, 'left')}${renderControl(right, ct, 'right')}</tr>`;
    }

    const html = `<html><head><style>
      *{margin:0;padding:0;box-sizing:border-box}
      body{font-family:Arial,sans-serif;color:#1a1a2e;padding:30px}
      h1{font-size:20px;margin-bottom:4px}
      .sub{font-size:11px;color:#666;margin-bottom:20px}
      .summary{display:flex;gap:16px;margin-bottom:20px;font-size:11px}
      .summary span{padding:3px 10px;border-radius:12px;font-weight:600}
      table{width:100%;border-collapse:collapse;table-layout:fixed}
      th{padding:8px;text-align:left;font-size:10px;text-transform:uppercase;color:#666;border-bottom:2px solid #e2e8f0;letter-spacing:.5px}
      td{word-wrap:break-word}
      tr{page-break-inside:avoid}
      @media print{body{padding:15px}}
    </style></head><body>
      <h1>Side-by-Side Comparison</h1>
      <p class="sub">Version ${leftVersion.version} → Version ${rightVersion.version} · Generated ${now}</p>
      <div class="summary">
        <span style="background:#ecfdf5;color:#059669">+ ${added.length} Added</span>
        <span style="background:#fef2f2;color:#dc2626">− ${removed.length} Removed</span>
        <span style="background:#fffbeb;color:#d97706">↔ ${modified.length} Modified</span>
        <span style="background:#f8fafc;color:#666">= ${unchanged.length} Unchanged</span>
      </div>
      <table>
        <thead><tr><th style="width:50%">Version ${leftVersion.version} (${leftVersion.controls.length} controls)</th><th style="width:50%">Version ${rightVersion.version} (${rightVersion.controls.length} controls)</th></tr></thead>
        <tbody>${rows}</tbody>
      </table>
    </body></html>`;

    const w = window.open('', '_blank');
    if (w) { w.document.write(html); w.document.close(); w.onload = () => w.print(); }
  };

  const exportCsv = () => {
    const esc = (v: string | undefined) => {
      if (!v) return '';
      const s = v.replace(/"/g, '""');
      return s.includes(',') || s.includes('"') || s.includes('\n') ? `"${s}"` : s;
    };
    const headers = ['Change Type', 'Control ID',
      `Title (v${leftVersion.version})`, `Title (v${rightVersion.version})`,
      `Description (v${leftVersion.version})`, `Description (v${rightVersion.version})`,
      `Criticality (v${leftVersion.version})`, `Criticality (v${rightVersion.version})`,
      `Status (v${leftVersion.version})`, `Status (v${rightVersion.version})`,
      `Category (v${leftVersion.version})`, `Category (v${rightVersion.version})`];
    const rows = [headers.join(',')];
    for (const id of allIds) {
      const l = leftMap.get(id);
      const r = rightMap.get(id);
      const ct = getChangeType(id);
      rows.push([ct, id,
        esc(l?.title), esc(r?.title),
        esc(l?.description), esc(r?.description),
        esc(l?.criticality), esc(r?.criticality),
        esc(l?.review_status), esc(r?.review_status),
        esc(l?.category), esc(r?.category),
      ].join(','));
    }
    const blob = new Blob(['\uFEFF' + rows.join('\n')], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `comparison_v${leftVersion.version}_v${rightVersion.version}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

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

  const criticalities = useMemo(() => {
    const set = new Set<string>();
    [...leftVersion.controls, ...rightVersion.controls].forEach(c => {
      if (c.criticality) set.add(c.criticality);
    });
    return Array.from(set).sort();
  }, [leftVersion, rightVersion]);

  const filteredIds = useMemo(() => {
    let ids: string[];
    switch (filter) {
      case 'added': ids = added; break;
      case 'removed': ids = removed; break;
      case 'modified': ids = modified; break;
      case 'unchanged': ids = unchanged; break;
      default: ids = allIds;
    }
    if (criticalityFilter !== 'all') {
      ids = ids.filter(id => {
        const l = leftMap.get(id);
        const r = rightMap.get(id);
        return l?.criticality === criticalityFilter || r?.criticality === criticalityFilter;
      });
    }
    if (!search.trim()) return ids;
    const q = search.toLowerCase();
    return ids.filter(id => {
      const l = leftMap.get(id);
      const r = rightMap.get(id);
      return (l?.title?.toLowerCase().includes(q) || l?.control_id?.toLowerCase().includes(q) ||
              r?.title?.toLowerCase().includes(q) || r?.control_id?.toLowerCase().includes(q));
    });
  }, [filter, search, criticalityFilter, allIds, added, removed, modified, unchanged, leftMap, rightMap]);

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

  const DiffTooltip: React.FC<{ left?: ControlSnapshot; right?: ControlSnapshot; field: string; label: string; children: React.ReactNode }> = ({ left, right, field, label, children }) => {
    if (!isFieldChanged(left, right, field)) return <>{children}</>;
    return (
      <Tooltip>
        <TooltipTrigger asChild><span className="cursor-help border-b border-dashed border-current">{children}</span></TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs space-y-1">
          <p className="font-semibold text-muted-foreground">{label}</p>
          <p className="text-red-400 line-through">{left?.[field] || '—'}</p>
          <p className="text-emerald-400">{right?.[field] || '—'}</p>
        </TooltipContent>
      </Tooltip>
    );
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-6xl max-h-[90vh] p-0 overflow-hidden border-border/50 shadow-2xl">
        <TooltipProvider delayDuration={200}>
        <div className="p-6 pb-4 border-b border-border/50">
          <DialogHeader>
            <div className="flex items-center gap-3 mb-1">
              <div className="h-10 w-10 rounded-full gold-gradient flex items-center justify-center">
                <Columns3 className="h-5 w-5 text-primary-foreground" />
              </div>
              <div className="flex-1">
                <DialogTitle className="text-lg font-display font-semibold">
                  {t.history.sideBySide.title}
                </DialogTitle>
                <DialogDescription className="text-xs text-muted-foreground">
                  {t.history.sideBySide.subtitle}
                </DialogDescription>
              </div>
              <Button variant="outline" size="sm" onClick={exportCsv}>
                <Download className="h-3.5 w-3.5 mr-1.5" />CSV
              </Button>
              <Button variant="outline" size="sm" onClick={exportPdf}>
                <FileText className="h-3.5 w-3.5 mr-1.5" />PDF
              </Button>
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

          {/* Summary statistics with donut chart */}
          <div className="flex items-center gap-4 mt-4 rounded-lg border border-border/50 bg-muted/10 p-3">
            <div className="w-24 h-24 shrink-0">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={[
                      { name: t.history.diff.added, value: added.length, color: '#10b981' },
                      { name: t.history.diff.removed, value: removed.length, color: '#ef4444' },
                      { name: t.history.diff.modified, value: modified.length, color: '#f59e0b' },
                      { name: 'Unchanged', value: unchanged.length, color: '#94a3b8' },
                    ].filter(d => d.value > 0)}
                    cx="50%" cy="50%"
                    innerRadius={24} outerRadius={40}
                    paddingAngle={3}
                    dataKey="value"
                    strokeWidth={0}
                    isAnimationActive={true}
                    animationBegin={200}
                    animationDuration={800}
                    animationEasing="ease-out"
                  >
                    {[
                      { color: '#10b981' },
                      { color: '#ef4444' },
                      { color: '#f59e0b' },
                      { color: '#94a3b8' },
                    ].filter((_, i) => [added.length, removed.length, modified.length, unchanged.length][i] > 0)
                      .map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                  </Pie>
                  <RechartsTooltip
                    contentStyle={{ fontSize: '11px', borderRadius: '8px', border: 'none', boxShadow: '0 4px 12px rgba(0,0,0,0.15)' }}
                  />
                  <text x="50%" y="50%" textAnchor="middle" dominantBaseline="middle" className="fill-foreground text-sm font-bold">
                    {allIds.length}
                  </text>
                </PieChart>
              </ResponsiveContainer>
            </div>
            <div className="grid grid-cols-2 gap-x-6 gap-y-2 flex-1">
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                <span className="text-xs text-muted-foreground">{t.history.diff.added}</span>
                <span className="text-sm font-bold text-emerald-600 dark:text-emerald-400 ml-auto">{added.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-red-500" />
                <span className="text-xs text-muted-foreground">{t.history.diff.removed}</span>
                <span className="text-sm font-bold text-red-600 dark:text-red-400 ml-auto">{removed.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                <span className="text-xs text-muted-foreground">{t.history.diff.modified}</span>
                <span className="text-sm font-bold text-amber-600 dark:text-amber-400 ml-auto">{modified.length}</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-2.5 h-2.5 rounded-full bg-slate-400" />
                <span className="text-xs text-muted-foreground">Unchanged</span>
                <span className="text-sm font-bold text-foreground ml-auto">{unchanged.length}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3 mt-4">
            <Tabs value={filter} onValueChange={(v) => setFilter(v as FilterTab)} className="flex-1">
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
            <Select value={criticalityFilter} onValueChange={setCriticalityFilter}>
              <SelectTrigger className="h-8 w-36 text-xs">
                <Shield className="h-3.5 w-3.5 mr-1.5 text-muted-foreground" />
                <SelectValue placeholder="Criticality" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all" className="text-xs">All Criticalities</SelectItem>
                {criticalities.map(c => (
                  <SelectItem key={c} value={c} className="text-xs capitalize">{c}</SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative w-48">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
              <Input
                placeholder="Search controls..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 text-xs"
              />
            </div>
          </div>
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
                        <DiffTooltip left={left} right={right} field="title" label="Title">
                          <p className={`text-xs font-medium mb-1 ${isFieldChanged(left, right, 'title') ? 'text-amber-600 dark:text-amber-400' : 'text-foreground'}`}>
                            {left.title}
                          </p>
                        </DiffTooltip>
                        {left.description && (
                          <DiffTooltip left={left} right={right} field="description" label="Description">
                            <p className={`text-[11px] line-clamp-2 ${isFieldChanged(left, right, 'description') ? 'text-amber-500/80' : 'text-muted-foreground'}`}>
                              {left.description}
                            </p>
                          </DiffTooltip>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {left.review_status && (
                            <DiffTooltip left={left} right={right} field="review_status" label="Review Status">
                              <Badge variant="outline" className={`text-[9px] ${isFieldChanged(left, right, 'review_status') ? 'border-amber-500/50 text-amber-600' : ''}`}>
                                {left.review_status}
                              </Badge>
                            </DiffTooltip>
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
                        <DiffTooltip left={left} right={right} field="title" label="Title">
                          <p className={`text-xs font-medium mb-1 ${isFieldChanged(left, right, 'title') ? 'text-emerald-600 dark:text-emerald-400' : 'text-foreground'}`}>
                            {right.title}
                          </p>
                        </DiffTooltip>
                        {right.description && (
                          <DiffTooltip left={left} right={right} field="description" label="Description">
                            <p className={`text-[11px] line-clamp-2 ${isFieldChanged(left, right, 'description') ? 'text-emerald-500/80' : 'text-muted-foreground'}`}>
                              {right.description}
                            </p>
                          </DiffTooltip>
                        )}
                        <div className="flex items-center gap-2 mt-2">
                          {right.review_status && (
                            <DiffTooltip left={left} right={right} field="review_status" label="Review Status">
                              <Badge variant="outline" className={`text-[9px] ${isFieldChanged(left, right, 'review_status') ? 'border-emerald-500/50 text-emerald-600' : ''}`}>
                                {right.review_status}
                              </Badge>
                            </DiffTooltip>
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
        </TooltipProvider>
      </DialogContent>
    </Dialog>
  );
};

export default SideBySideCompare;
