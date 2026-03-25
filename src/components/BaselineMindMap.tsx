import React, { useMemo, useState, useCallback, useRef } from 'react';
import { motion } from 'framer-motion';
import { Download } from 'lucide-react';
import type { ControlItem } from '@/types';

interface MindMapNode {
  id: string;
  label: string;
  sublabel?: string;
  children?: MindMapNode[];
  criticality?: string;
  reviewStatus?: string;
  confidence?: number;
  category?: string;
}

const CATEGORY_COLORS: Record<string, string> = {
  identity: '43, 55%, 55%',
  encryption: '210, 65%, 55%',
  logging: '152, 50%, 45%',
  network: '280, 50%, 55%',
  storage: '38, 85%, 55%',
  runtime: '0, 55%, 50%',
  cicd: '190, 60%, 45%',
};

const CRITICALITY_RING: Record<string, string> = {
  critical: 'hsl(0, 65%, 50%)',
  high: 'hsl(25, 80%, 50%)',
  medium: 'hsl(38, 85%, 55%)',
  low: 'hsl(152, 50%, 45%)',
  informational: 'hsl(210, 65%, 55%)',
};

interface Props {
  technologyName: string;
  controls: ControlItem[];
  categoryLabels: Record<string, string>;
}

const BaselineMindMap: React.FC<Props> = ({ technologyName, controls, categoryLabels }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedControl, setSelectedControl] = useState<ControlItem | null>(null);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgContainerRef = React.useRef<HTMLDivElement>(null);

  const handleWheel = useCallback((e: React.WheelEvent) => {
    e.preventDefault();
    const delta = e.deltaY > 0 ? -0.1 : 0.1;
    setZoom(z => Math.min(3, Math.max(0.3, z + delta)));
  }, []);

  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button === 0) {
      setIsPanning(true);
      setPanStart({ x: e.clientX - pan.x, y: e.clientY - pan.y });
    }
  }, [pan]);

  const handleMouseMove = useCallback((e: React.MouseEvent) => {
    if (!isPanning) return;
    setPan({ x: e.clientX - panStart.x, y: e.clientY - panStart.y });
  }, [isPanning, panStart]);

  const handleMouseUp = useCallback(() => {
    setIsPanning(false);
  }, []);

  const resetView = useCallback(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, []);

  const tree = useMemo<MindMapNode>(() => {
    const groups: Record<string, ControlItem[]> = {};
    for (const c of controls) {
      const cat = c.category || 'other';
      if (!groups[cat]) groups[cat] = [];
      groups[cat].push(c);
    }
    const categoryOrder = ['identity', 'encryption', 'network', 'logging', 'storage', 'runtime', 'cicd'];
    const sortedCats = categoryOrder.filter(c => groups[c]).concat(
      Object.keys(groups).filter(c => !categoryOrder.includes(c))
    );
    return {
      id: 'root',
      label: technologyName,
      children: sortedCats.map(cat => ({
        id: `cat-${cat}`,
        label: categoryLabels[cat] || cat,
        category: cat,
        children: groups[cat].map(ctrl => ({
          id: ctrl.id,
          label: ctrl.controlId,
          sublabel: ctrl.title,
          criticality: ctrl.criticality,
          reviewStatus: ctrl.reviewStatus,
          confidence: ctrl.confidenceScore,
          category: cat,
        })),
      })),
    };
  }, [controls, technologyName, categoryLabels]);

  const categories = tree.children || [];
  const totalControls = controls.length;

  // Layout calculations
  const svgWidth = 900;
  const padding = 60;
  const categoryRadius = 180;
  const controlRadius = 320;
  const svgHeight = Math.max(500, (controlRadius + padding) * 2);
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  // Distribute categories evenly in a circle
  const categoryPositions = useMemo(() => {
    return categories.map((cat, i) => {
      const angle = (i / categories.length) * 2 * Math.PI - Math.PI / 2;
      return {
        ...cat,
        x: centerX + Math.cos(angle) * categoryRadius,
        y: centerY + Math.sin(angle) * categoryRadius,
        angle,
      };
    });
  }, [categories, centerX, centerY, categoryRadius]);

  // Calculate control positions around each category
  const controlPositions = useMemo(() => {
    const positions: Array<{
      ctrl: MindMapNode;
      x: number;
      y: number;
      parentX: number;
      parentY: number;
      catColor: string;
    }> = [];

    categoryPositions.forEach(cat => {
      const children = cat.children || [];
      const spreadAngle = Math.min(Math.PI * 0.4, children.length * 0.15);
      const baseAngle = cat.angle;

      children.forEach((ctrl, j) => {
        const totalChildren = children.length;
        const childAngle = totalChildren === 1
          ? baseAngle
          : baseAngle - spreadAngle / 2 + (j / (totalChildren - 1)) * spreadAngle;
        const r = controlRadius;
        positions.push({
          ctrl,
          x: centerX + Math.cos(childAngle) * r,
          y: centerY + Math.sin(childAngle) * r,
          parentX: cat.x,
          parentY: cat.y,
          catColor: CATEGORY_COLORS[cat.category || ''] || '220, 10%, 55%',
        });
      });
    });

    return positions;
  }, [categoryPositions, centerX, centerY, controlRadius]);

  const handleControlClick = useCallback((nodeId: string) => {
    const ctrl = controls.find(c => c.id === nodeId);
    setSelectedControl(prev => prev?.id === nodeId ? null : ctrl || null);
  }, [controls]);

  const reviewStatusIcon = (status: string) => {
    switch (status) {
      case 'approved': return '✓';
      case 'rejected': return '✗';
      case 'reviewed': return '◉';
      case 'adjusted': return '↻';
      default: return '○';
    }
  };

  return (
    <div className="relative w-full">
      {/* SVG Mind Map */}
      <div className="bg-card border border-border rounded-lg shadow-premium overflow-hidden">
        {/* Zoom controls */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
          <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="px-2 py-1 text-xs font-mono rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">+</button>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="px-2 py-1 text-xs font-mono rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">−</button>
          <span className="text-[10px] text-muted-foreground font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={resetView} className="px-2 py-1 text-[10px] rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">Reset</button>
          <span className="text-[10px] text-muted-foreground ml-2">Scroll to zoom · Drag to pan</span>
        </div>
        <div
          ref={svgContainerRef}
          className="overflow-hidden select-none"
          style={{ maxHeight: '70vh', cursor: isPanning ? 'grabbing' : 'grab' }}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onMouseLeave={handleMouseUp}
        >
          <svg
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full"
            style={{ minHeight: '500px', transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transformOrigin: 'center center' }}
          >
            {/* Connections: root → categories */}
            {categoryPositions.map(cat => (
              <motion.line
                key={`line-root-${cat.id}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.4 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                x1={centerX}
                y1={centerY}
                x2={cat.x}
                y2={cat.y}
                stroke={`hsl(${CATEGORY_COLORS[cat.category || ''] || '220, 10%, 55%'})`}
                strokeWidth={2}
                strokeDasharray="6 3"
              />
            ))}

            {/* Connections: categories → controls */}
            {controlPositions.map(({ ctrl, x, y, parentX, parentY, catColor }) => (
              <motion.path
                key={`line-${ctrl.id}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.25 }}
                transition={{ duration: 0.4, delay: 0.5 }}
                d={`M ${parentX} ${parentY} Q ${(parentX + x) / 2} ${(parentY + y) / 2 + (y > parentY ? 15 : -15)} ${x} ${y}`}
                fill="none"
                stroke={`hsl(${catColor})`}
                strokeWidth={1.2}
              />
            ))}

            {/* Control nodes */}
            {controlPositions.map(({ ctrl, x, y, catColor }) => {
              const isHovered = hoveredNode === ctrl.id;
              const isSelected = selectedControl?.id === ctrl.id;
              const critColor = CRITICALITY_RING[ctrl.criticality || 'medium'] || 'hsl(var(--muted-foreground))';
              return (
                <g
                  key={ctrl.id}
                  className="cursor-pointer"
                  onMouseEnter={() => setHoveredNode(ctrl.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => handleControlClick(ctrl.id)}
                >
                  <motion.circle
                    initial={{ r: 0, opacity: 0 }}
                    animate={{ r: isHovered || isSelected ? 22 : 18, opacity: 1 }}
                    transition={{ duration: 0.3, delay: 0.6 }}
                    cx={x}
                    cy={y}
                    fill={`hsla(${catColor}, 0.15)`}
                    stroke={isSelected ? critColor : `hsl(${catColor})`}
                    strokeWidth={isSelected ? 2.5 : 1.5}
                  />
                  {/* Criticality ring */}
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
                  {/* Status icon */}
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
                  {/* Control ID label */}
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
            })}

            {/* Category nodes */}
            {categoryPositions.map((cat, i) => {
              const catColor = CATEGORY_COLORS[cat.category || ''] || '220, 10%, 55%';
              const isHovered = hoveredNode === cat.id;
              return (
                <g
                  key={cat.id}
                  onMouseEnter={() => setHoveredNode(cat.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  className="cursor-default"
                >
                  <motion.rect
                    initial={{ width: 0, height: 0, opacity: 0 }}
                    animate={{
                      width: isHovered ? 140 : 130,
                      height: isHovered ? 36 : 32,
                      opacity: 1,
                    }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.05 }}
                    x={cat.x - (isHovered ? 70 : 65)}
                    y={cat.y - (isHovered ? 18 : 16)}
                    rx={6}
                    fill={`hsla(${catColor}, 0.2)`}
                    stroke={`hsl(${catColor})`}
                    strokeWidth={1.5}
                  />
                  <motion.text
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    transition={{ delay: 0.5 }}
                    x={cat.x}
                    y={cat.y - 1}
                    textAnchor="middle"
                    dominantBaseline="middle"
                    className="text-[9px] font-semibold select-none pointer-events-none"
                    fill={`hsl(${catColor})`}
                  >
                    {cat.label}
                  </motion.text>
                  <text
                    x={cat.x}
                    y={cat.y + 10}
                    textAnchor="middle"
                    className="text-[7px] select-none pointer-events-none"
                    fill="hsl(var(--muted-foreground))"
                  >
                    {(cat.children || []).length} controls
                  </text>
                </g>
              );
            })}

            {/* Root node */}
            <motion.circle
              initial={{ r: 0 }}
              animate={{ r: 42 }}
              transition={{ duration: 0.5, type: 'spring' }}
              cx={centerX}
              cy={centerY}
              fill="hsl(var(--card))"
              stroke="hsl(var(--primary))"
              strokeWidth={3}
            />
            <motion.circle
              initial={{ r: 0 }}
              animate={{ r: 38 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              cx={centerX}
              cy={centerY}
              fill="hsla(var(--primary), 0.1)"
              stroke="none"
            />
            <motion.text
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ delay: 0.4 }}
              x={centerX}
              y={centerY - 4}
              textAnchor="middle"
              dominantBaseline="middle"
              className="text-[11px] font-display font-bold select-none"
              fill="hsl(var(--primary))"
            >
              {technologyName}
            </motion.text>
            <text
              x={centerX}
              y={centerY + 10}
              textAnchor="middle"
              className="text-[8px] select-none"
              fill="hsl(var(--muted-foreground))"
            >
              {totalControls} controls
            </text>
          </svg>
        </div>

        {/* Legend */}
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
      </div>

      {/* Detail panel */}
      {selectedControl && (
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          className="mt-4 bg-card border border-border rounded-lg p-5 shadow-premium"
        >
          <div className="flex items-start justify-between mb-3">
            <div>
              <span className="text-xs font-mono text-primary/70 mr-2">{selectedControl.controlId}</span>
              <span className={`text-[10px] px-2 py-0.5 rounded-full font-medium ${
                selectedControl.criticality === 'critical' ? 'bg-destructive/10 text-destructive' :
                selectedControl.criticality === 'high' ? 'bg-warning/10 text-warning' :
                selectedControl.criticality === 'medium' ? 'bg-accent text-accent-foreground' :
                'bg-success/10 text-success'
              }`}>
                {selectedControl.criticality}
              </span>
            </div>
            <button
              onClick={() => setSelectedControl(null)}
              className="text-muted-foreground hover:text-foreground text-xs"
            >
              ✕
            </button>
          </div>
          <h4 className="text-sm font-semibold text-foreground mb-2">{selectedControl.title}</h4>
          <p className="text-xs text-muted-foreground leading-relaxed mb-3">{selectedControl.description}</p>
          <div className="flex flex-wrap gap-1.5">
            {selectedControl.frameworkMappings.map(m => (
              <span key={m} className="px-2 py-0.5 bg-accent text-accent-foreground rounded text-[10px] font-medium">
                {m}
              </span>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

export default BaselineMindMap;
