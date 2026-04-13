import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import Settings from '@/pages/Settings';
import { TooltipProvider } from '@/components/ui/tooltip';

const mocks = vi.hoisted(() => ({
  setTheme: vi.fn(),
  setLocale: vi.fn(),
  mutate: vi.fn(),
  listUsers: vi.fn(),
  createUser: vi.fn(),
  toastSuccess: vi.fn(),
  toastError: vi.fn(),
}));

vi.mock('@/contexts/I18nContext', () => ({
  useI18n: () => ({
    locale: 'pt',
    setLocale: mocks.setLocale,
    t: {
      settings: {
        title: 'Configuracoes',
        subtitle: 'Ajustes gerais',
        interfaceLanguage: 'Idioma da interface',
        outputLanguage: 'Idioma de saida',
        theme: 'Tema',
        light: 'Claro',
        dark: 'Escuro',
        auto: 'Auto',
        tooltips: 'Tooltips',
        tooltipsAll: 'Todos',
        tooltipsMinimal: 'Minimo',
        tooltipsOff: 'Desligado',
        exportFormat: 'Formato de exportacao',
        aiStrictness: 'Rigor de IA',
        notifications: 'Notificacoes',
        notifySourceProcessed: 'Fonte processada',
        notifySourceProcessedDesc: 'Avisar quando concluir',
        notifyControlStatus: 'Status de controle',
        notifyControlStatusDesc: 'Avisar mudancas de status',
        notifyTeamMemberJoined: 'Membro entrou',
        notifyTeamMemberJoinedDesc: 'Avisar novos membros',
        saved: 'Salvo',
        backup: 'Backup',
        createBackup: 'Criar backup',
        restoreBackup: 'Restaurar backup',
        userManagement: {
          title: 'Usuarios locais',
          subtitle: 'Crie usuarios com senha temporaria. A troca de senha sera obrigatoria no primeiro login.',
          refreshing: 'Atualizando...',
          refreshList: 'Atualizar lista',
          usernamePlaceholder: 'usuario',
          passwordPlaceholder: 'senha temporaria',
          creating: 'Criando...',
          createUser: 'Criar usuario',
          passwordPolicyHint: 'Politica de senha',
          usernameColumn: 'Usuario',
          roleColumn: 'Perfil',
          passwordStatusColumn: 'Status de senha',
          pendingPasswordChange: 'Troca pendente',
          passwordUpdated: 'Senha atualizada',
          noUsers: 'Nenhum usuario cadastrado alem do admin.',
          userCreatedToast: 'Usuario criado com senha temporaria. Troca sera exigida no primeiro login.',
        },
      },
      common: {
        localeEnglishUs: 'English (US)',
        localePortugueseBr: 'Português (BR)',
        localeSpanishEs: 'Español (ES)',
      },
      exportImport: {
        json: 'JSON',
        markdown: 'Markdown',
        pdf: 'PDF',
      },
      tooltips: {
        outputLanguage: 'Idioma de saida',
        aiStrictness: 'Nivel de rigor',
      },
      rules: {
        conservative: 'Conservador',
        balanced: 'Balanceado',
        aggressive: 'Agressivo',
      },
    },
  }),
}));

vi.mock('@/contexts/ThemeContext', () => ({
  useTheme: () => ({
    theme: 'light',
    setTheme: mocks.setTheme,
  }),
}));

vi.mock('@/hooks/useUserPreferences', () => ({
  useUserPreferences: () => ({
    notifySourceProcessed: true,
    notifyControlStatus: true,
    notifyTeamMemberJoined: true,
    updatePreference: {
      mutate: mocks.mutate,
    },
  }),
}));

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => ({
    user: {
      id: 'admin-id',
      username: 'admin',
      app_metadata: { role: 'admin' },
    },
    listUsers: mocks.listUsers,
    createUser: mocks.createUser,
  }),
}));

vi.mock('sonner', () => ({
  toast: {
    success: mocks.toastSuccess,
    error: mocks.toastError,
  },
}));

vi.mock('@/components/HelpButton', () => ({
  default: () => <div data-testid="help-button" />,
}));

vi.mock('@/pages/AIIntegrations', () => ({
  default: () => <div data-testid="ai-integrations-panel" />,
}));

describe('Settings', () => {
  const renderSettings = () => render(
    <MemoryRouter initialEntries={['/settings']}>
      <TooltipProvider>
        <Settings />
      </TooltipProvider>
    </MemoryRouter>
  );

  beforeEach(() => {
    mocks.setTheme.mockReset();
    mocks.setLocale.mockReset();
    mocks.mutate.mockReset();
    mocks.listUsers.mockReset();
    mocks.createUser.mockReset();
    mocks.toastSuccess.mockReset();
    mocks.toastError.mockReset();
  });

  it('shows local user management section for admin', async () => {
    mocks.listUsers.mockResolvedValue({
      data: [
        {
          id: 'admin-id',
          username: 'admin',
          role: 'admin',
          must_change_password: false,
          created_at: '2026-04-11T00:00:00Z',
        },
      ],
      error: null,
    });

    renderSettings();

    const user = userEvent.setup();
    await user.click(screen.getByRole('tab', { name: /usuarios locais|access & users/i }));
    expect(await screen.findByRole('heading', { name: 'Usuarios locais' }, { timeout: 3000 })).toBeInTheDocument();
    expect(mocks.listUsers).toHaveBeenCalled();
    expect((await screen.findAllByText('admin', {}, { timeout: 3000 })).length).toBeGreaterThan(0);
  });

  it('creates user with lowercased username and refreshes list', async () => {
    mocks.listUsers.mockResolvedValue({ data: [], error: null });
    mocks.createUser.mockResolvedValue({
      data: {
        id: 'u2',
        username: 'analyst.user',
        role: 'user',
        must_change_password: true,
        created_at: '2026-04-11T00:00:00Z',
      },
      error: null,
    });

    const user = userEvent.setup();

    renderSettings();

    await user.click(screen.getByRole('tab', { name: /usuarios locais|access & users/i }));
    await screen.findByRole('heading', { name: 'Usuarios locais' }, { timeout: 3000 });
    await user.type(screen.getByPlaceholderText('usuario'), 'Analyst.User');
    await user.type(screen.getByPlaceholderText('senha temporaria'), 'TempPass@1234');
    await user.click(screen.getByRole('button', { name: /criar usuario/i }));

    await waitFor(() => {
      expect(mocks.createUser).toHaveBeenCalledWith({
        username: 'analyst.user',
        password: 'TempPass@1234',
      });
      expect(mocks.toastSuccess).toHaveBeenCalled();
      expect(mocks.listUsers).toHaveBeenCalledTimes(2);
    });
  }, 15000);
});
