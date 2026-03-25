import React, { useMemo, useState, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import type { ControlItem } from '@/types';
import { CATEGORY_COLORS } from './mindmap/types';
import { useMindMapLayout } from '@/hooks/useMindMapLayout';
import MindMapToolbar from './mindmap/MindMapToolbar';
import MindMapFilterBar from './mindmap/MindMapFilterBar';
import MindMapControlNode from './mindmap/MindMapControlNode';
import MindMapCategoryNode from './mindmap/MindMapCategoryNode';
import MindMapRootNode from './mindmap/MindMapRootNode';
import MindMapLegend from './mindmap/MindMapLegend';
import MindMapMiniMap from './mindmap/MindMapMiniMap';
import MindMapDetailPanel from './mindmap/MindMapDetailPanel';
import MindMapTooltip from './mindmap/MindMapTooltip';
import MindMapCategoryTooltip from './mindmap/MindMapCategoryTooltip';

interface Props {
  technologyName: string;
  controls: ControlItem[];
  categoryLabels: Record<string, string>;
}

const BaselineMindMap: React.FC<Props> = ({ technologyName, controls, categoryLabels }) => {
  // Layout hook
  const {
    svgWidth, svgHeight, centerX, centerY,
    categories, categoryPositions, controlPositions,
    svgRef, exportToPng,
  } = useMindMapLayout(controls, technologyName, categoryLabels);

  // Interaction state
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

  const toggleCollapseAll = useCallback(() => {
    const allCatIds = categories.map(c => c.id);
    setCollapsedCategories(prev => prev.size === allCatIds.length ? new Set() : new Set(allCatIds));
  }, [categories]);

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

  const matchingCategoryIds = useMemo(() => {
    if (!matchingControlIds) return null;
    const ids = new Set<string>();
    for (const cat of categories) {
      if ((cat.children || []).some(ctrl => matchingControlIds.has(ctrl.id))) ids.add(cat.id);
    }
    return ids;
  }, [matchingControlIds, categories]);

  // Zoom & Pan state
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isPanning, setIsPanning] = useState(false);
  const [panStart, setPanStart] = useState({ x: 0, y: 0 });
  const svgContainerRef = useRef<HTMLDivElement>(null);

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

  const handleControlClick = useCallback((nodeId: string) => {
    const ctrl = controls.find(c => c.id === nodeId);
    setSelectedControl(prev => prev?.id === nodeId ? null : ctrl || null);
  }, [controls]);

  const totalControls = controls.length;
  const visibleControls = controlPositions.filter(({ ctrl }) => !collapsedCategories.has(`cat-${ctrl.category}`));

  return (
    <div className="relative w-full">
      <div className="bg-card border border-border rounded-lg shadow-premium overflow-hidden">
        <MindMapToolbar
          zoom={zoom}
          onZoomIn={() => setZoom(z => Math.min(3, z + 0.2))}
          onZoomOut={() => setZoom(z => Math.max(0.3, z - 0.2))}
          onResetView={resetView}
          isAllCollapsed={collapsedCategories.size === categories.length}
          onToggleCollapseAll={toggleCollapseAll}
          onExportPng={exportToPng}
        />

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
          className="overflow-hidden select-none relative"
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
            role="img"
            aria-label={`Mind map visualization of ${technologyName} with ${totalControls} security controls across ${categories.length} categories`}
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
              {visibleControls.map(({ ctrl, x, y, parentX, parentY, catColor }) => (
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
              {visibleControls.map(({ ctrl, x, y, catColor }) => (
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
            </AnimatePresence>

            {/* Category nodes */}
            {categoryPositions.map((cat, i) => (
              <MindMapCategoryNode
                key={cat.id}
                cat={cat}
                index={i}
                isHovered={hoveredNode === cat.id}
                isDimmed={matchingCategoryIds !== null && !matchingCategoryIds.has(cat.id)}
                isCollapsed={collapsedCategories.has(cat.id)}
                onMouseEnter={() => setHoveredNode(cat.id)}
                onMouseLeave={() => setHoveredNode(null)}
                onClick={() => toggleCategory(cat.id)}
              />
            ))}

            {/* Root node */}
            <MindMapRootNode cx={centerX} cy={centerY} label={technologyName} controlCount={totalControls} />
          </svg>

          {/* Hover tooltip - controls */}
          {hoveredNode && !hoveredNode.startsWith('cat-') && (() => {
            const pos = visibleControls.find(({ ctrl }) => ctrl.id === hoveredNode);
            if (!pos) return null;
            return (
              <MindMapTooltip
                ctrl={pos.ctrl}
                x={pos.x}
                y={pos.y}
                svgWidth={svgWidth}
                svgHeight={svgHeight}
                zoom={zoom}
                pan={pan}
                containerRef={svgContainerRef}
              />
            );
          })()}

          {/* Hover tooltip - categories */}
          {hoveredNode && hoveredNode.startsWith('cat-') && (() => {
            const catPos = categoryPositions.find(c => c.id === hoveredNode);
            if (!catPos) return null;
            return (
              <MindMapCategoryTooltip
                cat={catPos}
                x={catPos.x}
                y={catPos.y}
                svgWidth={svgWidth}
                svgHeight={svgHeight}
                zoom={zoom}
                pan={pan}
                containerRef={svgContainerRef}
              />
            );
          })()}
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
