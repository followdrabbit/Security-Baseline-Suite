import React from 'react';
import { motion } from 'framer-motion';

interface Props {
  cx: number;
  cy: number;
  label: string;
  controlCount: number;
}

const MindMapRootNode: React.FC<Props> = ({ cx, cy, label, controlCount }) => (
  <g role="img" aria-label={`Mind map root: ${label}, ${controlCount} controls total`}>
    <motion.circle initial={{ r: 0 }} animate={{ r: 42 }} transition={{ duration: 0.5, type: 'spring' }} cx={cx} cy={cy} fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth={3} />
    <motion.circle initial={{ r: 0 }} animate={{ r: 38 }} transition={{ duration: 0.5, delay: 0.1 }} cx={cx} cy={cy} fill="hsla(var(--primary), 0.1)" stroke="none" />
    <motion.text initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} x={cx} y={cy - 4} textAnchor="middle" dominantBaseline="middle" className="text-[11px] font-display font-bold select-none" fill="hsl(var(--primary))" aria-hidden="true">
      {label}
    </motion.text>
    <text x={cx} y={cy + 10} textAnchor="middle" className="text-[8px] select-none" fill="hsl(var(--muted-foreground))" aria-hidden="true">
      {controlCount} controls
    </text>
  </g>
);

export default MindMapRootNode;
