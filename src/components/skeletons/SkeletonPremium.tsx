import React from 'react';
import { cn } from '@/lib/utils';

/** Base shimmer skeleton with premium gold-tinted animation */
const Shimmer: React.FC<React.HTMLAttributes<HTMLDivElement>> = ({ className, ...props }) => (
  <div
    className={cn(
      'relative overflow-hidden rounded-md bg-muted/60',
      'before:absolute before:inset-0 before:-translate-x-full',
      'before:animate-[shimmer_2s_infinite]',
      'before:bg-gradient-to-r before:from-transparent before:via-primary/[0.04] before:to-transparent',
      className
    )}
    {...props}
  />
);

/* ─── KPI Card Skeleton ─── */
export const KPICardSkeleton: React.FC = () => (
  <div className="bg-card border border-border rounded-lg p-5 shadow-premium space-y-3">
    <div className="flex items-center justify-between">
      <Shimmer className="h-5 w-5 rounded" />
      <Shimmer className="h-4 w-8 rounded-full" />
    </div>
    <Shimmer className="h-8 w-20 rounded" />
    <Shimmer className="h-3 w-28 rounded" />
  </div>
);

/* ─── Table Row Skeleton ─── */
export const TableRowSkeleton: React.FC<{ columns?: number }> = ({ columns = 6 }) => (
  <tr className="border-b border-border/50">
    {Array.from({ length: columns }).map((_, i) => (
      <td key={i} className="py-3 px-4">
        <Shimmer
          className={cn(
            'h-4 rounded',
            i === 0 ? 'w-48' : i === 1 ? 'w-28' : i === 2 ? 'w-20' : 'w-16'
          )}
        />
      </td>
    ))}
  </tr>
);

/* ─── Full Table Skeleton (header + rows) ─── */
export const TableSkeleton: React.FC<{ rows?: number; columns?: number }> = ({ rows = 5, columns = 6 }) => (
  <div className="bg-card border border-border rounded-lg overflow-hidden shadow-premium">
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-border bg-muted/30">
            {Array.from({ length: columns }).map((_, i) => (
              <th key={i} className="py-3 px-4 text-left">
                <Shimmer className="h-3 w-20 rounded" />
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {Array.from({ length: rows }).map((_, i) => (
            <TableRowSkeleton key={i} columns={columns} />
          ))}
        </tbody>
      </table>
    </div>
  </div>
);

/* ─── Control Card Skeleton (for Baseline Editor) ─── */
export const ControlCardSkeleton: React.FC = () => (
  <div className="bg-card border border-border rounded-lg shadow-premium p-4">
    <div className="flex items-center gap-4">
      <Shimmer className="h-4 w-4 rounded shrink-0" />
      <Shimmer className="h-4 w-24 rounded shrink-0" />
      <Shimmer className="h-4 w-64 rounded flex-1" />
      <Shimmer className="h-5 w-16 rounded-full" />
      <Shimmer className="h-5 w-16 rounded-full" />
      <Shimmer className="h-4 w-14 rounded" />
    </div>
  </div>
);

/* ─── Pipeline Step Skeleton ─── */
export const PipelineStepSkeleton: React.FC = () => (
  <div className="bg-card border border-border rounded-lg p-4 shadow-premium space-y-2">
    <div className="flex items-center justify-between">
      <div className="flex items-center gap-3">
        <Shimmer className="h-4 w-4 rounded-full" />
        <Shimmer className="h-4 w-36 rounded" />
      </div>
      <Shimmer className="h-3 w-10 rounded" />
    </div>
    <Shimmer className="h-1 w-full rounded-full" />
    <Shimmer className="h-3 w-48 rounded" />
  </div>
);

/* ─── Timeline Entry Skeleton ─── */
export const TimelineEntrySkeleton: React.FC = () => (
  <div className="flex gap-4">
    <div className="relative z-10">
      <Shimmer className="h-10 w-10 rounded-full" />
    </div>
    <div className="flex-1 bg-card border border-border rounded-lg p-5 shadow-premium space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-3">
          <Shimmer className="h-4 w-20 rounded" />
          <Shimmer className="h-5 w-20 rounded-full" />
        </div>
        <Shimmer className="h-3 w-32 rounded" />
      </div>
      <Shimmer className="h-3 w-full rounded" />
      <div className="flex items-center justify-between">
        <Shimmer className="h-3 w-40 rounded" />
        <div className="flex gap-2">
          <Shimmer className="h-8 w-24 rounded" />
          <Shimmer className="h-8 w-20 rounded" />
        </div>
      </div>
    </div>
  </div>
);

/* ─── Traceability Card Skeleton ─── */
export const TraceabilityCardSkeleton: React.FC = () => (
  <div className="bg-card border border-border rounded-lg p-5 shadow-premium space-y-4">
    <div className="flex items-start justify-between">
      <div className="space-y-1.5">
        <Shimmer className="h-3 w-20 rounded" />
        <Shimmer className="h-4 w-56 rounded" />
      </div>
      <Shimmer className="h-4 w-14 rounded" />
    </div>
    {[1, 2].map(i => (
      <div key={i} className="flex items-start gap-3 bg-muted/20 rounded-lg p-3 border border-border/50">
        <Shimmer className="h-7 w-7 rounded-md shrink-0" />
        <div className="flex-1 space-y-2">
          <div className="flex items-center justify-between">
            <Shimmer className="h-3 w-36 rounded" />
            <Shimmer className="h-3 w-12 rounded" />
          </div>
          <Shimmer className="h-3 w-full rounded" />
          <Shimmer className="h-2 w-16 rounded" />
        </div>
      </div>
    ))}
    <Shimmer className="h-3 w-32 rounded" />
  </div>
);

/* ─── Export Card Skeleton ─── */
export const ExportCardSkeleton: React.FC = () => (
  <div className="bg-card border border-border rounded-lg p-5 shadow-premium space-y-4">
    <div className="flex items-start gap-3">
      <Shimmer className="h-9 w-9 rounded-lg shrink-0" />
      <div className="flex-1 space-y-1.5">
        <Shimmer className="h-4 w-36 rounded" />
        <Shimmer className="h-3 w-full rounded" />
      </div>
    </div>
    <Shimmer className="h-8 w-full rounded" />
    <Shimmer className="h-2 w-24 rounded" />
  </div>
);

/* ─── Settings Section Skeleton ─── */
export const SettingsSectionSkeleton: React.FC = () => (
  <div className="bg-card border border-border rounded-lg p-5 shadow-premium space-y-4">
    <div className="flex items-center gap-2">
      <Shimmer className="h-4 w-4 rounded" />
      <Shimmer className="h-4 w-36 rounded" />
    </div>
    <Shimmer className="h-10 w-60 rounded" />
  </div>
);

export { Shimmer };
