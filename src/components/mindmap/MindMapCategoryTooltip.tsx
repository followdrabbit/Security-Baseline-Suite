import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { CategoryPosition } from './types';

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
  if (!cat || !containerRef.current) return null;

  const container = containerRef.current;
  const rect = container.getBoundingClientRect();
  const svgDisplayWidth = rect.width;
  const svgDisplayHeight = Math.min(rect.height, container.clientHeight);

  const scaleX = svgDisplayWidth / svgWidth;
  const scaleY = svgDisplayHeight / svgHeight;
  const scale = Math.min(scaleX, scaleY);

  const pixelX = (x * scale * zoom) + pan.x + (svgDisplayWidth - svgWidth * scale) / 2;
  const pixelY = (y * scale * zoom) + pan.y + (svgDisplayHeight - svgHeight * scale) / 2;

  const children = cat.children || [];
  const totalControls = children.length;

  // Criticality distribution
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
        initial={{ opacity: 0, y: 4, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: 4, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="absolute z-50 pointer-events-none"
        style={{
          left: pixelX,
          top: pixelY - 24,
          transform: 'translate(-50%, -100%)',
        }}
      >
        <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2.5 max-w-[240px] text-left">
          {/* Header */}
          <div className="flex items-center gap-1.5 mb-1.5">
            <span className="text-[10px] font-semibold text-primary">{cat.label}</span>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full bg-muted text-muted-foreground font-medium">
              {totalControls} controls
            </span>
          </div>

          {/* Criticality distribution */}
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

          {/* Status summary */}
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            {Object.entries(statusCounts).map(([st, count]) => (
              <span key={st}>{count} {statusLabel[st] || st}</span>
            ))}
          </div>

          {/* Average confidence */}
          {avgConfidence != null && (
            <div className="mt-1 text-[9px] text-muted-foreground">
              Avg. confidence: {avgConfidence}%
            </div>
          )}
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MindMapCategoryTooltip;
