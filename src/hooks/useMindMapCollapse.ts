import { useState, useCallback } from 'react';

export function useMindMapCollapse(categoryIds: string[]) {
  const [collapsedCategories, setCollapsedCategories] = useState<Set<string>>(new Set());

  const toggleCategory = useCallback((catId: string) => {
    setCollapsedCategories(prev => {
      const next = new Set(prev);
      if (next.has(catId)) next.delete(catId); else next.add(catId);
      return next;
    });
  }, []);

  const toggleCollapseAll = useCallback(() => {
    setCollapsedCategories(prev =>
      prev.size === categoryIds.length ? new Set() : new Set(categoryIds)
    );
  }, [categoryIds]);

  const isAllCollapsed = collapsedCategories.size === categoryIds.length && categoryIds.length > 0;

  return { collapsedCategories, toggleCategory, toggleCollapseAll, isAllCollapsed };
}
