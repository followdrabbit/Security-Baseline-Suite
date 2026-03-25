import React from 'react';
import { motion } from 'framer-motion';
import type { MindMapNode } from './types';
import { CRITICALITY_RING } from './types';

interface Props {
  ctrl: MindMapNode;
  x: number;
  y: number;
  catColor: string;
  isHovered: boolean;
  isSelected: boolean;
  isDimmed: boolean;
  isHighlighted: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

const reviewStatusIcon = (status: string) => {
  switch (status) {
    case 'approved': return '✓';
    case 'rejected': return '✗';
    case 'reviewed': return '◉';
    case 'adjusted': return '↻';
    default: return '○';
  }
};

const reviewStatusLabel = (status: string) => {
  switch (status) {
    case 'approved': return 'Approved';
    case 'rejected': return 'Rejected';
    case 'reviewed': return 'Reviewed';
    case 'adjusted': return 'Adjusted';
    default: return 'Pending';
  }
};

const MindMapControlNode: React.FC<Props> = ({
  ctrl, x, y, catColor,
  isHovered, isSelected, isDimmed, isHighlighted,
  onMouseEnter, onMouseLeave, onClick,
}) => {
  const critColor = CRITICALITY_RING[ctrl.criticality || 'medium'] || 'hsl(var(--muted-foreground))';

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <g
      className="cursor-pointer transition-opacity"
      style={{ opacity: isDimmed ? 0.15 : 1 }}
      role="button"
      tabIndex={isDimmed ? -1 : 0}
      aria-label={`Control ${ctrl.label}: ${ctrl.sublabel || ''}, ${ctrl.criticality || 'medium'} criticality, ${reviewStatusLabel(ctrl.reviewStatus || '')}`}
      aria-pressed={isSelected}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onFocus={onMouseEnter}
      onBlur={onMouseLeave}
    >
      {/* Focus ring */}
      <circle
        cx={x}
        cy={y}
        r={26}
        fill="none"
        stroke="hsl(var(--ring))"
        strokeWidth={2}
        opacity={0}
        className="focus-ring"
      />
      {/* Pulse ring for highlighted nodes */}
      {isHighlighted && !isSelected && (
        <motion.circle
          cx={x}
          cy={y}
          r={24}
          fill="none"
          stroke={critColor}
          strokeWidth={1.5}
          initial={{ opacity: 0.6, scale: 0.9 }}
          animate={{ opacity: [0.6, 0, 0.6], scale: [0.9, 1.15, 0.9] }}
          transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
          style={{ transformOrigin: `${x}px ${y}px` }}
        />
      )}
      <motion.circle
        initial={{ r: 0, opacity: 0 }}
        animate={{ r: isHovered || isSelected ? 22 : (isHighlighted ? 20 : 18), opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        cx={x}
        cy={y}
        fill={`hsla(${catColor}, ${isHighlighted ? 0.25 : 0.15})`}
        stroke={isSelected ? critColor : isHighlighted ? critColor : `hsl(${catColor})`}
        strokeWidth={isSelected ? 2.5 : isHighlighted ? 2 : 1.5}
      />
      <motion.circle
        initial={{ r: 0 }}
        animate={{ r: isHovered || isSelected ? 26 : 0 }}
        cx={x}
        cy={y}
        fill="none"
        stroke={critColor}
        strokeWidth={1.5}
        strokeDasharray="3 2"
        opacity={0.6}
      />
      <text
        x={x}
        y={y + 1}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-[9px] font-bold select-none pointer-events-none"
        fill={critColor}
        aria-hidden="true"
      >
        {reviewStatusIcon(ctrl.reviewStatus || '')}
      </text>
      <motion.text
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.8 }}
        x={x}
        y={y + 32}
        textAnchor="middle"
        className="text-[8px] font-mono select-none pointer-events-none"
        fill="hsl(var(--muted-foreground))"
        aria-hidden="true"
      >
        {ctrl.label}
      </motion.text>
    </g>
  );
};

export default MindMapControlNode;
