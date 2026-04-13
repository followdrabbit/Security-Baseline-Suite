import { localDb } from '@/integrations/localdb/client';

export const AI_CONFIGURATION_REQUIRED_MESSAGE =
  'Integração de IA não configurada. Acesse AI Integrations e configure um provedor antes de continuar.';

export interface AIProviderConfig {
  id: string;
  provider_id: string;
  enabled: boolean;
  api_key_encrypted: string;
  selected_model: string;
  is_default: boolean;
  connection_status: string;
  extra_config: Record<string, any>;
  has_api_key?: boolean;
}

export interface TestAIProviderResult {
  ok: boolean;
  message: string;
}

export interface AIProviderCatalogEntry {
  id: string;
  user_id: string;
  provider_id: string;
  name: string;
  description: string | null;
  icon: string | null;
  docs_url: string | null;
  requires_api_key: boolean;
  supports_endpoint: boolean;
  endpoint_placeholder: string | null;
  is_active: boolean;
  is_builtin: boolean;
  extra_config: Record<string, any> | null;
  created_at: string;
  updated_at: string;
}

export interface AIProviderModelEntry {
  id: string;
  user_id: string;
  provider_id: string;
  model_id: string;
  is_default: boolean;
  is_active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}

type UpsertConfigInput = {
  provider_id: string;
  enabled: boolean;
  api_key_encrypted?: string;
  selected_model: string;
  is_default: boolean;
  connection_status?: string;
  extra_config?: Record<string, any>;
};

type UpsertProviderCatalogInput = {
  provider_id: string;
  name: string;
  description?: string;
  icon?: string;
  docs_url?: string;
  requires_api_key?: boolean;
  supports_endpoint?: boolean;
  endpoint_placeholder?: string;
  is_active?: boolean;
  is_builtin?: boolean;
  extra_config?: Record<string, any>;
};

type CreateProviderModelInput = {
  provider_id: string;
  model_id: string;
  is_default?: boolean;
  is_active?: boolean;
  sort_order?: number;
};

function normalizeExtraConfig(value?: Record<string, any>) {
  if (!value || typeof value !== 'object') return {};
  return value;
}

async function getCurrentUserOrThrow() {
  const { data: { user } } = await localDb.auth.getUser();
  if (!user) throw new Error('Not authenticated');
  return user;
}

const PROVIDERS_WITHOUT_API_KEY = new Set(['ollama']);

function hasConfiguredApiKey(config: AIProviderConfig | null | undefined): boolean {
  if (!config) return false;

  const providerId = String(config.provider_id || '').trim().toLowerCase();
  if (PROVIDERS_WITHOUT_API_KEY.has(providerId)) {
    return true;
  }

  if (config.has_api_key === true) {
    return true;
  }

  const raw = String(config.api_key_encrypted || '').trim();
  return raw.length > 0 && raw !== '';
}

function isUsableProviderConfig(config: AIProviderConfig | null | undefined): boolean {
  if (!config) return false;
  if (!config.enabled) return false;

  const model = String(config.selected_model || '').trim();
  if (!model) return false;

  return hasConfiguredApiKey(config);
}

export const aiConfigService = {
  getProvidersCatalog: async (): Promise<AIProviderCatalogEntry[]> => {
    const user = await getCurrentUserOrThrow();

    const { data, error } = await localDb
      .from('ai_provider_catalog')
      .select('*')
      .eq('user_id', user.id)
      .order('name');

    if (error) throw error;
    return (data || []) as AIProviderCatalogEntry[];
  },

  getProviderModels: async (providerId?: string): Promise<AIProviderModelEntry[]> => {
    const user = await getCurrentUserOrThrow();

    let query = localDb
      .from('ai_provider_models')
      .select('*')
      .eq('user_id', user.id);

    if (providerId) {
      query = query.eq('provider_id', providerId);
    }

    const { data, error } = await query
      .order('sort_order')
      .order('model_id');

    if (error) throw error;
    return (data || []) as AIProviderModelEntry[];
  },

  upsertProviderCatalog: async (provider: UpsertProviderCatalogInput): Promise<AIProviderCatalogEntry> => {
    const user = await getCurrentUserOrThrow();

    const payload: Record<string, any> = {
      user_id: user.id,
      provider_id: String(provider.provider_id || '').trim(),
      name: String(provider.name || '').trim(),
      description: provider.description || '',
      icon: provider.icon || 'CUS',
      docs_url: provider.docs_url || '',
      requires_api_key: provider.requires_api_key !== false,
      supports_endpoint: Boolean(provider.supports_endpoint),
      endpoint_placeholder: provider.endpoint_placeholder || '',
      is_active: provider.is_active !== false,
      is_builtin: Boolean(provider.is_builtin),
      extra_config: normalizeExtraConfig(provider.extra_config),
    };

    const { data, error } = await localDb
      .from('ai_provider_catalog')
      .upsert(payload, { onConflict: 'user_id,provider_id' })
      .select()
      .single();

    if (error) throw error;
    return data as AIProviderCatalogEntry;
  },

  deleteProviderCatalog: async (providerId: string): Promise<void> => {
    const user = await getCurrentUserOrThrow();

    await localDb
      .from('ai_provider_models')
      .delete()
      .eq('user_id', user.id)
      .eq('provider_id', providerId);

    await localDb
      .from('ai_provider_configs')
      .delete()
      .eq('user_id', user.id)
      .eq('provider_id', providerId);

    const { error } = await localDb
      .from('ai_provider_catalog')
      .delete()
      .eq('user_id', user.id)
      .eq('provider_id', providerId);

    if (error) throw error;
  },

  createProviderModel: async (model: CreateProviderModelInput): Promise<AIProviderModelEntry> => {
    const user = await getCurrentUserOrThrow();

    const payload: Record<string, any> = {
      user_id: user.id,
      provider_id: String(model.provider_id || '').trim(),
      model_id: String(model.model_id || '').trim(),
      is_default: Boolean(model.is_default),
      is_active: model.is_active !== false,
      sort_order: Number(model.sort_order || 0),
    };

    const { data, error } = await localDb
      .from('ai_provider_models')
      .insert(payload)
      .select()
      .single();

    if (error) throw error;
    return data as AIProviderModelEntry;
  },

  updateProviderModel: async (modelRowId: string, updates: Partial<Pick<AIProviderModelEntry, 'model_id' | 'is_default' | 'is_active' | 'sort_order'>>): Promise<AIProviderModelEntry> => {
    const user = await getCurrentUserOrThrow();

    const payload: Record<string, any> = {};
    if (updates.model_id !== undefined) payload.model_id = String(updates.model_id).trim();
    if (updates.is_default !== undefined) payload.is_default = Boolean(updates.is_default);
    if (updates.is_active !== undefined) payload.is_active = Boolean(updates.is_active);
    if (updates.sort_order !== undefined) payload.sort_order = Number(updates.sort_order);

    const { data, error } = await localDb
      .from('ai_provider_models')
      .update(payload)
      .eq('user_id', user.id)
      .eq('id', modelRowId)
      .select()
      .single();

    if (error) throw error;
    return data as AIProviderModelEntry;
  },

  deleteProviderModel: async (modelRowId: string): Promise<void> => {
    const user = await getCurrentUserOrThrow();

    const { error } = await localDb
      .from('ai_provider_models')
      .delete()
      .eq('user_id', user.id)
      .eq('id', modelRowId);

    if (error) throw error;
  },

  setDefaultProviderModel: async (providerId: string, modelRowId: string): Promise<void> => {
    const user = await getCurrentUserOrThrow();

    await localDb
      .from('ai_provider_models')
      .update({ is_default: false })
      .eq('user_id', user.id)
      .eq('provider_id', providerId);

    const { error } = await localDb
      .from('ai_provider_models')
      .update({ is_default: true })
      .eq('user_id', user.id)
      .eq('id', modelRowId);

    if (error) throw error;
  },

  getAll: async (): Promise<AIProviderConfig[]> => {
    const user = await getCurrentUserOrThrow();

    const { data, error } = await localDb
      .from('ai_provider_configs')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at');
    if (error) throw error;
    return (data || []) as AIProviderConfig[];
  },

  getDefault: async (): Promise<AIProviderConfig | null> => {
    const user = await getCurrentUserOrThrow();

    const { data, error } = await localDb
      .from('ai_provider_configs')
      .select('*')
      .eq('user_id', user.id)
      .eq('is_default', true)
      .maybeSingle();
    if (error) throw error;
    return data as AIProviderConfig | null;
  },

  getConfiguredProvider: async (): Promise<AIProviderConfig | null> => {
    const all = await aiConfigService.getAll();
    const candidates = all.filter((config) => isUsableProviderConfig(config));
    if (candidates.length === 0) return null;

    return candidates.find((config) => config.is_default) || candidates[0];
  },

  hasConfiguredProvider: async (): Promise<boolean> => {
    const provider = await aiConfigService.getConfiguredProvider();
    return Boolean(provider);
  },

  ensureConfiguredProvider: async (): Promise<AIProviderConfig> => {
    const provider = await aiConfigService.getConfiguredProvider();
    if (!provider) {
      throw new Error(AI_CONFIGURATION_REQUIRED_MESSAGE);
    }
    return provider;
  },

  upsert: async (config: UpsertConfigInput): Promise<AIProviderConfig> => {
    const user = await getCurrentUserOrThrow();

    const payload: Record<string, any> = {
      user_id: user.id,
      provider_id: config.provider_id,
      enabled: config.enabled,
      selected_model: config.selected_model,
      is_default: config.is_default,
      connection_status: config.connection_status || 'idle',
      extra_config: normalizeExtraConfig(config.extra_config),
    };

    if (typeof config.api_key_encrypted === 'string' && config.api_key_encrypted.trim()) {
      payload.api_key_encrypted = config.api_key_encrypted.trim();
    }

    const { data, error } = await localDb
      .from('ai_provider_configs')
      .upsert(payload, { onConflict: 'user_id,provider_id' })
      .select()
      .single();

    if (error) throw error;
    return data as AIProviderConfig;
  },

  setDefault: async (providerId: string): Promise<void> => {
    const user = await getCurrentUserOrThrow();

    await localDb
      .from('ai_provider_configs')
      .update({ is_default: false })
      .eq('user_id', user.id);

    await localDb
      .from('ai_provider_configs')
      .update({ is_default: true })
      .eq('user_id', user.id)
      .eq('provider_id', providerId);
  },

  testConnection: async (
    providerId: string,
    apiKey: string,
    model: string,
    endpointUrl?: string,
    modelParams?: Record<string, any>,
  ): Promise<TestAIProviderResult> => {
    const { data, error } = await localDb.functions.invoke('test-ai-provider', {
      body: {
        providerId,
        apiKey,
        model,
        endpointUrl: endpointUrl || '',
        modelParams: normalizeExtraConfig(modelParams),
      },
    });

    if (error) {
      return { ok: false, message: error.message || 'Connection test failed' };
    }

    const ok = Boolean((data as any)?.ok);
    const message = String((data as any)?.message || (data as any)?.error || (ok ? 'Connection successful' : 'Connection failed'));
    return { ok, message };
  },
};

export const generateControlsService = {
  generate: async (projectId: string, technology: string, sourceTexts?: { name: string; content: string }[], language?: string) => {
    const { data, error } = await localDb.functions.invoke('generate-controls', {
      body: { projectId, technology, sourceTexts, language },
    });
    if (error) throw error;
    return data;
  },
};
