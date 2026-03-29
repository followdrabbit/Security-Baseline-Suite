import React, { useState, useEffect, useCallback } from 'react';
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
import { supabase } from '@/integrations/supabase/client';
import {
  Brain, Key, CheckCircle2, XCircle, Loader2, Eye, EyeOff, Zap, RefreshCw, Sparkles, LogIn,
} from 'lucide-react';

interface AIProvider {
  id: string;
  name: string;
  description: string;
  icon: string;
  models: string[];
  defaultModel: string;
  apiKeyLabel: string;
  apiKeyPlaceholder: string;
  docsUrl: string;
  requiresApiKey: boolean;
}

const AI_PROVIDERS: AIProvider[] = [
  {
    id: 'lovable_ai',
    name: 'Lovable AI',
    description: 'IA integrada — Sem necessidade de API key externa. Powered by Gemini & GPT.',
    icon: '💎',
    models: ['gemini-3-flash (padrão)', 'gemini-2.5-pro', 'gpt-5'],
    defaultModel: 'gemini-3-flash (padrão)',
    apiKeyLabel: '',
    apiKeyPlaceholder: '',
    docsUrl: 'https://docs.lovable.dev/features/ai',
    requiresApiKey: false,
  },
  {
    id: 'openai',
    name: 'OpenAI',
    description: 'GPT-4o, GPT-4 Turbo, GPT-3.5 — Ideal para geração de controles e análise de documentos',
    icon: '🤖',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-3.5-turbo'],
    defaultModel: 'gpt-4o',
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'sk-...',
    docsUrl: 'https://platform.openai.com/api-keys',
    requiresApiKey: true,
  },
  {
    id: 'anthropic',
    name: 'Anthropic',
    description: 'Claude 3.5 Sonnet, Claude 3 Opus — Excelente para análise profunda e raciocínio',
    icon: '🧠',
    models: ['claude-3.5-sonnet', 'claude-3-opus', 'claude-3-sonnet', 'claude-3-haiku'],
    defaultModel: 'claude-3.5-sonnet',
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'sk-ant-...',
    docsUrl: 'https://console.anthropic.com/settings/keys',
    requiresApiKey: true,
  },
  {
    id: 'google',
    name: 'Google Gemini',
    description: 'Gemini 2.5 Pro, Gemini Flash — Ótimo para processamento multimodal e documentos longos',
    icon: '✨',
    models: ['gemini-2.5-pro', 'gemini-2.5-flash', 'gemini-2.0-flash', 'gemini-1.5-pro'],
    defaultModel: 'gemini-2.5-pro',
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'AIza...',
    docsUrl: 'https://aistudio.google.com/apikey',
    requiresApiKey: true,
  },
  {
    id: 'azure_openai',
    name: 'Azure OpenAI',
    description: 'Modelos OpenAI hospedados no Azure — Para ambientes corporativos com compliance',
    icon: '☁️',
    models: ['gpt-4o', 'gpt-4-turbo', 'gpt-4', 'gpt-35-turbo'],
    defaultModel: 'gpt-4o',
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'Sua Azure OpenAI API key...',
    docsUrl: 'https://portal.azure.com',
    requiresApiKey: true,
  },
  {
    id: 'mistral',
    name: 'Mistral AI',
    description: 'Mistral Large, Medium — Modelos europeus de alta performance e custo-benefício',
    icon: '🌊',
    models: ['mistral-large-latest', 'mistral-medium-latest', 'mistral-small-latest', 'open-mixtral-8x22b'],
    defaultModel: 'mistral-large-latest',
    apiKeyLabel: 'API Key',
    apiKeyPlaceholder: 'Sua Mistral API key...',
    docsUrl: 'https://console.mistral.ai/api-keys',
    requiresApiKey: true,
  },
];

interface ProviderConfig {
  enabled: boolean;
  apiKey: string;
  selectedModel: string;
  maxTokens: number;
  connectionStatus: 'idle' | 'testing' | 'connected' | 'failed';
  isDefault: boolean;
}

const AIIntegrations: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [user, setUser] = useState<any>(null);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [configs, setConfigs] = useState<Record<string, ProviderConfig>>(() => {
    const initial: Record<string, ProviderConfig> = {};
    AI_PROVIDERS.forEach(p => {
      initial[p.id] = {
        enabled: p.id === 'lovable_ai',
        apiKey: '',
        selectedModel: p.defaultModel,
        maxTokens: 65000,
        connectionStatus: p.id === 'lovable_ai' ? 'connected' : 'idle',
        isDefault: p.id === 'lovable_ai',
      };
    });
    return initial;
  });

  useEffect(() => {
    const checkAuth = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      if (user) {
        await loadConfigs();
      }
      setLoading(false);
    };
    checkAuth();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user || null);
      if (session?.user) loadConfigs();
    });
    return () => subscription.unsubscribe();
  }, []);

  const loadConfigs = useCallback(async () => {
    try {
      const saved = await aiConfigService.getAll();
      if (saved.length > 0) {
        setConfigs(prev => {
          const updated = { ...prev };
          saved.forEach(s => {
            if (updated[s.provider_id]) {
              updated[s.provider_id] = {
                enabled: s.enabled,
                apiKey: s.api_key_encrypted || '',
                selectedModel: s.selected_model,
                maxTokens: (s.extra_config as any)?.max_tokens || 65000,
                connectionStatus: s.api_key_encrypted ? 'connected' : 'idle',
                isDefault: s.is_default,
              };
            }
          });
          return updated;
        });
      }
    } catch (err) {
      console.error('Failed to load AI configs:', err);
    }
  }, []);

  const saveConfig = async (providerId: string, config: ProviderConfig) => {
    if (!user) return;
    setSaving(true);
    try {
      await aiConfigService.upsert({
        provider_id: providerId,
        enabled: config.enabled,
        api_key_encrypted: config.apiKey,
        selected_model: config.selectedModel,
        is_default: config.isDefault,
        extra_config: { max_tokens: config.maxTokens },
      });
      toast({ title: '✅ Configuração salva', description: 'Configuração persistida com sucesso' });
    } catch (err) {
      console.error('Save error:', err);
      toast({ title: '❌ Erro ao salvar', description: 'Não foi possível salvar a configuração', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const updateConfig = (providerId: string, updates: Partial<ProviderConfig>) => {
    setConfigs(prev => ({
      ...prev,
      [providerId]: { ...prev[providerId], ...updates },
    }));
  };

  const setAsDefault = async (providerId: string) => {
    setConfigs(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        updated[id] = { ...updated[id], isDefault: id === providerId };
      });
      return updated;
    });
    if (user) {
      try {
        await aiConfigService.setDefault(providerId);
      } catch (err) {
        console.error('Error setting default:', err);
      }
    }
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    toast({
      title: `⭐ ${provider?.name}`,
      description: `${provider?.name} definido como provedor padrão`,
    });
  };

  const testConnection = async (providerId: string) => {
    updateConfig(providerId, { connectionStatus: 'testing' });
    const config = configs[providerId];
    const provider = AI_PROVIDERS.find(p => p.id === providerId);

    try {
      const success = await aiConfigService.testConnection(providerId, config.apiKey, config.selectedModel);
      updateConfig(providerId, { connectionStatus: success ? 'connected' : 'failed' });

      if (success) {
        toast({ title: '✅ Conexão bem-sucedida', description: 'API key validada com sucesso' });
        await saveConfig(providerId, { ...config, connectionStatus: 'connected' });
      } else {
        toast({ title: '❌ Falha na conexão', description: 'Verifique sua API key e tente novamente', variant: 'destructive' });
      }
    } catch {
      updateConfig(providerId, { connectionStatus: 'failed' });
      toast({ title: '❌ Falha na conexão', description: 'Erro ao testar conexão', variant: 'destructive' });
    }
  };

  const toggleShowKey = (providerId: string) => {
    setShowKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const enabledCount = Object.values(configs).filter(c => c.enabled).length;
  const connectedCount = Object.values(configs).filter(c => c.connectionStatus === 'connected').length;
  const defaultProvider = Object.entries(configs).find(([_, c]) => c.isDefault);
  const tAI = (t as any).aiIntegrations || {};

  if (!user && !loading) {
    return (
      <div className="p-6 lg:p-8 max-w-4xl mx-auto">
        <div className="bg-card border border-border rounded-lg p-8 text-center space-y-4 shadow-premium">
          <LogIn className="h-12 w-12 text-primary/50 mx-auto" />
          <h2 className="text-xl font-display font-semibold text-foreground">Faça login para configurar</h2>
          <p className="text-sm text-muted-foreground">Você precisa estar autenticado para configurar os provedores de IA e persistir suas configurações.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <div>
          <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">
            {tAI.title || 'Integrações de IA'}
          </h1>
          <p className="text-sm text-muted-foreground mt-1">
            {tAI.subtitle || 'Configure os provedores de IA para geração de controles e modelagem de ameaças'}
          </p>
        </div>
        <HelpButton section="ai-integrations" />
      </div>

      {!loading && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="bg-card border border-border rounded-lg p-4 shadow-premium">
            <div className="flex items-center gap-2 mb-1">
              <Brain className="h-4 w-4 text-primary/70" />
              <span className="text-xs text-muted-foreground">{tAI.providersConfigured || 'Provedores Configurados'}</span>
            </div>
            <span className="text-2xl font-display font-bold text-foreground">{enabledCount}</span>
            <span className="text-xs text-muted-foreground ml-1">/ {AI_PROVIDERS.length}</span>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 shadow-premium">
            <div className="flex items-center gap-2 mb-1">
              <Zap className="h-4 w-4 text-success/70" />
              <span className="text-xs text-muted-foreground">{tAI.activeConnections || 'Conexões Ativas'}</span>
            </div>
            <span className="text-2xl font-display font-bold text-success">{connectedCount}</span>
          </div>
          <div className="bg-card border border-border rounded-lg p-4 shadow-premium">
            <div className="flex items-center gap-2 mb-1">
              <Sparkles className="h-4 w-4 text-warning/70" />
              <span className="text-xs text-muted-foreground">{tAI.defaultProvider || 'Provedor Padrão'}</span>
            </div>
            <span className="text-sm font-medium text-foreground">
              {defaultProvider ? AI_PROVIDERS.find(p => p.id === defaultProvider[0])?.name : 'Nenhum selecionado'}
            </span>
          </div>
        </div>
      )}

      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 6 }).map((_, i) => <SettingsSectionSkeleton key={i} />)
        ) : (
          AI_PROVIDERS.map((provider, i) => {
            const config = configs[provider.id];
            return (
              <motion.div
                key={provider.id}
                initial={{ opacity: 0, y: 8 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: i * 0.05 }}
                className={`bg-card border rounded-lg p-5 shadow-premium transition-all ${
                  config.enabled ? 'border-primary/30 ring-1 ring-primary/10' : 'border-border'
                }`}
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{provider.name}</span>
                        {config.isDefault && (
                          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Padrão</Badge>
                        )}
                        {config.connectionStatus === 'connected' && (
                          <Badge variant="outline" className="text-[10px] border-success/30 text-success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />Conectado
                          </Badge>
                        )}
                        {config.connectionStatus === 'failed' && (
                          <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                            <XCircle className="h-3 w-3 mr-1" />Falhou
                          </Badge>
                        )}
                        {!provider.requiresApiKey && (
                          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">Integrado</Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => {
                      updateConfig(provider.id, { enabled: checked });
                      if (user) saveConfig(provider.id, { ...config, enabled: checked });
                    }}
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
                          {provider.apiKeyLabel}
                          <InfoTooltip content="Sua chave de API é armazenada de forma segura no banco de dados e nunca exposta no frontend" />
                        </label>
                        <div className="flex gap-2">
                          <div className="relative flex-1">
                            <Input
                              type={showKeys[provider.id] ? 'text' : 'password'}
                              placeholder={provider.apiKeyPlaceholder}
                              value={config.apiKey}
                              onChange={e => updateConfig(provider.id, { apiKey: e.target.value, connectionStatus: 'idle' })}
                              className="pr-10"
                            />
                            <button
                              onClick={() => toggleShowKey(provider.id)}
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                            >
                              {showKeys[provider.id] ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                            </button>
                          </div>
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={!config.apiKey || config.connectionStatus === 'testing'}
                            onClick={() => testConnection(provider.id)}
                          >
                            {config.connectionStatus === 'testing' ? (
                              <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />Testando...</>
                            ) : (
                              <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />Testar</>
                            )}
                          </Button>
                        </div>
                        <a
                          href={provider.docsUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-[11px] text-primary/70 hover:text-primary transition-colors"
                        >
                          Obter API Key →
                        </a>
                      </div>
                    )}

                    {!provider.requiresApiKey && (
                      <div className="bg-success/5 border border-success/20 rounded-md p-3">
                        <p className="text-xs text-success flex items-center gap-1.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Pronto para uso — Nenhuma API key necessária. IA integrada ao Lovable Cloud.
                        </p>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">Modelo</label>
                      <Select
                        value={config.selectedModel}
                        onValueChange={v => {
                          updateConfig(provider.id, { selectedModel: v });
                          if (user) saveConfig(provider.id, { ...config, selectedModel: v });
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
                      <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        Max Tokens (Extração)
                        <InfoTooltip content="Limite máximo de tokens na resposta da IA ao extrair conteúdo de documentos e URLs. Modelos mais recentes suportam janelas maiores (ex: Gemini 2.5 Pro até 65k, GPT-5 até 128k)." />
                      </label>
                      <div className="flex items-center gap-3 max-w-xs">
                        <Input
                          type="number"
                          min={1000}
                          max={200000}
                          step={1000}
                          value={config.maxTokens}
                          onChange={e => {
                            const val = parseInt(e.target.value, 10) || 65000;
                            updateConfig(provider.id, { maxTokens: val });
                          }}
                          onBlur={() => {
                            if (user) saveConfig(provider.id, config);
                          }}
                          className="w-32"
                        />
                        <span className="text-[10px] text-muted-foreground">tokens</span>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        Recomendado: 16k (rápido), 65k (padrão), 128k+ (documentos longos)
                      </p>

                    {provider.id === 'azure_openai' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Endpoint URL</label>
                        <Input placeholder="https://your-resource.openai.azure.com/" />
                      </div>
                    )}

                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={provider.requiresApiKey && config.connectionStatus !== 'connected'}
                        onClick={() => setAsDefault(provider.id)}
                        className={config.isDefault ? 'border-primary/30 text-primary' : ''}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        {config.isDefault ? 'Provedor Padrão' : 'Definir como Padrão'}
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
              <p className="text-xs font-medium text-foreground">Como funciona</p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                O sistema utiliza o provedor de IA configurado (Lovable AI por padrão, ou seu próprio provedor) para: (1) Extrair informações relevantes dos documentos e URLs fornecidos como fonte; (2) Gerar controles de segurança com modelagem de ameaças STRIDE; (3) Cada controle gerado recebe o status "Pendente" e aguarda revisão humana antes de ser aprovado. As configurações são salvas de forma segura no banco de dados.
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIIntegrations;
