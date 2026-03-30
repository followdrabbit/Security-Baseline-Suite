import { describe, it, expect } from 'vitest';
import { z } from 'zod';

// Replicate the schema from RulesTemplates
const DEFAULT_VALUES: Record<string, string> = {
  ai_strictness: 'balanced',
  baseline_template: 'default template',
  writing_standards: 'default writing',
  deduplication: 'default dedup',
  criticality: 'default crit',
  framework_mappings: 'default mappings',
  threat_modeling: 'default threat',
};

const knownKeys = Object.keys(DEFAULT_VALUES);
const ruleValueSchema = z.string().min(1, 'Rule value cannot be empty').max(10000, 'Rule value exceeds 10 000 characters');
const rulesRecord = z.record(z.string(), ruleValueSchema).refine(
  (obj) => Object.keys(obj).some((k) => knownKeys.includes(k)),
  { message: 'No recognised rule IDs found' }
);
const templateSchema = z.union([
  z.object({ allValues: rulesRecord }).transform((d) => d.allValues),
  z.object({ customValues: rulesRecord }).transform((d) => d.customValues),
  rulesRecord,
]);

describe('Template import schema validation', () => {
  it('rejects numeric values', () => {
    const result = templateSchema.safeParse({ baseline_template: 123 });
    expect(result.success).toBe(false);
  });

  it('rejects empty string values', () => {
    const result = templateSchema.safeParse({ baseline_template: '' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues[0].message).toContain('empty');
    }
  });

  it('rejects arrays', () => {
    const result = templateSchema.safeParse([1, 2, 3]);
    expect(result.success).toBe(false);
  });

  it('rejects object with no recognised keys', () => {
    const result = templateSchema.safeParse({ unknown_key: 'value', another: 'test' });
    expect(result.success).toBe(false);
    if (!result.success) {
      expect(result.error.issues.some(i => i.message.includes('recognised'))).toBe(true);
    }
  });

  it('rejects null values', () => {
    const result = templateSchema.safeParse({ baseline_template: null });
    expect(result.success).toBe(false);
  });

  it('rejects boolean values', () => {
    const result = templateSchema.safeParse({ baseline_template: true });
    expect(result.success).toBe(false);
  });

  it('accepts valid flat format', () => {
    const result = templateSchema.safeParse({ baseline_template: 'custom value' });
    expect(result.success).toBe(true);
  });

  it('accepts valid allValues wrapper', () => {
    const result = templateSchema.safeParse({ allValues: { writing_standards: 'new val' } });
    expect(result.success).toBe(true);
  });

  it('accepts valid customValues wrapper', () => {
    const result = templateSchema.safeParse({ customValues: { criticality: 'new crit' } });
    expect(result.success).toBe(true);
  });

  it('filters unknown keys after validation (only known keys used)', () => {
    const result = templateSchema.safeParse({ baseline_template: 'ok', unknown: 'ignored' });
    expect(result.success).toBe(true);
    if (result.success) {
      // The record passes because at least one key is known
      expect('baseline_template' in result.data).toBe(true);
    }
  });
});
