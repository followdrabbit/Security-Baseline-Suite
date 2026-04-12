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

type UpsertConfigInput = {
  provider_id: string;
  enabled: boolean;
  api_key_encrypted?: string;
  selected_model: string;
  is_default: boolean;
  connection_status?: string;
  extra_config?: Record<string, any>;
};

function normalizeExtraConfig(value?: Record<string, any>) {
  if (!value || typeof value !== 'object') return {};
  return value;
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
  getAll: async (): Promise<AIProviderConfig[]> => {
    const { data, error } = await localDb
      .from('ai_provider_configs')
      .select('*')
      .order('created_at');
    if (error) throw error;
    return (data || []) as AIProviderConfig[];
  },

  getDefault: async (): Promise<AIProviderConfig | null> => {
    const { data, error } = await localDb
      .from('ai_provider_configs')
      .select('*')
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
    const { data: { user } } = await localDb.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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
    const { data: { user } } = await localDb.auth.getUser();
    if (!user) throw new Error('Not authenticated');

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
  ): Promise<TestAIProviderResult> => {
    const { data, error } = await localDb.functions.invoke('test-ai-provider', {
      body: {
        providerId,
        apiKey,
        model,
        endpointUrl: endpointUrl || '',
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
