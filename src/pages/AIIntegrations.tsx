import React, { useCallback, useEffect, useState } from 'react';
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
import { aiConfigService } from '@/services/aiService';
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

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT models for control generation and structured security analysis.',
    icon: 'OAI',
    models: ['gpt-5', 'gpt-5-mini', 'gpt-4.1', 'gpt-4.1-mini', 'gpt-4o'],
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

interface ProviderConfig {
  enabled: boolean;
  apiKey: string;
  hasStoredKey: boolean;
  selectedModel: string;
  maxTokens: number;
  endpointUrl: string;
  connectionStatus: 'idle' | 'testing' | 'connected' | 'failed';
  isDefault: boolean;
}

const makeInitialConfigs = (): Record<string, ProviderConfig> => {
  const out: Record<string, ProviderConfig> = {};
  for (const provider of AI_PROVIDERS) {
    out[provider.id] = {
      enabled: provider.id === 'openai',
      apiKey: '',
      hasStoredKey: false,
      selectedModel: provider.defaultModel,
      maxTokens: 65000,
      endpointUrl: provider.id === 'ollama' ? 'http://127.0.0.1:11434' : '',
      connectionStatus: 'idle',
      isDefault: provider.id === 'openai',
    };
  }
  return out;
};

const AIIntegrations: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [configs, setConfigs] = useState<Record<string, ProviderConfig>>(makeInitialConfigs);

  const tAI = (t as any).aiIntegrations || {};

  const updateConfig = (providerId: string, updates: Partial<ProviderConfig>) => {
    setConfigs(prev => ({
      ...prev,
      [providerId]: { ...prev[providerId], ...updates },
    }));
  };

  const loadConfigs = useCallback(async () => {
    const saved = await aiConfigService.getAll();
    if (!saved.length) return;

    setConfigs(prev => {
      const next = { ...prev };
      for (const row of saved) {
        if (!next[row.provider_id]) continue;

        const extra = row.extra_config || {};
        const hasStoredKey = Boolean((row as any).has_api_key || (row.api_key_encrypted && row.api_key_encrypted !== ''));
        const endpointUrl = String((extra as any)?.endpoint_url || next[row.provider_id].endpointUrl || '');

        next[row.provider_id] = {
          ...next[row.provider_id],
          enabled: Boolean(row.enabled),
          selectedModel: row.selected_model || next[row.provider_id].selectedModel,
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
    const checkAuth = async () => {
      const { data: { user: currentUser } } = await localDb.auth.getUser();
      setUser(currentUser);
      if (currentUser) {
        await loadConfigs();
      }
      setLoading(false);
    };

    checkAuth();

    const { data: { subscription } } = localDb.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) {
        loadConfigs().catch(() => null);
      }
    });
    return () => subscription.unsubscribe();
  }, [loadConfigs]);

  const saveConfig = async (
    providerId: string,
    config: ProviderConfig,
    options?: { persistApiKey?: boolean; silent?: boolean },
  ) => {
    if (!user) return;

    setSaving(true);
    try {
      const provider = AI_PROVIDERS.find(p => p.id === providerId);
      const extraConfig: Record<string, any> = {
        max_tokens: config.maxTokens,
      };

      if (provider?.supportsEndpoint && config.endpointUrl.trim()) {
        extraConfig.endpoint_url = config.endpointUrl.trim();
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
          title: 'Configuration saved',
          description: 'Provider configuration persisted successfully.',
        });
      }
    } catch (err: any) {
      toast({
        title: 'Save error',
        description: err?.message || 'Could not save provider configuration.',
        variant: 'destructive',
      });
    } finally {
      setSaving(false);
    }
  };

  const setAsDefault = async (providerId: string) => {
    setConfigs(prev => {
      const updated = { ...prev };
      for (const id of Object.keys(updated)) {
        updated[id] = { ...updated[id], isDefault: id === providerId };
      }
      return updated;
    });

    try {
      await aiConfigService.setDefault(providerId);
      const provider = AI_PROVIDERS.find(p => p.id === providerId);
      toast({
        title: 'Default provider updated',
        description: `${provider?.name || providerId} is now the default provider.`,
      });
    } catch (err: any) {
      toast({
        title: 'Default provider error',
        description: err?.message || 'Could not update default provider.',
        variant: 'destructive',
      });
    }
  };

  const testConnection = async (providerId: string) => {
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    const config = configs[providerId];
    if (!provider || !config) return;

    if (provider.requiresApiKey && !config.apiKey.trim() && !config.hasStoredKey) {
      toast({
        title: 'API key required',
        description: 'Enter an API key or keep a stored key before testing.',
        variant: 'destructive',
      });
      return;
    }

    updateConfig(providerId, { connectionStatus: 'testing' });

    const result = await aiConfigService.testConnection(
      providerId,
      config.apiKey.trim(),
      config.selectedModel,
      config.endpointUrl.trim(),
    );

    if (!result.ok) {
      updateConfig(providerId, { connectionStatus: 'failed' });
      toast({
        title: 'Connection failed',
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
      title: 'Connection successful',
      description: result.message,
    });
  };

  const toggleShowKey = (providerId: string) => {
    setShowKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const enabledCount = Object.values(configs).filter(c => c.enabled).length;
  const connectedCount = Object.values(configs).filter(c => c.connectionStatus === 'connected').length;
  const defaultProviderId = Object.entries(configs).find(([, cfg]) => cfg.isDefault)?.[0];
  const defaultProvider = AI_PROVIDERS.find(p => p.id === defaultProviderId);

  if (!user && !loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="bg-card border border-border rounded-lg p-8 text-center space-y-4 shadow-premium">
          <LogIn className="h-12 w-12 text-primary/50 mx-auto" />
          <h2 className="text-xl font-display font-semibold text-foreground">Sign in required</h2>
          <p className="text-sm text-muted-foreground">
            You must be authenticated to configure AI providers and persist settings.
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
            <span className="text-xs text-muted-foreground ml-1">/ {AI_PROVIDERS.length}</span>
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

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: AI_PROVIDERS.length }).map((_, i) => <SettingsSectionSkeleton key={i} />)
        ) : (
          AI_PROVIDERS.map((provider, idx) => {
            const config = configs[provider.id];
            const canSetDefault = !provider.requiresApiKey || config.hasStoredKey || config.apiKey.trim().length > 0;

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
                          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Default</Badge>
                        )}
                        {config.connectionStatus === 'connected' && (
                          <Badge variant="outline" className="text-[10px] border-success/30 text-success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />Connected
                          </Badge>
                        )}
                        {config.connectionStatus === 'failed' && (
                          <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                            <XCircle className="h-3 w-3 mr-1" />Failed
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
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
                          API Key
                          <InfoTooltip content={tAI.apiKeyTooltip || 'API keys are encrypted at rest in the local database.'} />
                        </label>

                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showKeys[provider.id] ? 'text' : 'password'}
                              placeholder={config.hasStoredKey ? 'Stored key detected. Enter a new key to rotate.' : 'Paste provider API key'}
                              value={config.apiKey}
                              onChange={(e) => updateConfig(provider.id, {
                                apiKey: e.target.value,
                                connectionStatus: 'idle',
                              })}
                              onBlur={() => {
                                const latest = configs[provider.id];
                                if (!latest?.apiKey.trim()) return;
                                const toPersist = { ...latest, hasStoredKey: true };
                                updateConfig(provider.id, { hasStoredKey: true, apiKey: '' });
                                saveConfig(provider.id, toPersist, {
                                  persistApiKey: true,
                                  silent: true,
                                }).catch(() => null);
                              }}
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
                            disabled={config.connectionStatus === 'testing' || (!config.apiKey.trim() && !config.hasStoredKey)}
                            onClick={() => testConnection(provider.id)}
                          >
                            {config.connectionStatus === 'testing' ? (
                              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Testing...</>
                            ) : (
                              <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />{tAI.testConnection || 'Test'}</>
                            )}
                          </Button>
                        </div>

                        {config.hasStoredKey && (
                          <p className="text-[11px] text-muted-foreground">A key is already stored securely for this provider.</p>
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
                          Endpoint URL
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
                      <label className="text-xs font-medium text-foreground">{tAI.model || 'Model'}</label>
                      <Select
                        value={config.selectedModel}
                        onValueChange={(model) => {
                          const next = { ...configs[provider.id], selectedModel: model };
                          updateConfig(provider.id, { selectedModel: model });
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
                      <label className="text-xs font-medium text-foreground">Max Tokens (Extraction)</label>
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
                        <span className="text-[10px] text-muted-foreground">tokens</span>
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
                          <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Testing...</>
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
