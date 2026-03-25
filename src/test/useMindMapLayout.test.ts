import { describe, it, expect } from 'vitest';
import { renderHook } from '@testing-library/react';
import { useMindMapLayout } from '@/hooks/useMindMapLayout';
import type { ControlItem } from '@/types';

const makeControl = (overrides: Partial<ControlItem> & { id: string; controlId: string; title: string; category: string }): ControlItem => ({
  projectId: 'proj-1',
  description: '',
  applicability: '',
  securityRisk: '',
  criticality: 'medium',
  defaultBehaviorLimitations: '',
  automation: '',
  references: [],
  frameworkMappings: [],
  sourceTraceability: [],
  confidenceScore: 0.9,
  reviewStatus: 'pending',
  reviewerNotes: '',
  version: 1,
  ...overrides,
});

const controls: ControlItem[] = [
  makeControl({ id: '1', controlId: 'S3-SEC-001', title: 'Block Public Access', criticality: 'critical', reviewStatus: 'approved', category: 'identity' }),
  makeControl({ id: '2', controlId: 'S3-SEC-002', title: 'Enable Encryption', criticality: 'high', reviewStatus: 'reviewed', category: 'encryption' }),
  makeControl({ id: '3', controlId: 'K8S-SEC-001', title: 'Enable RBAC', criticality: 'critical', reviewStatus: 'pending', category: 'identity' }),
];

const categoryLabels: Record<string, string> = {
  identity: 'Identity & Access',
  encryption: 'Encryption & Data Protection',
};

describe('useMindMapLayout', () => {
  it('returns correct SVG dimensions', () => {
    const { result } = renderHook(() => useMindMapLayout(controls, 'AWS S3', categoryLabels));
    expect(result.current.svgWidth).toBe(900);
    expect(result.current.svgHeight).toBeGreaterThanOrEqual(500);
    expect(result.current.centerX).toBe(450);
    expect(result.current.centerY).toBe(result.current.svgHeight / 2);
  });

  it('groups controls into categories following predefined order', () => {
    const { result } = renderHook(() => useMindMapLayout(controls, 'AWS S3', categoryLabels));
    const cats = result.current.categories;
    expect(cats.length).toBe(2);
    // identity comes before encryption in the predefined order
    expect(cats[0].category).toBe('identity');
    expect(cats[1].category).toBe('encryption');
  });

  it('uses categoryLabels for display names', () => {
    const { result } = renderHook(() => useMindMapLayout(controls, 'AWS S3', categoryLabels));
    expect(result.current.categories[0].label).toBe('Identity & Access');
    expect(result.current.categories[1].label).toBe('Encryption & Data Protection');
  });

  it('falls back to category key when label is missing', () => {
    const { result } = renderHook(() => useMindMapLayout(controls, 'AWS S3', {}));
    expect(result.current.categories[0].label).toBe('identity');
  });

  it('maps control fields correctly into MindMapNode', () => {
    const { result } = renderHook(() => useMindMapLayout(controls, 'AWS S3', categoryLabels));
    const identityCat = result.current.categories[0];
    const children = identityCat.children || [];
    expect(children.length).toBe(2);

    const first = children[0];
    expect(first.id).toBe('1');
    expect(first.label).toBe('S3-SEC-001');
    expect(first.sublabel).toBe('Block Public Access');
    expect(first.criticality).toBe('critical');
    expect(first.reviewStatus).toBe('approved');
    expect(first.confidence).toBe(0.9);
  });

  it('generates category positions in a circular layout', () => {
    const { result } = renderHook(() => useMindMapLayout(controls, 'AWS S3', categoryLabels));
    const positions = result.current.categoryPositions;
    expect(positions.length).toBe(2);

    for (const pos of positions) {
      expect(pos.x).toBeGreaterThan(0);
      expect(pos.y).toBeGreaterThan(0);
      expect(typeof pos.angle).toBe('number');
    }

    // Positions should be distinct
    expect(positions[0].x).not.toBeCloseTo(positions[1].x, 0);
  });

  it('generates control positions linked to parent categories', () => {
    const { result } = renderHook(() => useMindMapLayout(controls, 'AWS S3', categoryLabels));
    const ctrlPos = result.current.controlPositions;
    expect(ctrlPos.length).toBe(3);

    for (const pos of ctrlPos) {
      expect(pos.x).toBeGreaterThan(0);
      expect(pos.y).toBeGreaterThan(0);
      expect(pos.parentX).toBeGreaterThan(0);
      expect(pos.parentY).toBeGreaterThan(0);
      expect(pos.catColor).toBeTruthy();
    }
  });

  it('control positions are farther from center than category positions', () => {
    const { result } = renderHook(() => useMindMapLayout(controls, 'AWS S3', categoryLabels));
    const { centerX, centerY, categoryPositions, controlPositions } = result.current;

    const catDist = Math.hypot(categoryPositions[0].x - centerX, categoryPositions[0].y - centerY);
    const ctrlDist = Math.hypot(controlPositions[0].x - centerX, controlPositions[0].y - centerY);
    expect(ctrlDist).toBeGreaterThan(catDist);
  });

  it('handles empty controls array', () => {
    const { result } = renderHook(() => useMindMapLayout([], 'Empty', categoryLabels));
    expect(result.current.categories.length).toBe(0);
    expect(result.current.categoryPositions.length).toBe(0);
    expect(result.current.controlPositions.length).toBe(0);
  });

  it('places unknown categories after predefined ones', () => {
    const customControls = [
      ...controls,
      makeControl({ id: '4', controlId: 'CUSTOM-001', title: 'Custom Control', category: 'zzz_custom' }),
    ];
    const { result } = renderHook(() => useMindMapLayout(customControls, 'Test', categoryLabels));
    const cats = result.current.categories;
    expect(cats[cats.length - 1].category).toBe('zzz_custom');
    expect(cats[cats.length - 1].label).toBe('zzz_custom');
  });
});
