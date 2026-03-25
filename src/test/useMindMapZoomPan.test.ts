import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMindMapZoomPan } from '@/hooks/useMindMapZoomPan';

describe('useMindMapZoomPan', () => {
  it('starts at zoom 1 and pan {0,0}', () => {
    const { result } = renderHook(() => useMindMapZoomPan());
    expect(result.current.zoom).toBe(1);
    expect(result.current.pan).toEqual({ x: 0, y: 0 });
    expect(result.current.isPanning).toBe(false);
  });

  it('zoomIn increases zoom by 0.2', () => {
    const { result } = renderHook(() => useMindMapZoomPan());
    act(() => result.current.zoomIn());
    expect(result.current.zoom).toBeCloseTo(1.2);
  });

  it('zoomOut decreases zoom by 0.2', () => {
    const { result } = renderHook(() => useMindMapZoomPan());
    act(() => result.current.zoomOut());
    expect(result.current.zoom).toBeCloseTo(0.8);
  });

  it('zoom clamps to max 3', () => {
    const { result } = renderHook(() => useMindMapZoomPan());
    for (let i = 0; i < 20; i++) {
      act(() => result.current.zoomIn());
    }
    expect(result.current.zoom).toBe(3);
  });

  it('zoom clamps to min 0.3', () => {
    const { result } = renderHook(() => useMindMapZoomPan());
    for (let i = 0; i < 20; i++) {
      act(() => result.current.zoomOut());
    }
    expect(result.current.zoom).toBeCloseTo(0.3, 1);
  });

  it('resetView restores zoom and pan', () => {
    const { result } = renderHook(() => useMindMapZoomPan());
    act(() => {
      result.current.zoomIn();
      result.current.zoomIn();
    });
    expect(result.current.zoom).toBeCloseTo(1.4);

    act(() => result.current.resetView());
    expect(result.current.zoom).toBe(1);
    expect(result.current.pan).toEqual({ x: 0, y: 0 });
  });

  it('handleMouseUp stops panning', () => {
    const { result } = renderHook(() => useMindMapZoomPan());
    act(() => result.current.handleMouseUp());
    expect(result.current.isPanning).toBe(false);
  });
});
