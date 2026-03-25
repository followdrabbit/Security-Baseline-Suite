import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CategoryPosition } from './types';
import { calcTooltipPosition, tooltipStyle } from './useTooltipPosition';

interface Props {
  cat: CategoryPosition | null;
  x: number;
  y: number;
  svgWidth: number;
  svgHeight: number;
  zoom: number;
  pan: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement>;
}

const criticalityOrder = ['critical', 'high', 'medium', 'low', 'informational'] as const;

const criticalityLabel: Record<string, string> = {
  critical: 'Critical',
  high: 'High',
  medium: 'Medium',
  low: 'Low',
  informational: 'Info',
};

const criticalityClass: Record<string, string> = {
  critical: 'bg-destructive/15 text-destructive',
  high: 'bg-orange-500/15 text-orange-400',
  medium: 'bg-yellow-500/15 text-yellow-400',
  low: 'bg-emerald-500/15 text-emerald-400',
  informational: 'bg-blue-500/15 text-blue-400',
};

const statusLabel: Record<string, string> = {
  approved: 'Approved',
  reviewed: 'Reviewed',
  pending: 'Pending',
  rejected: 'Rejected',
  adjusted: 'Adjusted',
};

const MindMapCategoryTooltip: React.FC<Props> = ({
  cat, x, y, svgWidth, svgHeight, zoom, pan, containerRef,
}) => {
  if (!cat) return null;

  const pos = calcTooltipPosition({
    svgX: x, svgY: y, svgWidth, svgHeight, zoom, pan, containerRef, offsetY: 24,
  });
  if (!pos) return null;

  const children = cat.children || [];
  const totalControls = children.length;

  const critCounts: Record<string, number> = {};
  const statusCounts: Record<string, number> = {};
  let confidenceSum = 0;
  let confidenceCount = 0;

  for (const ctrl of children) {
    const crit = ctrl.criticality || 'medium';
    critCounts[crit] = (critCounts[crit] || 0) + 1;
    const st = ctrl.reviewStatus || 'pending';
    statusCounts[st] = (statusCounts[st] || 0) + 1;
    if (ctrl.confidence != null) {
      confidenceSum += ctrl.confidence;
      confidenceCount++;
    }
  }

  const avgConfidence = confidenceCount > 0 ? Math.round((confidenceSum / confidenceCount) * 100) : null;

  return (
    <AnimatePresence>
      <motion.div
        key={cat.id}
        initial={{ opacity: 0, y: pos.alignY === 'above' ? 4 : -4, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: pos.alignY === 'above' ? 4 : -4, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="absolute z-50 pointer-events-none"
        style={tooltipStyle(pos)}
      >
        <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2.5 max-w-[240px] text-left">
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-semibold text-primary">{cat.label}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {totalControls} controls
            </span>
          </div>

          <div className="mb-1.5">
            <p className="text-[9px] text-muted-foreground mb-1">Criticality:</p>
            <div className="flex flex-wrap gap-1">
              {criticalityOrder
                .filter(c => critCounts[c])
                .map(c => (
                  <span
                    key={c}
                    className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${criticalityClass[c]}`}
                  >
                    {critCounts[c]} {criticalityLabel[c]}
                  </span>
                ))}
            </div>
          </div>

          {/* Status progress bar */}
          {totalControls > 0 && (() => {
            const approved = statusCounts['approved'] || 0;
            const reviewed = statusCounts['reviewed'] || 0;
            const pending = statusCounts['pending'] || 0;
            const rejected = statusCounts['rejected'] || 0;
            const adjusted = statusCounts['adjusted'] || 0;
            return (
              <div className="mb-1.5">
                <div className="flex items-center justify-between mb-0.5">
                  <span className="text-[9px] text-muted-foreground">Review progress</span>
                  <span className="text-[9px] font-medium text-primary">
                    {Math.round(((approved + reviewed) / totalControls) * 100)}%
                  </span>
                </div>
                <div className="w-full h-1.5 rounded-full bg-muted/50 overflow-hidden flex">
                  {approved > 0 && (
                    <div
                      className="h-full bg-emerald-500"
                      style={{ width: `${(approved / totalControls) * 100}%` }}
                      title={`${approved} Approved`}
                    />
                  )}
                  {reviewed > 0 && (
                    <div
                      className="h-full bg-blue-500"
                      style={{ width: `${(reviewed / totalControls) * 100}%` }}
                      title={`${reviewed} Reviewed`}
                    />
                  )}
                  {adjusted > 0 && (
                    <div
                      className="h-full bg-yellow-500"
                      style={{ width: `${(adjusted / totalControls) * 100}%` }}
                      title={`${adjusted} Adjusted`}
                    />
                  )}
                  {pending > 0 && (
                    <div
                      className="h-full bg-muted-foreground/30"
                      style={{ width: `${(pending / totalControls) * 100}%` }}
                      title={`${pending} Pending`}
                    />
                  )}
                  {rejected > 0 && (
                    <div
                      className="h-full bg-destructive"
                      style={{ width: `${(rejected / totalControls) * 100}%` }}
                      title={`${rejected} Rejected`}
                    />
                  )}
                </div>
                <div className="flex flex-wrap gap-x-2 gap-y-0.5 mt-1">
                  {approved > 0 && <span className="text-[8px] text-emerald-400">■ {approved} Approved</span>}
                  {reviewed > 0 && <span className="text-[8px] text-blue-400">■ {reviewed} Reviewed</span>}
                  {adjusted > 0 && <span className="text-[8px] text-yellow-400">■ {adjusted} Adjusted</span>}
                  {pending > 0 && <span className="text-[8px] text-muted-foreground">■ {pending} Pending</span>}
                  {rejected > 0 && <span className="text-[8px] text-destructive">■ {rejected} Rejected</span>}
                </div>
              </div>
            );
          })()}

          {avgConfidence != null && (
            <div className="text-[9px] text-muted-foreground">
              Avg. confidence: {avgConfidence}%
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MindMapCategoryTooltip;
