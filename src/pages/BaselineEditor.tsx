import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { mockControls } from '@/data/mockData';
import StatusBadge from '@/components/StatusBadge';
import ConfidenceScore from '@/components/ConfidenceScore';
import InfoTooltip from '@/components/InfoTooltip';
import ConfirmationModal from '@/components/ConfirmationModal';
import { ControlCardSkeleton } from '@/components/skeletons/SkeletonPremium';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, ChevronDown, ChevronRight, CheckCircle2, XCircle, Edit3, Eye, FileText, Shield } from 'lucide-react';
import type { ControlItem } from '@/types';

const BaselineEditor: React.FC = () => {
  const { t } = useI18n();
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [critFilter, setCritFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [expandedIds, setExpandedIds] = useState<string[]>([]);
  const [controls, setControls] = useState<ControlItem[]>(mockControls);

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 1300);
    return () => clearTimeout(timer);
  }, []);

  const filtered = controls.filter(c => {
    if (search && !c.title.toLowerCase().includes(search.toLowerCase()) && !c.controlId.toLowerCase().includes(search.toLowerCase())) return false;
    if (critFilter !== 'all' && c.criticality !== critFilter) return false;
    if (statusFilter !== 'all' && c.reviewStatus !== statusFilter) return false;
    return true;
  });

  const toggleExpand = (id: string) => {
    setExpandedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]);
  };

  const expandAll = () => setExpandedIds(filtered.map(c => c.id));
  const collapseAll = () => setExpandedIds([]);

  const updateStatus = (id: string, status: ControlItem['reviewStatus']) => {
    setControls(prev => prev.map(c => c.id === id ? { ...c, reviewStatus: status } : c));
  };

  return (
    <div className="p-6 lg:p-8 max-w-7xl mx-auto space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">{t.editor.title}</h1>
          <p className="text-sm text-muted-foreground mt-1">{t.editor.subtitle}</p>
        </div>
        <Button size="sm" className="gold-gradient text-primary-foreground hover:opacity-90">
          <CheckCircle2 className="h-4 w-4 mr-1.5" />{t.editor.approveAll}
        </Button>
      </div>

      {/* Filters */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="relative flex-1 min-w-[200px] max-w-md">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input placeholder={t.editor.search} value={search} onChange={e => setSearch(e.target.value)} className="pl-9" />
        </div>
        <Select value={critFilter} onValueChange={setCritFilter}>
          <SelectTrigger className="w-[140px]"><SelectValue placeholder={t.editor.filterCriticality} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.editor.filterCriticality}</SelectItem>
            <SelectItem value="critical">{t.common.critical}</SelectItem>
            <SelectItem value="high">{t.common.high}</SelectItem>
            <SelectItem value="medium">{t.common.medium}</SelectItem>
            <SelectItem value="low">{t.common.low}</SelectItem>
          </SelectContent>
        </Select>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[150px]"><SelectValue placeholder={t.editor.filterStatus} /></SelectTrigger>
          <SelectContent>
            <SelectItem value="all">{t.editor.filterStatus}</SelectItem>
            <SelectItem value="pending">{t.common.pending}</SelectItem>
            <SelectItem value="reviewed">{t.common.reviewed}</SelectItem>
            <SelectItem value="approved">{t.common.approved}</SelectItem>
            <SelectItem value="rejected">{t.common.rejected}</SelectItem>
          </SelectContent>
        </Select>
        <div className="flex gap-2 ml-auto">
          <Button variant="outline" size="sm" onClick={expandAll}><Eye className="h-3.5 w-3.5 mr-1" />{t.editor.expandAll}</Button>
          <Button variant="outline" size="sm" onClick={collapseAll}>{t.editor.collapseAll}</Button>
        </div>
      </div>

      <p className="text-xs text-muted-foreground">{filtered.length} {t.common.items}</p>

      {/* Controls list */}
      <div className="space-y-3">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <ControlCardSkeleton key={i} />)
        ) : filtered.length === 0 ? (
          <div className="bg-card border border-border rounded-lg p-12 text-center shadow-premium">
            <Shield className="h-10 w-10 text-muted-foreground/30 mx-auto mb-3" />
            <p className="text-sm font-medium text-muted-foreground">{t.editor.noControls}</p>
            <p className="text-xs text-muted-foreground/70 mt-1">{t.editor.noControlsDesc}</p>
          </div>
        ) : (
          filtered.map((control) => {
            const isExpanded = expandedIds.includes(control.id);
            return (
              <motion.div
                key={control.id}
                layout
                className="bg-card border border-border rounded-lg shadow-premium overflow-hidden"
              >
                {/* Header */}
                <button
                  className="w-full flex items-center gap-4 p-4 hover:bg-muted/20 transition-colors text-left"
                  onClick={() => toggleExpand(control.id)}
                >
                  {isExpanded ? <ChevronDown className="h-4 w-4 text-muted-foreground shrink-0" /> : <ChevronRight className="h-4 w-4 text-muted-foreground shrink-0" />}
                  <span className="text-xs font-mono text-primary/70 shrink-0 w-24">{control.controlId}</span>
                  <span className="text-sm font-medium text-foreground flex-1 truncate">{control.title}</span>
                  <StatusBadge status={control.criticality} type="criticality" />
                  <StatusBadge status={control.reviewStatus} type="review" />
                  <ConfidenceScore score={control.confidenceScore} />
                </button>

                {/* Expanded content */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      transition={{ duration: 0.2 }}
                      className="border-t border-border"
                    >
                      <div className="p-5 space-y-4">
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                          <Field label={t.editor.description} value={control.description} />
                          <Field label={<span className="flex items-center gap-1">{t.editor.applicability} <InfoTooltip content={t.tooltips.applicability} /></span>} value={control.applicability} />
                          <Field label={t.editor.securityRisk} value={control.securityRisk} />
                          <Field label={t.editor.defaultBehavior} value={control.defaultBehaviorLimitations} />
                          <Field label={t.editor.automation} value={control.automation} />
                          <div>
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                              {t.editor.frameworkMappings} <InfoTooltip content={t.tooltips.frameworkMapping} />
                            </label>
                            <div className="flex flex-wrap gap-1">
                              {control.frameworkMappings.map(m => (
                                <span key={m} className="px-2 py-0.5 bg-accent text-accent-foreground rounded text-[10px] font-medium">{m}</span>
                              ))}
                            </div>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.editor.references}</label>
                            <ul className="space-y-0.5">
                              {control.references.map((ref, i) => (
                                <li key={i} className="text-xs text-foreground/70 flex items-start gap-1.5">
                                  <FileText className="h-3 w-3 mt-0.5 text-muted-foreground shrink-0" />{ref}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <div>
                            <label className="text-xs font-medium text-muted-foreground flex items-center gap-1 mb-1">
                              {t.editor.traceability} <InfoTooltip content={t.tooltips.traceability} />
                            </label>
                            <div className="space-y-2">
                              {control.sourceTraceability.map((st) => (
                                <div key={st.sourceId} className="bg-muted/30 rounded p-2.5 text-xs border border-border/50">
                                  <div className="flex items-center justify-between mb-1">
                                    <span className="font-medium text-foreground">{st.sourceName}</span>
                                    <ConfidenceScore score={st.confidence} />
                                  </div>
                                  <p className="text-muted-foreground italic">"{st.excerpt}"</p>
                                </div>
                              ))}
                            </div>
                          </div>
                        </div>

                        {/* Reviewer notes */}
                        <div>
                          <label className="text-xs font-medium text-muted-foreground mb-1 block">{t.editor.reviewerNotes}</label>
                          <Textarea placeholder={t.editor.notesPlaceholder} defaultValue={control.reviewerNotes} rows={2} className="text-sm" />
                        </div>

                        {/* Actions */}
                        <div className="flex gap-2 pt-2 border-t border-border/50">
                          <Button size="sm" variant="outline" onClick={() => updateStatus(control.id, 'approved')} className="text-success border-success/30 hover:bg-success/10">
                            <CheckCircle2 className="h-3.5 w-3.5 mr-1" />{t.editor.approve}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(control.id, 'rejected')} className="text-destructive border-destructive/30 hover:bg-destructive/10">
                            <XCircle className="h-3.5 w-3.5 mr-1" />{t.editor.reject}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(control.id, 'adjusted')}>
                            <Edit3 className="h-3.5 w-3.5 mr-1" />{t.editor.adjust}
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => updateStatus(control.id, 'reviewed')}>
                            {t.editor.markReviewed}
                          </Button>
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
    </div>
  );
};

const Field: React.FC<{ label: React.ReactNode; value: string }> = ({ label, value }) => (
  <div>
    <label className="text-xs font-medium text-muted-foreground mb-1 block">{label}</label>
    <p className="text-sm text-foreground/80 leading-relaxed">{value}</p>
  </div>
);

export default BaselineEditor;
