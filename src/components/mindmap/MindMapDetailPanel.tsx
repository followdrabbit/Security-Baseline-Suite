import React from 'react';
import { motion } from 'framer-motion';
import type { ControlItem } from '@/types';

interface Props {
  control: ControlItem;
  onClose: () => void;
}

const MindMapDetailPanel: React.FC<Props> = ({ control, onClose }) => (
  <motion.div
    initial={{ opacity: 0, y: 8 }}
    animate={{ opacity: 1, y: 0 }}
    className="mt-4 bg-card border border-border rounded-lg p-5 shadow-premium"
  >
    <div className="flex items-start justify-between mb-3">
      <div>
        <span className="text-xs font-mono text-primary/70 mr-2">{control.controlId}</span>
        <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
          control.criticality === 'critical' ? 'bg-destructive/10 text-destructive' :
          control.criticality === 'high' ? 'bg-warning/10 text-warning' :
          control.criticality === 'medium' ? 'bg-accent text-accent-foreground' :
          'bg-success/10 text-success'
        }`}>
          {control.criticality}
        </span>
      </div>
      <button
        onClick={onClose}
        className="text-muted-foreground hover:text-foreground text-xs"
      >
        ✕
      </button>
    </div>
    <h4 className="text-sm font-semibold text-foreground mb-2">{control.title}</h4>
    <p className="text-xs text-muted-foreground leading-relaxed mb-3">{control.description}</p>
    <div className="flex flex-wrap gap-1.5">
      {control.frameworkMappings.map(m => (
        <span key={m} className="px-2 py-0.5 bg-accent text-accent-foreground rounded text-[10px] font-medium">
          {m}
        </span>
      ))}
    </div>
  </motion.div>
);

export default MindMapDetailPanel;
