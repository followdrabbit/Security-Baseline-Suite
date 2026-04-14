import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { SettingsSectionSkeleton } from '@/components/skeletons/SkeletonPremium';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import HelpButton from '@/components/HelpButton';
import { useToast } from '@/hooks/use-toast';
import { aiConfigService, type AIProviderCatalogEntry, type AIProviderModelEntry } from '@/services/aiService';
import { localDb } from '@/integrations/localdb/client';
import {
  Brain,
  Eye,
  EyeOff,
  Key,
  LogIn,
  RefreshCw,
  Server,
  Sparkles,
  Zap,
} from 'lucide-react';

interface AIProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  models: string[];
  defaultModel: string;
  docsUrl: string;
  requiresApiKey: boolean;
  supportsEndpoint?: boolean;
  endpointPlaceholder?: string;
  credentialScope: 'provider' | 'model';
  endpointScope: 'none' | 'provider' | 'model';
}

const FALLBACK_AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models for control generation and structured security analysis.',
    icon: 'OAI',
    models: [
      'gpt-5.4',
      'gpt-5.4-pro',
      'gpt-5.4-mini',
      'gpt-5.4-nano',
      'gpt-5',
      'gpt-5-mini',
      'gpt-5-nano',
      'gpt-5.2',
      'gpt-5.1',
      'gpt-4.1',
      'gpt-4.1-mini',
      'gpt-4.1-nano',
      'gpt-4o',
      'gpt-4o-mini',
    ],
    defaultModel: 'gpt-4.1-mini',
    docsUrl: 'https://platform.openai.com/api-keys',
    requiresApiKey: true,
    supportsEndpoint: false,
    credentialScope: 'provider',
    endpointScope: 'none',
  },
  {
    id: 'azure_openai',
    name: 'Azure OpenAI',
    description: 'Azure OpenAI deployments where API key and endpoint are configured per model.',
    icon: 'AZR',
    models: ['gpt-4.1', 'gpt-4o', 'o4-mini'],
    defaultModel: 'gpt-4.1',
    docsUrl: 'https://learn.microsoft.com/azure/ai-services/openai/how-to/create-resource',
    requiresApiKey: true,
    supportsEndpoint: true,
    endpointPlaceholder: 'https://<resource>.openai.azure.com',
    credentialScope: 'model',
    endpointScope: 'model',
  },
  {
    id: 'google',
    name: 'Google Gemini',
    description: 'Gemini models optimized for long-context source processing.',
    icon: 'GEM',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash'],
    defaultModel: 'gemini-2.5-pro',
    docsUrl: 'https://aistudio.google.com/app/apikey',
    requiresApiKey: true,
    supportsEndpoint: false,
    credentialScope: 'provider',
    endpointScope: 'none',
  },
  {
    id: 'anthropic',
    name: 'Anthropic Claude',
    description: 'Claude models for deep reasoning and policy-oriented controls.',
    icon: 'CLA',
    models: ['claude-3-7-sonnet-latest', 'claude-3-5-sonnet-latest', 'claude-3-5-haiku-latest'],
    defaultModel: 'claude-3-7-sonnet-latest',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    requiresApiKey: true,
    supportsEndpoint: false,
    credentialScope: 'provider',
    endpointScope: 'none',
  },
  {
    id: 'xai',
    name: 'Grok (xAI)',
    description: 'xAI models for fast synthesis and large-scale baseline drafts.',
    icon: 'XAI',
    models: ['grok-4', 'grok-3', 'grok-3-mini'],
    defaultModel: 'grok-3',
    docsUrl: 'https://console.x.ai',
    requiresApiKey: true,
    supportsEndpoint: false,
    credentialScope: 'provider',
    endpointScope: 'none',
  },
  {
    id: 'ollama',
    name: 'Ollama (Local)',
    description: 'Run local models on your infrastructure (no cloud API key required).',
    icon: 'LOC',
    models: ['llama3.2', 'qwen2.5:14b', 'mistral'],
    defaultModel: 'llama3.2',
    docsUrl: 'https://ollama.com/library',
    requiresApiKey: false,
    supportsEndpoint: true,
    endpointPlaceholder: 'http://127.0.0.1:11434',
    credentialScope: 'provider',
    endpointScope: 'provider',
  },
];

type ProviderDraft = {
  providerId: string;
  name: string;
  description: string;
  icon: string;
  docsUrl: string;
  requiresApiKey: boolean;
  supportsEndpoint: boolean;
  endpointPlaceholder: string;
  defaultModel: string;
  credentialScope: 'provider' | 'model';
  endpointScope: 'none' | 'provider' | 'model';
};

const emptyProviderDraft = (): ProviderDraft => ({
  providerId: '',
  name: '',
  description: '',
  icon: 'CUS',
  docsUrl: '',
  requiresApiKey: true,
  supportsEndpoint: false,
  endpointPlaceholder: '',
  defaultModel: '',
  credentialScope: 'provider',
  endpointScope: 'provider',
});

const normalizeProviderIdInput = (value: string): string => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9_-]/g, '-')
  .replace(/-+/g, '-');

const normalizeProviderId = (value: string): string => normalizeProviderIdInput(value)
  .replace(/^-|-$/g, '');

const normalizeProviderKey = (value: string | null | undefined): string =>
  String(value || '').trim().toLowerCase();

const isBuiltinFallbackProvider = (providerId: string): boolean =>
  FALLBACK_AI_PROVIDERS.some(
    provider => normalizeProviderKey(provider.id) === normalizeProviderKey(providerId),
  );

const normalizeModelId = (value: string): string => String(value || '').trim();

const VIRTUAL_MODEL_ROW_PREFIX = '__virtual_model__:';

const buildVirtualModelRowId = (modelId: string): string =>
  `${VIRTUAL_MODEL_ROW_PREFIX}${encodeURIComponent(normalizeModelId(modelId))}`;

const parseVirtualModelId = (rowId: string): string | null => {
  if (!String(rowId || '').startsWith(VIRTUAL_MODEL_ROW_PREFIX)) return null;
  const encoded = String(rowId).slice(VIRTUAL_MODEL_ROW_PREFIX.length);
  if (!encoded) return null;
  try {
    return normalizeModelId(decodeURIComponent(encoded));
  } catch {
    return null;
  }
};

const isVirtualModelRowId = (rowId: string): boolean =>
  String(rowId || '').startsWith(VIRTUAL_MODEL_ROW_PREFIX);

const iconFromName = (name: string): string => {
  const cleaned = String(name || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return cleaned.slice(0, 3) || 'CUS';
};

const parseProviderScope = (
  providerId: string,
  supportsEndpoint: boolean,
  extraConfig: Record<string, any> | null | undefined,
): { credentialScope: 'provider' | 'model'; endpointScope: 'none' | 'provider' | 'model' } => {
  const normalizedProviderId = String(providerId || '').trim().toLowerCase();
  const extra = extraConfig && typeof extraConfig === 'object' ? extraConfig : {};
  const extraCredentialScope = String((extra as any).credential_scope || '').toLowerCase();
  const extraEndpointScope = String((extra as any).endpoint_scope || '').toLowerCase();

  const credentialScope: 'provider' | 'model' = (extraCredentialScope === 'model' || normalizedProviderId === 'azure_openai')
    ? 'model'
    : 'provider';

  if (!supportsEndpoint) {
    return { credentialScope, endpointScope: 'none' };
  }

  if (extraEndpointScope === 'model') {
    return { credentialScope, endpointScope: 'model' };
  }
  if (extraEndpointScope === 'provider') {
    return { credentialScope, endpointScope: 'provider' };
  }

  return { credentialScope, endpointScope: credentialScope === 'model' ? 'model' : 'provider' };
};

const isProviderCatalogRowActive = (row: Pick<AIProviderCatalogEntry, 'is_active'>): boolean =>
  row.is_active !== false;

const isProviderModelRowActive = (row: Pick<AIProviderModelEntry, 'is_active'>): boolean =>
  row.is_active !== false;

const buildProvidersFromCatalog = (
  providerRows: AIProviderCatalogEntry[],
  modelRows: AIProviderModelEntry[],
): AIProvider[] => {
  const byProvider = new Map<string, AIProviderModelEntry[]>();
  for (const modelRow of modelRows) {
    if (!isProviderModelRowActive(modelRow)) continue;
    const providerKey = normalizeProviderKey(modelRow.provider_id);
    if (!providerKey) continue;
    const list = byProvider.get(providerKey) || [];
    list.push(modelRow);
    byProvider.set(providerKey, list);
  }

  const result: AIProvider[] = [];
  for (const row of providerRows) {
    if (!isProviderCatalogRowActive(row)) continue;
    const providerKey = normalizeProviderKey(row.provider_id);
    if (!providerKey) continue;

    const models = (byProvider.get(providerKey) || [])
      .slice()
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.model_id).localeCompare(String(b.model_id)))
      .map((item) => String(item.model_id || '').trim())
      .filter(Boolean);

    if (!models.length) {
      continue;
    }

    const defaultModel = (byProvider.get(providerKey) || []).find(model => model.is_default)?.model_id || models[0];
    const supportsEndpoint = Boolean(row.supports_endpoint);
    const providerScope = parseProviderScope(row.provider_id, supportsEndpoint, row.extra_config);

    result.push({
      id: row.provider_id,
      name: row.name || row.provider_id,
      description: row.description || '',
      icon: row.icon || iconFromName(row.name || row.provider_id),
      models,
      defaultModel: defaultModel || models[0],
      docsUrl: row.docs_url || '',
      requiresApiKey: Boolean(row.requires_api_key),
      supportsEndpoint,
      endpointPlaceholder: row.endpoint_placeholder || '',
      credentialScope: providerScope.credentialScope,
      endpointScope: providerScope.endpointScope,
    });
  }

  if (!result.length) {
    return FALLBACK_AI_PROVIDERS;
  }

  return result.sort((a, b) => a.name.localeCompare(b.name));
};

type ModelParamValue = string | number | string[] | null;
type ModelParams = Record<string, ModelParamValue>;

type ModelParamType = 'number' | 'integer' | 'string' | 'string_list' | 'select';

interface ModelParamDefinition {
  key: string;
  label: string;
  description: string;
  type: ModelParamType;
  min?: number;
  max?: number;
  step?: number;
  options?: string[];
  defaultValue?: ModelParamValue;
  placeholder?: string;
}

const MODEL_PARAMS_BY_PROVIDER: Record<string, ModelParamDefinition[]> = {
  openai: [
    { key: 'temperature', label: 'temperature', description: 'Controls randomness of output.', type: 'number', min: 0, max: 2, step: 0.1, defaultValue: 1 },
    { key: 'top_p', label: 'top_p', description: 'Nucleus sampling probability mass.', type: 'number', min: 0, max: 1, step: 0.05, defaultValue: 1 },
    { key: 'max_output_tokens', label: 'max_output_tokens', description: 'Maximum output token budget.', type: 'integer', min: 1, defaultValue: 1024 },
    { key: 'reasoning_effort', label: 'reasoning_effort', description: 'Reasoning effort for supported reasoning models.', type: 'select', options: ['none', 'minimal', 'low', 'medium', 'high', 'xhigh'], defaultValue: 'medium' },
    { key: 'presence_penalty', label: 'presence_penalty', description: 'Penalizes tokens already present in context.', type: 'number', min: -2, max: 2, step: 0.1, defaultValue: 0 },
    { key: 'frequency_penalty', label: 'frequency_penalty', description: 'Penalizes repeated tokens by frequency.', type: 'number', min: -2, max: 2, step: 0.1, defaultValue: 0 },
    { key: 'seed', label: 'seed', description: 'Best-effort deterministic sampling seed.', type: 'integer', min: 0, defaultValue: 42 },
    { key: 'stop', label: 'stop', description: 'Stop sequences (comma-separated).', type: 'string_list', placeholder: 'END, STOP' },
  ],
  azure_openai: [
    { key: 'temperature', label: 'temperature', description: 'Controls randomness of output.', type: 'number', min: 0, max: 2, step: 0.1, defaultValue: 1 },
    { key: 'top_p', label: 'top_p', description: 'Nucleus sampling probability mass.', type: 'number', min: 0, max: 1, step: 0.05, defaultValue: 1 },
    { key: 'max_tokens', label: 'max_tokens', description: 'Maximum output token budget.', type: 'integer', min: 1, defaultValue: 1024 },
    { key: 'presence_penalty', label: 'presence_penalty', description: 'Penalizes tokens already present in context.', type: 'number', min: -2, max: 2, step: 0.1, defaultValue: 0 },
    { key: 'frequency_penalty', label: 'frequency_penalty', description: 'Penalizes repeated tokens by frequency.', type: 'number', min: -2, max: 2, step: 0.1, defaultValue: 0 },
    { key: 'seed', label: 'seed', description: 'Best-effort deterministic sampling seed.', type: 'integer', min: 0, defaultValue: 42 },
    { key: 'stop', label: 'stop', description: 'Stop sequences (comma-separated).', type: 'string_list', placeholder: 'END, STOP' },
  ],
  google: [
    { key: 'temperature', label: 'temperature', description: 'Controls randomness of output.', type: 'number', min: 0, max: 2, step: 0.1, defaultValue: 1 },
    { key: 'topP', label: 'topP', description: 'Nucleus sampling probability mass.', type: 'number', min: 0, max: 1, step: 0.05, defaultValue: 0.95 },
    { key: 'topK', label: 'topK', description: 'Top-K token sampling limit.', type: 'integer', min: 1, defaultValue: 40 },
    { key: 'maxOutputTokens', label: 'maxOutputTokens', description: 'Maximum output tokens for response candidates.', type: 'integer', min: 1, defaultValue: 1024 },
    { key: 'candidateCount', label: 'candidateCount', description: 'Number of response candidates to generate.', type: 'integer', min: 1, max: 8, defaultValue: 1 },
    { key: 'seed', label: 'seed', description: 'Sampling seed.', type: 'integer', min: 0, defaultValue: 42 },
    { key: 'presencePenalty', label: 'presencePenalty', description: 'Penalty for already-present tokens.', type: 'number', step: 0.1, defaultValue: 0 },
    { key: 'frequencyPenalty', label: 'frequencyPenalty', description: 'Penalty for frequently repeated tokens.', type: 'number', step: 0.1, defaultValue: 0 },
    { key: 'stopSequences', label: 'stopSequences', description: 'Stop sequences (comma-separated).', type: 'string_list', placeholder: 'END, STOP' },
    { key: 'thinkingBudget', label: 'thinkingBudget', description: 'Reasoning token budget for supported models.', type: 'integer', defaultValue: 1024 },
  ],
  anthropic: [
    { key: 'max_tokens', label: 'max_tokens', description: 'Maximum generated tokens.', type: 'integer', min: 1, defaultValue: 1024 },
    { key: 'temperature', label: 'temperature', description: 'Controls randomness of output.', type: 'number', min: 0, max: 1, step: 0.1, defaultValue: 1 },
    { key: 'top_p', label: 'top_p', description: 'Nucleus sampling probability mass.', type: 'number', min: 0, max: 1, step: 0.05, defaultValue: 1 },
    { key: 'top_k', label: 'top_k', description: 'Top-K token sampling limit.', type: 'integer', min: 0, defaultValue: 5 },
    { key: 'stop_sequences', label: 'stop_sequences', description: 'Stop sequences (comma-separated).', type: 'string_list', placeholder: 'END, STOP' },
    { key: 'thinking_budget_tokens', label: 'thinking_budget_tokens', description: 'Extended thinking budget for supported models.', type: 'integer', min: 1024, defaultValue: 2048 },
  ],
  xai: [
    { key: 'temperature', label: 'temperature', description: 'Controls randomness of output.', type: 'number', min: 0, max: 2, step: 0.1, defaultValue: 1 },
    { key: 'top_p', label: 'top_p', description: 'Nucleus sampling probability mass.', type: 'number', min: 0, max: 1, step: 0.05, defaultValue: 1 },
    { key: 'max_tokens', label: 'max_tokens', description: 'Maximum output token budget.', type: 'integer', min: 1, defaultValue: 1024 },
    { key: 'presence_penalty', label: 'presence_penalty', description: 'Penalizes tokens already present in context.', type: 'number', min: -2, max: 2, step: 0.1, defaultValue: 0 },
    { key: 'frequency_penalty', label: 'frequency_penalty', description: 'Penalizes repeated tokens by frequency.', type: 'number', min: -2, max: 2, step: 0.1, defaultValue: 0 },
    { key: 'reasoning_effort', label: 'reasoning_effort', description: 'Reasoning effort (supported by specific models only).', type: 'select', options: ['low', 'high'], defaultValue: 'high' },
    { key: 'seed', label: 'seed', description: 'Best-effort deterministic sampling seed.', type: 'integer', min: 0, defaultValue: 42 },
    { key: 'stop', label: 'stop', description: 'Stop sequences (comma-separated).', type: 'string_list', placeholder: 'END, STOP' },
  ],
  ollama: [
    { key: 'temperature', label: 'temperature', description: 'Controls randomness of output.', type: 'number', step: 0.1, defaultValue: 0.8 },
    { key: 'top_p', label: 'top_p', description: 'Nucleus sampling probability mass.', type: 'number', step: 0.05, defaultValue: 0.9 },
    { key: 'top_k', label: 'top_k', description: 'Top-K token sampling limit.', type: 'integer', min: 1, defaultValue: 40 },
    { key: 'min_p', label: 'min_p', description: 'Minimum probability threshold sampling.', type: 'number', step: 0.01, defaultValue: 0.05 },
    { key: 'num_predict', label: 'num_predict', description: 'Maximum tokens to predict.', type: 'integer', defaultValue: 256 },
    { key: 'num_ctx', label: 'num_ctx', description: 'Context window size.', type: 'integer', defaultValue: 4096 },
    { key: 'repeat_penalty', label: 'repeat_penalty', description: 'Penalty for repetitions.', type: 'number', step: 0.1, defaultValue: 1.1 },
    { key: 'repeat_last_n', label: 'repeat_last_n', description: 'Window for repetition checks.', type: 'integer', defaultValue: 64 },
    { key: 'seed', label: 'seed', description: 'Sampling seed.', type: 'integer', defaultValue: 42 },
    { key: 'stop', label: 'stop', description: 'Stop sequences (comma-separated).', type: 'string_list', placeholder: 'END, STOP' },
  ],
};

const getModelParamsForProvider = (providerId: string): ModelParamDefinition[] => MODEL_PARAMS_BY_PROVIDER[providerId] || [];

const parseModelParamValue = (rawValue: unknown, def: ModelParamDefinition): ModelParamValue => {
  if (rawValue === null || rawValue === undefined) return null;

  if (def.type === 'string_list') {
    if (Array.isArray(rawValue)) {
      const cleaned = rawValue
        .map((item) => String(item).trim())
        .filter(Boolean);
      return cleaned.length ? cleaned : null;
    }
    const value = String(rawValue)
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
    return value.length ? value : null;
  }

  if (def.type === 'integer') {
    const parsed = Number.parseInt(String(rawValue), 10);
    if (!Number.isFinite(parsed)) return null;
    const minChecked = def.min !== undefined ? Math.max(parsed, def.min) : parsed;
    const maxChecked = def.max !== undefined ? Math.min(minChecked, def.max) : minChecked;
    return maxChecked;
  }

  if (def.type === 'number') {
    const parsed = Number.parseFloat(String(rawValue));
    if (!Number.isFinite(parsed)) return null;
    const minChecked = def.min !== undefined ? Math.max(parsed, def.min) : parsed;
    const maxChecked = def.max !== undefined ? Math.min(minChecked, def.max) : minChecked;
    return maxChecked;
  }

  if (def.type === 'select') {
    const value = String(rawValue).trim();
    if (!value) return null;
    if (def.options?.length && !def.options.includes(value)) return null;
    return value;
  }

  const text = String(rawValue).trim();
  return text ? text : null;
};

const normalizeModelParams = (providerId: string, input: unknown): ModelParams => {
  if (!input || typeof input !== 'object') return {};

  const out: ModelParams = {};
  const defs = getModelParamsForProvider(providerId);
  const map = input as Record<string, unknown>;
  for (const def of defs) {
    const value = parseModelParamValue(map[def.key], def);
    if (value !== null) {
      out[def.key] = value;
    }
  }
  return out;
};

interface ProviderConfig {
  enabled: boolean;
  apiKey: string;
  hasStoredKey: boolean;
  selectedModel: string;
  fallbackModel: string;
  advancedParamsEnabled: boolean;
  modelParams: ModelParams;
  modelCredentials: Record<string, {
    apiKey: string;
    hasStoredKey: boolean;
    storedApiKeyToken?: string;
    endpointUrl: string;
  }>;
  modelRegistry: Record<string, {
    paramsEnabled: boolean;
    modelParams: ModelParams;
  }>;
  maxTokens: number;
  endpointUrl: string;
  connectionStatus: 'idle' | 'testing' | 'connected' | 'failed';
  isDefault: boolean;
}

const makeProviderConfig = (provider: AIProvider): ProviderConfig => ({
  enabled: provider.id === 'openai',
  apiKey: '',
  hasStoredKey: false,
  selectedModel: provider.defaultModel,
  fallbackModel: '',
  advancedParamsEnabled: false,
  modelParams: {},
  modelCredentials: {},
  modelRegistry: {},
  maxTokens: 65000,
  endpointUrl: provider.endpointScope === 'provider' && provider.id === 'ollama'
    ? (provider.endpointPlaceholder || 'http://127.0.0.1:11434')
    : '',
  connectionStatus: 'idle',
  isDefault: provider.id === 'openai',
});

const mergeConfigsWithProviders = (
  prev: Record<string, ProviderConfig>,
  providers: AIProvider[],
): Record<string, ProviderConfig> => {
  const next: Record<string, ProviderConfig> = {};

  for (const provider of providers) {
    const previous = prev[provider.id];
    const fallback = makeProviderConfig(provider);
    next[provider.id] = previous
      ? {
        ...fallback,
        ...previous,
        selectedModel: previous.selectedModel || fallback.selectedModel,
        endpointUrl: previous.endpointUrl || fallback.endpointUrl,
      }
      : fallback;
  }

  return next;
};

interface AIIntegrationsProps {
  embedded?: boolean;
}

const AIIntegrations: React.FC<AIIntegrationsProps> = ({ embedded = false }) => {
  const { t } = useI18n();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [providerCatalogRows, setProviderCatalogRows] = useState<AIProviderCatalogEntry[]>([]);
  const [providerModelRows, setProviderModelRows] = useState<AIProviderModelEntry[]>([]);
  const [providers, setProviders] = useState<AIProvider[]>(FALLBACK_AI_PROVIDERS);
  const [selectedProviderId, setSelectedProviderId] = useState<string>(FALLBACK_AI_PROVIDERS[0].id);
  const [configs, setConfigs] = useState<Record<string, ProviderConfig>>(() => mergeConfigsWithProviders({}, FALLBACK_AI_PROVIDERS));
  const [integrationDirtyByProvider, setIntegrationDirtyByProvider] = useState<Record<string, boolean>>({});
  const [workspaceTab, setWorkspaceTab] = useState<'provider' | 'model' | 'integration'>('integration');
  const [providerCrudTab, setProviderCrudTab] = useState<'create' | 'edit' | 'delete'>('create');
  const [modelCrudTab, setModelCrudTab] = useState<'create' | 'edit' | 'delete'>('create');
  const [newProviderDraft, setNewProviderDraft] = useState<ProviderDraft>(emptyProviderDraft);
  const [editProviderDraft, setEditProviderDraft] = useState<ProviderDraft>(emptyProviderDraft);
  const [newProviderCredentialDraft, setNewProviderCredentialDraft] = useState<{ apiKey: string; endpointUrl: string }>({
    apiKey: '',
    endpointUrl: '',
  });
  const [newModelDraft, setNewModelDraft] = useState('');
  const [newModelCredentialDraft, setNewModelCredentialDraft] = useState<{ apiKey: string; endpointUrl: string }>({
    apiKey: '',
    endpointUrl: '',
  });
  const [newModelParamsEnabled, setNewModelParamsEnabled] = useState(false);
  const [newModelParamsDraft, setNewModelParamsDraft] = useState<ModelParams>({});
  const [renamingModelId, setRenamingModelId] = useState<string | null>(null);
  const [deleteModelId, setDeleteModelId] = useState<string>('');
  const [renamedModelValue, setRenamedModelValue] = useState('');
  const [renamingModelParamsEnabled, setRenamingModelParamsEnabled] = useState(false);
  const [renamingModelParamsDraft, setRenamingModelParamsDraft] = useState<ModelParams>({});
  const seedAttemptedProviderKeysRef = useRef<Set<string>>(new Set());

  const tAI = (t as any).aiIntegrations || {};
  const providerDescriptions = tAI.providerDescriptions || {};

  const updateConfig = (providerId: string, updates: Partial<ProviderConfig>) => {
    setConfigs(prev => ({
      ...prev,
      [providerId]: { ...prev[providerId], ...updates },
    }));
  };

  const setIntegrationDirty = (providerId: string, dirty: boolean) => {
    setIntegrationDirtyByProvider((prev) => {
      if (!dirty && !prev[providerId]) return prev;
      if (dirty && prev[providerId]) return prev;
      return { ...prev, [providerId]: dirty };
    });
  };

  useEffect(() => {
    setConfigs(prev => mergeConfigsWithProviders(prev, providers));

    if (!providers.some(provider => provider.id === selectedProviderId)) {
      setSelectedProviderId(providers[0]?.id || '');
    }
  }, [providers, selectedProviderId]);

  const loadProviderRegistry = useCallback(async (): Promise<AIProvider[]> => {
    const [catalogRows, modelRows] = await Promise.all([
      aiConfigService.getProvidersCatalog(),
      aiConfigService.getProviderModels(),
    ]);

    setProviderCatalogRows(catalogRows);
    setProviderModelRows(modelRows);

    const mappedProviders = buildProvidersFromCatalog(catalogRows, modelRows);
    setProviders(mappedProviders);
    return mappedProviders;
  }, []);

  const loadConfigs = useCallback(async (providerList: AIProvider[]) => {
    const saved = await aiConfigService.getAll();
    const availableProviders = providerList.length ? providerList : FALLBACK_AI_PROVIDERS;

    if (!saved.length || !availableProviders.length) {
      setSelectedProviderId(availableProviders[0]?.id || '');
      setIntegrationDirtyByProvider({});
      return;
    }

    const nextSelectedProvider = saved.find(row => row.is_default && availableProviders.some(p => p.id === row.provider_id))?.provider_id
      || saved.find(row => availableProviders.some(p => p.id === row.provider_id))?.provider_id
      || availableProviders[0].id;
    setSelectedProviderId(nextSelectedProvider);

    setConfigs(prev => {
      const next = mergeConfigsWithProviders(prev, availableProviders);
      for (const row of saved) {
        if (!next[row.provider_id]) continue;

        const extra = row.extra_config || {};
        const hasStoredKey = Boolean((row as any).has_api_key || (row.api_key_encrypted && row.api_key_encrypted !== ''));
        const endpointUrl = String((extra as any)?.endpoint_url || next[row.provider_id].endpointUrl || '');
        const fallbackModel = String((extra as any)?.fallback_model || '');
        const advancedParamsEnabled = Boolean((extra as any)?.model_params_enabled);
        const modelParams = normalizeModelParams(row.provider_id, (extra as any)?.model_params);
        const rawModelCredentials = (extra as any)?.model_credentials && typeof (extra as any).model_credentials === 'object'
          ? (extra as any).model_credentials as Record<string, any>
          : {};
        const modelCredentials: ProviderConfig['modelCredentials'] = {};
        for (const [modelId, rawCredential] of Object.entries(rawModelCredentials)) {
          const credential = rawCredential && typeof rawCredential === 'object' ? rawCredential as Record<string, any> : {};
          const storedToken = String(credential.api_key_encrypted || '').trim();
          modelCredentials[modelId] = {
            apiKey: '',
            hasStoredKey: Boolean(storedToken),
            storedApiKeyToken: storedToken || undefined,
            endpointUrl: String(credential.endpoint_url || '').trim(),
          };
        }

        const rawModelRegistry = (extra as any)?.model_registry && typeof (extra as any).model_registry === 'object'
          ? (extra as any).model_registry as Record<string, any>
          : {};
        const modelRegistry: ProviderConfig['modelRegistry'] = {};
        for (const [modelId, rawModelMeta] of Object.entries(rawModelRegistry)) {
          const meta = rawModelMeta && typeof rawModelMeta === 'object' ? rawModelMeta as Record<string, any> : {};
          modelRegistry[modelId] = {
            paramsEnabled: Boolean(meta.params_enabled),
            modelParams: normalizeModelParams(row.provider_id, meta.model_params),
          };
        }

        next[row.provider_id] = {
          ...next[row.provider_id],
          enabled: Boolean(row.enabled),
          selectedModel: row.selected_model || next[row.provider_id].selectedModel,
          fallbackModel,
          advancedParamsEnabled,
          modelParams,
          modelCredentials,
          modelRegistry,
          maxTokens: Number((extra as any)?.max_tokens || next[row.provider_id].maxTokens),
          endpointUrl,
          hasStoredKey,
          apiKey: '',
          connectionStatus: (row.connection_status as ProviderConfig['connectionStatus']) || (hasStoredKey ? 'connected' : 'idle'),
          isDefault: Boolean(row.is_default),
        };
      }
      return next;
    });
    setIntegrationDirtyByProvider({});
  }, []);

  useEffect(() => {
    const checkAuthAndLoad = async () => {
      const { data: { user: currentUser } } = await localDb.auth.getUser();
      setUser(currentUser);
      if (currentUser) {
        const mappedProviders = await loadProviderRegistry();
        await loadConfigs(mappedProviders);
      }
      setLoading(false);
    };

    checkAuthAndLoad().catch(() => setLoading(false));

    const { data: { subscription } } = localDb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadProviderRegistry()
          .then((mappedProviders) => loadConfigs(mappedProviders))
          .catch(() => null);
      }
    });
    return () => subscription.unsubscribe();
  }, [loadConfigs, loadProviderRegistry]);

  const saveConfig = async (
    providerId: string,
    config: ProviderConfig,
    options?: {
      persistApiKey?: boolean;
      silent?: boolean;
      credentialScopeOverride?: 'provider' | 'model';
      endpointScopeOverride?: 'none' | 'provider' | 'model';
      supportsEndpointOverride?: boolean;
    },
  ): Promise<boolean> => {
    if (!user) return false;

    setSaving(true);
    try {
      const provider = providers.find(p => p.id === providerId);
      const credentialScope = options?.credentialScopeOverride || provider?.credentialScope || 'provider';
      const endpointScope = options?.endpointScopeOverride
        || provider?.endpointScope
        || (provider?.supportsEndpoint ? 'provider' : 'none');
      const supportsEndpoint = options?.supportsEndpointOverride ?? Boolean(provider?.supportsEndpoint);
      const selectedModelMeta = config.modelRegistry[config.selectedModel];
      const normalizedSelectedModelParams = selectedModelMeta?.paramsEnabled
        ? normalizeModelParams(providerId, selectedModelMeta.modelParams)
        : {};
      const extraConfig: Record<string, any> = {
        max_tokens: config.maxTokens,
        model_params_enabled: Boolean(selectedModelMeta?.paramsEnabled),
        model_params: normalizedSelectedModelParams,
        credential_scope: credentialScope,
        endpoint_scope: endpointScope,
      };

      if (supportsEndpoint && endpointScope === 'provider' && config.endpointUrl.trim()) {
        extraConfig.endpoint_url = config.endpointUrl.trim();
      }

      if (config.fallbackModel.trim()) {
        extraConfig.fallback_model = config.fallbackModel.trim();
      }

      const modelCredentialsPayload: Record<string, any> = {};
      for (const [modelId, credential] of Object.entries(config.modelCredentials || {})) {
        const modelCredentialPayload: Record<string, any> = {};
        const typedCredential = credential || {} as any;
        const pendingApiKey = String((typedCredential as any).apiKey || '').trim();
        const hasStoredKey = Boolean((typedCredential as any).hasStoredKey);
        const storedApiKeyToken = String((typedCredential as any).storedApiKeyToken || '').trim();
        const endpointUrl = String((typedCredential as any).endpointUrl || '').trim();

        if (pendingApiKey) {
          modelCredentialPayload.api_key_encrypted = pendingApiKey;
        } else if (hasStoredKey) {
          modelCredentialPayload.api_key_encrypted = storedApiKeyToken || '__stored__';
        }

        if (endpointUrl) {
          modelCredentialPayload.endpoint_url = endpointUrl;
        }

        if (Object.keys(modelCredentialPayload).length > 0) {
          modelCredentialsPayload[modelId] = modelCredentialPayload;
        }
      }

      if (Object.keys(modelCredentialsPayload).length > 0) {
        extraConfig.model_credentials = modelCredentialsPayload;
      }

      const modelRegistryPayload: Record<string, any> = {};
      for (const [modelId, modelMeta] of Object.entries(config.modelRegistry || {})) {
        const meta = modelMeta || {} as any;
        const paramsEnabled = Boolean((meta as any).paramsEnabled);
        const normalizedModelParams = normalizeModelParams(providerId, (meta as any).modelParams);

        if (paramsEnabled || Object.keys(normalizedModelParams).length > 0) {
          modelRegistryPayload[modelId] = {
            params_enabled: paramsEnabled,
            model_params: normalizedModelParams,
          };
        }
      }

      if (Object.keys(modelRegistryPayload).length > 0) {
        extraConfig.model_registry = modelRegistryPayload;
      }

      await aiConfigService.upsert({
        provider_id: providerId,
        enabled: config.enabled,
        selected_model: config.selectedModel,
        is_default: config.isDefault,
        connection_status: config.connectionStatus,
        api_key_encrypted: options?.persistApiKey ? config.apiKey : undefined,
        extra_config: extraConfig,
      });

      if (!options?.silent) {
        toast({
          title: tAI.configSavedTitle || 'Configuration saved',
          description: tAI.configSavedDesc || 'Provider configuration persisted successfully.',
        });
      }
      return true;
    } catch (err: any) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: err?.message || tAI.saveErrorDesc || 'Could not save provider configuration.',
        variant: 'destructive',
      });
      return false;
    } finally {
      setSaving(false);
    }
  };

  const setAsDefault = async (providerId: string) => {
    setSelectedProviderId(providerId);
    setConfigs(prev => {
      const updated = { ...prev };
      for (const id of Object.keys(updated)) {
        updated[id] = { ...updated[id], isDefault: id === providerId };
      }
      return updated;
    });

    try {
      const providerForConfig = providers.find(p => p.id === providerId) || providers[0];
      if (!providerForConfig) {
        throw new Error('No provider available for default selection.');
      }
      const providerConfig = configs[providerId] || makeProviderConfig(providerForConfig);
      await saveConfig(providerId, { ...providerConfig, isDefault: true }, { silent: true });
      await aiConfigService.setDefault(providerId);
      const provider = providers.find(p => p.id === providerId);
      toast({
        title: tAI.defaultUpdatedTitle || 'Default provider updated',
        description: `${provider?.name || providerId} ${tAI.defaultUpdatedDescSuffix || 'is now the default provider.'}`,
      });
    } catch (err: any) {
      toast({
        title: tAI.defaultUpdatedErrorTitle || 'Default provider error',
        description: err?.message || tAI.defaultUpdatedErrorDesc || 'Could not update default provider.',
        variant: 'destructive',
      });
    }
  };

  const getActiveModelCredential = (providerId: string, modelId: string) => {
    const current = configs[providerId];
    const fallback = {
      apiKey: '',
      hasStoredKey: false,
      endpointUrl: '',
      storedApiKeyToken: undefined as string | undefined,
    };
    if (!current) return fallback;
    return current.modelCredentials?.[modelId] || fallback;
  };

  const updateModelCredential = (
    providerId: string,
    modelId: string,
    updates: Partial<ProviderConfig['modelCredentials'][string]>,
  ) => {
    const current = configs[providerId];
    if (!current) return;

    const previous = getActiveModelCredential(providerId, modelId);
    const nextCredential = {
      ...previous,
      ...updates,
    };

    updateConfig(providerId, {
      modelCredentials: {
        ...current.modelCredentials,
        [modelId]: nextCredential,
      },
      connectionStatus: 'idle',
    });
  };

  const testConnection = async (providerId: string, modelOverride?: string) => {
    const provider = providers.find(p => p.id === providerId);
    const config = configs[providerId];
    if (!provider || !config) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: tAI.testConfigUnavailable || 'Provider configuration is still loading. Try again in a few seconds.',
        variant: 'destructive',
      });
      return;
    }

     const selectedModel = normalizeModelId(modelOverride || config.selectedModel || provider.defaultModel);
     const modelCredential = getActiveModelCredential(providerId, selectedModel);
     const usesModelCredentials = provider.credentialScope === 'model';
     const apiKeyCandidate = usesModelCredentials ? modelCredential.apiKey.trim() : config.apiKey.trim();
     const hasStoredKey = usesModelCredentials ? modelCredential.hasStoredKey : config.hasStoredKey;
     const endpointCandidate = provider.endpointScope === 'model'
       ? modelCredential.endpointUrl.trim()
       : config.endpointUrl.trim();

    if (provider.requiresApiKey && !apiKeyCandidate && !hasStoredKey) {
      toast({
        title: tAI.apiKeyRequiredTitle || 'API key required',
        description: tAI.apiKeyRequiredDesc || 'Enter an API key or keep a stored key before testing.',
        variant: 'destructive',
      });
      return;
    }

    if (provider.supportsEndpoint && provider.endpointScope === 'model' && !endpointCandidate) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: 'Endpoint is required for the selected model.',
        variant: 'destructive',
      });
      return;
    }

    updateConfig(providerId, { connectionStatus: 'testing' });

    const modelMeta = config.modelRegistry[selectedModel];
    const modelParamsForTest = modelMeta?.paramsEnabled
      ? normalizeModelParams(providerId, modelMeta.modelParams)
      : {};

    const result = await aiConfigService.testConnection(
      providerId,
      apiKeyCandidate,
      selectedModel,
      endpointCandidate,
      modelParamsForTest,
    );

    if (!result.ok) {
      updateConfig(providerId, { connectionStatus: 'failed' });
      toast({
        title: tAI.connectionFailed || 'Connection failed',
        description: result.message,
        variant: 'destructive',
      });
      return;
    }

    const nextConfig: ProviderConfig = {
      ...config,
      connectionStatus: 'connected',
    };

    if (usesModelCredentials) {
      const nextModelCredential = {
        ...modelCredential,
        hasStoredKey: modelCredential.hasStoredKey || Boolean(modelCredential.apiKey.trim()),
        apiKey: '',
      };
      nextConfig.modelCredentials = {
        ...config.modelCredentials,
        [selectedModel]: nextModelCredential,
      };
    } else {
      nextConfig.hasStoredKey = config.hasStoredKey || Boolean(config.apiKey.trim());
      nextConfig.apiKey = '';
    }

    updateConfig(providerId, nextConfig);

    await saveConfig(providerId, nextConfig, { silent: true });

    toast({
      title: tAI.connectionSuccess || 'Connection successful',
      description: result.message,
    });
  };

  const toggleShowKey = (providerId: string) => {
    setShowKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const saveApiKey = async (providerId: string) => {
    const config = configs[providerId];
    if (!config?.apiKey.trim()) return;
    const apiKeyToPersist = config.apiKey.trim();

    const nextConfig: ProviderConfig = {
      ...config,
      hasStoredKey: true,
      apiKey: '',
      connectionStatus: 'idle',
    };
    updateConfig(providerId, nextConfig);

    await saveConfig(providerId, { ...nextConfig, apiKey: apiKeyToPersist }, {
      persistApiKey: true,
      silent: true,
    });

    toast({
      title: tAI.configSavedTitle || 'Configuration saved',
      description: tAI.configSavedDesc || 'Provider configuration persisted successfully.',
    });
  };

  const saveModelApiKey = async (providerId: string, modelId: string) => {
    const config = configs[providerId];
    if (!config) return;

    const modelCredential = getActiveModelCredential(providerId, modelId);
    const apiKeyToPersist = modelCredential.apiKey.trim();
    if (!apiKeyToPersist) return;

    const nextModelCredential = {
      ...modelCredential,
      hasStoredKey: true,
      storedApiKeyToken: modelCredential.storedApiKeyToken || '__stored__',
      apiKey: '',
    };
    const nextConfig: ProviderConfig = {
      ...config,
      connectionStatus: 'idle',
      modelCredentials: {
        ...config.modelCredentials,
        [modelId]: nextModelCredential,
      },
    };
    updateConfig(providerId, nextConfig);

    await saveConfig(
      providerId,
      {
        ...nextConfig,
        modelCredentials: {
          ...nextConfig.modelCredentials,
          [modelId]: {
            ...nextModelCredential,
            apiKey: apiKeyToPersist,
          },
        },
      },
      { silent: true },
    );

    toast({
      title: tAI.configSavedTitle || 'Configuration saved',
      description: tAI.configSavedDesc || 'Provider configuration persisted successfully.',
    });
  };

  const setAdvancedParamsEnabled = (providerId: string, enabled: boolean) => {
    const next = {
      ...configs[providerId],
      advancedParamsEnabled: enabled,
    };
    updateConfig(providerId, { advancedParamsEnabled: enabled });
    saveConfig(providerId, next, { silent: true }).catch(() => null);
  };

  const toggleModelParam = (providerId: string, def: ModelParamDefinition, enabled: boolean) => {
    const current = configs[providerId];
    const nextModelParams: ModelParams = { ...current.modelParams };
    if (enabled) {
      nextModelParams[def.key] = def.defaultValue ?? null;
    } else {
      delete nextModelParams[def.key];
    }

    const next: ProviderConfig = {
      ...current,
      modelParams: nextModelParams,
      connectionStatus: 'idle',
    };
    updateConfig(providerId, { modelParams: nextModelParams, connectionStatus: 'idle' });
    saveConfig(providerId, next, { silent: true }).catch(() => null);
  };

  const updateModelParamValue = (providerId: string, def: ModelParamDefinition, rawValue: unknown) => {
    const current = configs[providerId];
    const nextModelParams: ModelParams = {
      ...current.modelParams,
      [def.key]: rawValue as ModelParamValue,
    };
    updateConfig(providerId, { modelParams: nextModelParams, connectionStatus: 'idle' });
  };

  const persistModelParamValue = (providerId: string, def: ModelParamDefinition, rawValue: unknown) => {
    const current = configs[providerId];
    const parsedValue = parseModelParamValue(rawValue, def);
    const nextModelParams: ModelParams = { ...current.modelParams };

    if (parsedValue === null) {
      if (!Object.prototype.hasOwnProperty.call(nextModelParams, def.key)) return;
      nextModelParams[def.key] = null;
    } else {
      nextModelParams[def.key] = parsedValue;
    }

    const next: ProviderConfig = {
      ...current,
      modelParams: nextModelParams,
      connectionStatus: 'idle',
    };
    updateConfig(providerId, { modelParams: nextModelParams, connectionStatus: 'idle' });
    saveConfig(providerId, next, { silent: true }).catch(() => null);
  };

  const selectedProviderCatalog = useMemo(
    () => providerCatalogRows.find(
      row => normalizeProviderKey(row.provider_id) === normalizeProviderKey(selectedProviderId),
    ) || null,
    [providerCatalogRows, selectedProviderId],
  );
  const selectedProviderPersistedModels = useMemo(
    () => providerModelRows
      .filter(
        row => normalizeProviderKey(row.provider_id) === normalizeProviderKey(selectedProviderId),
      )
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.model_id).localeCompare(String(b.model_id))),
    [providerModelRows, selectedProviderId],
  );
  const selectedProviderFallbackModels = useMemo(() => {
    const provider = providers.find(p => p.id === selectedProviderId) || providers[0];
    if (!provider || !Array.isArray(provider.models)) return [];

    const seen = new Set<string>();
    const normalizedModels = provider.models
      .map(model => normalizeModelId(model))
      .filter((model) => {
        if (!model) return false;
        if (seen.has(model)) return false;
        seen.add(model);
        return true;
      });

    return normalizedModels.map((modelId, index) => ({
      id: buildVirtualModelRowId(modelId),
      user_id: user?.id || '',
      provider_id: provider.id,
      model_id: modelId,
      is_default: modelId === provider.defaultModel,
      is_active: true,
      sort_order: (index + 1) * 10,
      created_at: '',
      updated_at: '',
    }));
  }, [providers, selectedProviderId, user?.id]);
  const selectedProviderModels = useMemo(
    () => (selectedProviderPersistedModels.length > 0 ? selectedProviderPersistedModels : selectedProviderFallbackModels),
    [selectedProviderPersistedModels, selectedProviderFallbackModels],
  );
  const canEditSelectedProvider = providers.some(
    provider => normalizeProviderKey(provider.id) === normalizeProviderKey(selectedProviderId),
  );

  const reloadProviderData = async (preferredProviderId?: string) => {
    const mappedProviders = await loadProviderRegistry();
    await loadConfigs(mappedProviders);

    if (preferredProviderId && mappedProviders.some(provider => provider.id === preferredProviderId)) {
      setSelectedProviderId(preferredProviderId);
    }
  };

  const ensureProviderModelsSeeded = useCallback(async (provider: AIProvider) => {
    if (!provider || !provider.models.length) return;
    if (selectedProviderPersistedModels.length > 0) return;

    const providerKey = normalizeProviderKey(provider.id);
    if (!providerKey) return;
    if (seedAttemptedProviderKeysRef.current.has(providerKey)) return;
    seedAttemptedProviderKeysRef.current.add(providerKey);

    const hasProviderCatalog = providerCatalogRows.some(
      row => normalizeProviderKey(row.provider_id) === normalizeProviderKey(provider.id),
    );

    if (!hasProviderCatalog) {
      try {
        await aiConfigService.upsertProviderCatalog({
          provider_id: provider.id,
          name: provider.name || provider.id,
          description: provider.description || '',
          icon: (provider.icon || iconFromName(provider.name || provider.id)).toUpperCase().slice(0, 3),
          docs_url: provider.docsUrl || '',
          requires_api_key: provider.requiresApiKey,
          supports_endpoint: Boolean(provider.supportsEndpoint),
          endpoint_placeholder: provider.endpointPlaceholder || '',
          is_active: true,
          is_builtin: true,
          extra_config: {
            credential_scope: provider.credentialScope,
            endpoint_scope: provider.endpointScope,
          },
        });
      } catch {
        // If catalog upsert fails we still attempt to seed models below.
      }
    }

    let createdAny = false;
    for (let index = 0; index < provider.models.length; index += 1) {
      const modelId = String(provider.models[index] || '').trim();
      if (!modelId) continue;

      try {
        await aiConfigService.createProviderModel({
          provider_id: provider.id,
          model_id: modelId,
          is_default: modelId === provider.defaultModel,
          sort_order: (index + 1) * 10,
        });
        createdAny = true;
      } catch {
        // Ignore duplicates or per-model failures and continue syncing.
      }
    }

    if (createdAny) {
      await reloadProviderData(provider.id);
    }
  }, [reloadProviderData, selectedProviderPersistedModels.length, providerCatalogRows]);

  const handleCreateProvider = async (): Promise<string | null> => {
    if (!user) return null;

    const providerId = normalizeProviderId(newProviderDraft.providerId || newProviderDraft.name);
    const name = String(newProviderDraft.name || '').trim();
    const defaultModel = normalizeModelId(newProviderDraft.defaultModel);

    if (!providerId || !name || !defaultModel) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: 'Provider ID, provider name, and default model are required.',
        variant: 'destructive',
      });
      return null;
    }

    if (providers.some(provider => provider.id === providerId)) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: `Provider "${providerId}" already exists.`,
        variant: 'destructive',
      });
      return null;
    }

    try {
      const endpointScope = newProviderDraft.supportsEndpoint
        ? (newProviderDraft.endpointScope === 'model' ? 'model' : 'provider')
        : 'none';
      const providerApiKey = newProviderDraft.requiresApiKey && newProviderDraft.credentialScope === 'provider'
        ? newProviderCredentialDraft.apiKey.trim()
        : '';
      const providerEndpointUrl = newProviderDraft.supportsEndpoint && endpointScope === 'provider'
        ? newProviderCredentialDraft.endpointUrl.trim()
        : '';
      await aiConfigService.upsertProviderCatalog({
        provider_id: providerId,
        name,
        description: newProviderDraft.description,
        icon: (newProviderDraft.icon || iconFromName(name)).toUpperCase().slice(0, 3),
        docs_url: newProviderDraft.docsUrl,
        requires_api_key: newProviderDraft.requiresApiKey,
        supports_endpoint: newProviderDraft.supportsEndpoint,
        endpoint_placeholder: newProviderDraft.endpointPlaceholder,
        is_active: true,
        is_builtin: false,
        extra_config: {
          credential_scope: newProviderDraft.credentialScope,
          endpoint_scope: endpointScope,
        },
      });

      await aiConfigService.createProviderModel({
        provider_id: providerId,
        model_id: defaultModel,
        is_default: true,
        sort_order: 0,
      });

      await aiConfigService.upsert({
        provider_id: providerId,
        enabled: false,
        selected_model: defaultModel,
        is_default: false,
        connection_status: 'idle',
        api_key_encrypted: providerApiKey || undefined,
        extra_config: {
          max_tokens: 65000,
          credential_scope: newProviderDraft.credentialScope,
          endpoint_scope: endpointScope,
          endpoint_url: providerEndpointUrl || undefined,
        },
      });

      await reloadProviderData(providerId);
      setNewProviderDraft(emptyProviderDraft());
      setNewProviderCredentialDraft({ apiKey: '', endpointUrl: '' });
      toast({
        title: tAI.configSavedTitle || 'Configuration saved',
        description: 'Provider created successfully.',
      });
      return providerId;
    } catch (err: any) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: err?.message || 'Could not create provider.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleUpdateSelectedProvider = async (): Promise<string | null> => {
    if (!user || !selectedProvider) return null;

    const name = String(editProviderDraft.name || '').trim();
    if (!name) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: 'Provider name is required.',
        variant: 'destructive',
      });
      return null;
    }

    try {
      const endpointScope = editProviderDraft.supportsEndpoint
        ? (editProviderDraft.endpointScope === 'model' ? 'model' : 'provider')
        : 'none';
      const providerId = selectedProviderCatalog?.provider_id || selectedProvider.id;
      await aiConfigService.upsertProviderCatalog({
        provider_id: providerId,
        name,
        description: editProviderDraft.description,
        icon: (editProviderDraft.icon || iconFromName(name)).toUpperCase().slice(0, 3),
        docs_url: editProviderDraft.docsUrl,
        requires_api_key: editProviderDraft.requiresApiKey,
        supports_endpoint: editProviderDraft.supportsEndpoint,
        endpoint_placeholder: editProviderDraft.endpointPlaceholder,
        is_active: selectedProviderCatalog?.is_active ?? true,
        is_builtin: selectedProviderCatalog?.is_builtin ?? isBuiltinFallbackProvider(providerId),
        extra_config: {
          credential_scope: editProviderDraft.credentialScope,
          endpoint_scope: endpointScope,
        },
      });

      const providerForConfig = providers.find(p => p.id === providerId);
      const currentProviderConfig = configs[providerId]
        || (providerForConfig ? makeProviderConfig(providerForConfig) : null);
      if (currentProviderConfig) {
        const nextProviderConfig: ProviderConfig = {
          ...currentProviderConfig,
          endpointUrl: editProviderDraft.supportsEndpoint && endpointScope === 'provider'
            ? currentProviderConfig.endpointUrl.trim()
            : '',
          connectionStatus: 'idle',
        };
        const shouldPersistApiKey = editProviderDraft.requiresApiKey
          && editProviderDraft.credentialScope === 'provider'
          && Boolean(nextProviderConfig.apiKey.trim());

        await saveConfig(providerId, nextProviderConfig, {
          silent: true,
          persistApiKey: shouldPersistApiKey,
          credentialScopeOverride: editProviderDraft.credentialScope,
          endpointScopeOverride: endpointScope,
          supportsEndpointOverride: editProviderDraft.supportsEndpoint,
        });

        if (shouldPersistApiKey) {
          updateConfig(providerId, {
            apiKey: '',
            hasStoredKey: true,
            endpointUrl: nextProviderConfig.endpointUrl,
            connectionStatus: 'idle',
          });
        } else {
          updateConfig(providerId, {
            endpointUrl: nextProviderConfig.endpointUrl,
            connectionStatus: 'idle',
          });
        }
      }

      await reloadProviderData(providerId);
      toast({
        title: tAI.configSavedTitle || 'Configuration saved',
        description: 'Provider updated successfully.',
      });
      return providerId;
    } catch (err: any) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: err?.message || 'Could not update provider.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleDeleteSelectedProvider = async () => {
    if (!user || !selectedProvider) return;

    if (providers.length <= 1) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: 'At least one provider must remain registered.',
        variant: 'destructive',
      });
      return;
    }

    const nextProvider = providers.find(provider => provider.id !== selectedProvider.id) || null;

    try {
      await aiConfigService.deleteProviderCatalog(selectedProvider.id);

      if (nextProvider) {
        await aiConfigService.upsert({
          provider_id: nextProvider.id,
          enabled: true,
          selected_model: nextProvider.defaultModel,
          is_default: true,
          connection_status: 'idle',
          extra_config: {
            max_tokens: 65000,
            credential_scope: nextProvider.credentialScope,
            endpoint_scope: nextProvider.endpointScope,
          },
        });
      }

      await reloadProviderData(nextProvider?.id);
      toast({
        title: tAI.configSavedTitle || 'Configuration saved',
        description: 'Provider removed successfully.',
      });
    } catch (err: any) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: err?.message || 'Could not delete provider.',
        variant: 'destructive',
      });
    }
  };

  const handleCreateModel = async (): Promise<string | null> => {
    if (!selectedProvider) return null;

    const modelId = normalizeModelId(newModelDraft);
    if (!modelId) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: 'Model ID is required.',
        variant: 'destructive',
      });
      return null;
    }

    if (selectedProviderModels.some(row => row.model_id === modelId)) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: `Model "${modelId}" is already registered for this provider.`,
        variant: 'destructive',
      });
      return null;
    }

    const maxSort = selectedProviderModels.length
      ? Math.max(...selectedProviderModels.map(row => Number(row.sort_order || 0)))
      : 0;

    try {
      await aiConfigService.createProviderModel({
        provider_id: selectedProvider.id,
        model_id: modelId,
        is_default: selectedProviderModels.length === 0,
        sort_order: maxSort + 10,
      });

      const currentConfig = configs[selectedProvider.id] || makeProviderConfig(selectedProvider);
      const nextSelectedModel = currentConfig.selectedModel || modelId;
      const modelApiKey = selectedProvider.requiresApiKey && selectedProvider.credentialScope === 'model'
        ? newModelCredentialDraft.apiKey.trim()
        : '';
      const modelEndpointUrl = selectedProvider.supportsEndpoint && selectedProvider.endpointScope === 'model'
        ? newModelCredentialDraft.endpointUrl.trim()
        : '';
      const previousModelCredential = currentConfig.modelCredentials[modelId] || {
        apiKey: '',
        hasStoredKey: false,
        endpointUrl: '',
      };
      const modelCredentialForPersistence = {
        ...previousModelCredential,
        apiKey: modelApiKey,
        hasStoredKey: previousModelCredential.hasStoredKey || Boolean(modelApiKey),
        endpointUrl: modelEndpointUrl,
      };
      const nextConfig: ProviderConfig = {
        ...currentConfig,
        selectedModel: nextSelectedModel,
        modelRegistry: {
          ...currentConfig.modelRegistry,
          [modelId]: {
            paramsEnabled: newModelParamsEnabled,
            modelParams: newModelParamsEnabled ? normalizeModelParams(selectedProvider.id, newModelParamsDraft) : {},
          },
        },
      };

      if (selectedProvider.credentialScope === 'model' || selectedProvider.endpointScope === 'model') {
        nextConfig.modelCredentials = {
          ...currentConfig.modelCredentials,
          [modelId]: modelCredentialForPersistence,
        };
      }

      const nextConfigForUi: ProviderConfig = {
        ...nextConfig,
        modelCredentials: {
          ...nextConfig.modelCredentials,
          [modelId]: {
            ...modelCredentialForPersistence,
            apiKey: '',
            hasStoredKey: modelCredentialForPersistence.hasStoredKey || Boolean(modelCredentialForPersistence.apiKey),
            storedApiKeyToken: modelCredentialForPersistence.hasStoredKey || Boolean(modelCredentialForPersistence.apiKey)
              ? (modelCredentialForPersistence.storedApiKeyToken || '__stored__')
              : modelCredentialForPersistence.storedApiKeyToken,
          },
        },
      };
      updateConfig(selectedProvider.id, {
        selectedModel: nextSelectedModel,
        modelRegistry: nextConfigForUi.modelRegistry,
        modelCredentials: nextConfigForUi.modelCredentials,
      });
      await saveConfig(selectedProvider.id, nextConfig, { silent: true });

      await reloadProviderData(selectedProvider.id);
      setNewModelDraft('');
      setNewModelCredentialDraft({ apiKey: '', endpointUrl: '' });
      setNewModelParamsEnabled(false);
      setNewModelParamsDraft({});
      toast({
        title: tAI.configSavedTitle || 'Configuration saved',
        description: 'Model created successfully.',
      });
      return modelId;
    } catch (err: any) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: err?.message || 'Could not create model.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleSetDefaultModel = async (modelRowId: string) => {
    if (!selectedProvider) return;

    try {
      const resolvedModelRowId = await resolveModelRowIdForMutation(modelRowId);
      if (!resolvedModelRowId) {
        toast({
          title: tAI.saveErrorTitle || 'Save error',
          description: 'Could not load the selected model. Refresh the provider model list and try again.',
          variant: 'destructive',
        });
        return;
      }

      await aiConfigService.setDefaultProviderModel(selectedProvider.id, resolvedModelRowId);
      await reloadProviderData(selectedProvider.id);
      toast({
        title: tAI.configSavedTitle || 'Configuration saved',
        description: 'Default model updated successfully.',
      });
    } catch (err: any) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: err?.message || 'Could not update default model.',
        variant: 'destructive',
      });
    }
  };

  const handleRenameModel = async (): Promise<string | null> => {
    if (!selectedProvider || !renamingModelId) return null;

    const row = selectedProviderModels.find(item => item.id === renamingModelId);
    if (!row) return null;

    const requestedModelId = normalizeModelId(renamedModelValue);
    const nextModelId = requestedModelId || row.model_id;
    const modelIdChanged = nextModelId !== row.model_id;

    if (modelIdChanged && selectedProviderModels.some(item => item.model_id === nextModelId)) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: `Model "${nextModelId}" is already registered for this provider.`,
        variant: 'destructive',
      });
      return null;
    }

    try {
      let resolvedModelRowId: string | null = row.id;
      if (isVirtualModelRowId(row.id)) {
        resolvedModelRowId = await resolveModelRowIdForMutation(row.id);
      }

      if (modelIdChanged) {
        if (!resolvedModelRowId) {
          toast({
            title: tAI.saveErrorTitle || 'Save error',
            description: 'Could not load the selected model. Refresh the provider model list and try again.',
            variant: 'destructive',
          });
          return null;
        }
        await aiConfigService.updateProviderModel(resolvedModelRowId, { model_id: nextModelId });
      }

      const currentConfig = configs[selectedProvider.id];
      if (currentConfig) {
        const nextModelRegistry = { ...currentConfig.modelRegistry };
        const currentRegistryEntry = nextModelRegistry[row.model_id] || {
          paramsEnabled: false,
          modelParams: {},
        };
        delete nextModelRegistry[row.model_id];
        nextModelRegistry[nextModelId] = {
          paramsEnabled: renamingModelParamsEnabled,
          modelParams: renamingModelParamsEnabled
            ? normalizeModelParams(selectedProvider.id, renamingModelParamsDraft)
            : currentRegistryEntry.modelParams,
        };

        const nextModelCredentials = { ...currentConfig.modelCredentials };
        if (nextModelCredentials[row.model_id]) {
          const previousCredential = nextModelCredentials[row.model_id];
          delete nextModelCredentials[row.model_id];
          nextModelCredentials[nextModelId] = previousCredential;
        }

        const nextConfig: ProviderConfig = {
          ...currentConfig,
          selectedModel: currentConfig.selectedModel === row.model_id ? nextModelId : currentConfig.selectedModel,
          fallbackModel: currentConfig.fallbackModel === row.model_id ? '' : currentConfig.fallbackModel,
          modelRegistry: nextModelRegistry,
          modelCredentials: nextModelCredentials,
        };
        updateConfig(selectedProvider.id, {
          selectedModel: nextConfig.selectedModel,
          fallbackModel: nextConfig.fallbackModel,
          modelRegistry: nextConfig.modelRegistry,
          modelCredentials: nextConfig.modelCredentials,
        });
        await saveConfig(selectedProvider.id, nextConfig, { silent: true });

        const nextCredentialsForUi: ProviderConfig['modelCredentials'] = {};
        for (const [modelKey, credentialValue] of Object.entries(nextConfig.modelCredentials || {})) {
          const credential = credentialValue || {
            apiKey: '',
            hasStoredKey: false,
            endpointUrl: '',
          };
          const hasPendingApiKey = Boolean(String(credential.apiKey || '').trim());
          nextCredentialsForUi[modelKey] = {
            ...credential,
            apiKey: '',
            hasStoredKey: credential.hasStoredKey || hasPendingApiKey,
            storedApiKeyToken: credential.hasStoredKey || hasPendingApiKey
              ? (credential.storedApiKeyToken || '__stored__')
              : credential.storedApiKeyToken,
          };
        }
        updateConfig(selectedProvider.id, { modelCredentials: nextCredentialsForUi });
      }

      await reloadProviderData(selectedProvider.id);
      setRenamingModelId(null);
      setRenamedModelValue('');
      setRenamingModelParamsEnabled(false);
      setRenamingModelParamsDraft({});
      toast({
        title: tAI.configSavedTitle || 'Configuration saved',
        description: 'Model updated successfully.',
      });
      return nextModelId;
    } catch (err: any) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: err?.message || 'Could not update model.',
        variant: 'destructive',
      });
      return null;
    }
  };

  const handleDeleteModel = async (modelRowId: string) => {
    if (!selectedProvider) return;

    try {
      const resolvedModelRowId = await resolveModelRowIdForMutation(modelRowId);
      if (!resolvedModelRowId) {
        toast({
          title: tAI.saveErrorTitle || 'Save error',
          description: 'Could not load the selected model. Refresh the provider model list and try again.',
          variant: 'destructive',
        });
        return;
      }

      const persistedRows = (await aiConfigService.getProviderModels(selectedProvider.id))
        .filter(row => normalizeProviderKey(row.provider_id) === normalizeProviderKey(selectedProvider.id))
        .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.model_id).localeCompare(String(b.model_id)));

      if (persistedRows.length <= 1) {
        toast({
          title: tAI.saveErrorTitle || 'Save error',
          description: 'At least one model must remain registered for this provider.',
          variant: 'destructive',
        });
        return;
      }

      const deletingRow = persistedRows.find(item => item.id === resolvedModelRowId);
      if (!deletingRow) {
        toast({
          title: tAI.saveErrorTitle || 'Save error',
          description: 'Could not load the selected model. Refresh the provider model list and try again.',
          variant: 'destructive',
        });
        return;
      }

      const remainingRows = persistedRows.filter(item => item.id !== resolvedModelRowId);
      const nextDefault = remainingRows.find(item => item.is_default) || remainingRows[0];

      await aiConfigService.deleteProviderModel(resolvedModelRowId);
      if (nextDefault) {
        await aiConfigService.setDefaultProviderModel(selectedProvider.id, nextDefault.id);
      }

      const currentConfig = configs[selectedProvider.id];
      if (currentConfig && nextDefault) {
        const nextModelRegistry = { ...currentConfig.modelRegistry };
        delete nextModelRegistry[deletingRow.model_id];
        const nextModelCredentials = { ...currentConfig.modelCredentials };
        delete nextModelCredentials[deletingRow.model_id];

        const nextConfig: ProviderConfig = {
          ...currentConfig,
          selectedModel: currentConfig.selectedModel === deletingRow.model_id ? nextDefault.model_id : currentConfig.selectedModel,
          fallbackModel: currentConfig.fallbackModel === deletingRow.model_id ? '' : currentConfig.fallbackModel,
          modelRegistry: nextModelRegistry,
          modelCredentials: nextModelCredentials,
        };
        updateConfig(selectedProvider.id, {
          selectedModel: nextConfig.selectedModel,
          fallbackModel: nextConfig.fallbackModel,
          modelRegistry: nextConfig.modelRegistry,
          modelCredentials: nextConfig.modelCredentials,
        });
        await saveConfig(selectedProvider.id, nextConfig, { silent: true });
      }

      await reloadProviderData(selectedProvider.id);
      toast({
        title: tAI.configSavedTitle || 'Configuration saved',
        description: 'Model removed successfully.',
      });
    } catch (err: any) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: err?.message || 'Could not remove model.',
        variant: 'destructive',
      });
    }
  };

  const waitNextTick = () => new Promise<void>((resolve) => {
    setTimeout(() => resolve(), 0);
  });

  const runSaveAndTest = async (providerId: string, modelId?: string) => {
    setSelectedProviderId(providerId);
    setWorkspaceTab('integration');
    await reloadProviderData(providerId);
    await waitNextTick();
    await testConnection(providerId, modelId);
  };

  const handleSaveIntegrationSelection = async (providerId: string): Promise<boolean> => {
    const providerForConfig = providers.find(p => p.id === providerId) || providers[0];
    if (!providerForConfig) return false;

    const currentConfig = configs[providerId] || makeProviderConfig(providerForConfig);
    const saved = await saveConfig(providerId, { ...currentConfig, connectionStatus: 'idle' }, { silent: true });
    if (!saved) return false;

    setIntegrationDirty(providerId, false);
    toast({
      title: tAI.configSavedTitle || 'Configuration saved',
      description: tAI.configSavedDesc || 'Provider configuration persisted successfully.',
    });
    return true;
  };

  const handleSaveAndTestIntegration = async (providerId: string) => {
    const hasUnsavedChanges = Boolean(integrationDirtyByProvider[providerId]);
    if (hasUnsavedChanges) {
      const saved = await handleSaveIntegrationSelection(providerId);
      if (!saved) return;
    }
    await testConnection(providerId);
  };

  const handleCreateProviderAndTest = async () => {
    const providerId = await handleCreateProvider();
    if (!providerId) return;
    await runSaveAndTest(providerId);
  };

  const handleUpdateProviderAndTest = async () => {
    const providerId = await handleUpdateSelectedProvider();
    if (!providerId) return;
    await runSaveAndTest(providerId);
  };

  const handleCreateModelAndTest = async () => {
    if (!selectedProvider) return;
    const modelId = await handleCreateModel();
    if (!modelId) return;
    await runSaveAndTest(selectedProvider.id, modelId);
  };

  const handleRenameModelAndTest = async () => {
    if (!selectedProvider) return;
    const modelId = await handleRenameModel();
    if (!modelId) return;
    await runSaveAndTest(selectedProvider.id, modelId);
  };

  const selectModelForEdit = (modelRowId: string) => {
    if (!selectedProvider) return;

    const modelRow = selectedProviderModels.find(item => item.id === modelRowId);
    if (!modelRow) return;

    const modelMeta = configs[selectedProvider.id]?.modelRegistry?.[modelRow.model_id];
    setRenamingModelId(modelRow.id);
    setRenamedModelValue(modelRow.model_id);
    setRenamingModelParamsEnabled(Boolean(modelMeta?.paramsEnabled));
    setRenamingModelParamsDraft(modelMeta?.modelParams || {});
  };

  const enabledCount = Object.values(configs).filter(c => c.enabled).length;
  const connectedCount = Object.values(configs).filter(c => c.connectionStatus === 'connected').length;
  const defaultProviderId = Object.entries(configs).find(([, cfg]) => cfg.isDefault)?.[0];
  const defaultProvider = providers.find(p => p.id === defaultProviderId);
  const selectedProvider = useMemo(
    () => providers.find(p => p.id === selectedProviderId) || providers[0],
    [providers, selectedProviderId],
  );
  const selectedProviderConfig = useMemo(
    () => (selectedProvider ? (configs[selectedProvider.id] || makeProviderConfig(selectedProvider)) : null),
    [configs, selectedProvider],
  );
  const resolveModelRowIdForMutation = useCallback(async (modelRowId: string): Promise<string | null> => {
    if (!selectedProvider) return null;
    if (!isVirtualModelRowId(modelRowId)) return modelRowId;

    const virtualModelId = parseVirtualModelId(modelRowId);
    if (!virtualModelId) return null;

    try {
      await ensureProviderModelsSeeded(selectedProvider);
      const latestRows = (await aiConfigService.getProviderModels(selectedProvider.id))
        .filter(row => normalizeProviderKey(row.provider_id) === normalizeProviderKey(selectedProvider.id));
      const matched = latestRows.find(row => normalizeModelId(row.model_id) === virtualModelId);
      if (!matched) return null;

      reloadProviderData(selectedProvider.id).catch(() => null);
      return matched.id;
    } catch {
      return null;
    }
  }, [selectedProvider, ensureProviderModelsSeeded, reloadProviderData]);
  const selectedModelEditRow = useMemo(
    () => (renamingModelId ? selectedProviderModels.find(model => model.id === renamingModelId) || null : null),
    [renamingModelId, selectedProviderModels],
  );
  const selectedModelDeleteRow = useMemo(
    () => (deleteModelId ? selectedProviderModels.find(model => model.id === deleteModelId) || null : null),
    [deleteModelId, selectedProviderModels],
  );
  const selectedModelEditCredential = useMemo(() => {
    if (!selectedProvider || !selectedModelEditRow) {
      return {
        apiKey: '',
        hasStoredKey: false,
        endpointUrl: '',
        storedApiKeyToken: undefined as string | undefined,
      };
    }
    return getActiveModelCredential(selectedProvider.id, selectedModelEditRow.model_id);
  }, [selectedProvider, selectedModelEditRow, configs]);
  const selectedProviderParamDefs = useMemo(
    () => getModelParamsForProvider(selectedProvider?.id || ''),
    [selectedProvider?.id],
  );

  useEffect(() => {
    if (!selectedProvider) return;

    const providerRow = providerCatalogRows.find(row => row.provider_id === selectedProvider.id) || null;
    const nextDraft: ProviderDraft = {
      providerId: selectedProvider.id,
      name: selectedProvider.name || providerRow?.name || '',
      description: selectedProvider.description || providerRow?.description || '',
      icon: selectedProvider.icon || providerRow?.icon || iconFromName(selectedProvider.name || selectedProvider.id),
      docsUrl: selectedProvider.docsUrl || providerRow?.docs_url || '',
      requiresApiKey: selectedProvider.requiresApiKey,
      supportsEndpoint: Boolean(selectedProvider.supportsEndpoint),
      endpointPlaceholder: selectedProvider.endpointPlaceholder || '',
      defaultModel: selectedProvider.defaultModel || '',
      credentialScope: selectedProvider.credentialScope,
      endpointScope: selectedProvider.endpointScope,
    };

    setEditProviderDraft((prev) => {
      if (
        prev.providerId === nextDraft.providerId
        && prev.name === nextDraft.name
        && prev.description === nextDraft.description
        && prev.icon === nextDraft.icon
        && prev.docsUrl === nextDraft.docsUrl
        && prev.requiresApiKey === nextDraft.requiresApiKey
        && prev.supportsEndpoint === nextDraft.supportsEndpoint
        && prev.endpointPlaceholder === nextDraft.endpointPlaceholder
        && prev.defaultModel === nextDraft.defaultModel
        && prev.credentialScope === nextDraft.credentialScope
        && prev.endpointScope === nextDraft.endpointScope
      ) {
        return prev;
      }

      return nextDraft;
    });

    if (!selectedProviderModels.length) {
      setRenamingModelId(null);
      setRenamedModelValue('');
      setRenamingModelParamsEnabled(false);
      setRenamingModelParamsDraft({});
      setDeleteModelId('');
      return;
    }

    const hasCurrentEditModel = Boolean(renamingModelId && selectedProviderModels.some(model => model.id === renamingModelId));
    if (!hasCurrentEditModel) {
      const defaultEditRow = selectedProviderModels.find(model => model.is_default) || selectedProviderModels[0];
      const modelMeta = configs[selectedProvider.id]?.modelRegistry?.[defaultEditRow.model_id];
      setRenamingModelId(defaultEditRow.id);
      setRenamedModelValue(defaultEditRow.model_id);
      setRenamingModelParamsEnabled(Boolean(modelMeta?.paramsEnabled));
      setRenamingModelParamsDraft(modelMeta?.modelParams || {});
    }

    if (!deleteModelId || !selectedProviderModels.some(model => model.id === deleteModelId)) {
      const deleteCandidate = selectedProviderModels.find(model => !model.is_default) || selectedProviderModels[0];
      setDeleteModelId(deleteCandidate.id);
    }
  }, [selectedProvider, providerCatalogRows, renamingModelId, deleteModelId, selectedProviderModels, configs]);

  useEffect(() => {
    if (loading) return;
    if (workspaceTab !== 'model') return;
    if (!selectedProvider) return;
    if (selectedProviderPersistedModels.length > 0) return;

    ensureProviderModelsSeeded(selectedProvider).catch(() => null);
  }, [loading, workspaceTab, selectedProvider, selectedProviderPersistedModels.length, ensureProviderModelsSeeded]);

  useEffect(() => {
    setNewModelCredentialDraft({ apiKey: '', endpointUrl: '' });
  }, [selectedProviderId]);

  if (!user && !loading) {
    const wrapperClassName = embedded ? '' : 'p-6 lg:p-8 max-w-4xl mx-auto';
    return (
      <div className={wrapperClassName}>
        <div className="bg-card border border-border rounded-lg p-8 text-center space-y-4 shadow-premium">
          <LogIn className="h-12 w-12 text-primary/50 mx-auto" />
          <h2 className="text-xl font-display font-semibold text-foreground">{tAI.signInRequiredTitle || 'Sign in required'}</h2>
          <p className="text-sm text-muted-foreground">
            {tAI.signInRequiredDesc || 'You must be authenticated to configure AI providers and persist settings.'}
          </p>
        </div>
      </div>
    );
  }

  const pageClassName = embedded ? 'space-y-6' : 'p-6 lg:p-8 max-w-4xl mx-auto space-y-6';

  return (
    <div className={pageClassName}>
      {!embedded && (
        <div className="flex items-center gap-3">
          <div>
            <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">
              {tAI.title || 'AI Integrations'}
            </h1>
            <p className="text-sm text-muted-foreground mt-1">
              {tAI.subtitle || 'Configure provider and model selection for the AI pipeline.'}
            </p>
          </div>
          <HelpButton section="ai-integrations" />
        </div>
      )}

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4 shadow-premium">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4 text-primary/70" />
              <span className="text-xs text-muted-foreground">{tAI.providersConfigured || 'Providers Configured'}</span>
            </div>
            <span className="text-2xl font-display font-bold text-foreground">{enabledCount}</span>
            <span className="text-xs text-muted-foreground ml-1">/ {providers.length}</span>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 shadow-premium">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-success/70" />
              <span className="text-xs text-muted-foreground">{tAI.activeConnections || 'Active Connections'}</span>
            </div>
            <span className="text-2xl font-display font-bold text-success">{connectedCount}</span>
          </div>

          <div className="bg-card border border-border rounded-lg p-4 shadow-premium">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-warning/70" />
              <span className="text-xs text-muted-foreground">{tAI.defaultProvider || 'Default Provider'}</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {defaultProvider?.name || (tAI.noneSelected || 'None selected')}
            </span>
          </div>
        </div>
      )}

      <Tabs value={workspaceTab} onValueChange={(value) => setWorkspaceTab(value as 'provider' | 'model' | 'integration')}>
        <TabsList className="bg-muted/40 border border-border w-full sm:w-auto">
          <TabsTrigger value="provider" className="data-[state=active]:bg-card">
            {tAI.providersTab || 'Provider'}
          </TabsTrigger>
          <TabsTrigger value="model" className="data-[state=active]:bg-card">
            {tAI.modelsTab || 'Model'}
          </TabsTrigger>
          <TabsTrigger value="integration" className="data-[state=active]:bg-card">
            {tAI.integrationTab || 'Integration'}
          </TabsTrigger>
        </TabsList>
      </Tabs>

      {!loading && workspaceTab !== 'provider' && selectedProvider && (
        <div className="bg-card border border-border rounded-lg p-4 shadow-premium space-y-3">
          <label className="text-xs font-medium text-foreground">
            {tAI.providerSelectorLabel || 'Provider'}
          </label>
          <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
            <SelectTrigger className="w-full sm:w-[320px]">
              <SelectValue placeholder={tAI.providerSelectorPlaceholder || 'Select provider'} />
            </SelectTrigger>
            <SelectContent>
              {providers.map(provider => (
                <SelectItem key={provider.id} value={provider.id}>
                  {provider.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <p className="text-xs text-muted-foreground">
            {providerDescriptions[selectedProvider.id] || selectedProvider.description}
          </p>
        </div>
      )}

      {(workspaceTab === 'provider' || workspaceTab === 'model') && !loading && selectedProvider && (
        <div className="bg-card border border-border rounded-lg p-4 shadow-premium space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{tAI.providerCrudTitle || 'Providers and Models Registry'}</p>
              <p className="text-xs text-muted-foreground">
                {tAI.providerCrudDesc || 'Create, read, update, and delete providers and models.'}
              </p>
            </div>
            <div className="flex items-center gap-2">
              <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                {providers.length} {(tAI.providersConfigured || 'Providers').toLowerCase()}
              </Badge>
              <Badge variant="outline" className="text-[10px] border-border text-muted-foreground">
                {selectedProviderModels.length} {(tAI.modelsCrudTitle || 'Models').toLowerCase()}
              </Badge>
            </div>
          </div>

          <Tabs value={workspaceTab === 'provider' ? 'providers' : 'models'} onValueChange={() => null} className="space-y-4">
            <TabsContent value="providers" className="mt-0">
              <div className="rounded-md border border-border/70 p-3 space-y-3">
                <p className="text-[11px] text-muted-foreground">
                  {tAI.providerCrudFlowHint || 'Use one flow at a time to avoid visual overload.'}
                </p>

                <Tabs
                  value={providerCrudTab}
                  onValueChange={(value) => setProviderCrudTab(value as 'create' | 'edit' | 'delete')}
                  className="space-y-3"
                >
                  <TabsList className="bg-muted/40 border border-border">
                    <TabsTrigger value="create" className="data-[state=active]:bg-card">
                      {tAI.providerCreateTitle || 'Create Provider'}
                    </TabsTrigger>
                    <TabsTrigger value="edit" className="data-[state=active]:bg-card">
                      {tAI.providerEditTitle || 'Edit Provider'}
                    </TabsTrigger>
                    <TabsTrigger value="delete" className="data-[state=active]:bg-card">
                      {tAI.providerDeleteTitle || 'Delete Provider'}
                    </TabsTrigger>
                  </TabsList>

                  <TabsContent value="create" className="mt-0 space-y-2">
                    <Input
                      placeholder={tAI.providerIdPlaceholder || 'provider-id (e.g. custom-ai)'}
                      value={newProviderDraft.providerId}
                      onChange={(e) => setNewProviderDraft(prev => ({ ...prev, providerId: normalizeProviderIdInput(e.target.value) }))}
                    />
                    <Input
                      placeholder={tAI.providerNamePlaceholder || 'Provider name'}
                      value={newProviderDraft.name}
                      onChange={(e) => setNewProviderDraft(prev => ({ ...prev, name: e.target.value, icon: iconFromName(e.target.value) }))}
                    />
                    <Input
                      placeholder={tAI.providerDefaultModelPlaceholder || 'Default model (e.g. model-v1)'}
                      value={newProviderDraft.defaultModel}
                      onChange={(e) => setNewProviderDraft(prev => ({ ...prev, defaultModel: e.target.value }))}
                    />
                    <Input
                      placeholder={tAI.providerDocsPlaceholder || 'Docs URL'}
                      value={newProviderDraft.docsUrl}
                      onChange={(e) => setNewProviderDraft(prev => ({ ...prev, docsUrl: e.target.value }))}
                    />
                    <Input
                      placeholder={tAI.providerDescriptionPlaceholder || 'Description'}
                      value={newProviderDraft.description}
                      onChange={(e) => setNewProviderDraft(prev => ({ ...prev, description: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between border border-border rounded px-2 py-1.5">
                        <span className="text-[11px] text-muted-foreground">{tAI.providerRequiresKey || 'Requires API key'}</span>
                        <Switch
                          checked={newProviderDraft.requiresApiKey}
                          onCheckedChange={(checked) => setNewProviderDraft(prev => ({ ...prev, requiresApiKey: checked }))}
                        />
                      </div>
                      <div className="flex items-center justify-between border border-border rounded px-2 py-1.5">
                        <span className="text-[11px] text-muted-foreground">{tAI.providerEndpointSupport || 'Supports endpoint'}</span>
                        <Switch
                          checked={newProviderDraft.supportsEndpoint}
                          onCheckedChange={(checked) => setNewProviderDraft(prev => ({
                            ...prev,
                            supportsEndpoint: checked,
                            endpointScope: checked ? (prev.endpointScope === 'model' ? 'model' : 'provider') : 'none',
                          }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground">{tAI.credentialScopeLabel || 'Credential scope'}</p>
                        <Select
                          value={newProviderDraft.credentialScope}
                          onValueChange={(value) => setNewProviderDraft(prev => ({
                            ...prev,
                            credentialScope: value === 'model' ? 'model' : 'provider',
                            endpointScope: prev.supportsEndpoint
                              ? (value === 'model' ? 'model' : (prev.endpointScope === 'none' ? 'provider' : prev.endpointScope))
                              : 'none',
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="provider">{tAI.credentialScopeProvider || 'Provider level (single key)'}</SelectItem>
                            <SelectItem value="model">{tAI.credentialScopeModel || 'Model level (key per model)'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {newProviderDraft.supportsEndpoint && (
                        <div className="space-y-1">
                          <p className="text-[11px] text-muted-foreground">{tAI.endpointScopeLabel || 'Endpoint scope'}</p>
                          <Select
                            value={newProviderDraft.endpointScope === 'model' ? 'model' : 'provider'}
                            onValueChange={(value) => setNewProviderDraft(prev => ({
                              ...prev,
                              endpointScope: value === 'model' ? 'model' : 'provider',
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="provider">{tAI.endpointScopeProvider || 'Provider endpoint'}</SelectItem>
                              <SelectItem value="model">{tAI.endpointScopeModel || 'Model endpoint'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    {newProviderDraft.supportsEndpoint && (
                      <Input
                        placeholder={tAI.providerEndpointPlaceholder || 'Endpoint placeholder'}
                        value={newProviderDraft.endpointPlaceholder}
                        onChange={(e) => setNewProviderDraft(prev => ({ ...prev, endpointPlaceholder: e.target.value }))}
                      />
                    )}
                    {newProviderDraft.requiresApiKey && newProviderDraft.credentialScope === 'provider' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <Key className="h-3 w-3 text-primary/70" />
                          {tAI.apiKeyLabel || 'API Key'}
                        </label>
                        <div className="relative">
                          <Input
                            type={showKeys['provider:create'] ? 'text' : 'password'}
                            placeholder={tAI.apiKeyPlaceholder || 'Paste provider API key'}
                            value={newProviderCredentialDraft.apiKey}
                            onChange={(e) => setNewProviderCredentialDraft(prev => ({ ...prev, apiKey: e.target.value }))}
                            className="pr-10"
                          />
                          <button
                            onClick={() => toggleShowKey('provider:create')}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            type="button"
                          >
                            {showKeys['provider:create'] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                      </div>
                    )}
                    {newProviderDraft.supportsEndpoint && newProviderDraft.endpointScope === 'provider' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <Server className="h-3 w-3 text-primary/70" />
                          {tAI.endpointUrlLabel || 'Endpoint URL'}
                        </label>
                        <Input
                          placeholder={newProviderDraft.endpointPlaceholder || 'https://api.example.com'}
                          value={newProviderCredentialDraft.endpointUrl}
                          onChange={(e) => setNewProviderCredentialDraft(prev => ({ ...prev, endpointUrl: e.target.value }))}
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleCreateProvider}>
                        {tAI.providerCreateAction || 'Create Provider'}
                      </Button>
                      <Button variant="outline" size="sm" onClick={handleCreateProviderAndTest}>
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        {tAI.providerCreateAndTestAction || 'Create and Test'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => {
                          setNewProviderDraft(emptyProviderDraft());
                          setNewProviderCredentialDraft({ apiKey: '', endpointUrl: '' });
                        }}
                      >
                        {tAI.providerResetAction || 'Reset'}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="edit" className="mt-0 space-y-2">
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">{tAI.providerEditSelectLabel || 'Provider to edit'}</p>
                      <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                        <SelectTrigger className="w-full sm:w-[320px]">
                          <SelectValue placeholder={tAI.providerSelectorPlaceholder || 'Select provider'} />
                        </SelectTrigger>
                        <SelectContent>
                          {providers.map(provider => (
                            <SelectItem key={provider.id} value={provider.id}>
                              {provider.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    {!canEditSelectedProvider && (
                      <p className="text-[11px] text-muted-foreground">
                        {tAI.providerEditUnavailable || 'Select a provider stored in the registry to edit or delete it.'}
                      </p>
                    )}
                    <Input
                      value={editProviderDraft.providerId}
                      disabled
                      placeholder="provider-id"
                    />
                    <Input
                      placeholder={tAI.providerNamePlaceholder || 'Provider name'}
                      value={editProviderDraft.name}
                      onChange={(e) => setEditProviderDraft(prev => ({ ...prev, name: e.target.value }))}
                    />
                    <Input
                      placeholder={tAI.providerDocsPlaceholder || 'Docs URL'}
                      value={editProviderDraft.docsUrl}
                      onChange={(e) => setEditProviderDraft(prev => ({ ...prev, docsUrl: e.target.value }))}
                    />
                    <Input
                      placeholder={tAI.providerDescriptionPlaceholder || 'Description'}
                      value={editProviderDraft.description}
                      onChange={(e) => setEditProviderDraft(prev => ({ ...prev, description: e.target.value }))}
                    />
                    <div className="grid grid-cols-2 gap-2">
                      <div className="flex items-center justify-between border border-border rounded px-2 py-1.5">
                        <span className="text-[11px] text-muted-foreground">{tAI.providerRequiresKey || 'Requires API key'}</span>
                        <Switch
                          checked={editProviderDraft.requiresApiKey}
                          onCheckedChange={(checked) => setEditProviderDraft(prev => ({ ...prev, requiresApiKey: checked }))}
                        />
                      </div>
                      <div className="flex items-center justify-between border border-border rounded px-2 py-1.5">
                        <span className="text-[11px] text-muted-foreground">{tAI.providerEndpointSupport || 'Supports endpoint'}</span>
                        <Switch
                          checked={editProviderDraft.supportsEndpoint}
                          onCheckedChange={(checked) => setEditProviderDraft(prev => ({
                            ...prev,
                            supportsEndpoint: checked,
                            endpointScope: checked ? (prev.endpointScope === 'model' ? 'model' : 'provider') : 'none',
                          }))}
                        />
                      </div>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                      <div className="space-y-1">
                        <p className="text-[11px] text-muted-foreground">{tAI.credentialScopeLabel || 'Credential scope'}</p>
                        <Select
                          value={editProviderDraft.credentialScope}
                          onValueChange={(value) => setEditProviderDraft(prev => ({
                            ...prev,
                            credentialScope: value === 'model' ? 'model' : 'provider',
                            endpointScope: prev.supportsEndpoint
                              ? (value === 'model' ? 'model' : (prev.endpointScope === 'none' ? 'provider' : prev.endpointScope))
                              : 'none',
                          }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="provider">{tAI.credentialScopeProvider || 'Provider level (single key)'}</SelectItem>
                            <SelectItem value="model">{tAI.credentialScopeModel || 'Model level (key per model)'}</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                      {editProviderDraft.supportsEndpoint && (
                        <div className="space-y-1">
                          <p className="text-[11px] text-muted-foreground">{tAI.endpointScopeLabel || 'Endpoint scope'}</p>
                          <Select
                            value={editProviderDraft.endpointScope === 'model' ? 'model' : 'provider'}
                            onValueChange={(value) => setEditProviderDraft(prev => ({
                              ...prev,
                              endpointScope: value === 'model' ? 'model' : 'provider',
                            }))}
                          >
                            <SelectTrigger>
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              <SelectItem value="provider">{tAI.endpointScopeProvider || 'Provider endpoint'}</SelectItem>
                              <SelectItem value="model">{tAI.endpointScopeModel || 'Model endpoint'}</SelectItem>
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                    {editProviderDraft.supportsEndpoint && (
                      <Input
                        placeholder={tAI.providerEndpointPlaceholder || 'Endpoint placeholder'}
                        value={editProviderDraft.endpointPlaceholder}
                        onChange={(e) => setEditProviderDraft(prev => ({ ...prev, endpointPlaceholder: e.target.value }))}
                      />
                    )}
                    {editProviderDraft.requiresApiKey && editProviderDraft.credentialScope === 'provider' && selectedProvider && selectedProviderConfig && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <Key className="h-3 w-3 text-primary/70" />
                          {tAI.apiKeyLabel || 'API Key'}
                        </label>
                        <div className="relative">
                          <Input
                            type={showKeys[`provider:edit:${selectedProvider.id}`] ? 'text' : 'password'}
                            placeholder={selectedProviderConfig.hasStoredKey
                              ? (tAI.apiKeyStoredPlaceholder || 'Stored key detected. Enter a new key to rotate.')
                              : (tAI.apiKeyPlaceholder || 'Paste provider API key')}
                            value={selectedProviderConfig.apiKey}
                            onChange={(e) => updateConfig(selectedProvider.id, { apiKey: e.target.value, connectionStatus: 'idle' })}
                            className="pr-10"
                          />
                          <button
                            onClick={() => toggleShowKey(`provider:edit:${selectedProvider.id}`)}
                            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            type="button"
                          >
                            {showKeys[`provider:edit:${selectedProvider.id}`] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                          </button>
                        </div>
                        {selectedProviderConfig.hasStoredKey && (
                          <p className="text-[11px] text-muted-foreground">{tAI.storedKeyHint || 'A key is already stored securely for this provider.'}</p>
                        )}
                      </div>
                    )}
                    {editProviderDraft.supportsEndpoint && editProviderDraft.endpointScope === 'provider' && selectedProvider && selectedProviderConfig && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <Server className="h-3 w-3 text-primary/70" />
                          {tAI.endpointUrlLabel || 'Endpoint URL'}
                        </label>
                        <Input
                          placeholder={editProviderDraft.endpointPlaceholder || 'https://api.example.com'}
                          value={selectedProviderConfig.endpointUrl}
                          onChange={(e) => updateConfig(selectedProvider.id, {
                            endpointUrl: e.target.value,
                            connectionStatus: 'idle',
                          })}
                        />
                      </div>
                    )}
                    <div className="flex gap-2">
                      <Button size="sm" onClick={handleUpdateSelectedProvider} disabled={!canEditSelectedProvider}>
                        {tAI.providerUpdateAction || 'Save Provider'}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={handleUpdateProviderAndTest}
                        disabled={!canEditSelectedProvider}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        {tAI.providerUpdateAndTestAction || 'Save and Test'}
                      </Button>
                    </div>
                  </TabsContent>

                  <TabsContent value="delete" className="mt-0 space-y-2">
                    <div className="space-y-1">
                      <p className="text-[11px] text-muted-foreground">{tAI.providerDeleteSelectLabel || 'Provider to delete'}</p>
                      <Select value={selectedProviderId} onValueChange={setSelectedProviderId}>
                        <SelectTrigger className="w-full sm:w-[320px]">
                          <SelectValue placeholder={tAI.providerSelectorPlaceholder || 'Select provider'} />
                        </SelectTrigger>
                        <SelectContent>
                          {providers.map(provider => (
                            <SelectItem key={provider.id} value={provider.id}>
                              {provider.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 space-y-2">
                      <p className="text-xs font-medium text-foreground">
                        {selectedProvider?.name || (tAI.noneSelected || 'None selected')}
                      </p>
                      <p className="text-[11px] text-muted-foreground">
                        {tAI.providerDeleteHint || 'Deleting a provider removes its integration and model registry associations from your account.'}
                      </p>
                      {providers.length <= 1 && (
                        <p className="text-[11px] text-destructive">
                          {tAI.providerDeleteMinOne || 'At least one provider must remain registered.'}
                        </p>
                      )}
                      <Button
                        variant="destructive"
                        size="sm"
                        onClick={handleDeleteSelectedProvider}
                        disabled={!canEditSelectedProvider || providers.length <= 1}
                      >
                        {tAI.providerDeleteAction || 'Delete Provider'}
                      </Button>
                    </div>
                  </TabsContent>
                </Tabs>
              </div>
            </TabsContent>

            <TabsContent value="models" className="mt-0">
              <div className="rounded-md border border-border/70 p-3 space-y-3">
                <p className="text-[11px] text-muted-foreground">
                  {tAI.providerCrudFlowHint || 'Use one flow at a time to avoid visual overload.'}
                </p>

                <Tabs
                  value={modelCrudTab}
                  onValueChange={(value) => setModelCrudTab(value as 'create' | 'edit' | 'delete')}
                  className="space-y-3"
                >
                  <TabsList className="bg-muted/40 border border-border">
                    <TabsTrigger value="create" className="data-[state=active]:bg-card">
                      {tAI.modelCreateTitle || 'New Model'}
                    </TabsTrigger>
                    <TabsTrigger value="edit" className="data-[state=active]:bg-card">
                      {tAI.modelEditTitle || 'Edit Model'}
                    </TabsTrigger>
                    <TabsTrigger value="delete" className="data-[state=active]:bg-card">
                      {tAI.modelDeleteTitle || 'Delete Model'}
                    </TabsTrigger>
                  </TabsList>

                {modelCrudTab === 'create' && (
                <div className="rounded border border-border/60 bg-muted/20 p-3 space-y-3">
                  <div className="flex flex-wrap items-end gap-2">
                    <div className="flex-1 min-w-[220px] space-y-1">
                      <p className="text-[11px] text-muted-foreground">{tAI.modelsCrudTitle || 'Models'}</p>
                      <Input
                        placeholder={tAI.modelCreatePlaceholder || 'New model id'}
                        value={newModelDraft}
                        onChange={(e) => setNewModelDraft(e.target.value)}
                      />
                    </div>
                    <Button size="sm" onClick={handleCreateModel}>
                      {tAI.modelCreateAction || 'Add Model'}
                    </Button>
                    <Button size="sm" variant="outline" onClick={handleCreateModelAndTest}>
                      <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                      {tAI.modelCreateAndTestAction || 'Add and Test'}
                    </Button>
                  </div>

                  {selectedProvider.requiresApiKey && selectedProvider.credentialScope === 'model' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Key className="h-3 w-3 text-primary/70" />
                        {tAI.modelApiKeyLabel || 'Model API key'}
                      </label>
                      <div className="relative">
                        <Input
                          type={showKeys['model:create'] ? 'text' : 'password'}
                          placeholder={tAI.apiKeyPlaceholder || 'Paste provider API key'}
                          value={newModelCredentialDraft.apiKey}
                          onChange={(e) => setNewModelCredentialDraft(prev => ({ ...prev, apiKey: e.target.value }))}
                          className="pr-10"
                        />
                        <button
                          onClick={() => toggleShowKey('model:create')}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                          type="button"
                        >
                          {showKeys['model:create'] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                        </button>
                      </div>
                    </div>
                  )}

                  {selectedProvider.supportsEndpoint && selectedProvider.endpointScope === 'model' && (
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Server className="h-3 w-3 text-primary/70" />
                        {tAI.modelEndpointLabel || 'Model endpoint URL'}
                      </label>
                      <Input
                        placeholder={selectedProvider.endpointPlaceholder || 'https://<resource>.openai.azure.com'}
                        value={newModelCredentialDraft.endpointUrl}
                        onChange={(e) => setNewModelCredentialDraft(prev => ({ ...prev, endpointUrl: e.target.value }))}
                      />
                    </div>
                  )}

                  <div className="flex items-center justify-between rounded border border-border/60 bg-card px-2.5 py-2">
                    <div>
                      <p className="text-xs font-medium text-foreground">{tAI.modelParamsDuringCreateTitle || 'Additional parameters'}</p>
                      <p className="text-[11px] text-muted-foreground">
                        {tAI.modelParamsDuringCreateDesc || 'Enable to save provider-specific parameters with this model.'}
                      </p>
                    </div>
                    <Switch
                      checked={newModelParamsEnabled}
                      onCheckedChange={setNewModelParamsEnabled}
                    />
                  </div>

                  {newModelParamsEnabled && selectedProviderParamDefs.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      {tAI.advancedParamsNoOptions || 'No advanced parameters are available for this provider.'}
                    </p>
                  )}

                  {newModelParamsEnabled && selectedProviderParamDefs.length > 0 && (
                    <div className="space-y-2">
                      {selectedProviderParamDefs.map((def) => {
                        const hasParamValue = Object.prototype.hasOwnProperty.call(newModelParamsDraft, def.key);
                        const rawParamValue = newModelParamsDraft[def.key];
                        const textValue = Array.isArray(rawParamValue)
                          ? rawParamValue.join(', ')
                          : (rawParamValue === null || rawParamValue === undefined ? '' : String(rawParamValue));

                        return (
                          <div key={`new-${def.key}`} className="rounded border border-border/60 bg-card p-2.5 space-y-2">
                            <div className="flex items-start justify-between gap-3">
                              <div>
                                <p className="text-xs font-medium text-foreground font-mono">{def.label}</p>
                                <p className="text-[11px] text-muted-foreground">{def.description}</p>
                              </div>
                              <Switch
                                checked={hasParamValue}
                                onCheckedChange={(checked) => setNewModelParamsDraft((prev) => {
                                  const next = { ...prev };
                                  if (checked) {
                                    next[def.key] = def.defaultValue ?? null;
                                  } else {
                                    delete next[def.key];
                                  }
                                  return next;
                                })}
                              />
                            </div>

                            {hasParamValue && def.type === 'select' && def.options && (
                              <Select
                                value={textValue || String(def.defaultValue || def.options[0] || '')}
                                onValueChange={(value) => setNewModelParamsDraft(prev => ({ ...prev, [def.key]: value }))}
                              >
                                <SelectTrigger className="w-full max-w-xs">
                                  <SelectValue />
                                </SelectTrigger>
                                <SelectContent>
                                  {def.options.map((option) => (
                                    <SelectItem key={option} value={option}>{option}</SelectItem>
                                  ))}
                                </SelectContent>
                              </Select>
                            )}

                            {hasParamValue && def.type !== 'select' && (
                              <Input
                                type={def.type === 'number' || def.type === 'integer' ? 'number' : 'text'}
                                min={def.min}
                                max={def.max}
                                step={def.type === 'integer' ? 1 : (def.step || 0.1)}
                                value={textValue}
                                placeholder={def.placeholder}
                                onChange={(e) => setNewModelParamsDraft(prev => ({ ...prev, [def.key]: e.target.value }))}
                              />
                            )}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
                )}

                {modelCrudTab === 'edit' && (
                  <div className="space-y-2">
                    {selectedProviderModels.length === 0 ? (
                      <div className="rounded border border-dashed border-border/70 px-3 py-4 text-xs text-muted-foreground">
                        {tAI.noModelsRegistered || 'No models registered for this provider yet.'}
                      </div>
                    ) : (
                      <div className="rounded border border-border/60 bg-muted/20 p-3 space-y-3">
                        <div className="space-y-1">
                          <p className="text-[11px] text-muted-foreground">{tAI.modelEditSelectLabel || 'Model to edit'}</p>
                          <Select value={selectedModelEditRow?.id || ''} onValueChange={selectModelForEdit}>
                            <SelectTrigger className="w-full sm:w-[320px]">
                              <SelectValue placeholder={tAI.modelCreatePlaceholder || 'New model id'} />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedProviderModels.map((modelRow) => (
                                <SelectItem key={modelRow.id} value={modelRow.id}>
                                  {modelRow.model_id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        {selectedModelEditRow && (
                          <>
                            <div className="flex flex-wrap items-center gap-2">
                              {selectedModelEditRow.is_default && (
                                <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                                  {tAI.default || 'Default'}
                                </Badge>
                              )}
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleSetDefaultModel(selectedModelEditRow.id)}
                                disabled={selectedModelEditRow.is_default}
                              >
                                {tAI.modelSetDefault || 'Set Default'}
                              </Button>
                            </div>

                            <Input
                              className="max-w-xs"
                              value={renamedModelValue}
                              onChange={(e) => setRenamedModelValue(e.target.value)}
                            />

                            {selectedProvider.requiresApiKey && selectedProvider.credentialScope === 'model' && (
                              <div className="space-y-1.5">
                                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                  <Key className="h-3 w-3 text-primary/70" />
                                  {tAI.modelApiKeyLabel || 'Model API key'}
                                </label>
                                <div className="relative max-w-md">
                                  <Input
                                    type={showKeys[`model:edit:${selectedModelEditRow.model_id}`] ? 'text' : 'password'}
                                    placeholder={selectedModelEditCredential.hasStoredKey
                                      ? (tAI.apiKeyStoredPlaceholder || 'Stored key detected. Enter a new key to rotate.')
                                      : (tAI.apiKeyPlaceholder || 'Paste provider API key')}
                                    value={selectedModelEditCredential.apiKey}
                                    onChange={(e) => updateModelCredential(selectedProvider.id, selectedModelEditRow.model_id, {
                                      apiKey: e.target.value,
                                    })}
                                    className="pr-10"
                                  />
                                  <button
                                    onClick={() => toggleShowKey(`model:edit:${selectedModelEditRow.model_id}`)}
                                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                    type="button"
                                  >
                                    {showKeys[`model:edit:${selectedModelEditRow.model_id}`] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                  </button>
                                </div>
                                {selectedModelEditCredential.hasStoredKey && (
                                  <p className="text-[11px] text-muted-foreground">
                                    {tAI.modelStoredKeyHint || `A key is already stored for model ${selectedModelEditRow.model_id}.`}
                                  </p>
                                )}
                              </div>
                            )}

                            {selectedProvider.supportsEndpoint && selectedProvider.endpointScope === 'model' && (
                              <div className="space-y-1.5 max-w-md">
                                <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                                  <Server className="h-3 w-3 text-primary/70" />
                                  {tAI.modelEndpointLabel || 'Model endpoint URL'}
                                </label>
                                <Input
                                  placeholder={selectedProvider.endpointPlaceholder || 'https://<resource>.openai.azure.com'}
                                  value={selectedModelEditCredential.endpointUrl}
                                  onChange={(e) => updateModelCredential(selectedProvider.id, selectedModelEditRow.model_id, {
                                    endpointUrl: e.target.value,
                                  })}
                                />
                                <p className="text-[11px] text-muted-foreground">
                                  {tAI.modelEndpointHint || 'This endpoint is saved per model.'}
                                </p>
                              </div>
                            )}

                            <div className="w-full rounded border border-border/60 bg-card p-2.5 space-y-2">
                              <div className="flex items-center justify-between gap-3">
                                <p className="text-[11px] text-muted-foreground">
                                  {tAI.modelParamsDuringEdit || 'Additional parameters for this model'}
                                </p>
                                <Switch
                                  checked={renamingModelParamsEnabled}
                                  onCheckedChange={setRenamingModelParamsEnabled}
                                />
                              </div>
                              {renamingModelParamsEnabled && selectedProviderParamDefs.length > 0 && (
                                <div className="space-y-2">
                                  {selectedProviderParamDefs.map((def) => {
                                    const hasParamValue = Object.prototype.hasOwnProperty.call(renamingModelParamsDraft, def.key);
                                    const rawParamValue = renamingModelParamsDraft[def.key];
                                    const textValue = Array.isArray(rawParamValue)
                                      ? rawParamValue.join(', ')
                                      : (rawParamValue === null || rawParamValue === undefined ? '' : String(rawParamValue));

                                    return (
                                      <div key={`edit-${def.key}`} className="rounded border border-border/60 bg-card p-2.5 space-y-2">
                                        <div className="flex items-start justify-between gap-3">
                                          <div>
                                            <p className="text-xs font-medium text-foreground font-mono">{def.label}</p>
                                            <p className="text-[11px] text-muted-foreground">{def.description}</p>
                                          </div>
                                          <Switch
                                            checked={hasParamValue}
                                            onCheckedChange={(checked) => setRenamingModelParamsDraft((prev) => {
                                              const next = { ...prev };
                                              if (checked) {
                                                next[def.key] = def.defaultValue ?? null;
                                              } else {
                                                delete next[def.key];
                                              }
                                              return next;
                                            })}
                                          />
                                        </div>

                                        {hasParamValue && def.type === 'select' && def.options && (
                                          <Select
                                            value={textValue || String(def.defaultValue || def.options[0] || '')}
                                            onValueChange={(value) => setRenamingModelParamsDraft(prev => ({ ...prev, [def.key]: value }))}
                                          >
                                            <SelectTrigger className="w-full max-w-xs">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              {def.options.map((option) => (
                                                <SelectItem key={option} value={option}>{option}</SelectItem>
                                              ))}
                                            </SelectContent>
                                          </Select>
                                        )}

                                        {hasParamValue && def.type !== 'select' && (
                                          <Input
                                            type={def.type === 'number' || def.type === 'integer' ? 'number' : 'text'}
                                            min={def.min}
                                            max={def.max}
                                            step={def.type === 'integer' ? 1 : (def.step || 0.1)}
                                            value={textValue}
                                            placeholder={def.placeholder}
                                            onChange={(e) => setRenamingModelParamsDraft(prev => ({ ...prev, [def.key]: e.target.value }))}
                                          />
                                        )}
                                      </div>
                                    );
                                  })}
                                </div>
                              )}
                            </div>

                            <div className="flex gap-2">
                              <Button size="sm" onClick={handleRenameModel} disabled={!selectedModelEditRow}>
                                {tAI.modelRenameSave || 'Save Model'}
                              </Button>
                              <Button size="sm" variant="outline" onClick={handleRenameModelAndTest} disabled={!selectedModelEditRow}>
                                <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                                {tAI.modelRenameAndTestAction || 'Save and Test'}
                              </Button>
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => selectedModelEditRow && selectModelForEdit(selectedModelEditRow.id)}
                                disabled={!selectedModelEditRow}
                              >
                                {t.common.cancel || 'Cancel'}
                              </Button>
                            </div>
                          </>
                        )}
                      </div>
                    )}
                  </div>
                )}

                {modelCrudTab === 'delete' && (
                  <div className="space-y-2">
                    {selectedProviderModels.length === 0 ? (
                      <div className="rounded border border-dashed border-border/70 px-3 py-4 text-xs text-muted-foreground">
                        {tAI.noModelsRegistered || 'No models registered for this provider yet.'}
                      </div>
                    ) : (
                      <div className="rounded border border-border/60 bg-muted/20 p-3 space-y-3">
                        <div className="space-y-1">
                          <p className="text-[11px] text-muted-foreground">{tAI.modelDeleteSelectLabel || 'Model to delete'}</p>
                          <Select value={selectedModelDeleteRow?.id || ''} onValueChange={setDeleteModelId}>
                            <SelectTrigger className="w-full sm:w-[320px]">
                              <SelectValue placeholder={tAI.modelCreatePlaceholder || 'New model id'} />
                            </SelectTrigger>
                            <SelectContent>
                              {selectedProviderModels.map((modelRow) => (
                                <SelectItem key={modelRow.id} value={modelRow.id}>
                                  {modelRow.model_id}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>

                        <div className="rounded border border-destructive/30 bg-destructive/5 px-3 py-2 space-y-2">
                          <p className="text-xs font-medium text-foreground">
                            {selectedModelDeleteRow?.model_id || (tAI.noneSelected || 'None selected')}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {tAI.modelDeleteHint || 'Deleting a model removes its registry entry and saved model-level integration parameters.'}
                          </p>
                          {selectedProviderModels.length <= 1 && (
                            <p className="text-[11px] text-destructive">
                              {tAI.modelDeleteMinOne || 'At least one model must remain registered for this provider.'}
                            </p>
                          )}
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => selectedModelDeleteRow && handleDeleteModel(selectedModelDeleteRow.id)}
                            disabled={!selectedModelDeleteRow || selectedProviderModels.length <= 1}
                          >
                            {tAI.modelDeleteAction || 'Delete'}
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                </Tabs>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      )}

      {workspaceTab === 'integration' && (
        <div className="space-y-4">
          {loading ? (
            Array.from({ length: 1 }).map((_, i) => <SettingsSectionSkeleton key={i} />)
          ) : (
            [selectedProvider].map((provider, idx) => {
              const config = configs[provider.id] || makeProviderConfig(provider);
              const selectedModel = config.selectedModel || provider.defaultModel;

              return (
                <motion.div
                  key={provider.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: idx * 0.04 }}
                  className="bg-card border border-border rounded-lg p-5 shadow-premium"
                >
                  <div className="flex items-center gap-3 mb-4">
                    <span className="text-[11px] tracking-widest font-bold text-primary/80 bg-primary/10 px-2 py-1 rounded">
                      {provider.icon}
                    </span>
                    <div className="flex items-center gap-3">
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-foreground">{provider.name}</span>
                        </div>
                        <p className="text-xs text-muted-foreground mt-0.5">{providerDescriptions[provider.id] || provider.description}</p>
                      </div>
                    </div>
                  </div>

                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 pt-4 border-t border-border"
                  >
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">{tAI.primaryModelLabel || tAI.model || 'Primary model'}</label>
                        <Select
                          value={selectedModel}
                          onValueChange={(model) => {
                            const current = configs[provider.id] || config;
                            const nextFallback = current.fallbackModel === model ? '' : current.fallbackModel;
                            updateConfig(provider.id, {
                              selectedModel: model,
                              fallbackModel: nextFallback,
                              connectionStatus: 'idle',
                            });
                            setIntegrationDirty(provider.id, true);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {provider.models.map(model => (
                              <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">{tAI.fallbackModelLabel || 'Fallback model'}</label>
                        <Select
                          value={config.fallbackModel || '__none__'}
                          onValueChange={(value) => {
                            const fallbackModel = value === '__none__' ? '' : value;
                            updateConfig(provider.id, { fallbackModel, connectionStatus: 'idle' });
                            setIntegrationDirty(provider.id, true);
                          }}
                        >
                          <SelectTrigger className="w-full">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="__none__">{tAI.noFallbackModel || 'No fallback'}</SelectItem>
                            {provider.models
                              .filter(model => model !== selectedModel)
                              .map(model => (
                                <SelectItem key={model} value={model}>{model}</SelectItem>
                              ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      {tAI.integrationModelOnlyHint || 'Integration only controls primary and fallback model selection. Configure credentials and endpoints in Provider and Model tabs.'}
                    </p>
                    <div className="flex flex-wrap items-center gap-2 pt-1">
                      <Button
                        size="sm"
                        onClick={() => handleSaveIntegrationSelection(provider.id)}
                        disabled={saving || !integrationDirtyByProvider[provider.id]}
                      >
                        {tAI.integrationSaveAction || 'Save Selection'}
                      </Button>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleSaveAndTestIntegration(provider.id)}
                        disabled={saving}
                      >
                        <RefreshCw className="h-3.5 w-3.5 mr-1.5" />
                        {tAI.integrationSaveAndTestAction || 'Save and Test'}
                      </Button>
                      {integrationDirtyByProvider[provider.id] && (
                        <p className="text-[11px] text-muted-foreground">
                          {tAI.integrationUnsavedHint || 'You have unsaved integration model changes.'}
                        </p>
                      )}
                    </div>
                  </motion.div>
                </motion.div>
              );
            })
          )}
        </div>
      )}
      {workspaceTab === 'integration' && !loading && (
        <div className="bg-muted/30 border border-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-primary/70 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">{tAI.howItWorksTitle || 'How it works'}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {tAI.howItWorksDesc || 'Use Integration to define the primary and fallback model for the selected provider. Configure provider/model credentials and endpoints in their respective CRUD tabs.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIIntegrations;
