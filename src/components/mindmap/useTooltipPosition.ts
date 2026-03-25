import type React from 'react';

const TOOLTIP_WIDTH = 240;
const TOOLTIP_HEIGHT_ESTIMATE = 120;
const MARGIN = 8;

interface Params {
  svgX: number;
  svgY: number;
  svgWidth: number;
  svgHeight: number;
  zoom: number;
  pan: { x: number; y: number };
  containerRef: React.RefObject<HTMLDivElement>;
  offsetY?: number;
}

export interface TooltipPos {
  left: number;
  top: number;
  alignX: 'center' | 'left' | 'right';
  alignY: 'above' | 'below';
}

export function calcTooltipPosition({
  svgX, svgY, svgWidth, svgHeight, zoom, pan, containerRef, offsetY = 50,
}: Params): TooltipPos | null {
  const container = containerRef.current;
  if (!container) return null;

  const rect = container.getBoundingClientRect();
  const displayW = rect.width;
  const displayH = Math.min(rect.height, container.clientHeight);

  const scaleX = displayW / svgWidth;
  const scaleY = displayH / svgHeight;
  const scale = Math.min(scaleX, scaleY);

  const originOffsetX = (displayW - svgWidth * scale) / 2;
  const originOffsetY = (displayH - svgHeight * scale) / 2;

  let pixelX = (svgX * scale * zoom) + pan.x + originOffsetX;
  let pixelY = (svgY * scale * zoom) + pan.y + originOffsetY;

  // Determine vertical placement
  const spaceAbove = pixelY - offsetY;
  const alignY: 'above' | 'below' = spaceAbove < TOOLTIP_HEIGHT_ESTIMATE + MARGIN ? 'below' : 'above';

  if (alignY === 'above') {
    pixelY = pixelY - offsetY;
  } else {
    pixelY = pixelY + offsetY;
  }

  // Clamp horizontal
  let alignX: 'center' | 'left' | 'right' = 'center';
  const halfW = TOOLTIP_WIDTH / 2;

  if (pixelX - halfW < MARGIN) {
    pixelX = Math.max(MARGIN, pixelX);
    alignX = 'left';
  } else if (pixelX + halfW > displayW - MARGIN) {
    pixelX = Math.min(displayW - MARGIN, pixelX);
    alignX = 'right';
  }

  // Clamp vertical
  if (alignY === 'above') {
    pixelY = Math.max(MARGIN, pixelY);
  } else {
    pixelY = Math.min(displayH - MARGIN - TOOLTIP_HEIGHT_ESTIMATE, pixelY);
  }

  return { left: pixelX, top: pixelY, alignX, alignY };
}

export function tooltipStyle(pos: TooltipPos): React.CSSProperties {
  const translateX = pos.alignX === 'center' ? '-50%' : pos.alignX === 'right' ? '-100%' : '0%';
  const translateY = pos.alignY === 'above' ? '-100%' : '0%';

  return {
    left: pos.left,
    top: pos.top,
    transform: `translate(${translateX}, ${translateY})`,
  };
}
