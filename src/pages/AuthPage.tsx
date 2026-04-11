import React, { useState } from 'react';
import { Navigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Shield, Lock, ArrowRight, User } from 'lucide-react';

const AuthPage: React.FC = () => {
  const { user, loading, signIn, completeFirstLoginPasswordChange } = useAuth();
  const { toast } = useToast();
  const [username, setUsername] = useState('admin');
  const [password, setPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [requiresPasswordChange, setRequiresPasswordChange] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (user) return <Navigate to="/" replace />;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!username || !password) return;
    setSubmitting(true);

    if (requiresPasswordChange) {
      if (!newPassword || newPassword !== confirmPassword) {
        toast({
          title: 'Erro ao atualizar senha',
          description: 'Confirme a nova senha corretamente.',
          variant: 'destructive',
        });
        setSubmitting(false);
        return;
      }

      const { error } = await completeFirstLoginPasswordChange({
        username,
        currentPassword: password,
        newPassword,
      });

      if (error) {
        toast({
          title: 'Erro ao atualizar senha',
          description: error.message,
          variant: 'destructive',
        });
      } else {
        toast({
          title: 'Senha atualizada',
          description: 'Acesso liberado com a nova senha.',
        });
      }

      setSubmitting(false);
      return;
    }

    const { error } = await signIn(username, password);

    if (error) {
      if (error.code === 'PASSWORD_CHANGE_REQUIRED') {
        setRequiresPasswordChange(true);
        toast({
          title: 'Troca de senha obrigatoria',
          description: 'Defina uma nova senha para concluir o primeiro login.',
        });
      } else {
        toast({
          title: 'Erro ao fazer login',
          description: error.message,
          variant: 'destructive',
        });
      }
    }

    setSubmitting(false);
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background p-4">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md space-y-8"
      >
        <div className="text-center space-y-2">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-primary/10 mb-4">
            <Shield className="h-8 w-8 text-primary" />
          </div>
          <h1 className="text-3xl font-display font-semibold text-foreground">Aureum</h1>
          <p className="text-sm text-muted-foreground">Security Baseline Suite</p>
        </div>

        <div className="bg-card border border-border rounded-xl p-6 shadow-premium space-y-6">
          <div className="text-center">
            <h2 className="text-lg font-semibold text-foreground">
              {requiresPasswordChange ? 'Troque sua senha' : 'Fazer login'}
            </h2>
            <p className="text-xs text-muted-foreground mt-1">
              {requiresPasswordChange
                ? 'A senha padrao precisa ser alterada no primeiro acesso.'
                : 'Use usuario e senha locais para acessar o sistema.'}
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <User className="h-3 w-3 text-primary/70" /> Usuario
              </label>
              <Input
                type="text"
                placeholder="admin"
                value={username}
                onChange={e => setUsername(e.target.value)}
                required
                autoComplete="username"
                disabled={requiresPasswordChange}
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                <Lock className="h-3 w-3 text-primary/70" /> Senha
              </label>
              <Input
                type="password"
                placeholder="********"
                value={password}
                onChange={e => setPassword(e.target.value)}
                required
                minLength={8}
                autoComplete={requiresPasswordChange ? 'current-password' : 'password'}
                disabled={requiresPasswordChange}
              />
            </div>

            {requiresPasswordChange && (
              <>
                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-primary/70" /> Nova senha
                  </label>
                  <Input
                    type="password"
                    placeholder="Digite a nova senha"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium text-foreground flex items-center gap-1.5">
                    <Lock className="h-3 w-3 text-primary/70" /> Confirmar nova senha
                  </label>
                  <Input
                    type="password"
                    placeholder="Repita a nova senha"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    required
                    minLength={8}
                    autoComplete="new-password"
                  />
                </div>
              </>
            )}

            <Button type="submit" className="w-full" disabled={submitting}>
              {submitting ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <ArrowRight className="h-4 w-4 mr-2" />
              )}
              {requiresPasswordChange ? 'Atualizar senha e entrar' : 'Entrar'}
            </Button>
          </form>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthPage;
