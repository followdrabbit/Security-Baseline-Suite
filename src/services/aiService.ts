import { supabase } from '@/integrations/supabase/client';

export interface AIProviderConfig {
  id: string;
  provider_id: string;
  enabled: boolean;
  api_key_encrypted: string;
  selected_model: string;
  is_default: boolean;
  connection_status: string;
  extra_config: Record<string, any>;
}

export const aiConfigService = {
  getAll: async (): Promise<AIProviderConfig[]> => {
    const { data, error } = await supabase
      .from('ai_provider_configs')
      .select('*')
      .order('created_at');
    if (error) throw error;
    return (data || []) as AIProviderConfig[];
  },

  getDefault: async (): Promise<AIProviderConfig | null> => {
    const { data, error } = await supabase
      .from('ai_provider_configs')
      .select('*')
      .eq('is_default', true)
      .maybeSingle();
    if (error) throw error;
    return data as AIProviderConfig | null;
  },

  upsert: async (config: {
    provider_id: string;
    enabled: boolean;
    api_key_encrypted?: string;
    selected_model: string;
    is_default: boolean;
    extra_config?: Record<string, any>;
  }): Promise<AIProviderConfig> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    const { data, error } = await supabase
      .from('ai_provider_configs')
      .upsert({
        user_id: user.id,
        provider_id: config.provider_id,
        enabled: config.enabled,
        api_key_encrypted: config.api_key_encrypted || '',
        selected_model: config.selected_model,
        is_default: config.is_default,
        connection_status: 'idle',
        extra_config: config.extra_config || {},
      }, { onConflict: 'user_id,provider_id' })
      .select()
      .single();
    if (error) throw error;
    return data as AIProviderConfig;
  },

  setDefault: async (providerId: string): Promise<void> => {
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) throw new Error('Not authenticated');

    // Clear all defaults
    await supabase
      .from('ai_provider_configs')
      .update({ is_default: false })
      .eq('user_id', user.id);

    // Set new default
    await supabase
      .from('ai_provider_configs')
      .update({ is_default: true })
      .eq('user_id', user.id)
      .eq('provider_id', providerId);
  },

  testConnection: async (providerId: string, apiKey: string, model: string): Promise<boolean> => {
    // For Lovable AI, no API key needed - always works
    if (providerId === 'lovable_ai') return true;

    // For external providers, try a simple request
    try {
      if (providerId === 'openai') {
        const resp = await fetch('https://api.openai.com/v1/models', {
          headers: { Authorization: `Bearer ${apiKey}` },
        });
        return resp.ok;
      }
      if (providerId === 'anthropic') {
        const resp = await fetch('https://api.anthropic.com/v1/messages', {
          method: 'POST',
          headers: {
            'x-api-key': apiKey,
            'Content-Type': 'application/json',
            'anthropic-version': '2023-06-01',
          },
          body: JSON.stringify({
            model: model || 'claude-3-haiku-20240307',
            max_tokens: 10,
            messages: [{ role: 'user', content: 'ping' }],
          }),
        });
        return resp.ok;
      }
      // For other providers, validate key length
      return apiKey.length > 10;
    } catch {
      return false;
    }
  },
};

export const generateControlsService = {
  generate: async (projectId: string, technology: string, sourceTexts?: { name: string; content: string }[], language?: string) => {
    const { data, error } = await supabase.functions.invoke('generate-controls', {
      body: { projectId, technology, sourceTexts, language },
    });
    if (error) throw error;
    return data;
  },
};
