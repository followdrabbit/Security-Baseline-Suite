import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { SettingsSectionSkeleton } from '@/components/skeletons/SkeletonPremium';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import InfoTooltip from '@/components/InfoTooltip';
import HelpButton from '@/components/HelpButton';
import { useToast } from '@/hooks/use-toast';
import { aiConfigService, type AIProviderCatalogEntry, type AIProviderModelEntry } from '@/services/aiService';
import { localDb } from '@/integrations/localdb/client';
import {
  Brain,
  CheckCircle2,
  Eye,
  EyeOff,
  Key,
  Loader2,
  LogIn,
  RefreshCw,
  Server,
  Sparkles,
  XCircle,
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
});

const normalizeProviderIdInput = (value: string): string => String(value || '')
  .toLowerCase()
  .replace(/[^a-z0-9_-]/g, '-')
  .replace(/-+/g, '-');

const normalizeProviderId = (value: string): string => normalizeProviderIdInput(value)
  .replace(/^-|-$/g, '');

const normalizeModelId = (value: string): string => String(value || '').trim();

const iconFromName = (name: string): string => {
  const cleaned = String(name || '').trim().toUpperCase().replace(/[^A-Z0-9]/g, '');
  return cleaned.slice(0, 3) || 'CUS';
};

const buildProvidersFromCatalog = (
  providerRows: AIProviderCatalogEntry[],
  modelRows: AIProviderModelEntry[],
): AIProvider[] => {
  const byProvider = new Map<string, AIProviderModelEntry[]>();
  for (const modelRow of modelRows) {
    if (!modelRow.is_active) continue;
    const list = byProvider.get(modelRow.provider_id) || [];
    list.push(modelRow);
    byProvider.set(modelRow.provider_id, list);
  }

  const result: AIProvider[] = [];
  for (const row of providerRows) {
    if (!row.is_active) continue;

    const models = (byProvider.get(row.provider_id) || [])
      .slice()
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.model_id).localeCompare(String(b.model_id)))
      .map((item) => String(item.model_id || '').trim())
      .filter(Boolean);

    if (!models.length) {
      continue;
    }

    const defaultModel = (byProvider.get(row.provider_id) || []).find(model => model.is_default)?.model_id || models[0];

    result.push({
      id: row.provider_id,
      name: row.name || row.provider_id,
      description: row.description || '',
      icon: row.icon || iconFromName(row.name || row.provider_id),
      models,
      defaultModel: defaultModel || models[0],
      docsUrl: row.docs_url || '',
      requiresApiKey: Boolean(row.requires_api_key),
      supportsEndpoint: Boolean(row.supports_endpoint),
      endpointPlaceholder: row.endpoint_placeholder || '',
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
  maxTokens: 65000,
  endpointUrl: provider.id === 'ollama' ? (provider.endpointPlaceholder || 'http://127.0.0.1:11434') : '',
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

const AIIntegrations: React.FC = () => {
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
  const [showProviderCrud, setShowProviderCrud] = useState(false);
  const [newProviderDraft, setNewProviderDraft] = useState<ProviderDraft>(emptyProviderDraft);
  const [editProviderDraft, setEditProviderDraft] = useState<ProviderDraft>(emptyProviderDraft);
  const [newModelDraft, setNewModelDraft] = useState('');
  const [renamingModelId, setRenamingModelId] = useState<string | null>(null);
  const [renamedModelValue, setRenamedModelValue] = useState('');

  const tAI = (t as any).aiIntegrations || {};
  const providerDescriptions = tAI.providerDescriptions || {};

  const updateConfig = (providerId: string, updates: Partial<ProviderConfig>) => {
    setConfigs(prev => ({
      ...prev,
      [providerId]: { ...prev[providerId], ...updates },
    }));
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

        next[row.provider_id] = {
          ...next[row.provider_id],
          enabled: Boolean(row.enabled),
          selectedModel: row.selected_model || next[row.provider_id].selectedModel,
          fallbackModel,
          advancedParamsEnabled,
          modelParams,
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
    options?: { persistApiKey?: boolean; silent?: boolean },
  ) => {
    if (!user) return;

    setSaving(true);
    try {
      const provider = providers.find(p => p.id === providerId);
      const normalizedModelParams = normalizeModelParams(providerId, config.modelParams);
      const extraConfig: Record<string, any> = {
        max_tokens: config.maxTokens,
        model_params_enabled: Boolean(config.advancedParamsEnabled),
        model_params: config.advancedParamsEnabled ? normalizedModelParams : {},
      };

      if (provider?.supportsEndpoint && config.endpointUrl.trim()) {
        extraConfig.endpoint_url = config.endpointUrl.trim();
      }

      if (config.fallbackModel.trim()) {
        extraConfig.fallback_model = config.fallbackModel.trim();
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
    } catch (err: any) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: err?.message || tAI.saveErrorDesc || 'Could not save provider configuration.',
        variant: 'destructive',
      });
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

  const testConnection = async (providerId: string) => {
    const provider = providers.find(p => p.id === providerId);
    const config = configs[providerId];
    if (!provider || !config) return;

    if (provider.requiresApiKey && !config.apiKey.trim() && !config.hasStoredKey) {
      toast({
        title: tAI.apiKeyRequiredTitle || 'API key required',
        description: tAI.apiKeyRequiredDesc || 'Enter an API key or keep a stored key before testing.',
        variant: 'destructive',
      });
      return;
    }

    updateConfig(providerId, { connectionStatus: 'testing' });

    const modelParamsForTest = config.advancedParamsEnabled
      ? normalizeModelParams(providerId, config.modelParams)
      : {};

    const result = await aiConfigService.testConnection(
      providerId,
      config.apiKey.trim(),
      config.selectedModel,
      config.endpointUrl.trim(),
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
      hasStoredKey: config.hasStoredKey || Boolean(config.apiKey.trim()),
      apiKey: '',
    };
    updateConfig(providerId, nextConfig);

    await saveConfig(providerId, nextConfig, {
      persistApiKey: Boolean(config.apiKey.trim()),
      silent: true,
    });

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
    () => providerCatalogRows.find(row => row.provider_id === selectedProviderId) || null,
    [providerCatalogRows, selectedProviderId],
  );
  const selectedProviderModels = useMemo(
    () => providerModelRows
      .filter(row => row.provider_id === selectedProviderId && row.is_active)
      .sort((a, b) => Number(a.sort_order || 0) - Number(b.sort_order || 0) || String(a.model_id).localeCompare(String(b.model_id))),
    [providerModelRows, selectedProviderId],
  );

  const reloadProviderData = async (preferredProviderId?: string) => {
    const mappedProviders = await loadProviderRegistry();
    await loadConfigs(mappedProviders);

    if (preferredProviderId && mappedProviders.some(provider => provider.id === preferredProviderId)) {
      setSelectedProviderId(preferredProviderId);
    }
  };

  const handleCreateProvider = async () => {
    if (!user) return;

    const providerId = normalizeProviderId(newProviderDraft.providerId || newProviderDraft.name);
    const name = String(newProviderDraft.name || '').trim();
    const defaultModel = normalizeModelId(newProviderDraft.defaultModel);

    if (!providerId || !name || !defaultModel) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: 'Provider ID, provider name, and default model are required.',
        variant: 'destructive',
      });
      return;
    }

    if (providers.some(provider => provider.id === providerId)) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: `Provider "${providerId}" already exists.`,
        variant: 'destructive',
      });
      return;
    }

    try {
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
        extra_config: { max_tokens: 65000 },
      });

      await reloadProviderData(providerId);
      setNewProviderDraft(emptyProviderDraft());
      toast({
        title: tAI.configSavedTitle || 'Configuration saved',
        description: 'Provider created successfully.',
      });
    } catch (err: any) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: err?.message || 'Could not create provider.',
        variant: 'destructive',
      });
    }
  };

  const handleUpdateSelectedProvider = async () => {
    if (!user || !selectedProviderCatalog) return;

    const name = String(editProviderDraft.name || '').trim();
    if (!name) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: 'Provider name is required.',
        variant: 'destructive',
      });
      return;
    }

    try {
      await aiConfigService.upsertProviderCatalog({
        provider_id: selectedProviderCatalog.provider_id,
        name,
        description: editProviderDraft.description,
        icon: (editProviderDraft.icon || iconFromName(name)).toUpperCase().slice(0, 3),
        docs_url: editProviderDraft.docsUrl,
        requires_api_key: editProviderDraft.requiresApiKey,
        supports_endpoint: editProviderDraft.supportsEndpoint,
        endpoint_placeholder: editProviderDraft.endpointPlaceholder,
        is_active: selectedProviderCatalog.is_active,
        is_builtin: selectedProviderCatalog.is_builtin,
      });

      await reloadProviderData(selectedProviderCatalog.provider_id);
      toast({
        title: tAI.configSavedTitle || 'Configuration saved',
        description: 'Provider updated successfully.',
      });
    } catch (err: any) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: err?.message || 'Could not update provider.',
        variant: 'destructive',
      });
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
          extra_config: { max_tokens: 65000 },
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

  const handleCreateModel = async () => {
    if (!selectedProvider) return;

    const modelId = normalizeModelId(newModelDraft);
    if (!modelId) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: 'Model ID is required.',
        variant: 'destructive',
      });
      return;
    }

    if (selectedProviderModels.some(row => row.model_id === modelId)) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: `Model "${modelId}" is already registered for this provider.`,
        variant: 'destructive',
      });
      return;
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

      if (!configs[selectedProvider.id]?.selectedModel) {
        const next = {
          ...configs[selectedProvider.id],
          selectedModel: modelId,
        };
        updateConfig(selectedProvider.id, { selectedModel: modelId });
        saveConfig(selectedProvider.id, next, { silent: true }).catch(() => null);
      }

      await reloadProviderData(selectedProvider.id);
      setNewModelDraft('');
      toast({
        title: tAI.configSavedTitle || 'Configuration saved',
        description: 'Model created successfully.',
      });
    } catch (err: any) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: err?.message || 'Could not create model.',
        variant: 'destructive',
      });
    }
  };

  const handleSetDefaultModel = async (modelRowId: string) => {
    if (!selectedProvider) return;

    try {
      await aiConfigService.setDefaultProviderModel(selectedProvider.id, modelRowId);
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

  const handleRenameModel = async () => {
    if (!selectedProvider || !renamingModelId) return;

    const row = selectedProviderModels.find(item => item.id === renamingModelId);
    if (!row) return;

    const nextModelId = normalizeModelId(renamedModelValue);
    if (!nextModelId || nextModelId === row.model_id) {
      setRenamingModelId(null);
      setRenamedModelValue('');
      return;
    }

    if (selectedProviderModels.some(item => item.model_id === nextModelId)) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: `Model "${nextModelId}" is already registered for this provider.`,
        variant: 'destructive',
      });
      return;
    }

    try {
      await aiConfigService.updateProviderModel(row.id, { model_id: nextModelId });

      const currentConfig = configs[selectedProvider.id];
      if (currentConfig) {
        const nextConfig: ProviderConfig = {
          ...currentConfig,
          selectedModel: currentConfig.selectedModel === row.model_id ? nextModelId : currentConfig.selectedModel,
          fallbackModel: currentConfig.fallbackModel === row.model_id ? '' : currentConfig.fallbackModel,
        };
        updateConfig(selectedProvider.id, {
          selectedModel: nextConfig.selectedModel,
          fallbackModel: nextConfig.fallbackModel,
        });
        saveConfig(selectedProvider.id, nextConfig, { silent: true }).catch(() => null);
      }

      await reloadProviderData(selectedProvider.id);
      setRenamingModelId(null);
      setRenamedModelValue('');
      toast({
        title: tAI.configSavedTitle || 'Configuration saved',
        description: 'Model updated successfully.',
      });
    } catch (err: any) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: err?.message || 'Could not update model.',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteModel = async (modelRowId: string) => {
    if (!selectedProvider) return;

    if (selectedProviderModels.length <= 1) {
      toast({
        title: tAI.saveErrorTitle || 'Save error',
        description: 'At least one model must remain registered for this provider.',
        variant: 'destructive',
      });
      return;
    }

    const deletingRow = selectedProviderModels.find(item => item.id === modelRowId);
    if (!deletingRow) return;

    const remainingRows = selectedProviderModels.filter(item => item.id !== modelRowId);
    const nextDefault = remainingRows.find(item => item.is_default) || remainingRows[0];

    try {
      await aiConfigService.deleteProviderModel(modelRowId);
      if (nextDefault) {
        await aiConfigService.setDefaultProviderModel(selectedProvider.id, nextDefault.id);
      }

      const currentConfig = configs[selectedProvider.id];
      if (currentConfig && nextDefault) {
        const nextConfig: ProviderConfig = {
          ...currentConfig,
          selectedModel: currentConfig.selectedModel === deletingRow.model_id ? nextDefault.model_id : currentConfig.selectedModel,
          fallbackModel: currentConfig.fallbackModel === deletingRow.model_id ? '' : currentConfig.fallbackModel,
        };
        updateConfig(selectedProvider.id, {
          selectedModel: nextConfig.selectedModel,
          fallbackModel: nextConfig.fallbackModel,
        });
        saveConfig(selectedProvider.id, nextConfig, { silent: true }).catch(() => null);
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

  const enabledCount = Object.values(configs).filter(c => c.enabled).length;
  const connectedCount = Object.values(configs).filter(c => c.connectionStatus === 'connected').length;
  const defaultProviderId = Object.entries(configs).find(([, cfg]) => cfg.isDefault)?.[0];
  const defaultProvider = providers.find(p => p.id === defaultProviderId);
  const selectedProvider = useMemo(
    () => providers.find(p => p.id === selectedProviderId) || providers[0],
    [providers, selectedProviderId],
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
      ) {
        return prev;
      }

      return nextDraft;
    });

    if (renamingModelId && !selectedProviderModels.some(model => model.id === renamingModelId)) {
      setRenamingModelId(null);
      setRenamedModelValue('');
    }
  }, [selectedProvider, providerCatalogRows, renamingModelId, selectedProviderModels]);

  if (!user && !loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
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

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
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

      {!loading && (
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

      {!loading && selectedProvider && (
        <div className="bg-card border border-border rounded-lg p-4 shadow-premium space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-foreground">{tAI.providerCrudTitle || 'Providers and Models Registry'}</p>
              <p className="text-xs text-muted-foreground">
                {tAI.providerCrudDesc || 'Create, read, update, and delete providers and models.'}
              </p>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setShowProviderCrud(prev => !prev)}
            >
              {showProviderCrud ? (tAI.providerCrudHide || 'Hide CRUD') : (tAI.providerCrudShow || 'Manage CRUD')}
            </Button>
          </div>

          {showProviderCrud && (
            <div className="space-y-5">
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                <div className="rounded-md border border-border/70 p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">{tAI.providerCreateTitle || 'Create Provider'}</p>
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
                        onCheckedChange={(checked) => setNewProviderDraft(prev => ({ ...prev, supportsEndpoint: checked }))}
                      />
                    </div>
                  </div>
                  {newProviderDraft.supportsEndpoint && (
                    <Input
                      placeholder={tAI.providerEndpointPlaceholder || 'Endpoint placeholder'}
                      value={newProviderDraft.endpointPlaceholder}
                      onChange={(e) => setNewProviderDraft(prev => ({ ...prev, endpointPlaceholder: e.target.value }))}
                    />
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleCreateProvider}>
                      {tAI.providerCreateAction || 'Create Provider'}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setNewProviderDraft(emptyProviderDraft())}
                    >
                      {tAI.providerResetAction || 'Reset'}
                    </Button>
                  </div>
                </div>

                <div className="rounded-md border border-border/70 p-3 space-y-2">
                  <p className="text-xs font-semibold text-foreground">{tAI.providerEditTitle || 'Edit Selected Provider'}</p>
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
                        onCheckedChange={(checked) => setEditProviderDraft(prev => ({ ...prev, supportsEndpoint: checked }))}
                      />
                    </div>
                  </div>
                  {editProviderDraft.supportsEndpoint && (
                    <Input
                      placeholder={tAI.providerEndpointPlaceholder || 'Endpoint placeholder'}
                      value={editProviderDraft.endpointPlaceholder}
                      onChange={(e) => setEditProviderDraft(prev => ({ ...prev, endpointPlaceholder: e.target.value }))}
                    />
                  )}
                  <div className="flex gap-2">
                    <Button size="sm" onClick={handleUpdateSelectedProvider}>
                      {tAI.providerUpdateAction || 'Save Provider'}
                    </Button>
                    <Button variant="destructive" size="sm" onClick={handleDeleteSelectedProvider}>
                      {tAI.providerDeleteAction || 'Delete Provider'}
                    </Button>
                  </div>
                </div>
              </div>

              <div className="rounded-md border border-border/70 p-3 space-y-3">
                <p className="text-xs font-semibold text-foreground">{tAI.modelsCrudTitle || 'Models (CRUD)'}</p>

                <div className="flex gap-2">
                  <Input
                    placeholder={tAI.modelCreatePlaceholder || 'New model id'}
                    value={newModelDraft}
                    onChange={(e) => setNewModelDraft(e.target.value)}
                  />
                  <Button size="sm" onClick={handleCreateModel}>
                    {tAI.modelCreateAction || 'Add Model'}
                  </Button>
                </div>

                <div className="space-y-2">
                  {selectedProviderModels.map((modelRow) => (
                    <div key={modelRow.id} className="flex flex-wrap items-center gap-2 border border-border rounded p-2">
                      {renamingModelId === modelRow.id ? (
                        <>
                          <Input
                            className="max-w-xs"
                            value={renamedModelValue}
                            onChange={(e) => setRenamedModelValue(e.target.value)}
                          />
                          <Button size="sm" onClick={handleRenameModel}>
                            {tAI.modelRenameSave || 'Save Name'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRenamingModelId(null);
                              setRenamedModelValue('');
                            }}
                          >
                            {t.common.cancel || 'Cancel'}
                          </Button>
                        </>
                      ) : (
                        <>
                          <span className="text-xs font-mono text-foreground">{modelRow.model_id}</span>
                          {modelRow.is_default && (
                            <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                              {tAI.default || 'Default'}
                            </Badge>
                          )}
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => handleSetDefaultModel(modelRow.id)}
                            disabled={modelRow.is_default}
                          >
                            {tAI.modelSetDefault || 'Set Default'}
                          </Button>
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              setRenamingModelId(modelRow.id);
                              setRenamedModelValue(modelRow.model_id);
                            }}
                          >
                            {tAI.modelRenameAction || 'Rename'}
                          </Button>
                          <Button
                            variant="destructive"
                            size="sm"
                            onClick={() => handleDeleteModel(modelRow.id)}
                          >
                            {tAI.modelDeleteAction || 'Delete'}
                          </Button>
                        </>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 1 }).map((_, i) => <SettingsSectionSkeleton key={i} />)
        ) : (
          [selectedProvider].map((provider, idx) => {
            const config = configs[provider.id] || makeProviderConfig(provider);
            const canSetDefault = !provider.requiresApiKey || config.hasStoredKey || config.apiKey.trim().length > 0;
            const providerParamDefs = getModelParamsForProvider(provider.id);

            return (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: idx * 0.04 }}
                className={`bg-card border rounded-lg p-5 shadow-premium transition-all ${
                  config.enabled ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-[11px] tracking-widest font-bold text-primary/80 bg-primary/10 px-2 py-1 rounded">
                      {provider.icon}
                    </span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{provider.name}</span>
                        {config.isDefault && (
                          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">{tAI.default || 'Default'}</Badge>
                        )}
                        {config.connectionStatus === 'connected' && (
                          <Badge variant="outline" className="text-[10px] border-success/30 text-success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />{tAI.connected || 'Connected'}
                          </Badge>
                        )}
                        {config.connectionStatus === 'failed' && (
                          <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                            <XCircle className="h-3 w-3 mr-1" />{tAI.failed || 'Failed'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{providerDescriptions[provider.id] || provider.description}</p>
                    </div>
                  </div>

                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => {
                      const next = { ...config, enabled: checked };
                      updateConfig(provider.id, { enabled: checked });
                      if (user) {
                        saveConfig(provider.id, next, { silent: true }).catch(() => null);
                      }
                    }}
                    disabled={saving}
                  />
                </div>

                {config.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 pt-4 border-t border-border"
                  >
                    {provider.requiresApiKey && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <Key className="h-3 w-3 text-primary/70" />
                          {tAI.apiKeyLabel || 'API Key'}
                          <InfoTooltip content={tAI.apiKeyTooltip || 'API keys are encrypted at rest in the local database.'} />
                        </label>

                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showKeys[provider.id] ? 'text' : 'password'}
                              placeholder={config.hasStoredKey
                                ? (tAI.apiKeyStoredPlaceholder || 'Stored key detected. Enter a new key to rotate.')
                                : (tAI.apiKeyPlaceholder || 'Paste provider API key')}
                              value={config.apiKey}
                              onChange={(e) => updateConfig(provider.id, {
                                apiKey: e.target.value,
                                connectionStatus: 'idle',
                              })}
                              className="pr-10"
                            />
                            <button
                              onClick={() => toggleShowKey(provider.id)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                              type="button"
                            >
                              {showKeys[provider.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!config.apiKey.trim()}
                            onClick={() => saveApiKey(provider.id)}
                          >
                            <Key className="h-3.5 w-3.5 mr-1.5" />
                            {tAI.saveKey || 'Save key'}
                          </Button>

                          <Button
                            variant="outline"
                            size="sm"
                            disabled={config.connectionStatus === 'testing' || (!config.apiKey.trim() && !config.hasStoredKey)}
                            onClick={() => testConnection(provider.id)}
                          >
                            {config.connectionStatus === 'testing' ? (
                              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{tAI.testing || 'Testing...'}</>
                            ) : (
                              <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />{tAI.testConnection || 'Test'}</>
                            )}
                          </Button>
                        </div>

                        {config.hasStoredKey && (
                          <p className="text-[11px] text-muted-foreground">{tAI.storedKeyHint || 'A key is already stored securely for this provider.'}</p>
                        )}

                        <a
                          href={provider.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-primary/70 hover:text-primary transition-colors"
                        >
                          {tAI.getApiKey || 'Get API Key ->'}
                        </a>
                      </div>
                    )}

                    {provider.supportsEndpoint && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                          <Server className="h-3 w-3 text-primary/70" />
                          {tAI.endpointUrlLabel || 'Endpoint URL'}
                        </label>
                        <Input
                          placeholder={provider.endpointPlaceholder}
                          value={config.endpointUrl}
                          onChange={(e) => updateConfig(provider.id, { endpointUrl: e.target.value })}
                          onBlur={() => saveConfig(provider.id, configs[provider.id], { silent: true }).catch(() => null)}
                        />
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">{tAI.primaryModelLabel || tAI.model || 'Primary model'}</label>
                      <Select
                        value={config.selectedModel}
                        onValueChange={(model) => {
                          const nextFallback = configs[provider.id].fallbackModel === model ? '' : configs[provider.id].fallbackModel;
                          const next = { ...configs[provider.id], selectedModel: model, fallbackModel: nextFallback };
                          updateConfig(provider.id, { selectedModel: model, fallbackModel: nextFallback });
                          saveConfig(provider.id, next, { silent: true }).catch(() => null);
                        }}
                      >
                        <SelectTrigger className="w-full max-w-xs">
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
                          const next = { ...configs[provider.id], fallbackModel };
                          updateConfig(provider.id, { fallbackModel });
                          saveConfig(provider.id, next, { silent: true }).catch(() => null);
                        }}
                      >
                        <SelectTrigger className="w-full max-w-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="__none__">{tAI.noFallbackModel || 'No fallback'}</SelectItem>
                          {provider.models
                            .filter(model => model !== config.selectedModel)
                            .map(model => (
                              <SelectItem key={model} value={model}>{model}</SelectItem>
                            ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-3 rounded-md border border-border/70 p-3 bg-muted/20">
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className="text-xs font-medium text-foreground">
                            {tAI.advancedParamsTitle || 'Advanced model parameters'}
                          </p>
                          <p className="text-[11px] text-muted-foreground mt-0.5">
                            {tAI.advancedParamsDesc || 'Disabled by default. Enable to configure provider-specific parameters such as temperature, reasoning, and sampling limits.'}
                          </p>
                        </div>
                        <Switch
                          checked={config.advancedParamsEnabled}
                          onCheckedChange={(checked) => setAdvancedParamsEnabled(provider.id, checked)}
                          aria-label={tAI.advancedParamsEnableLabel || 'Enable advanced model parameters'}
                          data-testid={`advanced-params-toggle-${provider.id}`}
                        />
                      </div>

                      {!config.advancedParamsEnabled && (
                        <p className="text-[11px] text-muted-foreground">
                          {tAI.advancedParamsDisabledHint || 'Enable advanced model parameters to customize generation behavior.'}
                        </p>
                      )}

                      {config.advancedParamsEnabled && providerParamDefs.length === 0 && (
                        <p className="text-[11px] text-muted-foreground">
                          {tAI.advancedParamsNoOptions || 'No advanced parameters are available for this provider.'}
                        </p>
                      )}

                      {config.advancedParamsEnabled && providerParamDefs.length > 0 && (
                        <div className="space-y-3">
                          {providerParamDefs.map((def) => {
                            const hasParamValue = Object.prototype.hasOwnProperty.call(config.modelParams, def.key);
                            const rawParamValue = config.modelParams[def.key];
                            const textValue = Array.isArray(rawParamValue)
                              ? rawParamValue.join(', ')
                              : (rawParamValue === null || rawParamValue === undefined ? '' : String(rawParamValue));

                            return (
                              <div key={def.key} className="rounded border border-border/60 bg-card p-2.5 space-y-2">
                                <div className="flex items-start justify-between gap-3">
                                  <div>
                                    <p className="text-xs font-medium text-foreground font-mono">{def.label}</p>
                                    <p className="text-[11px] text-muted-foreground">{def.description}</p>
                                  </div>
                                  <Switch
                                    checked={hasParamValue}
                                    onCheckedChange={(checked) => toggleModelParam(provider.id, def, checked)}
                                    aria-label={`Enable ${def.key}`}
                                    data-testid={`param-toggle-${provider.id}-${def.key}`}
                                  />
                                </div>

                                {hasParamValue && def.type === 'select' && def.options && (
                                  <Select
                                    value={textValue || String(def.defaultValue || def.options[0] || '')}
                                    onValueChange={(value) => persistModelParamValue(provider.id, def, value)}
                                  >
                                    <SelectTrigger className="w-full max-w-xs" data-testid={`param-input-${provider.id}-${def.key}`}>
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
                                    data-testid={`param-input-${provider.id}-${def.key}`}
                                    onChange={(e) => updateModelParamValue(provider.id, def, e.target.value)}
                                    onBlur={(e) => persistModelParamValue(provider.id, def, e.target.value)}
                                  />
                                )}
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">{tAI.maxTokensLabel || 'Max Tokens (Extraction)'}</label>
                      <div className="flex items-center gap-3 max-w-xs">
                        <Input
                          type="number"
                          min={1000}
                          max={200000}
                          step={1000}
                          value={config.maxTokens}
                          onChange={(e) => {
                            const val = parseInt(e.target.value, 10) || 65000;
                            updateConfig(provider.id, { maxTokens: val });
                          }}
                          onBlur={() => saveConfig(provider.id, configs[provider.id], { silent: true }).catch(() => null)}
                          className="w-32"
                        />
                        <span className="text-[10px] text-muted-foreground">{tAI.tokensSuffix || 'tokens'}</span>
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={!canSetDefault}
                        onClick={() => setAsDefault(provider.id)}
                        className={config.isDefault ? 'border-primary/30 text-primary' : ''}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        {config.isDefault ? (tAI.isDefault || 'Default Provider') : (tAI.setAsDefault || 'Set as Default')}
                      </Button>

                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => testConnection(provider.id)}
                        disabled={config.connectionStatus === 'testing' || (provider.requiresApiKey && !config.apiKey.trim() && !config.hasStoredKey)}
                      >
                        {config.connectionStatus === 'testing' ? (
                          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{tAI.testing || 'Testing...'}</>
                        ) : (
                          <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />{tAI.testConnection || 'Test'}</>
                        )}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {!loading && (
        <div className="bg-muted/30 border border-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-primary/70 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">{tAI.howItWorksTitle || 'How it works'}</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {tAI.howItWorksDesc || 'Select a provider and model, test the connection, set a default provider, and run the AI pipeline using that configuration. API keys are encrypted in the local database and never returned in plaintext to the UI.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIIntegrations;
