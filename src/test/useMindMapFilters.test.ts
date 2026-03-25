import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useMindMapFilters } from '@/hooks/useMindMapFilters';
import type { ControlItem } from '@/types';

const makeControl = (overrides: Partial<ControlItem> & { id: string; controlId: string; title: string }): ControlItem => ({
  projectId: 'proj-1',
  description: '',
  applicability: '',
  securityRisk: '',
  criticality: 'medium',
  defaultBehaviorLimitations: '',
  automation: '',
  references: [],
  frameworkMappings: [],
  threatScenarios: [],
  sourceTraceability: [],
  confidenceScore: 0.9,
  reviewStatus: 'pending',
  reviewerNotes: '',
  version: 1,
  category: 'identity',
  ...overrides,
});

const controls: ControlItem[] = [
  makeControl({ id: '1', controlId: 'S3-SEC-001', title: 'Block Public Access', criticality: 'critical', reviewStatus: 'approved', category: 'identity' }),
  makeControl({ id: '2', controlId: 'S3-SEC-002', title: 'Enable Encryption', criticality: 'high', reviewStatus: 'reviewed', category: 'encryption' }),
  makeControl({ id: '3', controlId: 'K8S-SEC-001', title: 'Enable RBAC', criticality: 'critical', reviewStatus: 'pending', category: 'identity' }),
];

const categories = [
  { id: 'cat-identity', children: [{ id: '1', label: 'S3-SEC-001' }, { id: '3', label: 'K8S-SEC-001' }] },
  { id: 'cat-encryption', children: [{ id: '2', label: 'S3-SEC-002' }] },
];

describe('useMindMapFilters', () => {
  it('starts with no active filters', () => {
    const { result } = renderHook(() => useMindMapFilters(controls, categories));
    expect(result.current.hasActiveFilter).toBe(false);
    expect(result.current.matchingControlIds).toBeNull();
    expect(result.current.matchingCategoryIds).toBeNull();
  });

  it('filters by search text', () => {
    const { result } = renderHook(() => useMindMapFilters(controls, categories));
    act(() => result.current.setSearchText('RBAC'));
    expect(result.current.hasActiveFilter).toBe(true);
    expect(result.current.matchingControlIds?.size).toBe(1);
    expect(result.current.matchingControlIds?.has('3')).toBe(true);
  });

  it('filters by controlId search', () => {
    const { result } = renderHook(() => useMindMapFilters(controls, categories));
    act(() => result.current.setSearchText('s3-sec'));
    expect(result.current.matchingControlIds?.size).toBe(2);
    expect(result.current.matchingControlIds?.has('1')).toBe(true);
    expect(result.current.matchingControlIds?.has('2')).toBe(true);
  });

  it('filters by criticality', () => {
    const { result } = renderHook(() => useMindMapFilters(controls, categories));
    act(() => result.current.setCriticalityFilter('critical'));
    expect(result.current.matchingControlIds?.size).toBe(2);
    expect(result.current.matchingControlIds?.has('1')).toBe(true);
    expect(result.current.matchingControlIds?.has('3')).toBe(true);
  });

  it('filters by status', () => {
    const { result } = renderHook(() => useMindMapFilters(controls, categories));
    act(() => result.current.setStatusFilter('approved'));
    expect(result.current.matchingControlIds?.size).toBe(1);
    expect(result.current.matchingControlIds?.has('1')).toBe(true);
  });

  it('combines search and criticality filters', () => {
    const { result } = renderHook(() => useMindMapFilters(controls, categories));
    act(() => {
      result.current.setSearchText('S3');
      result.current.setCriticalityFilter('critical');
    });
    expect(result.current.matchingControlIds?.size).toBe(1);
    expect(result.current.matchingControlIds?.has('1')).toBe(true);
  });

  it('computes matchingCategoryIds from matched controls', () => {
    const { result } = renderHook(() => useMindMapFilters(controls, categories));
    act(() => result.current.setCriticalityFilter('high'));
    expect(result.current.matchingCategoryIds?.size).toBe(1);
    expect(result.current.matchingCategoryIds?.has('cat-encryption')).toBe(true);
  });

  it('clearFilters resets all', () => {
    const { result } = renderHook(() => useMindMapFilters(controls, categories));
    act(() => {
      result.current.setSearchText('test');
      result.current.setCriticalityFilter('critical');
      result.current.setStatusFilter('approved');
    });
    expect(result.current.hasActiveFilter).toBe(true);

    act(() => result.current.clearFilters());
    expect(result.current.hasActiveFilter).toBe(false);
    expect(result.current.matchingControlIds).toBeNull();
  });
});
