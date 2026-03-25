import React from 'react';
import { motion } from 'framer-motion';
import type { CategoryPosition } from './types';
import { CATEGORY_COLORS } from './types';

interface Props {
  cat: CategoryPosition;
  index: number;
  isHovered: boolean;
  isDimmed: boolean;
  isCollapsed: boolean;
  onMouseEnter: () => void;
  onMouseLeave: () => void;
  onClick: () => void;
}

const MindMapCategoryNode: React.FC<Props> = ({
  cat, index, isHovered, isDimmed, isCollapsed,
  onMouseEnter, onMouseLeave, onClick,
}) => {
  const catColor = CATEGORY_COLORS[cat.category || ''] || '220, 10%, 55%';
  const childCount = (cat.children || []).length;

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      onClick();
    }
  };

  return (
    <g
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      onClick={onClick}
      onKeyDown={handleKeyDown}
      onFocus={onMouseEnter}
      onBlur={onMouseLeave}
      className="cursor-pointer"
      style={{ opacity: isDimmed ? 0.2 : 1 }}
      role="button"
      tabIndex={isDimmed ? -1 : 0}
      aria-label={`Category ${cat.label}, ${childCount} controls, ${isCollapsed ? 'collapsed' : 'expanded'}. Press Enter to ${isCollapsed ? 'expand' : 'collapse'}.`}
      aria-expanded={!isCollapsed}
    >
      <motion.rect
        initial={{ width: 0, height: 0, opacity: 0 }}
        animate={{ width: isHovered ? 140 : 130, height: isHovered ? 36 : 32, opacity: 1 }}
        transition={{ duration: 0.4, delay: 0.3 + index * 0.05 }}
        x={cat.x - (isHovered ? 70 : 65)}
        y={cat.y - (isHovered ? 18 : 16)}
        rx={6}
        fill={`hsla(${catColor}, ${isCollapsed ? 0.35 : 0.2})`}
        stroke={`hsl(${catColor})`}
        strokeWidth={isCollapsed ? 2 : 1.5}
        strokeDasharray={isCollapsed ? '4 2' : 'none'}
      />
      <motion.text
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 0.5 }}
        x={cat.x} y={cat.y - 1}
        textAnchor="middle"
        dominantBaseline="middle"
        className="text-[9px] font-semibold select-none pointer-events-none"
        fill={`hsl(${catColor})`}
        aria-hidden="true"
      >
        {isCollapsed ? '▸ ' : ''}{cat.label}
      </motion.text>
      <text
        x={cat.x} y={cat.y + 10}
        textAnchor="middle"
        className="text-[7px] select-none pointer-events-none"
        fill="hsl(var(--muted-foreground))"
        aria-hidden="true"
      >
        {childCount} controls {isCollapsed ? '(collapsed)' : ''}
      </text>
    </g>
  );
};

export default MindMapCategoryNode;
