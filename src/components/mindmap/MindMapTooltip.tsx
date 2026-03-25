import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { MindMapNode } from './types';
import { calcTooltipPosition, tooltipStyle } from './useTooltipPosition';

interface Props {
  ctrl: MindMapNode | null;
  x: number;
  y: number;
  svgWidth: number;
  svgHeight: number;
  zoom: number;
  pan: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement>;
}

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

const MindMapTooltip: React.FC<Props> = ({
  ctrl, x, y, svgWidth, svgHeight, zoom, pan, containerRef,
}) => {
  if (!ctrl) return null;

  const pos = calcTooltipPosition({
    svgX: x, svgY: y, svgWidth, svgHeight, zoom, pan, containerRef, offsetY: 50,
  });
  if (!pos) return null;

  const crit = ctrl.criticality || 'medium';

  return (
    <AnimatePresence>
      <motion.div
        key={ctrl.id}
        initial={{ opacity: 0, y: pos.alignY === 'above' ? 4 : -4, scale: 0.95 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        exit={{ opacity: 0, y: pos.alignY === 'above' ? 4 : -4, scale: 0.95 }}
        transition={{ duration: 0.15 }}
        className="absolute z-50 pointer-events-none"
        style={tooltipStyle(pos)}
      >
        <div className="bg-popover border border-border rounded-lg shadow-lg px-3 py-2.5 max-w-[220px] text-left">
          <div className="flex items-center gap-1.5 mb-1">
            <span className="text-[10px] font-mono text-primary font-semibold">{ctrl.label}</span>
            <span className={`text-[9px] px-1.5 py-0.5 rounded-full font-medium ${criticalityClass[crit] || 'bg-muted text-muted-foreground'}`}>
              {criticalityLabel[crit] || crit}
            </span>
          </div>
          {ctrl.sublabel && (
            <p className="text-[10px] text-foreground/80 leading-tight mb-1.5 line-clamp-2">{ctrl.sublabel}</p>
          )}
          <div className="flex items-center gap-2 text-[9px] text-muted-foreground">
            <span>Status: {statusLabel[ctrl.reviewStatus || ''] || 'Pending'}</span>
            {ctrl.confidence != null && (
              <span>· {Math.round(ctrl.confidence * 100)}% conf.</span>
            )}
          </div>
        </div>
      </motion.div>
    </AnimatePresence>
  );
};

export default MindMapTooltip;
