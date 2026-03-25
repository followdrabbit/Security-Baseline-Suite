import React, { useMemo, useState, useCallback } from 'react';
import type { ControlItem } from '@/types';
import { useMindMapLayout } from '@/hooks/useMindMapLayout';
import { useMindMapFilters } from '@/hooks/useMindMapFilters';
import { useMindMapZoomPan } from '@/hooks/useMindMapZoomPan';
import { useMindMapCollapse } from '@/hooks/useMindMapCollapse';
import MindMapToolbar from './mindmap/MindMapToolbar';
import MindMapFilterBar from './mindmap/MindMapFilterBar';
import MindMapCanvas from './mindmap/MindMapCanvas';
import MindMapLegend from './mindmap/MindMapLegend';
import MindMapMiniMap from './mindmap/MindMapMiniMap';
import MindMapDetailPanel from './mindmap/MindMapDetailPanel';

interface Props {
  technologyName: string;
  controls: ControlItem[];
  categoryLabels: Record<string, string>;
}

const BaselineMindMap: React.FC<Props> = ({ technologyName, controls, categoryLabels }) => {
  const {
    svgWidth, svgHeight, centerX, centerY,
    categories, categoryPositions, controlPositions,
    svgRef, exportToPng,
  } = useMindMapLayout(controls, technologyName, categoryLabels);

  const categoryIds = useMemo(() => categories.map(c => c.id), [categories]);

  const { collapsedCategories, toggleCategory, toggleCollapseAll, isAllCollapsed } =
    useMindMapCollapse(categoryIds);

  const {
    searchText, setSearchText,
    criticalityFilter, setCriticalityFilter,
    statusFilter, setStatusFilter,
    hasActiveFilter, matchingControlIds, matchingCategoryIds, clearFilters,
  } = useMindMapFilters(controls, categories);

  const {
    zoom, pan, isPanning, svgContainerRef, setPan,
    handleWheel, handleMouseDown, handleMouseMove, handleMouseUp,
    resetView, zoomIn, zoomOut,
  } = useMindMapZoomPan();

  const [hoveredNode, setHoveredNode] = useState<string | null>(null);
  const [selectedControl, setSelectedControl] = useState<ControlItem | null>(null);

  const handleControlClick = useCallback((nodeId: string) => {
    const ctrl = controls.find(c => c.id === nodeId);
    setSelectedControl(prev => prev?.id === nodeId ? null : ctrl || null);
  }, [controls]);

  const totalControls = controls.length;
  const visibleControls = useMemo(
    () => controlPositions.filter(({ ctrl }) => !collapsedCategories.has(`cat-${ctrl.category}`)),
    [controlPositions, collapsedCategories]
  );

  return (
    <div className="relative w-full">
      <div className="bg-card border border-border rounded-lg shadow-premium overflow-hidden">
        <MindMapToolbar
          zoom={zoom}
          onZoomIn={zoomIn}
          onZoomOut={zoomOut}
          onResetView={resetView}
          isAllCollapsed={isAllCollapsed}
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

        <MindMapCanvas
          svgRef={svgRef}
          svgContainerRef={svgContainerRef}
          svgWidth={svgWidth}
          svgHeight={svgHeight}
          centerX={centerX}
          centerY={centerY}
          zoom={zoom}
          pan={pan}
          isPanning={isPanning}
          technologyName={technologyName}
          totalControls={totalControls}
          categoryPositions={categoryPositions}
          visibleControls={visibleControls}
          hoveredNode={hoveredNode}
          selectedControlId={selectedControl?.id}
          matchingControlIds={matchingControlIds}
          matchingCategoryIds={matchingCategoryIds}
          collapsedCategories={collapsedCategories}
          onWheel={handleWheel}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUp}
          onHoverNode={setHoveredNode}
          onClickControl={handleControlClick}
          onToggleCategory={toggleCategory}
          categoriesLength={categories.length}
        />

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
