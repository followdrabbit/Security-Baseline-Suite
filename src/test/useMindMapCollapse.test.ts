import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMindMapCollapse } from '@/hooks/useMindMapCollapse';

describe('useMindMapCollapse', () => {
  const categoryIds = ['cat-identity', 'cat-encryption', 'cat-network'];

  it('starts with no collapsed categories', () => {
    const { result } = renderHook(() => useMindMapCollapse(categoryIds));
    expect(result.current.collapsedCategories.size).toBe(0);
    expect(result.current.isAllCollapsed).toBe(false);
  });

  it('toggleCategory collapses and expands a single category', () => {
    const { result } = renderHook(() => useMindMapCollapse(categoryIds));

    act(() => result.current.toggleCategory('cat-identity'));
    expect(result.current.collapsedCategories.has('cat-identity')).toBe(true);
    expect(result.current.collapsedCategories.size).toBe(1);

    act(() => result.current.toggleCategory('cat-identity'));
    expect(result.current.collapsedCategories.has('cat-identity')).toBe(false);
  });

  it('toggleCollapseAll collapses all then expands all', () => {
    const { result } = renderHook(() => useMindMapCollapse(categoryIds));

    act(() => result.current.toggleCollapseAll());
    expect(result.current.collapsedCategories.size).toBe(3);
    expect(result.current.isAllCollapsed).toBe(true);

    act(() => result.current.toggleCollapseAll());
    expect(result.current.collapsedCategories.size).toBe(0);
    expect(result.current.isAllCollapsed).toBe(false);
  });

  it('isAllCollapsed is false for empty categoryIds', () => {
    const { result } = renderHook(() => useMindMapCollapse([]));
    expect(result.current.isAllCollapsed).toBe(false);
  });
});
