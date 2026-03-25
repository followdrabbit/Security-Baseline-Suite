import React, { useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Download } from 'lucide-react';
import type { ControlItem } from '@/types';
import { CATEGORY_COLORS, CRITICALITY_RING } from './mindmap/types';
import type { CategoryPosition, ControlPosition } from './mindmap/types';
import MindMapFilterBar from './mindmap/MindMapFilterBar';
import MindMapControlNode from './mindmap/MindMapControlNode';
import MindMapLegend from './mindmap/MindMapLegend';
import MindMapMiniMap from './mindmap/MindMapMiniMap';
import MindMapDetailPanel from './mindmap/MindMapDetailPanel';

interface Props {
  technologyName: string;
  controls: ControlItem[];
  categoryLabels: Record<string, string>;
}

const BaselineMindMap: React.FC<Props> = ({ technologyName, controls, categoryLabels }) => {
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedControl, setSelectedControl] = useState<ControlItem | null>(null);
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());
  const toggleCategory = useCallback((catId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
  }, []);

  // Filter state
  const [searchText, setSearchText] = useState('');
  const [criticalityFilter, setCriticalityFilter] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<string>('all');

  const hasActiveFilter = searchText.trim() !== '' || criticalityFilter !== 'all' || statusFilter !== 'all';

  const matchingControlIds = useMemo(() => {
    if (!hasActiveFilter) return null;
    const ids = new Set<string>();
    const query = searchText.toLowerCase().trim();
    for (const c of controls) {
      const matchesSearch = !query || c.controlId.toLowerCase().includes(query) || c.title.toLowerCase().includes(query);
      const matchesCriticality = criticalityFilter === 'all' || c.criticality === criticalityFilter;
      const matchesStatus = statusFilter === 'all' || c.reviewStatus === statusFilter;
      if (matchesSearch && matchesCriticality && matchesStatus) ids.add(c.id);
    }
    return ids;
  }, [controls, searchText, criticalityFilter, statusFilter, hasActiveFilter]);

  const clearFilters = useCallback(() => {
    setSearchText('');
    setCriticalityFilter('all');
    setStatusFilter('all');
  }, []);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);

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

  const handleMouseUp = useCallback(() => setIsPanning(false), []);
  const resetView = useCallback(() => { setZoom(1); setPan({ x: 0, y: 0 }); }, []);

  // Tree structure
  const tree = useMemo(() => {
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

  const matchingCategoryIds = useMemo(() => {
    if (!matchingControlIds) return null;
    const ids = new Set<string>();
    for (const cat of categories) {
      if ((cat.children || []).some(ctrl => matchingControlIds.has(ctrl.id))) ids.add(cat.id);
    }
    return ids;
  }, [matchingControlIds, categories]);

  // Layout
  const svgWidth = 900;
  const padding = 60;
  const categoryRadius = 180;
  const controlRadius = 320;
  const svgHeight = Math.max(500, (controlRadius + padding) * 2);
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

  const categoryPositions = useMemo<CategoryPosition[]>(() =>
    categories.map((cat, i) => {
      const angle = (i / categories.length) * 2 * Math.PI - Math.PI / 2;
      return { ...cat, x: centerX + Math.cos(angle) * categoryRadius, y: centerY + Math.sin(angle) * categoryRadius, angle };
    }),
    [categories, centerX, centerY, categoryRadius]
  );

  const controlPositions = useMemo<ControlPosition[]>(() => {
    const positions: ControlPosition[] = [];
    categoryPositions.forEach(cat => {
      const children = cat.children || [];
      const spreadAngle = Math.min(Math.PI * 0.4, children.length * 0.15);
      const baseAngle = cat.angle;
      children.forEach((ctrl, j) => {
        const totalChildren = children.length;
        const childAngle = totalChildren === 1
          ? baseAngle
          : baseAngle - spreadAngle / 2 + (j / (totalChildren - 1)) * spreadAngle;
        positions.push({
          ctrl,
          x: centerX + Math.cos(childAngle) * controlRadius,
          y: centerY + Math.sin(childAngle) * controlRadius,
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

  const exportToPng = useCallback(() => {
    const svgEl = svgRef.current;
    if (!svgEl) return;
    const clone = svgEl.cloneNode(true) as SVGSVGElement;
    clone.removeAttribute('class');
    clone.removeAttribute('style');
    clone.setAttribute('width', String(svgWidth));
    clone.setAttribute('height', String(svgHeight));
    const cs = getComputedStyle(document.documentElement);
    const cardBg = cs.getPropertyValue('--card').trim();
    const primaryColor = cs.getPropertyValue('--primary').trim();
    const mutedFg = cs.getPropertyValue('--muted-foreground').trim();
    const bgRect = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    bgRect.setAttribute('width', '100%');
    bgRect.setAttribute('height', '100%');
    bgRect.setAttribute('fill', cardBg ? `hsl(${cardBg})` : '#1a1a2e');
    clone.insertBefore(bgRect, clone.firstChild);
    clone.querySelectorAll('text').forEach(text => {
      const fill = text.getAttribute('fill') || '';
      if (fill.includes('var(--muted-foreground)')) text.setAttribute('fill', mutedFg ? `hsl(${mutedFg})` : '#888');
      else if (fill.includes('var(--primary)')) text.setAttribute('fill', primaryColor ? `hsl(${primaryColor})` : '#c8a84e');
    });
    clone.querySelectorAll('circle').forEach(circle => {
      const fill = circle.getAttribute('fill') || '';
      const stroke = circle.getAttribute('stroke') || '';
      if (fill.includes('var(--card)')) circle.setAttribute('fill', cardBg ? `hsl(${cardBg})` : '#1a1a2e');
      if (fill.includes('var(--primary)')) circle.setAttribute('fill', primaryColor ? `hsl(${primaryColor})` : 'hsla(43, 55%, 55%, 0.1)');
      if (stroke.includes('var(--primary)')) circle.setAttribute('stroke', primaryColor ? `hsl(${primaryColor})` : '#c8a84e');
    });
    const svgString = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgString], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const img = new Image();
    img.onload = () => {
      const scale = 2;
      const canvas = document.createElement('canvas');
      canvas.width = svgWidth * scale;
      canvas.height = svgHeight * scale;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;
      ctx.scale(scale, scale);
      ctx.drawImage(img, 0, 0, svgWidth, svgHeight);
      URL.revokeObjectURL(url);
      canvas.toBlob(pngBlob => {
        if (!pngBlob) return;
        const pngUrl = URL.createObjectURL(pngBlob);
        const a = document.createElement('a');
        a.href = pngUrl;
        a.download = `mindmap-${technologyName.replace(/\s+/g, '-').toLowerCase()}.png`;
        a.click();
        URL.revokeObjectURL(pngUrl);
      }, 'image/png');
    };
    img.src = url;
  }, [svgWidth, svgHeight, technologyName]);

  return (
    <div className="relative w-full">
      <div className="bg-card border border-border rounded-lg shadow-premium overflow-hidden">
        {/* Zoom controls */}
        <div className="flex items-center gap-2 px-4 py-2 border-b border-border bg-muted/30">
          <button onClick={() => setZoom(z => Math.min(3, z + 0.2))} className="px-2 py-1 text-xs font-mono rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">+</button>
          <button onClick={() => setZoom(z => Math.max(0.3, z - 0.2))} className="px-2 py-1 text-xs font-mono rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">−</button>
          <span className="text-[10px] text-muted-foreground font-mono w-12 text-center">{Math.round(zoom * 100)}%</span>
          <button onClick={resetView} className="px-2 py-1 text-[10px] rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors">Reset</button>
          <span className="mx-1 h-4 w-px bg-border" />
          <button
            onClick={() => {
              const allCatIds = categories.map(c => c.id);
              setCollapsedCategories(prev => prev.size === allCatIds.length ? new Set() : new Set(allCatIds));
            }}
            className="px-2 py-1 text-[10px] rounded bg-accent text-accent-foreground hover:bg-accent/80 transition-colors"
          >
            {collapsedCategories.size === categories.length ? 'Expand All' : 'Collapse All'}
          </button>
          <span className="text-[10px] text-muted-foreground ml-2">Scroll to zoom · Drag to pan</span>
          <div className="ml-auto">
            <button onClick={exportToPng} className="flex items-center gap-1.5 px-3 py-1 text-[10px] rounded bg-primary/10 text-primary hover:bg-primary/20 transition-colors font-medium">
              <Download className="w-3 h-3" />
              Export PNG
            </button>
          </div>
        </div>

        {/* Filter bar */}
        <MindMapFilterBar
          searchText={searchText}
          onSearchChange={setSearchText}
          criticalityFilter={criticalityFilter}
          onCriticalityChange={setCriticalityFilter}
          statusFilter={statusFilter}
          onStatusChange={setStatusFilter}
          hasActiveFilter={hasActiveFilter}
          onClear={clearFilters}
          matchingCount={matchingControlIds?.size ?? 0}
          totalCount={totalControls}
        />

        {/* SVG canvas */}
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
            ref={svgRef}
            viewBox={`0 0 ${svgWidth} ${svgHeight}`}
            className="w-full"
            style={{ minHeight: '500px', transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`, transformOrigin: 'center center' }}
          >
            {/* Root → category connections */}
            {categoryPositions.map(cat => (
              <motion.line
                key={`line-root-${cat.id}`}
                initial={{ pathLength: 0, opacity: 0 }}
                animate={{ pathLength: 1, opacity: 0.4 }}
                transition={{ duration: 0.6, delay: 0.2 }}
                x1={centerX} y1={centerY} x2={cat.x} y2={cat.y}
                stroke={`hsl(${CATEGORY_COLORS[cat.category || ''] || '220, 10%, 55%'})`}
                strokeWidth={2}
                strokeDasharray="6 3"
              />
            ))}

            {/* Category → control connections */}
            <AnimatePresence>
              {controlPositions.filter(({ ctrl }) => !collapsedCategories.has(`cat-${ctrl.category}`)).map(({ ctrl, x, y, parentX, parentY, catColor }) => (
                <motion.path
                  key={`line-${ctrl.id}`}
                  initial={{ pathLength: 0, opacity: 0 }}
                  animate={{ pathLength: 1, opacity: 0.25 }}
                  exit={{ pathLength: 0, opacity: 0 }}
                  transition={{ duration: 0.35, ease: 'easeInOut' }}
                  d={`M ${parentX} ${parentY} Q ${(parentX + x) / 2} ${(parentY + y) / 2 + (y > parentY ? 15 : -15)} ${x} ${y}`}
                  fill="none"
                  stroke={`hsl(${catColor})`}
                  strokeWidth={1.2}
                />
              ))}
            </AnimatePresence>

            {/* Control nodes */}
            <AnimatePresence>
              {controlPositions.filter(({ ctrl }) => !collapsedCategories.has(`cat-${ctrl.category}`)).map(({ ctrl, x, y, catColor }) => (
                <motion.g
                  key={ctrl.id}
                  initial={{ opacity: 0, scale: 0.3 }}
                  animate={{ opacity: 1, scale: 1 }}
                  exit={{ opacity: 0, scale: 0.3 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  style={{ transformOrigin: `${x}px ${y}px` }}
                >
                  <MindMapControlNode
                    ctrl={ctrl}
                    x={x}
                    y={y}
                    catColor={catColor}
                    isHovered={hoveredNode === ctrl.id}
                    isSelected={selectedControl?.id === ctrl.id}
                    isDimmed={matchingControlIds !== null && !matchingControlIds.has(ctrl.id)}
                    isHighlighted={matchingControlIds !== null && matchingControlIds.has(ctrl.id)}
                    onMouseEnter={() => setHoveredNode(ctrl.id)}
                    onMouseLeave={() => setHoveredNode(null)}
                    onClick={() => handleControlClick(ctrl.id)}
                  />
                </motion.g>
              ))}
              />
            ))}

            {/* Category nodes */}
            {categoryPositions.map((cat, i) => {
              const catColor = CATEGORY_COLORS[cat.category || ''] || '220, 10%, 55%';
              const isHovered = hoveredNode === cat.id;
              const isCatDimmed = matchingCategoryIds !== null && !matchingCategoryIds.has(cat.id);
              const isCollapsed = collapsedCategories.has(cat.id);
              return (
                <g
                  key={cat.id}
                  onMouseEnter={() => setHoveredNode(cat.id)}
                  onMouseLeave={() => setHoveredNode(null)}
                  onClick={() => toggleCategory(cat.id)}
                  className="cursor-pointer"
                  style={{ opacity: isCatDimmed ? 0.2 : 1 }}
                >
                  <motion.rect
                    initial={{ width: 0, height: 0, opacity: 0 }}
                    animate={{ width: isHovered ? 140 : 130, height: isHovered ? 36 : 32, opacity: 1 }}
                    transition={{ duration: 0.4, delay: 0.3 + i * 0.05 }}
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
                  >
                    {isCollapsed ? '▸ ' : ''}{cat.label}
                  </motion.text>
                  <text
                    x={cat.x} y={cat.y + 10}
                    textAnchor="middle"
                    className="text-[7px] select-none pointer-events-none"
                    fill="hsl(var(--muted-foreground))"
                  >
                    {(cat.children || []).length} controls {isCollapsed ? '(collapsed)' : ''}
                  </text>
                </g>
              );
            })}

            {/* Root node */}
            <motion.circle initial={{ r: 0 }} animate={{ r: 42 }} transition={{ duration: 0.5, type: 'spring' }} cx={centerX} cy={centerY} fill="hsl(var(--card))" stroke="hsl(var(--primary))" strokeWidth={3} />
            <motion.circle initial={{ r: 0 }} animate={{ r: 38 }} transition={{ duration: 0.5, delay: 0.1 }} cx={centerX} cy={centerY} fill="hsla(var(--primary), 0.1)" stroke="none" />
            <motion.text initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} x={centerX} y={centerY - 4} textAnchor="middle" dominantBaseline="middle" className="text-[11px] font-display font-bold select-none" fill="hsl(var(--primary))">
              {technologyName}
            </motion.text>
            <text x={centerX} y={centerY + 10} textAnchor="middle" className="text-[8px] select-none" fill="hsl(var(--muted-foreground))">
              {totalControls} controls
            </text>
          </svg>
        </div>

        {/* Mini-map */}
        {zoom > 1 && (
          <MindMapMiniMap
            svgWidth={svgWidth}
            svgHeight={svgHeight}
            centerX={centerX}
            centerY={centerY}
            zoom={zoom}
            pan={pan}
            categoryPositions={categoryPositions}
            controlPositions={controlPositions}
            containerRef={svgContainerRef}
            onNavigate={setPan}
          />
        )}

        <MindMapLegend />
      </div>

      {/* Detail panel */}
      {selectedControl && (
        <MindMapDetailPanel
          control={selectedControl}
          onClose={() => setSelectedControl(null)}
        />
      )}
    </div>
  );
};

export default BaselineMindMap;
