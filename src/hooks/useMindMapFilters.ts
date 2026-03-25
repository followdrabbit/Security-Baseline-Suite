import { useState, useCallback, useMemo } from 'react';
import type { ControlItem } from '@/types';
import type { MindMapNode } from '@/components/mindmap/types';

interface CategoryLike {
  id: string;
  children?: MindMapNode[];
}

export function useMindMapFilters(controls: ControlItem[], categories: CategoryLike[]) {
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

  const matchingCategoryIds = useMemo(() => {
    if (!matchingControlIds) return null;
    const ids = new Set<string>();
    for (const cat of categories) {
      if ((cat.children || []).some(ctrl => matchingControlIds.has(ctrl.id))) ids.add(cat.id);
    }
    return ids;
  }, [matchingControlIds, categories]);

  const clearFilters = useCallback(() => {
    setSearchText('');
    setCriticalityFilter('all');
    setStatusFilter('all');
  }, []);

  return {
    searchText, setSearchText,
    criticalityFilter, setCriticalityFilter,
    statusFilter, setStatusFilter,
    hasActiveFilter, matchingControlIds, matchingCategoryIds, clearFilters,
  };
}
