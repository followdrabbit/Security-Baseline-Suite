export const FRAMEWORK_COLORS: Record<string, string> = {
  'CIS': '#8b5cf6',
  'NIST': '#3b82f6',
  'ISO': '#10b981',
  'SOC': '#f59e0b',
  'PCI': '#ef4444',
  'Other': '#6b7280',
};

export const getFrameworkPrefix = (mapping: string): string => {
  if (mapping.startsWith('CIS')) return 'CIS';
  if (mapping.startsWith('NIST')) return 'NIST';
  if (mapping.startsWith('ISO')) return 'ISO';
  if (mapping.startsWith('SOC')) return 'SOC';
  if (mapping.startsWith('PCI')) return 'PCI';
  return 'Other';
};

export interface FrameworkDatum {
  framework: string;
  controls: number;
  fullMark: number;
  color: string;
}
