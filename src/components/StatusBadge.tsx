import React from 'react';
import type { Criticality, SourceStatus, ReviewStatus, ProjectStatus } from '@/types';
import { useI18n } from '@/contexts/I18nContext';

interface StatusBadgeProps {
  status: string;
  type?: 'criticality' | 'source' | 'review' | 'project';
}

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, type = 'source' }) => {
  const { t } = useI18n();
  
  const getColors = () => {
    if (type === 'criticality') {
      const map: Record<Criticality, string> = {
        critical: 'bg-destructive/10 text-destructive border-destructive/20',
        high: 'bg-warning/10 text-warning border-warning/20',
        medium: 'bg-info/10 text-info border-info/20',
        low: 'bg-success/10 text-success border-success/20',
        informational: 'bg-muted text-muted-foreground border-border',
      };
      return map[status as Criticality] || map.informational;
    }
    if (type === 'review') {
      const map: Record<ReviewStatus, string> = {
        pending: 'bg-muted text-muted-foreground border-border',
        reviewed: 'bg-info/10 text-info border-info/20',
        approved: 'bg-success/10 text-success border-success/20',
        rejected: 'bg-destructive/10 text-destructive border-destructive/20',
        adjusted: 'bg-warning/10 text-warning border-warning/20',
      };
      return map[status as ReviewStatus] || map.pending;
    }
    if (type === 'project') {
      const map: Record<ProjectStatus, string> = {
        draft: 'bg-muted text-muted-foreground border-border',
        in_progress: 'bg-info/10 text-info border-info/20',
        review: 'bg-warning/10 text-warning border-warning/20',
        approved: 'bg-success/10 text-success border-success/20',
        archived: 'bg-secondary text-secondary-foreground border-border',
      };
      return map[status as ProjectStatus] || map.draft;
    }
    // source
    const map: Record<SourceStatus, string> = {
      pending: 'bg-muted text-muted-foreground border-border',
      validated: 'bg-info/10 text-info border-info/20',
      extracting: 'bg-primary/10 text-primary border-primary/20',
      normalized: 'bg-success/10 text-success border-success/20',
      processed: 'bg-success/10 text-success border-success/20',
      failed: 'bg-destructive/10 text-destructive border-destructive/20',
    };
    return map[status as SourceStatus] || map.pending;
  };

  const label = (t.common as Record<string, string>)[status] || status;

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium tracking-wide uppercase border ${getColors()}`}>
      {label}
    </span>
  );
};

export default StatusBadge;
