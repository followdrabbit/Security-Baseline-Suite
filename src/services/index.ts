import { mockProjects, mockSources, mockControls, mockPipeline, mockVersions, mockTemplates } from '@/data/mockData';
import type { Project, SourceItem, ControlItem, PipelineStep, BaselineVersion, TemplateRule, UserSettings } from '@/types';

// Service abstractions prepared for future backend integration

export const projectService = {
  getAll: async (): Promise<Project[]> => mockProjects,
  getById: async (id: string): Promise<Project | undefined> => mockProjects.find(p => p.id === id),
  create: async (project: Partial<Project>): Promise<Project> => ({ ...mockProjects[0], ...project, id: `proj-${Date.now()}` }),
  update: async (id: string, data: Partial<Project>): Promise<Project> => ({ ...mockProjects[0], ...data }),
  delete: async (_id: string): Promise<void> => {},
};

export const sourceService = {
  getByProject: async (_projectId: string): Promise<SourceItem[]> => mockSources,
  add: async (source: Partial<SourceItem>): Promise<SourceItem> => ({ ...mockSources[0], ...source, id: `src-${Date.now()}` }),
  remove: async (_id: string): Promise<void> => {},
  updateStatus: async (id: string, status: SourceItem['status']): Promise<SourceItem> => ({ ...mockSources[0], id, status }),
};

export const baselineService = {
  getControls: async (_projectId: string): Promise<ControlItem[]> => mockControls,
  updateControl: async (id: string, data: Partial<ControlItem>): Promise<ControlItem> => ({ ...mockControls[0], ...data, id }),
  approveControl: async (id: string): Promise<ControlItem> => ({ ...mockControls[0], id, reviewStatus: 'approved' }),
  rejectControl: async (id: string): Promise<ControlItem> => ({ ...mockControls[0], id, reviewStatus: 'rejected' }),
};

export const aiPipelineService = {
  getStatus: async (_projectId: string): Promise<PipelineStep[]> => mockPipeline,
  start: async (_projectId: string): Promise<void> => {},
  pause: async (_projectId: string): Promise<void> => {},
  reset: async (_projectId: string): Promise<void> => {},
};

export const exportService = {
  exportJSON: async (_projectId: string): Promise<Blob> => new Blob(['{}'], { type: 'application/json' }),
  exportMarkdown: async (_projectId: string): Promise<Blob> => new Blob(['# Baseline'], { type: 'text/markdown' }),
  exportPDF: async (_projectId: string): Promise<Blob> => new Blob(['PDF'], { type: 'application/pdf' }),
  importProject: async (_file: File): Promise<Project> => mockProjects[0],
};

export const settingsService = {
  get: async (): Promise<UserSettings> => ({
    language: 'en', theme: 'dark', tooltipMode: 'all', exportFormat: 'json',
    defaultTemplate: 'tmpl-001', aiStrictness: 'balanced',
  }),
  update: async (settings: Partial<UserSettings>): Promise<UserSettings> => ({
    language: 'en', theme: 'dark', tooltipMode: 'all', exportFormat: 'json',
    defaultTemplate: 'tmpl-001', aiStrictness: 'balanced', ...settings,
  }),
};

export const versionService = {
  getByProject: async (_projectId: string): Promise<BaselineVersion[]> => mockVersions,
  compare: async (_v1: string, _v2: string): Promise<{ added: number; removed: number; modified: number }> =>
    ({ added: 2, removed: 5, modified: 3 }),
};

export const templateService = {
  getAll: async (): Promise<TemplateRule[]> => mockTemplates,
  getById: async (id: string): Promise<TemplateRule | undefined> => mockTemplates.find(t => t.id === id),
  save: async (template: Partial<TemplateRule>): Promise<TemplateRule> => ({ ...mockTemplates[0], ...template }),
};
