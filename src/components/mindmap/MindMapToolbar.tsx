import React from 'react';
import { Download } from 'lucide-react';

interface Props {
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onResetView: () => void;
  isAllCollapsed: boolean;
  onToggleCollapseAll: () => void;
  onExportPng: () => void;
}

const MindMapToolbar: React.FC<Props> = ({
  zoom, onZoomIn, onZoomOut, onResetView,
  isAllCollapsed, onToggleCollapseAll, onExportPng,
}) => (
  <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
    <button onClick={onZoomIn} className="px-2 py-1 text-xs font-mono rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">+</button>
    <button onClick={onZoomOut} className="px-2 py-1 text-xs font-mono rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">−</button>
    <span className="text-[10px] text-muted-foreground font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
    <button onClick={onResetView} className="px-2 py-1 text-[10px] rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">Reset</button>
    <span className="mx-1 h-4 w-px bg-border" />
    <button
      onClick={onToggleCollapseAll}
      className="px-2 py-1 text-[10px] rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
    >
      {isAllCollapsed ? 'Expand All' : 'Collapse All'}
    </button>
    <span className="text-[10px] text-muted-foreground ml-2">Scroll to zoom · Drag to pan</span>
    <div className="ml-auto">
      <button onClick={onExportPng} className="flex items-center gap-1.5 px-3 py-1 text-[10px] rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">
        <Download className="w-3 h-3" />
        Export PNG
      </button>
    </div>
  </div>
);

export default MindMapToolbar;
