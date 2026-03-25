import React from 'react';
import { CATEGORY_COLORS } from './types';
import type { CategoryPosition, ControlPosition } from './types';

interface Props {
  svgWidth: number;
  svgHeight: number;
  centerX: number;
  centerY: number;
  zoom: number;
  pan: { x: number; y: number };
  categoryPositions: CategoryPosition[];
  controlPositions: ControlPosition[];
  containerRef: React.RefObject<HTMLDivElement>;
  onNavigate: (pan: { x: number; y: number }) => void;
}

const MindMapMiniMap: React.FC<Props> = ({
  svgWidth, svgHeight, centerX, centerY,
  zoom, pan, categoryPositions, controlPositions,
  containerRef, onNavigate,
}) => {
  const handleClick = (e: React.MouseEvent) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const clickX = (e.clientX - rect.left) / rect.width;
    const clickY = (e.clientY - rect.top) / rect.height;
    const containerEl = containerRef.current;
    if (!containerEl) return;
    const containerW = containerEl.clientWidth;
    const containerH = containerEl.clientHeight;
    onNavigate({
      x: -(clickX - 0.5) * svgWidth * zoom + containerW / 2 - svgWidth / 2,
      y: -(clickY - 0.5) * svgHeight * zoom + containerH / 2 - svgHeight / 2,
    });
  };

  const containerEl = containerRef.current;
  const vpW = containerEl ? containerEl.clientWidth / zoom : 0;
  const vpH = containerEl ? containerEl.clientHeight / zoom : 0;
  const vpX = (svgWidth / 2) - (pan.x / zoom) - vpW / 2;
  const vpY = (svgHeight / 2) - (pan.y / zoom) - vpH / 2;

  return (
    <div
      className="absolute bottom-[52px] right-3 border border-border rounded-md bg-card/90 backdrop-blur-sm shadow-lg overflow-hidden cursor-pointer z-10"
      style={{ width: 160, height: 160 * (svgHeight / svgWidth) }}
      onClick={handleClick}
    >
      <svg viewBox={`0 0 ${svgWidth} ${svgHeight}`} className="w-full h-full">
        <rect width={svgWidth} height={svgHeight} fill="hsl(var(--card))" opacity={0.5} />
        {categoryPositions.map(cat => (
          <line
            key={`mini-${cat.id}`}
            x1={centerX} y1={centerY}
            x2={cat.x} y2={cat.y}
            stroke="hsl(var(--muted-foreground))"
            strokeWidth={3}
            opacity={0.3}
          />
        ))}
        {categoryPositions.map(cat => (
          <circle
            key={`mini-cat-${cat.id}`}
            cx={cat.x} cy={cat.y} r={12}
            fill={`hsl(${CATEGORY_COLORS[cat.category || ''] || '220, 10%, 55%'})`}
            opacity={0.6}
          />
        ))}
        {controlPositions.map(({ ctrl, x, y, catColor }) => (
          <circle
            key={`mini-ctrl-${ctrl.id}`}
            cx={x} cy={y} r={6}
            fill={`hsl(${catColor})`}
            opacity={0.4}
          />
        ))}
        <circle cx={centerX} cy={centerY} r={16} fill="hsl(var(--primary))" opacity={0.7} />
        {containerEl && (
          <rect
            x={vpX} y={vpY}
            width={vpW} height={vpH}
            fill="hsl(var(--primary))"
            fillOpacity={0.08}
            stroke="hsl(var(--primary))"
            strokeWidth={4}
            strokeOpacity={0.7}
            rx={3}
          />
        )}
      </svg>
    </div>
  );
};

export default MindMapMiniMap;
