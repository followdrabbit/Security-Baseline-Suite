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

const MindMapControlNode: React.FC<Props> = ({
  ctrl, x, y, catColor,
  isHovered, isSelected, isDimmed, isHighlighted,
  onMouseEnter, onMouseLeave, onClick,
}) => {
  const critColor = CRITICALITY_RING[ctrl.criticality || 'medium'] || 'hsl(var(--muted-foreground))';

  return (
    <g
      className="cursor-pointer transition-opacity"
      style={{ opacity: isDimmed ? 0.15 : 1 }}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
    >
      <motion.circle
        initial={{ r: 0, opacity: 0 }}
        animate={{ r: isHovered || isSelected ? 22 : (isHighlighted ? 20 : 18), opacity: 1 }}
        transition={{ duration: 0.3, delay: 0.6 }}
        cx={x}
        cy={y}
        fill={`hsla(${catColor}, 0.15)`}
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
      >
        {ctrl.label}
      </motion.text>
    </g>
  );
};

export default MindMapControlNode;
