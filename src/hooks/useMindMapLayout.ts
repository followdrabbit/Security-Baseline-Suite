import { useMemo, useCallback, useRef } from 'react';
import type { ControlItem } from '@/types';
import { CATEGORY_COLORS } from '@/components/mindmap/types';
import type { CategoryPosition, ControlPosition } from '@/components/mindmap/types';

const SVG_WIDTH = 900;
const PADDING = 60;
const CATEGORY_RADIUS = 180;
const CONTROL_RADIUS = 320;

export function useMindMapLayout(
  controls: ControlItem[],
  technologyName: string,
  categoryLabels: Record<string, string>,
) {
  const svgWidth = SVG_WIDTH;
  const svgHeight = Math.max(500, (CONTROL_RADIUS + PADDING) * 2);
  const centerX = svgWidth / 2;
  const centerY = svgHeight / 2;

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

  const categoryPositions = useMemo<CategoryPosition[]>(() =>
    categories.map((cat, i) => {
      const angle = (i / categories.length) * 2 * Math.PI - Math.PI / 2;
      return { ...cat, x: centerX + Math.cos(angle) * CATEGORY_RADIUS, y: centerY + Math.sin(angle) * CATEGORY_RADIUS, angle };
    }),
    [categories, centerX, centerY]
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
          x: centerX + Math.cos(childAngle) * CONTROL_RADIUS,
          y: centerY + Math.sin(childAngle) * CONTROL_RADIUS,
          parentX: cat.x,
          parentY: cat.y,
          catColor: CATEGORY_COLORS[cat.category || ''] || '220, 10%, 55%',
        });
      });
    });
    return positions;
  }, [categoryPositions, centerX, centerY]);

  const svgRef = useRef<SVGSVGElement>(null);

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

  return {
    svgWidth,
    svgHeight,
    centerX,
    centerY,
    categories,
    categoryPositions,
    controlPositions,
    svgRef,
    exportToPng,
  };
}
