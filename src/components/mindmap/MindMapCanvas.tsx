import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CATEGORY_COLORS } from './types';
import type { CategoryPosition, ControlPosition, MindMapNode } from './types';
import MindMapControlNode from './MindMapControlNode';
import MindMapCategoryNode from './MindMapCategoryNode';
import MindMapRootNode from './MindMapRootNode';
import MindMapTooltip from './MindMapTooltip';
import MindMapCategoryTooltip from './MindMapCategoryTooltip';

interface Props {
  svgRef: React.RefObject<SVGSVGElement>;
  svgContainerRef: React.RefObject<HTMLDivElement>;
  svgWidth: number;
  svgHeight: number;
  centerX: number;
  centerY: number;
  zoom: number;
  pan: { x: number; y: number };
  isPanning: boolean;
  technologyName: string;
  totalControls: number;
  categoryPositions: CategoryPosition[];
  visibleControls: ControlPosition[];
  hoveredNode: string | null;
  selectedControlId: string | undefined;
  matchingControlIds: Set<string> | null;
  matchingCategoryIds: Set<string> | null;
  collapsedCategories: Set<string>;
  onWheel: (e: React.WheelEvent) => void;
  onMouseDown: (e: React.MouseEvent) => void;
  onMouseMove: (e: React.MouseEvent) => void;
  onMouseUp: () => void;
  onHoverNode: (id: string | null) => void;
  onClickControl: (id: string) => void;
  onToggleCategory: (id: string) => void;
  categoriesLength: number;
}

const MindMapCanvas: React.FC<Props> = ({
  svgRef, svgContainerRef,
  svgWidth, svgHeight, centerX, centerY,
  zoom, pan, isPanning,
  technologyName, totalControls,
  categoryPositions, visibleControls,
  hoveredNode, selectedControlId,
  matchingControlIds, matchingCategoryIds, collapsedCategories,
  onWheel, onMouseDown, onMouseMove, onMouseUp,
  onHoverNode, onClickControl, onToggleCategory,
  categoriesLength,
}) => {
  return (
    <div
      ref={svgContainerRef}
      className="overflow-hidden select-none relative"
      style={{ maxHeight: '70vh', cursor: isPanning ? 'grabbing' : 'grab' }}
      onWheel={onWheel}
      onMouseDown={onMouseDown}
      onMouseMove={onMouseMove}
      onMouseUp={onMouseUp}
      onMouseLeave={onMouseUp}
    >
      <svg
        ref={svgRef}
        viewBox={`0 0 ${svgWidth} ${svgHeight}`}
        className="w-full"
        style={{
          minHeight: '500px',
          transform: `scale(${zoom}) translate(${pan.x / zoom}px, ${pan.y / zoom}px)`,
          transformOrigin: 'center center',
        }}
        role="img"
        aria-label={`Mind map visualization of ${technologyName} with ${totalControls} security controls across ${categoriesLength} categories`}
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
                isSelected={selectedControlId === ctrl.id}
                isDimmed={matchingControlIds !== null && !matchingControlIds.has(ctrl.id)}
                isHighlighted={matchingControlIds !== null && matchingControlIds.has(ctrl.id)}
                onMouseEnter={() => onHoverNode(ctrl.id)}
                onMouseLeave={() => onHoverNode(null)}
                onClick={() => onClickControl(ctrl.id)}
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
            onMouseEnter={() => onHoverNode(cat.id)}
            onMouseLeave={() => onHoverNode(null)}
            onClick={() => onToggleCategory(cat.id)}
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
  );
};

export default MindMapCanvas;
