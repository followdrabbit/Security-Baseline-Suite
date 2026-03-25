export type Locale = 'en' | 'pt' | 'es';
export type ThemeMode = 'light' | 'dark' | 'auto';

export type ProjectStatus = 'draft' | 'in_progress' | 'review' | 'approved' | 'archived';
export type SourceStatus = 'pending' | 'validated' | 'extracting' | 'normalized' | 'processed' | 'failed';
export type SourceType = 'url' | 'document';
export type ReviewStatus = 'pending' | 'reviewed' | 'approved' | 'rejected' | 'adjusted';
export type Criticality = 'critical' | 'high' | 'medium' | 'low' | 'informational';
export type StrideCategory = 'spoofing' | 'tampering' | 'repudiation' | 'information_disclosure' | 'denial_of_service' | 'elevation_of_privilege';
export type ThreatLikelihood = 'very_high' | 'high' | 'medium' | 'low' | 'very_low';

export interface ThreatScenario {
  id: string;
  threatName: string;
  strideCategory: StrideCategory;
  attackVector: string;
  threatAgent: string;
  preconditions: string;
  impact: string;
  likelihood: ThreatLikelihood;
  mitigations: string[];
  residualRisk: string;
}
export type PipelineStage = 'source_ingestion' | 'content_extraction' | 'normalization' | 'evidence_grouping' | 'control_extraction' | 'deduplication' | 'baseline_composition' | 'technical_review' | 'final_proposal';
export type PipelineStageStatus = 'pending' | 'running' | 'completed' | 'failed';

export interface Project {
  id: string;
  name: string;
  technology: string;
  vendor: string;
  version: string;
  category: string;
  outputLanguage: Locale;
  createdAt: string;
  updatedAt: string;
  status: ProjectStatus;
  tags: string[];
  notes: string;
  controlCount: number;
  sourceCount: number;
  avgConfidence: number;
}

export interface SourceItem {
  id: string;
  projectId: string;
  type: SourceType;
  name: string;
  url?: string;
  fileName?: string;
  fileType?: string;
  status: SourceStatus;
  addedAt: string;
  tags: string[];
  preview: string;
  confidence: number;
  origin: string;
}

export interface ControlItem {
  id: string;
  projectId: string;
  controlId: string;
  title: string;
  description: string;
  applicability: string;
  securityRisk: string;
  criticality: Criticality;
  defaultBehaviorLimitations: string;
  automation: string;
  references: string[];
  frameworkMappings: string[];
  threatScenarios: ThreatScenario[];
  sourceTraceability: SourceTraceability[];
  confidenceScore: number;
  reviewStatus: ReviewStatus;
  reviewerNotes: string;
  version: number;
  category: string;
}

export interface SourceTraceability {
  sourceId: string;
  sourceName: string;
  excerpt: string;
  sourceType: SourceType;
  confidence: number;
}

export interface TemplateRule {
  id: string;
  name: string;
  description: string;
  language: Locale;
  controlStructure: string;
  writingRules: string;
  riskRules: string;
  criticalityRules: string;
  dedupRules: string;
  mappingRules: string;
  threatModelingRules: string;
  isDefault: boolean;
}

export interface PipelineStep {
  stage: PipelineStage;
  status: PipelineStageStatus;
  progress: number;
  message: string;
  startedAt?: string;
  completedAt?: string;
  itemsProcessed?: number;
  itemsTotal?: number;
}

export interface BaselineVersion {
  id: string;
  projectId: string;
  version: number;
  createdAt: string;
  author: string;
  status: ProjectStatus;
  controlCount: number;
  changesSummary: string;
}

export interface UserSettings {
  language: Locale;
  theme: ThemeMode;
  tooltipMode: 'all' | 'minimal' | 'off';
  exportFormat: 'json' | 'markdown' | 'pdf';
  defaultTemplate: string;
  aiStrictness: 'conservative' | 'balanced' | 'aggressive';
}
