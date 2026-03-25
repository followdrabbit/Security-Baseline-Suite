import React from 'react';
import { Search, X } from 'lucide-react';

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
}) => (
  <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/20 overflow-x-auto">
    <div className="relative">
      <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 text-muted-foreground" />
      <input
        type="text"
        value={searchText}
        onChange={e => onSearchChange(e.target.value)}
        placeholder="Search controls..."
        className="pl-7 pr-2 py-1 text-[11px] rounded bg-accent text-foreground placeholder:text-muted-foreground border border-border focus:border-primary focus:outline-none w-40 transition-colors"
      />
    </div>
    <select
      value={criticalityFilter}
      onChange={e => onCriticalityChange(e.target.value)}
      className="px-2 py-1 text-[11px] rounded bg-accent text-foreground border border-border focus:border-primary focus:outline-none transition-colors w-auto max-w-[140px]"
    >
      <option value="all">All Criticality</option>
      <option value="critical">Critical</option>
      <option value="high">High</option>
      <option value="medium">Medium</option>
      <option value="low">Low</option>
      <option value="informational">Informational</option>
    </select>
    <select
      value={statusFilter}
      onChange={e => onStatusChange(e.target.value)}
      className="px-2 py-1 text-[11px] rounded bg-accent text-foreground border border-border focus:border-primary focus:outline-none transition-colors w-auto max-w-[120px]"
    >
      <option value="all">All Status</option>
      <option value="approved">Approved</option>
      <option value="reviewed">Reviewed</option>
      <option value="pending">Pending</option>
      <option value="rejected">Rejected</option>
      <option value="adjusted">Adjusted</option>
    </select>
    {hasActiveFilter && (
      <>
        <button onClick={onClear} className="flex items-center gap-1 px-2 py-1 text-[10px] rounded bg-destructive/10 text-destructive hover:bg-destructive/20 transition-colors">
          <X className="w-3 h-3" />
          Clear
        </button>
        <span className="text-[10px] text-muted-foreground ml-1">
          {matchingCount} of {totalCount} controls
        </span>
      </>
    )}
  </div>
);

export default MindMapFilterBar;
