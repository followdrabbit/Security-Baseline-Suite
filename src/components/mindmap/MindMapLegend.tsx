import React from 'react';
import { CRITICALITY_RING } from './types';

const MindMapLegend: React.FC = () => (
  <div className="border-t border-border px-5 py-3 flex flex-wrap items-center gap-4 text-[10px]">
    <span className="font-medium text-muted-foreground uppercase tracking-wider mr-2">Legend:</span>
    {Object.entries(CRITICALITY_RING).map(([level, color]) => (
      <span key={level} className="flex items-center gap-1.5 text-muted-foreground">
        <span className="w-2.5 h-2.5 rounded-full border-2 shrink-0" style={{ borderColor: color }} />
        <span className="capitalize">{level}</span>
      </span>
    ))}
    <span className="border-l border-border pl-4 ml-2 flex items-center gap-3 text-muted-foreground">
      <span>✓ Approved</span>
      <span>◉ Reviewed</span>
      <span>○ Pending</span>
      <span>✗ Rejected</span>
    </span>
  </div>
);

export default MindMapLegend;
