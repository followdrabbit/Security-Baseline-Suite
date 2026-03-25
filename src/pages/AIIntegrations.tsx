import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { useI18n } from '@/contexts/I18nContext';
import { SettingsSectionSkeleton } from '@/components/skeletons/SkeletonPremium';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import InfoTooltip from '@/components/InfoTooltip';
import { useToast } from '@/hooks/use-toast';
import {
  Brain, Key, CheckCircle2, XCircle, Loader2, Eye, EyeOff, Zap, RefreshCw, Sparkles,
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
  color: string;
}

const AI_PROVIDERS: AIProvider[] = [
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
    color: 'hsl(var(--success))',
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
    color: 'hsl(var(--info))',
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
    color: 'hsl(var(--primary))',
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
    color: 'hsl(var(--warning))',
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
    color: 'hsl(var(--destructive))',
  },
];

interface ProviderConfig {
  enabled: boolean;
  apiKey: string;
  selectedModel: string;
  connectionStatus: 'idle' | 'testing' | 'connected' | 'failed';
  isDefault: boolean;
}

const AIIntegrations: React.FC = () => {
  const { t } = useI18n();
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [showKeys, setShowKeys] = useState<Record<string, boolean>>({});
  const [configs, setConfigs] = useState<Record<string, ProviderConfig>>(() => {
    const initial: Record<string, ProviderConfig> = {};
    AI_PROVIDERS.forEach(p => {
      initial[p.id] = {
        enabled: false,
        apiKey: '',
        selectedModel: p.defaultModel,
        connectionStatus: 'idle',
        isDefault: false,
      };
    });
    return initial;
  });

  useEffect(() => {
    const timer = setTimeout(() => setLoading(false), 900);
    return () => clearTimeout(timer);
  }, []);

  const updateConfig = (providerId: string, updates: Partial<ProviderConfig>) => {
    setConfigs(prev => ({
      ...prev,
      [providerId]: { ...prev[providerId], ...updates },
    }));
  };

  const setAsDefault = (providerId: string) => {
    setConfigs(prev => {
      const updated = { ...prev };
      Object.keys(updated).forEach(id => {
        updated[id] = { ...updated[id], isDefault: id === providerId };
      });
      return updated;
    });
    const provider = AI_PROVIDERS.find(p => p.id === providerId);
    toast({
      title: `⭐ ${provider?.name}`,
      description: (t as any).aiIntegrations?.setAsDefaultSuccess || `${provider?.name} definido como provedor padrão`,
    });
  };

  const testConnection = async (providerId: string) => {
    updateConfig(providerId, { connectionStatus: 'testing' });
    // Simulate API key validation
    await new Promise(resolve => setTimeout(resolve, 2000));
    const config = configs[providerId];
    if (config.apiKey.length > 10) {
      updateConfig(providerId, { connectionStatus: 'connected' });
      toast({
        title: '✅ ' + ((t as any).aiIntegrations?.connectionSuccess || 'Conexão bem-sucedida'),
        description: (t as any).aiIntegrations?.connectionSuccessDesc || 'API key validada com sucesso',
      });
    } else {
      updateConfig(providerId, { connectionStatus: 'failed' });
      toast({
        title: '❌ ' + ((t as any).aiIntegrations?.connectionFailed || 'Falha na conexão'),
        description: (t as any).aiIntegrations?.connectionFailedDesc || 'Verifique sua API key e tente novamente',
        variant: 'destructive',
      });
    }
  };

  const toggleShowKey = (providerId: string) => {
    setShowKeys(prev => ({ ...prev, [providerId]: !prev[providerId] }));
  };

  const enabledCount = Object.values(configs).filter(c => c.enabled).length;
  const connectedCount = Object.values(configs).filter(c => c.connectionStatus === 'connected').length;
  const defaultProvider = Object.entries(configs).find(([_, c]) => c.isDefault);

  const tAI = (t as any).aiIntegrations || {};

  return (
    <div className="p-6 lg:p-8 max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-2xl lg:text-3xl font-display font-semibold text-foreground">
          {tAI.title || 'Integrações de IA'}
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          {tAI.subtitle || 'Configure os provedores de IA para geração de controles e modelagem de ameaças'}
        </p>
      </div>

      {/* Status cards */}
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
              {defaultProvider ? AI_PROVIDERS.find(p => p.id === defaultProvider[0])?.name : (tAI.noneSelected || 'Nenhum selecionado')}
            </span>
          </div>
        </div>
      )}

      {/* Provider cards */}
      <div className="space-y-4">
        {loading ? (
          Array.from({ length: 5 }).map((_, i) => <SettingsSectionSkeleton key={i} />)
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
                {/* Header */}
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{provider.icon}</span>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-sm font-semibold text-foreground">{provider.name}</span>
                        {config.isDefault && (
                          <Badge variant="outline" className="text-[10px] border-primary/30 text-primary">
                            {tAI.default || 'Padrão'}
                          </Badge>
                        )}
                        {config.connectionStatus === 'connected' && (
                          <Badge variant="outline" className="text-[10px] border-success/30 text-success">
                            <CheckCircle2 className="h-3 w-3 mr-1" />
                            {tAI.connected || 'Conectado'}
                          </Badge>
                        )}
                        {config.connectionStatus === 'failed' && (
                          <Badge variant="outline" className="text-[10px] border-destructive/30 text-destructive">
                            <XCircle className="h-3 w-3 mr-1" />
                            {tAI.failed || 'Falhou'}
                          </Badge>
                        )}
                      </div>
                      <p className="text-xs text-muted-foreground mt-0.5">{provider.description}</p>
                    </div>
                  </div>
                  <Switch
                    checked={config.enabled}
                    onCheckedChange={(checked) => updateConfig(provider.id, { enabled: checked })}
                  />
                </div>

                {/* Config when enabled */}
                {config.enabled && (
                  <motion.div
                    initial={{ height: 0, opacity: 0 }}
                    animate={{ height: 'auto', opacity: 1 }}
                    transition={{ duration: 0.2 }}
                    className="space-y-4 pt-4 border-t border-border"
                  >
                    {/* API Key */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                        <Key className="h-3 w-3 text-primary/70" />
                        {provider.apiKeyLabel}
                        <InfoTooltip content={tAI.apiKeyTooltip || 'Sua chave de API é armazenada localmente e nunca enviada para terceiros'} />
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
                            <><Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" />{tAI.testing || 'Testando...'}</>
                          ) : (
                            <><RefreshCw className="h-3.5 w-3.5 mr-1.5" />{tAI.testConnection || 'Testar'}</>
                          )}
                        </Button>
                      </div>
                      <a
                        href={provider.docsUrl}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-[11px] text-primary/70 hover:text-primary transition-colors"
                      >
                        {tAI.getApiKey || 'Obter API Key →'}
                      </a>
                    </div>

                    {/* Model selection */}
                    <div className="space-y-1.5">
                      <label className="text-xs font-medium text-foreground">
                        {tAI.model || 'Modelo'}
                      </label>
                      <Select
                        value={config.selectedModel}
                        onValueChange={v => updateConfig(provider.id, { selectedModel: v })}
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

                    {/* Azure-specific: endpoint */}
                    {provider.id === 'azure_openai' && (
                      <div className="space-y-1.5">
                        <label className="text-xs font-medium text-foreground">Endpoint URL</label>
                        <Input placeholder="https://your-resource.openai.azure.com/" />
                      </div>
                    )}

                    {/* Set as default */}
                    <div className="flex items-center justify-between pt-2">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={config.connectionStatus !== 'connected'}
                        onClick={() => setAsDefault(provider.id)}
                        className={config.isDefault ? 'border-primary/30 text-primary' : ''}
                      >
                        <Sparkles className="h-3.5 w-3.5 mr-1.5" />
                        {config.isDefault ? (tAI.isDefault || 'Provedor Padrão') : (tAI.setAsDefault || 'Definir como Padrão')}
                      </Button>
                    </div>
                  </motion.div>
                )}
              </motion.div>
            );
          })
        )}
      </div>

      {/* Usage note */}
      {!loading && (
        <div className="bg-muted/30 border border-border rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Brain className="h-5 w-5 text-primary/70 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <p className="text-xs font-medium text-foreground">
                {tAI.howItWorksTitle || 'Como funciona'}
              </p>
              <p className="text-xs text-muted-foreground leading-relaxed">
                {tAI.howItWorksDesc || 'O sistema utiliza o provedor de IA configurado para: (1) Extrair informações relevantes dos documentos e URLs fornecidos como fonte; (2) Gerar controles de segurança com modelagem de ameaças STRIDE; (3) Cada controle gerado recebe o status "Pendente" e aguarda revisão humana antes de ser aprovado. Configure pelo menos um provedor para ativar o pipeline de IA.'}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AIIntegrations;
