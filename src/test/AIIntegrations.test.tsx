import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import AIIntegrations from '@/pages/AIIntegrations';

const mocks = vi.hoisted(() => ({
  getProvidersCatalog: vi.fn(),
  getProviderModels: vi.fn(),
  upsertProviderCatalog: vi.fn(),
  createProviderModel: vi.fn(),
  updateProviderModel: vi.fn(),
  deleteProviderModel: vi.fn(),
  setDefaultProviderModel: vi.fn(),
  deleteProviderCatalog: vi.fn(),
  getAll: vi.fn(),
  upsert: vi.fn(),
  setDefault: vi.fn(),
  testConnection: vi.fn(),
  toast: vi.fn(),
  getUser: vi.fn(),
  onAuthStateChange: vi.fn(),
}));

vi.mock('framer-motion', async () => {
  const actual = await vi.importActual<typeof import('framer-motion')>('framer-motion');
  return {
    ...actual,
    motion: new Proxy(actual.motion, {
      get: (_target, prop: string) => {
        const Component = ({ children, initial, animate, exit, transition, whileHover, whileTap, variants, layout, ...rest }: any) => {
          const Tag = prop as any;
          return <Tag {...rest}>{children}</Tag>;
        };
        Component.displayName = `motion.${prop}`;
        return Component;
      },
    }),
  };
});

vi.mock('@/contexts/I18nContext', () => ({
  useI18n: () => ({
    t: {
      aiIntegrations: {
        title: 'AI Integrations',
        subtitle: 'Configure providers',
        providerSelectorLabel: 'Provider',
        providerSelectorPlaceholder: 'Select provider',
        apiKeyLabel: 'API Key',
        apiKeyPlaceholder: 'Paste provider API key',
        primaryModelLabel: 'Primary model',
        fallbackModelLabel: 'Fallback model',
        noFallbackModel: 'No fallback',
        saveKey: 'Save key',
        advancedParamsTitle: 'Advanced model parameters',
        advancedParamsDesc: 'Disabled by default.',
        advancedParamsEnableLabel: 'Enable advanced model parameters',
      },
      common: {},
    },
  }),
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: mocks.toast,
  }),
}));

vi.mock('@/services/aiService', () => ({
  aiConfigService: {
    getProvidersCatalog: (...args: unknown[]) => mocks.getProvidersCatalog(...args),
    getProviderModels: (...args: unknown[]) => mocks.getProviderModels(...args),
    upsertProviderCatalog: (...args: unknown[]) => mocks.upsertProviderCatalog(...args),
    createProviderModel: (...args: unknown[]) => mocks.createProviderModel(...args),
    updateProviderModel: (...args: unknown[]) => mocks.updateProviderModel(...args),
    deleteProviderModel: (...args: unknown[]) => mocks.deleteProviderModel(...args),
    setDefaultProviderModel: (...args: unknown[]) => mocks.setDefaultProviderModel(...args),
    deleteProviderCatalog: (...args: unknown[]) => mocks.deleteProviderCatalog(...args),
    getAll: (...args: unknown[]) => mocks.getAll(...args),
    upsert: (...args: unknown[]) => mocks.upsert(...args),
    setDefault: (...args: unknown[]) => mocks.setDefault(...args),
    testConnection: (...args: unknown[]) => mocks.testConnection(...args),
  },
}));

vi.mock('@/integrations/localdb/client', () => ({
  localDb: {
    auth: {
      getUser: (...args: unknown[]) => mocks.getUser(...args),
      onAuthStateChange: (...args: unknown[]) => mocks.onAuthStateChange(...args),
    },
  },
}));

vi.mock('@/components/HelpButton', () => ({
  default: () => <div data-testid="help-button" />,
}));

vi.mock('@/components/InfoTooltip', () => ({
  default: () => null,
}));

vi.mock('@/components/ui/switch', () => ({
  Switch: ({
    checked,
    onCheckedChange,
    disabled,
    ...rest
  }: {
    checked: boolean;
    onCheckedChange: (v: boolean) => void;
    disabled?: boolean;
    [key: string]: unknown;
  }) => (
    <input
      type="checkbox"
      checked={checked}
      disabled={disabled}
      onChange={(e) => onCheckedChange(e.target.checked)}
      {...rest}
    />
  ),
}));

vi.mock('@/components/ui/select', async () => {
  const React = await vi.importActual<typeof import('react')>('react');
  const SelectContext = React.createContext<{ onValueChange: (value: string) => void }>({
    onValueChange: () => {},
  });

  const Select = ({ onValueChange, children }: { onValueChange: (value: string) => void; children: React.ReactNode }) => (
    <SelectContext.Provider value={{ onValueChange }}>
      <div>{children}</div>
    </SelectContext.Provider>
  );

  const SelectTrigger = ({ children, className }: { children: React.ReactNode; className?: string }) => (
    <div className={className}>{children}</div>
  );

  const SelectValue = ({ placeholder }: { placeholder?: string }) => <span>{placeholder || ''}</span>;
  const SelectContent = ({ children }: { children: React.ReactNode }) => <div>{children}</div>;

  const SelectItem = ({ value, children }: { value: string; children: React.ReactNode }) => {
    const ctx = React.useContext(SelectContext);
    return (
      <button type="button" onClick={() => ctx.onValueChange(value)}>
        {children}
      </button>
    );
  };

  return {
    Select,
    SelectTrigger,
    SelectValue,
    SelectContent,
    SelectItem,
  };
});

describe('AIIntegrations', () => {
  beforeEach(() => {
    mocks.getProvidersCatalog.mockReset();
    mocks.getProviderModels.mockReset();
    mocks.upsertProviderCatalog.mockReset();
    mocks.createProviderModel.mockReset();
    mocks.updateProviderModel.mockReset();
    mocks.deleteProviderModel.mockReset();
    mocks.setDefaultProviderModel.mockReset();
    mocks.deleteProviderCatalog.mockReset();
    mocks.getAll.mockReset();
    mocks.upsert.mockReset();
    mocks.setDefault.mockReset();
    mocks.testConnection.mockReset();
    mocks.toast.mockReset();
    mocks.getUser.mockReset();
    mocks.onAuthStateChange.mockReset();

    mocks.getUser.mockResolvedValue({
      data: {
        user: { id: 'user-1' },
      },
    });
    mocks.onAuthStateChange.mockReturnValue({
      data: {
        subscription: {
          unsubscribe: vi.fn(),
        },
      },
    });
    mocks.getProvidersCatalog.mockResolvedValue([]);
    mocks.getProviderModels.mockResolvedValue([]);
    mocks.upsertProviderCatalog.mockResolvedValue({});
    mocks.createProviderModel.mockResolvedValue({});
    mocks.updateProviderModel.mockResolvedValue({});
    mocks.deleteProviderModel.mockResolvedValue({});
    mocks.setDefaultProviderModel.mockResolvedValue({});
    mocks.deleteProviderCatalog.mockResolvedValue({});
    mocks.getAll.mockResolvedValue([]);
    mocks.upsert.mockResolvedValue({});
  });

  it('changes selected provider from selector and updates visible provider details', async () => {
    const user = userEvent.setup();
    render(<AIIntegrations />);

    expect(await screen.findByText('AI Integrations')).toBeInTheDocument();
    expect(screen.getAllByText('OpenAI').length).toBeGreaterThan(0);

    await user.click(screen.getByRole('button', { name: 'Google Gemini' }));

    await waitFor(() => {
      expect(screen.getAllByText('Gemini models optimized for long-context source processing.').length).toBeGreaterThan(0);
    });
  });

  it('keeps integration focused on primary/fallback model selection only', async () => {
    render(<AIIntegrations />);
    await screen.findByText('AI Integrations');

    expect(screen.queryByPlaceholderText('Paste provider API key')).not.toBeInTheDocument();
    expect(screen.getAllByText('Primary model').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Fallback model').length).toBeGreaterThan(0);
    expect(screen.getByRole('button', { name: 'Save Selection' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Save and Test' })).toBeInTheDocument();
  });

  it('persists fallback model selection in provider extra_config', async () => {
    const user = userEvent.setup();
    render(<AIIntegrations />);
    await screen.findByText('AI Integrations');

    mocks.upsert.mockClear();

    const gpt5Buttons = screen.getAllByRole('button', { name: 'gpt-5' });
    expect(gpt5Buttons.length).toBeGreaterThan(1);
    await user.click(gpt5Buttons[1]);
    expect(mocks.upsert).not.toHaveBeenCalled();
    await user.click(screen.getByRole('button', { name: 'Save Selection' }));

    await waitFor(() => {
      expect(mocks.upsert).toHaveBeenCalled();
    });

    const payload = mocks.upsert.mock.calls[mocks.upsert.mock.calls.length - 1][0];
    expect(payload.provider_id).toBe('openai');
    expect(payload.extra_config.fallback_model).toBe('gpt-5');
  });

  it('persists model-scoped API key and endpoint from model edit flow for Azure OpenAI', async () => {
    const user = userEvent.setup();
    mocks.getProviderModels.mockResolvedValue([
      {
        id: 'model-azure-1',
        user_id: 'user-1',
        provider_id: 'azure_openai',
        model_id: 'gpt-4.1',
        is_default: true,
        is_active: true,
        sort_order: 10,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);
    mocks.getAll.mockResolvedValue([
      {
        id: 'cfg-azure-openai',
        user_id: 'user-1',
        provider_id: 'azure_openai',
        selected_model: 'gpt-4.1',
        is_default: true,
        enabled: true,
        api_key_encrypted: null,
        extra_config: {},
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);
    render(<AIIntegrations />);
    await screen.findByText('AI Integrations');
    await user.click(screen.getByRole('tab', { name: 'Model' }));
    await user.click(screen.getByRole('tab', { name: 'Edit Model' }));
    await screen.findByPlaceholderText('https://<resource>.openai.azure.com');

    mocks.upsert.mockClear();
    fireEvent.change(screen.getByPlaceholderText('Paste provider API key'), { target: { value: 'az-key-123' } });
    fireEvent.change(
      screen.getByPlaceholderText('https://<resource>.openai.azure.com'),
      { target: { value: 'https://my-azure.openai.azure.com' } },
    );
    await user.click(screen.getByRole('button', { name: 'Save Model' }));

    await waitFor(() => {
      expect(mocks.upsert).toHaveBeenCalled();
    });

    const payload = mocks.upsert.mock.calls[mocks.upsert.mock.calls.length - 1][0];
    expect(payload.provider_id).toBe('azure_openai');
    expect(payload.extra_config.model_credentials['gpt-4.1'].api_key_encrypted).toBeDefined();
    expect(payload.extra_config.model_credentials['gpt-4.1'].endpoint_url).toBe('https://my-azure.openai.azure.com');
  });

  it('creates a custom provider through CRUD form', async () => {
    const user = userEvent.setup();
    render(<AIIntegrations />);
    await screen.findByText('AI Integrations');
    await user.click(screen.getByRole('tab', { name: 'Provider' }));
    await user.click(screen.getByRole('tab', { name: 'Create Provider' }));

    fireEvent.change(screen.getByPlaceholderText('provider-id (e.g. custom-ai)'), { target: { value: 'custom-ai' } });
    fireEvent.change(screen.getByPlaceholderText('Provider name'), { target: { value: 'Custom Provider' } });
    fireEvent.change(screen.getByPlaceholderText('Default model (e.g. model-v1)'), { target: { value: 'custom-model-v1' } });
    fireEvent.change(screen.getByPlaceholderText('Description'), { target: { value: 'Custom provider for internal workloads' } });

    await user.click(screen.getByRole('button', { name: 'Create Provider' }));

    await waitFor(() => {
      expect(mocks.upsertProviderCatalog).toHaveBeenCalled();
      expect(mocks.createProviderModel).toHaveBeenCalled();
      expect(mocks.upsert).toHaveBeenCalled();
    });

    const providerPayload = mocks.upsertProviderCatalog.mock.calls[mocks.upsertProviderCatalog.mock.calls.length - 1][0];
    expect(providerPayload.provider_id).toBe('custom-ai');
    expect(providerPayload.name).toBe('Custom Provider');
    expect(providerPayload.is_builtin).toBe(false);

    const modelPayload = mocks.createProviderModel.mock.calls[mocks.createProviderModel.mock.calls.length - 1][0];
    expect(modelPayload.provider_id).toBe('custom-ai');
    expect(modelPayload.model_id).toBe('custom-model-v1');
    expect(modelPayload.is_default).toBe(true);
  });

  it('saves provider API key from edit flow even when provider is not yet in catalog', async () => {
    const user = userEvent.setup();
    render(<AIIntegrations />);
    await screen.findByText('AI Integrations');

    await user.click(screen.getByRole('tab', { name: 'Provider' }));
    await user.click(screen.getByRole('tab', { name: 'Edit Provider' }));

    const apiKeyInput = await screen.findByPlaceholderText('Paste provider API key');
    await user.clear(apiKeyInput);
    await user.type(apiKeyInput, 'sk-openai-provider-key');

    mocks.upsertProviderCatalog.mockClear();
    mocks.upsert.mockClear();

    await user.click(screen.getByRole('button', { name: 'Save Provider' }));

    await waitFor(() => {
      expect(mocks.upsertProviderCatalog).toHaveBeenCalled();
      expect(mocks.upsert).toHaveBeenCalled();
    });

    const providerPayload = mocks.upsertProviderCatalog.mock.calls[mocks.upsertProviderCatalog.mock.calls.length - 1][0];
    expect(providerPayload.provider_id).toBe('openai');

    const configPayload = mocks.upsert.mock.calls[mocks.upsert.mock.calls.length - 1][0];
    expect(configPayload.provider_id).toBe('openai');
    expect(configPayload.api_key_encrypted).toBe('sk-openai-provider-key');
  });

  it('adds a model to selected provider through CRUD section', async () => {
    const user = userEvent.setup();
    render(<AIIntegrations />);
    await screen.findByText('AI Integrations');

    await user.click(screen.getByRole('tab', { name: 'Model' }));
    await user.type(screen.getByPlaceholderText('New model id'), 'gpt-custom-experimental');
    await user.click(screen.getByRole('button', { name: 'Add Model' }));

    await waitFor(() => {
      expect(mocks.createProviderModel).toHaveBeenCalled();
    });

    const customCall = mocks.createProviderModel.mock.calls
      .map((call) => call[0])
      .find((payload) => payload.provider_id === 'openai' && payload.model_id === 'gpt-custom-experimental');
    expect(customCall).toBeTruthy();
  });

  it('shows legacy OpenAI models with nullable is_active in edit and delete flows', async () => {
    const user = userEvent.setup();
    mocks.getProvidersCatalog.mockResolvedValue([
      {
        id: 'catalog-openai',
        user_id: 'user-1',
        provider_id: 'openai',
        name: 'OpenAI',
        description: '',
        icon: 'OAI',
        docs_url: 'https://platform.openai.com/api-keys',
        requires_api_key: true,
        supports_endpoint: false,
        endpoint_placeholder: '',
        is_active: null,
        is_builtin: true,
        extra_config: {},
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);
    mocks.getProviderModels.mockResolvedValue([
      {
        id: 'model-openai-1',
        user_id: 'user-1',
        provider_id: 'openai',
        model_id: 'gpt-4o-mini',
        is_default: true,
        is_active: null,
        sort_order: 10,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
      {
        id: 'model-openai-2',
        user_id: 'user-1',
        provider_id: 'openai',
        model_id: 'gpt-5',
        is_default: false,
        is_active: null,
        sort_order: 20,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);

    render(<AIIntegrations />);
    await screen.findByText('AI Integrations');

    await user.click(screen.getByRole('tab', { name: 'Model' }));

    await user.click(screen.getByRole('tab', { name: 'Edit Model' }));
    expect(screen.queryByText('No models registered for this provider yet.')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'gpt-4o-mini' }).length).toBeGreaterThan(0);

    await user.click(screen.getByRole('tab', { name: 'Delete Model' }));
    expect(screen.queryByText('No models registered for this provider yet.')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'gpt-5' }).length).toBeGreaterThan(0);
  });

  it('matches OpenAI models with legacy provider_id casing in edit flow', async () => {
    const user = userEvent.setup();
    mocks.getProvidersCatalog.mockResolvedValue([]);
    mocks.getProviderModels.mockResolvedValue([
      {
        id: 'legacy-model-1',
        user_id: 'user-1',
        provider_id: 'OpenAI',
        model_id: 'gpt-4.1-mini',
        is_default: true,
        is_active: true,
        sort_order: 10,
        created_at: '2026-01-01T00:00:00Z',
        updated_at: '2026-01-01T00:00:00Z',
      },
    ]);

    render(<AIIntegrations />);
    await screen.findByText('AI Integrations');

    await user.click(screen.getByRole('tab', { name: 'Model' }));
    await user.click(screen.getByRole('tab', { name: 'Edit Model' }));

    expect(screen.queryByText('No models registered for this provider yet.')).not.toBeInTheDocument();
    expect(screen.getAllByRole('button', { name: 'gpt-4.1-mini' }).length).toBeGreaterThan(0);
  });
});
