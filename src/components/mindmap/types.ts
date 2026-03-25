export interface MindMapNode {
  id: string;
  label: string;
  sublabel?: string;
  children?: MindMapNode[];
  criticality?: string;
  reviewStatus?: string;
  confidence?: number;
  category?: string;
}

export interface CategoryPosition extends MindMapNode {
  x: number;
  y: number;
  angle: number;
}

export interface ControlPosition {
  ctrl: MindMapNode;
  x: number;
  y: number;
  parentX: number;
  parentY: number;
  catColor: string;
}

export const CATEGORY_COLORS: Record<string, string> = {
  identity: '43, 55%, 55%',
  encryption: '210, 65%, 55%',
  logging: '152, 50%, 45%',
  network: '280, 50%, 55%',
  storage: '38, 85%, 55%',
  runtime: '0, 55%, 50%',
  cicd: '190, 60%, 45%',
};

export const CRITICALITY_RING: Record<string, string> = {
  critical: 'hsl(0, 65%, 50%)',
  high: 'hsl(25, 80%, 50%)',
  medium: 'hsl(38, 85%, 55%)',
  low: 'hsl(152, 50%, 45%)',
  informational: 'hsl(210, 65%, 55%)',
};
