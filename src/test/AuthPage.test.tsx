import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { act, render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter } from 'react-router-dom';
import AuthPage from '@/pages/AuthPage';

const authMock = {
  user: null,
  loading: false,
  signIn: vi.fn(),
  completeFirstLoginPasswordChange: vi.fn(),
};

const toastFn = vi.fn();

vi.mock('@/contexts/AuthContext', () => ({
  useAuth: () => authMock,
}));

vi.mock('@/hooks/use-toast', () => ({
  useToast: () => ({
    toast: toastFn,
  }),
}));

vi.mock('@/contexts/I18nContext', () => ({
  useI18n: () => ({
    t: {
      app: {
        name: 'Aureum',
        tagline: 'Security Baseline Suite',
      },
      auth: {
        updatePasswordErrorTitle: 'Erro ao atualizar senha',
        updatePasswordErrorDesc: 'Confirme a nova senha corretamente.',
        passwordUpdatedTitle: 'Senha atualizada',
        passwordUpdatedDesc: 'Acesso liberado com a nova senha.',
        passwordChangeRequiredTitle: 'Troca de senha obrigatoria',
        passwordChangeRequiredDesc: 'Defina uma nova senha para concluir o primeiro login.',
        loginErrorTitle: 'Erro ao fazer login',
        changePasswordTitle: 'Troque sua senha',
        loginTitle: 'Fazer login',
        changePasswordSubtitle: 'A senha padrao precisa ser alterada no primeiro acesso.',
        loginSubtitle: 'Use usuario e senha locais para acessar o sistema.',
        usernameLabel: 'Usuario',
        usernamePlaceholder: 'admin',
        passwordLabel: 'Senha',
        passwordPlaceholder: '********',
        newPasswordLabel: 'Nova senha',
        newPasswordPlaceholder: 'Digite a nova senha',
        confirmNewPasswordLabel: 'Confirmar nova senha',
        confirmNewPasswordPlaceholder: 'Repita a nova senha',
        passwordPolicyHint: 'Requisitos: minimo de 12 caracteres com maiuscula, minuscula, numero e caractere especial.',
        changePasswordSubmit: 'Atualizar senha e entrar',
        loginSubmit: 'Entrar',
      },
    },
  }),
}));

describe('AuthPage', () => {
  beforeEach(() => {
    authMock.user = null;
    authMock.loading = false;
    authMock.signIn.mockReset();
    authMock.completeFirstLoginPasswordChange.mockReset();
    toastFn.mockReset();
  });

  it('renders local username/password login fields', () => {
    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );

    expect(screen.getByPlaceholderText('admin')).toBeInTheDocument();
    expect(screen.getByPlaceholderText('********')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /entrar/i })).toBeInTheDocument();
  });

  it('submits username/password to sign in', async () => {
    authMock.signIn.mockResolvedValue({ error: null });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );

    await user.clear(screen.getByPlaceholderText('admin'));
    await user.type(screen.getByPlaceholderText('admin'), 'admin');
    await user.type(screen.getByPlaceholderText('********'), 'Admin@123456');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(authMock.signIn).toHaveBeenCalledWith('admin', 'Admin@123456');
    });
  });

  it('requires password change when backend returns PASSWORD_CHANGE_REQUIRED', async () => {
    authMock.signIn.mockResolvedValue({
      error: { message: 'Password change required', code: 'PASSWORD_CHANGE_REQUIRED' },
    });
    authMock.completeFirstLoginPasswordChange.mockResolvedValue({ error: null });
    const user = userEvent.setup();

    render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );

    await user.clear(screen.getByPlaceholderText('admin'));
    await user.type(screen.getByPlaceholderText('admin'), 'admin');
    await user.type(screen.getByPlaceholderText('********'), 'Admin@123456');
    await user.click(screen.getByRole('button', { name: /entrar/i }));

    await waitFor(() => {
      expect(screen.getByPlaceholderText('Digite a nova senha')).toBeInTheDocument();
      expect(screen.getByPlaceholderText('Repita a nova senha')).toBeInTheDocument();
    });

    await user.type(screen.getByPlaceholderText('Digite a nova senha'), 'New-admin-123');
    await user.type(screen.getByPlaceholderText('Repita a nova senha'), 'New-admin-123');
    await user.click(screen.getByRole('button', { name: /atualizar senha e entrar/i }));

    await waitFor(() => {
      expect(authMock.completeFirstLoginPasswordChange).toHaveBeenCalledWith({
        username: 'admin',
        currentPassword: 'Admin@123456',
        newPassword: 'New-admin-123',
      });
    });
  });

  it('shows loading spinner while auth state is loading', () => {
    authMock.loading = true;

    const { container } = render(
      <MemoryRouter>
        <AuthPage />
      </MemoryRouter>
    );

    expect(container.querySelector('.animate-spin')).toBeTruthy();
  });

  it('redirects when already authenticated', async () => {
    authMock.user = {
      id: 'u1',
      username: 'admin',
    };

    render(
      <MemoryRouter initialEntries={['/auth']}>
        <AuthPage />
      </MemoryRouter>
    );

    await act(async () => {
      await Promise.resolve();
    });

    expect(screen.queryByPlaceholderText('admin')).not.toBeInTheDocument();
  });
});
