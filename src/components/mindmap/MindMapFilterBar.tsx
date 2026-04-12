import React from 'react';
import { Search, X } from 'lucide-react';
import { useI18n } from '@/contexts/I18nContext';

interface Props {
  searchText: string;
  onSearchChange: (value: string) => void;
  criticalityFilter: string;
  onCriticalityChange: (value: string) => void;
  statusFilter: string;
  onStatusChange: (value: string) => void;
  hasActiveFilter: boolean;
  onClear: () => void;
  matchingCount: number;
  totalCount: number;
}

const MindMapFilterBar: React.FC<Props> = ({
  searchText, onSearchChange,
  criticalityFilter, onCriticalityChange,
  statusFilter, onStatusChange,
  hasActiveFilter, onClear,
  matchingCount, totalCount,
}) => {
  const { t } = useI18n();
  const tMindmap = (t.editor as any).mindmap || {};

  return (
    <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/20 overflow-x-auto">
    <div className="relative">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
      <input
        type="text"
        value={searchText}
        onChange={e => onSearchChange(e.target.value)}
        placeholder={t.editor.search}
        className="pl-7 pr-2 py-1 text-[11px] rounded bg-accent text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none w-40 transition-colors"
      />
    </div>
    <select
      value={criticalityFilter}
      onChange={e => onCriticalityChange(e.target.value)}
      className="px-2 py-1 text-[11px] rounded bg-accent text-foreground border border-border focus:border-primary focus:outline-none transition-colors w-auto max-w-[140px]"
    >
      <option value="all">{tMindmap.allCriticality || 'All Criticality'}</option>
      <option value="critical">{t.common.critical}</option>
      <option value="high">{t.common.high}</option>
      <option value="medium">{t.common.medium}</option>
      <option value="low">{t.common.low}</option>
      <option value="informational">{t.common.informational}</option>
    </select>
    <select
      value={statusFilter}
      onChange={e => onStatusChange(e.target.value)}
      className="px-2 py-1 text-[11px] rounded bg-accent text-foreground border border-border focus:border-primary focus:outline-none transition-colors w-auto max-w-[120px]"
    >
      <option value="all">{tMindmap.allStatus || 'All Status'}</option>
      <option value="approved">{t.common.approved}</option>
      <option value="reviewed">{t.common.reviewed}</option>
      <option value="pending">{t.common.pending}</option>
      <option value="rejected">{t.common.rejected}</option>
      <option value="adjusted">{t.common.adjusted}</option>
    </select>
    {hasActiveFilter && (
      <>
        <button onClick={onClear} className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
          <X className="w-3 h-3" />
          {t.editor.clearFilter}
        </button>
        <span className="text-[10px] text-muted-foreground ml-1">
          {matchingCount} {t.common.of} {totalCount} {t.dashboard.controls}
        </span>
      </>
    )}
    </div>
  );
};

export default MindMapFilterBar;
