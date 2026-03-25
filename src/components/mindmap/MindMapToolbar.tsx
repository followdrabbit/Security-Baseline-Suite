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
  <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30" role="toolbar" aria-label="Mind map controls">
    <button onClick={onZoomIn} aria-label="Zoom in" className="px-2 py-1 text-xs font-mono rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">+</button>
    <button onClick={onZoomOut} aria-label="Zoom out" className="px-2 py-1 text-xs font-mono rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">−</button>
    <span className="text-[10px] text-muted-foreground font-mono w-12 text-center" aria-live="polite" aria-label={`Zoom level ${Math.round(zoom * 100)}%`}>{Math.round(zoom * 100)}%</span>
    <button onClick={onResetView} aria-label="Reset view" className="px-2 py-1 text-[10px] rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Reset</button>
    <span className="mx-1 h-4 w-px bg-border" aria-hidden="true" />
    <button
      onClick={onToggleCollapseAll}
      aria-label={isAllCollapsed ? 'Expand all categories' : 'Collapse all categories'}
      className="px-2 py-1 text-[10px] rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
    >
      {isAllCollapsed ? 'Expand All' : 'Collapse All'}
    </button>
    <span className="text-[10px] text-muted-foreground ml-2" aria-hidden="true">Scroll to zoom · Drag to pan</span>
    <div className="ml-auto">
      <button onClick={onExportPng} aria-label="Export mind map as PNG" className="flex items-center gap-1.5 px-3 py-1 text-[10px] rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <Download className="w-3 h-3" aria-hidden="true" />
        Export PNG
      </button>
    </div>
  </div>
);

export default MindMapToolbar;
